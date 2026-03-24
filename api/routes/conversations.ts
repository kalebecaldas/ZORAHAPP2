import { Router, type Request, type Response } from 'express'
import path from 'path'
import fs from 'fs'
import { z } from 'zod'
import prisma from '../prisma/client.js'
const prismaAny = prisma as any
import { authMiddleware } from '../utils/auth.js'
import { WhatsAppService } from '../services/whatsapp.js'
import { InstagramService } from '../services/instagram.js'
import { AIService } from '../services/ai.js'
import type { AIContext } from '../services/ai.js'
import axios from 'axios'
import { getRealtime } from '../realtime.js'
import { upload, FileValidationService } from '../services/fileValidation.js'
import { transcodeToMp3, transcodeToOggOpus, transcodeToAacM4a } from '../utils/audioTranscode.js'
// Old engine (kept for backward compatibility)
// import { WorkflowEngine as WorkflowEngineOld, type WorkflowNode } from '../../src/services/workflowEngine.js'
// New modular engine
import { WorkflowEngine } from '../../src/services/workflow/core/WorkflowEngine.js'
import type { WorkflowNode } from '../../src/services/workflow/core/types.js'
import { prismaClinicDataService } from '../services/prismaClinicDataService.js'
import { sessionManager } from '../services/conversationSession.js'
import { intelligentRouter } from '../services/intelligentRouter.js'
import { conversationContextService } from '../services/conversationContext.js'
import { messageCacheService } from '../services/messageCache.js'
import { n8nBotService } from '../services/n8nBotService.js'

const router = Router()

// WhatsApp service instance
const whatsappService = new WhatsAppService(
  process.env.META_ACCESS_TOKEN || '',
  process.env.META_PHONE_NUMBER_ID || ''
)

// Instagram service instance
const instagramService = new InstagramService(
  process.env.INSTAGRAM_ACCESS_TOKEN || '',
  process.env.INSTAGRAM_PAGE_ID || process.env.INSTAGRAM_APP_ID || ''
)

// AI service instance
const aiService = new AIService(
  process.env.OPENAI_API_KEY || '',
  process.env.OPENAI_MODEL || 'gpt-4o',
  Number(process.env.OPENAI_TIMEOUT) || 20000
)

// Bot conversation timeout management
const botTimeouts = new Map<string, NodeJS.Timeout>()
const appointmentDrafts = new Map<string, any>()
const BOT_TIMEOUT_MS = 30000 // 30 seconds

/**
 * Schedule automatic transfer from bot to human after timeout
 */
function scheduleBotToHumanTransfer(conversationId: string, phone: string) {
  // Clear any existing timeout for this conversation
  const existingTimeout = botTimeouts.get(conversationId)
  if (existingTimeout) {
    clearTimeout(existingTimeout)
  }

  // Schedule new timeout
  const timeout = setTimeout(async () => {
    try {
      console.log(`Bot timeout reached for conversation ${conversationId}, transferring to human queue`)

      // Transfer conversation to principal queue
      await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          status: 'PRINCIPAL',
          assignedToId: null
        }
      })

      // Create system message about transfer
      await prisma.message.create({
        data: {
          conversationId,
          phoneNumber: phone,
          messageText: 'Conversa transferida automaticamente para atendimento humano devido ao tempo limite do bot.',
          direction: 'SENT',
          from: 'AGENT',
          timestamp: new Date()
        }
      })

      // Log the transfer
      const conv = await prisma.conversation.findUnique({ where: { id: conversationId } })
      if (conv?.patientId) {
        await prisma.patientInteraction.create({
          data: {
            patientId: conv.patientId,
            type: 'TRANSFER_TO_HUMAN',
            description: 'Transferência automática do bot para fila principal (timeout de 30 segundos)',
            data: { reason: 'timeout', previousStatus: 'BOT_QUEUE', timeoutDuration: BOT_TIMEOUT_MS }
          }
        })
      }

      // Emit real-time update
      const realtime = getRealtime()
      realtime.io.emit('conversation_transferred', {
        conversationId,
        from: 'BOT_QUEUE',
        to: 'PRINCIPAL',
        reason: 'timeout'
      })

      console.log(`Automatic transfer completed for conversation ${conversationId}`)
    } catch (error) {
      console.error(`Error during automatic transfer for conversation ${conversationId}:`, error)
    } finally {
      // Clean up timeout
      botTimeouts.delete(conversationId)
    }
  }, BOT_TIMEOUT_MS)

  botTimeouts.set(conversationId, timeout)
  console.log(`Scheduled bot timeout for conversation ${conversationId} in ${BOT_TIMEOUT_MS}ms`)
}

/**
 * Cancel bot timeout for a conversation
 */
function cancelBotTimeout(conversationId: string) {
  const timeout = botTimeouts.get(conversationId)
  if (timeout) {
    clearTimeout(timeout)
    botTimeouts.delete(conversationId)
    console.log(`Cancelled bot timeout for conversation ${conversationId}`)
  }
}

// In development, allow accessing list without auth to simplify bootstrapping
const listAuth = process.env.NODE_ENV === 'development'
  ? (req: Request, res: Response, next: any) => { next() }
  : authMiddleware

// Get all conversations
router.get('/', listAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, page = 1, limit = 20, search = '', assignedTo } = req.query
    const skip = (Number(page) - 1) * Number(limit)

    const where: any = {}
    if (status) {
      const s = String(status)
      if (s === 'ACTIVE') {
        where.status = { in: ['BOT_QUEUE', 'PRINCIPAL', 'AGUARDANDO', 'EM_ATENDIMENTO'] }
      } else if (s === 'BOT') {
        where.status = { in: ['BOT_QUEUE'] }
      } else if (s === 'HUMAN') {
        where.status = { in: ['PRINCIPAL', 'AGUARDANDO', 'EM_ATENDIMENTO'] }
      } else if (s === 'CLOSED') {
        where.status = 'FECHADA'
      } else if (s === 'PRINCIPAL') {
        // ✅ Tratar 'AGUARDANDO' como equivalente a 'PRINCIPAL'
        where.status = { in: ['PRINCIPAL', 'AGUARDANDO'] }
      } else {
        where.status = s
      }
    }
    // ✅ Filtrar por usuário atribuído (para MINHAS_CONVERSAS incluir expiradas)
    if (assignedTo) {
      where.assignedToId = String(assignedTo)
      // Se buscar por assignedTo, incluir todas as conversas atribuídas (exceto FECHADA)
      // Isso permite que conversas expiradas apareçam em "MINHAS_CONVERSAS"
      // Não aplicar filtro de status se já foi definido, mas garantir que FECHADA seja excluída
      if (!where.status) {
        // Se não tem filtro de status, excluir apenas FECHADA
        where.status = { not: 'FECHADA' }
      } else if (where.status === 'FECHADA') {
        // Se status é FECHADA, não aplicar assignedTo (conflito)
        delete where.assignedToId
      }
      // Se status já é um filtro (in, not, etc), manter e não sobrescrever
    }
    if (search) {
      const s = String(search)
      where.OR = [
        { phone: { contains: s } },
        { lastMessage: { contains: s } },
        { patient: { name: { contains: s } } },
      ]
    }

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { lastTimestamp: 'desc' },
        include: {
          patient: {
            select: { id: true, name: true, cpf: true, insuranceCompany: true }
          },
          assignedTo: {
            select: { id: true, name: true, email: true }
          },
          messages: {
            take: 1,
            orderBy: { timestamp: 'desc' },
            select: { id: true, messageText: true, direction: true, timestamp: true }
          }
        }
      }),
      prisma.conversation.count({ where })
    ])

    res.json({
      conversations,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    })
  } catch (error) {
    console.error('Erro ao buscar conversas:', error)
    res.status(500).json({ error: 'Erro interno' })
  }
})

// Get conversation context by ID (for N8N integration)
router.get('/:id/context', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            phone: true,
            cpf: true,
            insuranceCompany: true
          }
        },
        messages: {
          take: 10,
          orderBy: { timestamp: 'desc' },
          select: {
            id: true,
            messageText: true,
            direction: true,
            from: true,
            timestamp: true
          }
        }
      }
    })

    if (!conversation) {
      res.status(404).json({ error: 'Conversa não encontrada' })
      return
    }

    // Format context for N8N
    const context = {
      history: conversation.messages.reverse().map(msg => ({
        role: msg.from === 'USER' || msg.direction === 'RECEIVED' ? 'user' : 'assistant',
        content: msg.messageText || '',
        timestamp: msg.timestamp?.toISOString() || new Date().toISOString()
      })),
      currentIntent: (conversation as any).currentIntent || null,
      workflowContext: (conversation.workflowContext as any) || {},
      patient: conversation.patient ? {
        id: conversation.patient.id,
        name: conversation.patient.name,
        phone: conversation.patient.phone
      } : null
    }

    res.json(context)
  } catch (error) {
    console.error('Erro ao buscar contexto da conversa:', error)
    res.status(500).json({ error: 'Erro interno' })
  }
})

// Get conversation by phone (returns the most recent conversation)
router.get('/:phone', listAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone } = req.params
    const { limit = 50 } = req.query

    // ✅ Buscar a conversa mais recente (ordenada por createdAt desc)
    const conversation = await prisma.conversation.findFirst({
      where: { phone },
      orderBy: { createdAt: 'desc' }, // ✅ Sempre pegar a mais recente
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            cpf: true,
            insuranceCompany: true,
            insuranceNumber: true,
            email: true,
            birthDate: true,
            address: true,
            emergencyContact: true,
            preferences: true
          }
        },
        assignedTo: {
          select: { id: true, name: true, email: true }
        },
        messages: {
          take: Number(limit),
          orderBy: { timestamp: 'desc' },
          select: {
            id: true,
            messageText: true,
            messageType: true,
            mediaUrl: true,
            metadata: true,
            direction: true,
            from: true,
            timestamp: true,
            createdAt: true
          }
        }
      }
    })

    if (!conversation) {
      res.status(404).json({ error: 'Conversa não encontrada' })
      return
    }

    // ⚠️ NÃO zerar aqui - apenas quando agente explicitamente marcar como lida
    // O frontend deve chamar POST /:phone/mark-read quando abrir a conversa

    // Reverse messages to get chronological order
    conversation.messages.reverse()

    res.json(conversation)
  } catch (error) {
    console.error('Erro ao buscar conversa:', error)
    res.status(500).json({ error: 'Erro interno' })
  }
})

// ✅ Heartbeat para manter conversa ativa (atualiza lastAgentActivity sem emitir eventos)
router.post('/:phone/heartbeat', listAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone } = req.params

    // ✅ Buscar a conversa mais recente (ordenada por createdAt desc)
    const conversation = await prisma.conversation.findFirst({
      where: { phone },
      orderBy: { createdAt: 'desc' }
    })

    if (!conversation) {
      res.status(404).json({ error: 'Conversa não encontrada' })
      return
    }

    // ✅ Atualizar lastAgentActivity APENAS se está em atendimento
    // Indica que o atendente está VISUALIZANDO ativamente a conversa
    // Não emitir eventos para evitar loops
    if (conversation.status === 'EM_ATENDIMENTO' && conversation.assignedToId) {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastAgentActivity: new Date() }
      })
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Erro ao fazer heartbeat:', error)
    res.status(500).json({ error: 'Erro interno' })
  }
})

// ✅ Marcar conversa como lida (zerar unreadCount)
router.post('/:phone/mark-read', listAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone } = req.params

    // ✅ Buscar a conversa mais recente (ordenada por createdAt desc)
    const conversation = await prisma.conversation.findFirst({
      where: { phone },
      orderBy: { createdAt: 'desc' } // ✅ Sempre pegar a mais recente
    })

    if (!conversation) {
      res.status(404).json({ error: 'Conversa não encontrada' })
      return
    }

    // Zerar contador apenas se > 0
    if (conversation.unreadCount > 0) {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { unreadCount: 0 }
      })

      // Emitir evento para atualizar badge em tempo real
      try {
        const realtime = getRealtime()
        realtime.io.emit('conversation:updated', {
          conversationId: conversation.id,
          unreadCount: 0
        })
        console.log(`📢 Conversa marcada como lida: ${conversation.id}`)
      } catch (e) {
        console.warn('⚠️ Erro ao emitir evento:', e)
      }

      res.json({ success: true, unreadCount: 0 })
    } else {
      res.json({ success: true, unreadCount: 0, message: 'Já estava zerado' })
    }
  } catch (error) {
    console.error('Erro ao marcar como lida:', error)
    res.status(500).json({ error: 'Erro interno' })
  }
})

// Get conversation by ID
router.get('/id/:id', listAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            cpf: true,
            insuranceCompany: true,
            insuranceNumber: true,
            email: true,
            birthDate: true,
            address: true,
            emergencyContact: true,
            preferences: true
          }
        },
        assignedTo: {
          select: { id: true, name: true, email: true }
        },
        messages: {
          take: 50,
          orderBy: { timestamp: 'desc' },
          select: {
            id: true,
            messageText: true,
            messageType: true,
            mediaUrl: true,
            metadata: true,
            direction: true,
            from: true,
            timestamp: true,
            createdAt: true
          }
        }
      }
    })

    if (!conversation) {
      res.status(404).json({ error: 'Conversa não encontrada' })
      return
    }

    // Reverse messages to get chronological order
    const messages = [...conversation.messages].reverse()

    res.json({
      ...conversation,
      messages
    })
  } catch (error) {
    console.error('Error fetching conversation by ID:', error)
    res.status(500).json({ error: 'Erro ao buscar conversa' })
  }
})

// ⚡ NEW: Paginated messages endpoint (optimized for performance)
router.get('/id/:id/messages', listAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { limit = 50, offset = 0 } = req.query

    const limitNum = Math.min(Number(limit), 100) // Max 100 messages per request
    const offsetNum = Number(offset)

    console.log(`📄 Buscando mensagens paginadas: conversationId=${id}, limit=${limitNum}, offset=${offsetNum}`)

    // Use cache for first page (offset = 0)
    if (offsetNum === 0) {
      const cached = await messageCacheService.getOrSet(
        `messages:${id}`,
        async () => {
          return await prisma.message.findMany({
            where: { conversationId: id },
            select: {
              id: true,
              messageText: true,
              messageType: true,
              mediaUrl: true,
              metadata: true,
              direction: true,
              from: true,
              timestamp: true,
              createdAt: true
            },
            orderBy: { timestamp: 'desc' },
            take: limitNum
          })
        }
      )

      const hasMore = cached.length === limitNum
      res.json({ messages: cached.reverse(), hasMore, total: cached.length })
      return
    }

    // For subsequent pages, query directly (no cache)
    const messages = await prisma.message.findMany({
      where: { conversationId: id },
      select: {
        id: true,
        messageText: true,
        messageType: true,
        mediaUrl: true,
        metadata: true,
        direction: true,
        from: true,
        timestamp: true,
        createdAt: true
      },
      orderBy: { timestamp: 'desc' },
      take: limitNum,
      skip: offsetNum
    })

    const hasMore = messages.length === limitNum
    res.json({ messages: messages.reverse(), hasMore, total: messages.length })

  } catch (error) {
    console.error('Error fetching paginated messages:', error)
    res.status(500).json({ error: 'Erro ao buscar mensagens' })
  }
})

// ✅ DELETE conversation by ID (apenas para Master)
router.delete('/id/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    // Verificar se usuário é Master
    if (req.user?.role !== 'MASTER') {
      res.status(403).json({ error: 'Apenas usuários Master podem deletar conversas' })
      return
    }

    // Verificar se conversa existe
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        messages: true
      }
    })

    if (!conversation) {
      res.status(404).json({ error: 'Conversa não encontrada' })
      return
    }

    // Deletar mensagens primeiro (devido à foreign key)
    await prisma.message.deleteMany({
      where: { conversationId: id }
    })

    // Deletar conversa
    await prisma.conversation.delete({
      where: { id }
    })

    console.log(`🗑️ Conversa ${id} deletada por usuário Master: ${req.user?.email}`)

    // Emitir evento de conversa deletada
    try {
      const realtime = getRealtime()
      realtime.io.emit('conversation:deleted', {
        conversationId: id,
        phone: conversation.phone
      })
    } catch (e) {
      console.warn('⚠️ Erro ao emitir evento de conversa deletada:', e)
    }

    res.json({ success: true, message: 'Conversa deletada com sucesso' })
  } catch (error) {
    console.error('Erro ao deletar conversa:', error)
    res.status(500).json({ error: 'Erro ao deletar conversa' })
  }
})

// Conversation actions (take, transfer, close, return)
const actionsAuth = process.env.NODE_ENV === 'development'
  ? ((req: Request, _res: Response, next: any) => {
    if (!req.user) {
      req.user = {
        id: (req.body?.assignTo || process.env.DEV_USER_ID || 'dev-user'),
        email: 'dev@local',
        name: 'Dev User',
        role: 'AGENT'
      } as any
    }
    next()
  })
  : authMiddleware

router.post('/actions', actionsAuth, async (req: Request, res: Response): Promise<void> => {
  console.log('🚨 [/actions] REQUISIÇÃO RECEBIDA!', { body: req.body, headers: req.headers['content-type'] });
  try {
    const { action, phone, assignTo, conversationId } = req.body
    const now = new Date()

    console.log('🎯 [POST /actions] Recebida ação:', { action, conversationId, phone })

    // ✅ Se conversationId foi fornecido, usar ele diretamente (mais preciso)
    // Caso contrário, buscar por phone (comportamento legado)
    let conversation
    if (conversationId) {
      console.log(`🎯 Buscando conversa por ID específico: ${conversationId}`)
      conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { patient: true, assignedTo: true }
      })
    } else if (phone) {
      console.log(`📞 Buscando conversa por telefone: ${phone} (comportamento legado)`)
      // ✅ Sempre buscar a conversa mais recente (ordenada por createdAt desc)
      conversation = await prisma.conversation.findFirst({
        where: { phone },
        orderBy: { createdAt: 'desc' }, // ✅ Sempre pegar a mais recente
        include: { patient: true, assignedTo: true }
      })
    } else {
      res.status(400).json({ error: 'conversationId ou phone é obrigatório' })
      return
    }

    if (!conversation) {
      console.log('❌ Conversa não encontrada!')
      res.status(404).json({ error: 'Conversa não encontrada' })
      return
    }

    console.log(`✅ Conversa encontrada: ${conversation.id} (phone: ${conversation.phone}, status: ${conversation.status})`)

    let updateData: any = {}
    let actionDescription = ''

    // Resolve assignee id (prefer authenticated user, fallback to payload)
    const assigneeId = (assignTo || req.user?.id || (process.env.NODE_ENV === 'development' ? 'dev-user' : undefined))

    // In development, ensure assignee exists to avoid FK errors
    if (process.env.NODE_ENV === 'development' && assigneeId) {
      try {
        const exists = await prisma.user.findUnique({ where: { id: assigneeId } })
        if (!exists) {
          await prisma.user.create({
            data: {
              id: assigneeId,
              email: `dev+${assigneeId}@local`,
              name: 'Dev User',
              password: 'dev',
              role: 'AGENT'
            }
          })
        }
      } catch (createUserError) {
        console.warn('Dev assignee ensure error:', createUserError instanceof Error ? createUserError.message : createUserError)
      }
    }

    switch (action) {
      case 'take':
        if (conversation.assignedToId && conversation.assignedToId !== assigneeId) {
          res.status(409).json({ error: 'Conversa já está atribuída a outro atendente. Use Solicitar conversa.' })
          return
        }
        // ✅ Atualizar lastAgentActivity ao assumir conversa
        // Indica que o atendente começou a atender (resetar timer de inatividade)
        // lastUserActivity não é alterado (mantém data da última mensagem do paciente)
        updateData = {
          status: 'EM_ATENDIMENTO',
          lastAgentActivity: now,
          assignedToId: assigneeId
          // ❌ REMOVIDO: lastUserActivity: now - Mantemos a data da última mensagem do paciente
        }
        actionDescription = 'Conversa assumida'
        // Cancel bot timeout if conversation was in bot queue
        if (conversation.status === 'BOT_QUEUE') {
          cancelBotTimeout(conversation.id)
        }
        break

      case 'transfer':
        if (!assignTo) {
          res.status(400).json({ error: 'Usuário de destino é obrigatório' })
          return
        }
        const targetUser = await prisma.user.findUnique({ where: { id: assignTo } })
        if (!targetUser) {
          res.status(404).json({ error: 'Usuário de destino não encontrado' })
          return
        }
        updateData = {
          status: 'EM_ATENDIMENTO',
          assignedToId: assignTo
        }
        actionDescription = 'Conversa transferida'
        break

      case 'to_bot':
        updateData = {
          status: 'BOT_QUEUE',
          assignedToId: null
        }
        actionDescription = 'Conversa enviada para fila do bot'
        // Schedule automatic transfer to human after 30 seconds
        scheduleBotToHumanTransfer(conversation.id, conversation.phone)
        break

      case 'close':
        // ✅ Log dos dados recebidos
        console.log('📋 [CLOSE] Dados recebidos:', {
          category: req.body.category,
          privateAppointment: req.body.privateAppointment,
          normalAppointment: req.body.normalAppointment
        })

        // ✅ Validar categoria obrigatória
        if (!req.body.category) {
          res.status(400).json({ error: 'Categoria de encerramento é obrigatória' })
          return
        }

        // ✅ Validar privateAppointment se categoria for AGENDAMENTO_PARTICULAR
        if (req.body.category === 'AGENDAMENTO_PARTICULAR') {
          const { privateAppointment } = req.body
          if (!privateAppointment?.procedure || !privateAppointment?.sessions || !privateAppointment?.totalValue) {
            res.status(400).json({ 
              error: 'Para agendamentos particulares, informe: procedimento, sessões e valor total' 
            })
            return
          }
        }

        // ✅ Validar normalAppointment se categoria for AGENDAMENTO
        if (req.body.category === 'AGENDAMENTO') {
          const { normalAppointment } = req.body
          if (!normalAppointment?.insurance || !normalAppointment?.procedure || !normalAppointment?.sessions) {
            res.status(400).json({ 
              error: 'Para agendamentos com convênio, informe: convênio, procedimento e número de sessões' 
            })
            return
          }
        }

        updateData = {
          status: 'FECHADA',
          assignedToId: null,
          sessionStatus: 'closed',
          closeCategory: req.body.category,           // ✅ Salvar categoria
          closedAt: new Date(),                       // ✅ Data do encerramento
          closedByUserId: req.user?.id || null,       // ✅ Quem encerrou
          privateAppointment: req.body.privateAppointment || null,  // ✅ Dados do particular
          normalAppointment: req.body.normalAppointment || null     // ✅ Dados do agendamento normal
        }
        
        console.log('💾 [CLOSE] updateData que será salvo:', updateData)
        actionDescription = 'Conversa fechada'

        // ✅ Verificar se a sessão está expirada (mais de 24h sem resposta do cliente)
        const isSessionExpired = conversation.sessionExpiryTime
          ? new Date(conversation.sessionExpiryTime) < new Date()
          : false

        // ✅ Só envia mensagem de encerramento se a sessão NÃO estiver expirada
        if (!isSessionExpired) {
          const settings = await prisma.systemSettings.findFirst()
          const closingMessage = settings?.closingMessage || 'Obrigado pelo contato! Estamos à disposição. 😊'

          // ✅ Tentar enviar via WhatsApp (mas continuar mesmo se falhar)
          try {
            console.log(`📨 Enviando mensagem de encerramento para ${conversation.phone}...`)
            await whatsappService.sendTextMessage(conversation.phone, closingMessage)
            console.log(`✅ Mensagem de encerramento enviada com sucesso para ${conversation.phone}`)
          } catch (sendError) {
            console.warn('⚠️ WhatsApp falhou (continuando mesmo assim):', sendError)
          }

          // ✅ SEMPRE salvar mensagem no histórico (mesmo se WhatsApp falhar)
          try {
            const closingMsg = await prisma.message.create({
              data: {
                conversationId: conversation.id,
                phoneNumber: conversation.phone,
                direction: 'SENT', // ✅ Usar 'SENT' em vez de 'outgoing' para compatibilidade com frontend
                from: 'AGENT',
                messageText: closingMessage,
                messageType: 'TEXT',
                timestamp: new Date(),
                metadata: { isClosingMessage: true }
              }
            })

            console.log(`✅ Mensagem de encerramento salva no histórico: ${closingMsg.id}`)

            // ✅ Emitir evento para atualizar frontend imediatamente
            try {
              const realtime = getRealtime()
              realtime.io.to(`conv:${conversation.phone}`).emit('new_message', {
                conversation: { phone: conversation.phone, id: conversation.id },
                message: closingMsg
              })
              // Também emitir para a sala específica da conversa
              realtime.io.to(`conv:${conversation.id}`).emit('new_message', {
                conversation: { phone: conversation.phone, id: conversation.id },
                message: closingMsg
              })
              console.log(`📡 Eventos Socket.IO emitidos para mensagem de encerramento`)
            } catch (e) {
              console.warn('⚠️ Erro ao emitir evento de nova mensagem:', e)
            }
          } catch (dbError) {
            console.error('❌ Erro ao salvar mensagem de encerramento no histórico:', dbError)
          }
        } else {
          console.log(`⏰ Sessão expirada para ${conversation.phone} - mensagem de encerramento não enviada`)
        }

        // ✅ Sempre criar mensagem do sistema (independente de expiração)
        try {
          const { createSystemMessage } = await import('../utils/systemMessages.js')
          await createSystemMessage(conversation.id, 'CONVERSATION_CLOSED', {
            agentName: conversation.assignedTo?.name || req.user?.name || 'Sistema'
          })
        } catch (sysError) {
          console.error('⚠️ Erro ao criar mensagem do sistema:', sysError)
        }

        // ⚠️ WEBHOOK MOVIDO PARA DEPOIS DO UPDATE - Ver case 'close' após linha ~1016
        break

      case 'reopen':
        if (conversation.status !== 'FECHADA') {
          res.status(400).json({ error: 'Apenas conversas encerradas podem ser reabertas' })
          return
        }
        updateData = {
          status: 'PRINCIPAL',
          assignedToId: null
        }
        actionDescription = 'Conversa reaberta'
        break

      case 'return':

        updateData = {
          status: 'PRINCIPAL',
          assignedToId: null
        }
        actionDescription = 'Conversa retornada para fila'
        break

      default:
        res.status(400).json({ error: 'Ação inválida' })
        return
    }

    const updatedConversation = await prisma.conversation.update({
      where: { id: conversation.id },
      data: updateData,
      include: {
        patient: {
          select: { id: true, name: true, cpf: true, insuranceCompany: true, phone: true, email: true }
        },
        assignedTo: {
          select: { id: true, name: true, email: true }
        },
        closedBy: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    console.log('✅ [UPDATE] Conversa atualizada:', {
      id: updatedConversation.id,
      status: updatedConversation.status,
      closeCategory: updatedConversation.closeCategory,
      privateAppointment: updatedConversation.privateAppointment,
      normalAppointment: updatedConversation.normalAppointment
    })

    // ✅ Criar mensagem do sistema para cada ação
    try {
      const { createSystemMessage } = await import('../utils/systemMessages.js')
      const currentAgentName = req.user?.name || 'Agente'

      switch (action) {
        case 'take':
          await createSystemMessage(conversation.id, 'AGENT_ASSIGNED', {
            agentName: currentAgentName
          })

          // ✅ Adicionar evento de webhook
          try {
            const { addWebhookEvent } = await import('../utils/webhookEvents.js')
            await addWebhookEvent(conversation.id, 'agent_assigned', {
              agentId: req.user.id,
              agentName: req.user.name,
              agentEmail: req.user.email,
              previousStatus: conversation.status,
              newStatus: 'EM_ATENDIMENTO'
            })
          } catch (eventError) {
            console.error('⚠️ Erro ao adicionar evento de webhook:', eventError)
          }
          break

        case 'transfer':
          if (assignTo) {
            const targetUser = await prisma.user.findUnique({ where: { id: assignTo } })
            await createSystemMessage(conversation.id, 'TRANSFERRED_TO_AGENT', {
              agentName: currentAgentName,
              targetAgentName: targetUser?.name || 'Novo agente'
            })
          }
          break

        case 'to_bot':
          await createSystemMessage(conversation.id, 'TRANSFERRED_TO_QUEUE', {
            agentName: currentAgentName,
            queueName: 'BOT_QUEUE'
          })
          break

        case 'return':
          await createSystemMessage(conversation.id, 'RETURNED_TO_QUEUE', {
            agentName: currentAgentName,
            queueName: 'PRINCIPAL'
          })
          break

        case 'close':
          await createSystemMessage(conversation.id, 'CONVERSATION_CLOSED', {
            agentName: currentAgentName
          })
          
          // ✅ Disparar webhook conversation_closed AQUI (após o update)
          try {
            const { WebhookService } = await import('../services/webhookService.js')
            const { getWebhookEvents, clearWebhookEvents } = await import('../utils/webhookEvents.js')

            // Buscar eventos acumulados durante a conversa
            const events = await getWebhookEvents(conversation.id)

            // Buscar total de mensagens
            const messageCount = await prisma.message.count({
              where: { conversationId: conversation.id }
            })

            // Calcular duração da conversa
            const duration = updatedConversation?.closedAt && updatedConversation?.createdAt
              ? Math.floor((updatedConversation.closedAt.getTime() - updatedConversation.createdAt.getTime()) / 1000)
              : null

            console.log('🔍 [WEBHOOK] Conversa após update:', {
              id: updatedConversation.id,
              closeCategory: updatedConversation.closeCategory,
              privateAppointment: updatedConversation.privateAppointment,
              normalAppointment: updatedConversation.normalAppointment
            })

            await WebhookService.trigger('conversation_closed', {
              conversationId: conversation.id,
              phone: conversation.phone,
              timestamp: new Date().toISOString(),
              
              // ✅ Dados de tabulação (do updatedConversation após o update)
              category: updatedConversation.closeCategory || 'OUTROS',
              closedAt: updatedConversation.closedAt?.toISOString() || new Date().toISOString(),
              closedBy: updatedConversation.closedBy ? {
                id: updatedConversation.closedBy.id,
                name: updatedConversation.closedBy.name,
                email: updatedConversation.closedBy.email
              } : {
                id: req.user?.id || 'system',
                name: req.user?.name || 'Sistema',
                email: req.user?.email || null
              },
              
              // ✅ Dados de agendamento particular (se houver)
              privateAppointment: updatedConversation.privateAppointment || null,
              
              // ✅ Dados de agendamento normal/convênio (se houver)
              normalAppointment: updatedConversation.normalAppointment || null,
              
              // Dados do paciente
              patient: updatedConversation.patient || null,
              patientId: conversation.patientId,
              
              // Eventos e métricas
              events: events,
              metrics: {
                duration,
                messageCount,
                sessionExpired: conversation.sessionExpiryTime 
                  ? new Date(conversation.sessionExpiryTime) < new Date()
                  : false,
                channel: conversation.channel || 'whatsapp',
                totalEvents: events.length
              }
            })

            console.log(`📤 Webhook consolidado disparado com ${events.length} eventos para ${conversation.phone}`)

            // Limpar eventos após envio bem-sucedido
            await clearWebhookEvents(conversation.id)
          } catch (webhookError) {
            console.error('⚠️ Erro ao disparar webhook (não bloqueia fluxo):', webhookError)
          }
          break
      }
    } catch (systemMsgError) {
      console.error('Erro ao criar mensagem do sistema:', systemMsgError)
      // Não falha a requisição se a mensagem do sistema falhar
    }

    // Log action
    console.log('Prisma models available:', Object.keys(prisma))
    if (conversation.patientId) {
      console.log('Creating patient interaction for patient:', conversation.patientId)
      try {
        await prisma.patientInteraction.create({
          data: {
            patientId: conversation.patientId,
            type: 'CONVERSATION_ACTION',
            description: actionDescription,
            data: {
              action,
              performedBy: req.user.id,
              performedByName: req.user.name,
              previousStatus: conversation.status,
              newStatus: updatedConversation.status
            }
          }
        })
      } catch (error) {
        console.error('Error creating patient interaction:', error)
      }
    }

    // Emit real-time update (safe in case realtime not initialized)
    try {
      const realtime = getRealtime()
      // ✅ Emitir eventos para atualizar frontend
      realtime.io.to(`conv:${phone}`).emit('conversation_updated', updatedConversation)
      realtime.io.emit('queue_updated', { action, conversation: updatedConversation })
      // ✅ Emitir conversation:updated para garantir atualização em tempo real
      const updateEvent: any = {
        conversationId: updatedConversation.id,
        phone: updatedConversation.phone,
        status: updatedConversation.status,
        assignedToId: updatedConversation.assignedToId,
        assignedTo: updatedConversation.assignedTo
      }
      // ✅ Adicionar reason para reabertura
      if (action === 'reopen') {
        updateEvent.reason = 'conversation_reopened'
      }
      realtime.io.emit('conversation:updated', updateEvent)
      console.log(`📡 Eventos emitidos para conversa ${action}: ${updatedConversation.id}`)
    } catch (emitError) {
      console.warn('Realtime not initialized, skipping emit:', emitError instanceof Error ? emitError.message : emitError)
    }

    res.json(updatedConversation)
  } catch (error) {
    console.error('Erro na ação da conversa:', error)
    res.status(500).json({ error: 'Erro interno' })
  }
})

// Request conversation (creates a solicitation record and emits event)
router.post('/:id/request', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { notes } = req.body

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: { patient: true, assignedTo: true }
    })

    if (!conversation) {
      res.status(404).json({ error: 'Conversa não encontrada' })
      return
    }

    // Log as patient interaction for now (acts as request history)
    if (conversation.patientId) {
      await prisma.patientInteraction.create({
        data: {
          patientId: conversation.patientId,
          type: 'CONVERSATION_REQUEST',
          description: 'Solicitação de conversa',
          data: {
            requestedBy: req.user.id,
            requestedByName: req.user.name,
            assignedToId: conversation.assignedToId,
            assignedToName: conversation.assignedTo?.name || null,
            notes: notes || null
          }
        }
      })
    }

    // Emit real-time event to notify current assignee
    const realtime = getRealtime()
    realtime.io.emit('conversation_request_created', {
      conversationId: conversation.id,
      requestedBy: { id: req.user.id, name: req.user.name },
      assignedTo: conversation.assignedTo ? { id: conversation.assignedTo.id, name: conversation.assignedTo.name } : null
    })

    res.json({ success: true })
  } catch (error) {
    console.error('Erro ao solicitar conversa:', error)
    res.status(500).json({ error: 'Erro interno' })
  }
})

// Send message (OTIMIZADO: envia para WhatsApp e banco em paralelo)
router.post('/send', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone, text, from = 'AGENT', mediaUrl, mediaType } = req.body

    if (!phone || !text) {
      res.status(400).json({ error: 'Telefone e mensagem são obrigatórios' })
      return
    }

    // OTIMIZAÇÃO CRÍTICA: Enviar mensagem PRIMEIRO (mais importante para latência)
    const startTime = Date.now()
    let messageSent = false
    let messageError: any = null
    let platform = 'whatsapp'

    // Detectar plataforma pelo formato do phone/userId
    // Instagram user IDs são numéricos longos, WhatsApp são números de telefone
    const isInstagram = /^\d{10,}$/.test(phone) && phone.length > 10 && !phone.startsWith('55')

    // Enviar mensagem IMEDIATAMENTE (não esperar banco)
    try {
      if (isInstagram && process.env.INSTAGRAM_ACCESS_TOKEN) {
        platform = 'instagram'
        const instagramService = new InstagramService(
          process.env.INSTAGRAM_ACCESS_TOKEN,
          process.env.INSTAGRAM_PAGE_ID || process.env.INSTAGRAM_APP_ID || ''
        )
        await instagramService.sendTextMessage(phone, text)
        messageSent = true
        const messageTime = Date.now() - startTime
        console.log(`⚡ [FAST] Instagram enviado em ${messageTime}ms`)
      } else {
        await whatsappService.sendTextMessage(phone, text)
        messageSent = true
        const messageTime = Date.now() - startTime
        console.log(`⚡ [FAST] WhatsApp enviado em ${messageTime}ms`)
      }
    } catch (error) {
      messageError = error
      console.error(`❌ Erro ao enviar via ${platform}:`, error)
    }

    // Enquanto isso, fazer operações de banco (podem ser feitas depois)
    // ✅ IMPORTANTE: Sempre buscar a conversa mais recente para evitar salvar em conversa errada
    let conversation = await prisma.conversation.findFirst({
      where: { phone },
      orderBy: { createdAt: 'desc' } // ✅ Sempre pegar a mais recente
    })

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          phone,
          status: 'EM_ATENDIMENTO',
          assignedToId: req.user.id,
          lastMessage: text,
          lastTimestamp: new Date()
        }
      })
    }

    // Criar mensagem no banco (rápido)
    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        phoneNumber: phone,
        messageText: text,
        direction: 'SENT',
        from: from as 'AGENT' | 'USER' | 'BOT',
        timestamp: new Date()
      }
    })

    // ⚡ Invalidar cache de mensagens
    messageCacheService.invalidate(conversation.id)

    // Atualizar conversa (sem include pesado)
    const now = new Date()
    const updatedConversation = await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessage: text,
        lastTimestamp: now,
        lastAgentActivity: now // ✅ Atendente enviou mensagem (resposta ativa)
      }
    })

    // Log de interação de forma assíncrona (não bloqueia resposta)
    if (updatedConversation.patientId) {
      prisma.patientInteraction.create({
        data: {
          patientId: updatedConversation.patientId,
          type: messageSent ? 'MESSAGE_SENT' : 'MESSAGE_FAILED',
          description: messageSent ? `Mensagem enviada via ${platform === 'instagram' ? 'Instagram' : 'WhatsApp'}` : `Falha ao enviar mensagem via ${platform === 'instagram' ? 'Instagram' : 'WhatsApp'}`,
          data: {
            messageId: message.id,
            sentBy: req.user.id,
            sentByName: req.user.name,
            platform,
            ...(messageError ? { error: messageError instanceof Error ? messageError.message : 'Erro desconhecido' } : {})
          }
        }
      }).catch(err => console.warn('Erro ao criar log de interação:', err))
    }

    // Emit real-time update (APENAS UMA VEZ para evitar duplicatas)
    try {
      const realtime = getRealtime()
      const payload = {
        message: {
          id: message.id,
          conversationId: message.conversationId,
          phoneNumber: message.phoneNumber,
          messageText: message.messageText,
          direction: message.direction,
          from: message.from,
          timestamp: message.timestamp.toISOString()
        },
        conversation: {
          ...updatedConversation,
          lastMessage: message.messageText, // ✅ Garantir que lastMessage está no payload
          lastTimestamp: message.timestamp // ✅ Garantir que lastTimestamp está no payload
        },
        phone
      }
      // Emitir apenas para as salas relevantes, não globalmente (evita duplicatas)
      realtime.io.to(`conv:${phone}`).emit('message_sent', payload)
      realtime.io.to(`conv:${updatedConversation.id}`).emit('message_sent', payload)
      console.log(`📡 [SINGLE] Evento message_sent emitido para conv:${phone} e conv:${updatedConversation.id}`)
    } catch (e) {
      console.warn('Realtime update failed:', e)
    }

    const elapsed = Date.now() - startTime
    console.log(`⚡ [PERF] Mensagem enviada em ${elapsed}ms (${platform === 'instagram' ? 'Instagram' : 'WhatsApp'}: ${messageSent ? 'OK' : 'FAIL'})`)

    // Retornar resposta
    if (messageSent) {
      res.json({ message, conversation: updatedConversation, delivery: 'ok', platform })
    } else {
      const failOpen = process.env.NODE_ENV !== 'production' ||
        (platform === 'whatsapp' && (!process.env.META_ACCESS_TOKEN || !process.env.META_PHONE_NUMBER_ID)) ||
        (platform === 'instagram' && !process.env.INSTAGRAM_ACCESS_TOKEN) ||
        process.env.WHATSAPP_FAIL_OPEN === 'true'
      if (failOpen) {
        res.json({ message, conversation: updatedConversation, delivery: 'failed', platform })
      } else {
        res.status(500).json({ error: `Erro ao enviar mensagem via ${platform === 'instagram' ? 'Instagram' : 'WhatsApp'}` })
      }
    }
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error)
    res.status(500).json({ error: 'Erro interno' })
  }
})

// Process incoming WhatsApp message (called from webhook)
export async function processIncomingMessage(
  phone: string,
  text: string,
  messageId: string,
  messageType: string = 'TEXT',
  mediaUrl: string | null = null,
  metadata: any = null
): Promise<string[]> {
  const workflowLogs: string[] = []

  try {
    // Find patient (but don't create automatically - let workflow handle patient creation)
    // This allows the workflow to properly check if patient exists before creating
    let patient = await prisma.patient.findUnique({
      where: { phone }
    })

    // Only create temporary patient if conversation already exists and has patientId
    // This is for backward compatibility with existing conversations
    if (!patient) {
      const existingConversation = await prisma.conversation.findFirst({
        where: { phone },
        select: { patientId: true }
      })

      // Only create temporary patient if conversation exists and has patientId
      // Otherwise, let the workflow handle patient creation
      if (existingConversation?.patientId) {
        // This shouldn't happen, but handle it gracefully
        console.warn(`⚠️ Conversation has patientId but patient not found: ${existingConversation.patientId}`)
      }
      // Don't create patient here - let workflow handle it
    }

    // Find or create conversation
    // ✅ Sempre buscar a conversa mais recente (ordenada por createdAt desc)
    let conversation = await prisma.conversation.findFirst({
      where: { phone },
      orderBy: { createdAt: 'desc' } // ✅ Sempre pegar a mais recente
    })

    // Initialize session times
    const now = new Date()
    const sessionExpiryTime = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours

    if (!conversation) {
      // Get workflow BEFORE creating conversation to ensure workflowId is set
      let defaultWorkflowId: string | null = null
      let defaultStartNode: string = 'start'
      try {
        const wf = await getDefaultWorkflow()
        if (wf) {
          defaultWorkflowId = wf.id
          const cfg = (typeof (wf as any).config === 'string') ? (() => { try { return JSON.parse((wf as any).config) } catch { return {} } })() : ((wf as any).config || {})
          const nodes = Array.isArray(cfg?.nodes) ? cfg.nodes : []
          const startNode = nodes.find((n: any) => n.type === 'START')
          defaultStartNode = startNode?.id || 'start'
          console.log(`✅ Workflow encontrado: ${wf.id}, startNode: ${defaultStartNode}`)
        } else {
          console.warn(`⚠️ Nenhum workflow ativo encontrado no banco`)
        }
      } catch (err) {
        console.error(`❌ Erro ao buscar workflow padrão:`, err)
      }

      // Determine channel from metadata or default to whatsapp
      const channel = metadata?.platform === 'instagram' ? 'instagram' :
        (metadata?.platform === 'messenger' ? 'messenger' : 'whatsapp')

      conversation = await prisma.conversation.create({
        data: {
          phone,
          status: 'BOT_QUEUE',
          patientId: patient?.id || null, // Only set patientId if patient exists
          lastMessage: text,
          lastTimestamp: new Date(),
          sessionStartTime: now,
          sessionExpiryTime: sessionExpiryTime,
          sessionStatus: 'active',
          lastUserActivity: now,
          channel: channel,
          workflowId: defaultWorkflowId, // ✅ Set workflowId na criação
          currentWorkflowNode: defaultStartNode,
          workflowContext: {},
          awaitingInput: false
        }
      })
      console.log(`💬 Nova conversa criada: ${conversation.id} com sessão de 24h, workflowId: ${defaultWorkflowId || 'nenhum'}`)

      // ✅ Adicionar eventos de webhook ao contexto
      try {
        const { addWebhookEvent } = await import('../utils/webhookEvents.js')

        // Evento: first_message
        await addWebhookEvent(conversation.id, 'first_message', {
          phone: phone,
          message: text,
          channel: channel,
          patientId: patient?.id || null,
          patientName: patient?.name || null
        })

        // Evento: conversation_started
        await addWebhookEvent(conversation.id, 'conversation_started', {
          phone: phone,
          channel: channel,
          workflowId: defaultWorkflowId,
          sessionExpiryTime: sessionExpiryTime.toISOString(),
          status: 'BOT_QUEUE'
        })
      } catch (eventError) {
        console.error('⚠️ Erro ao adicionar eventos de webhook:', eventError)
      }

      // ✅ Emitir evento de nova conversa criada
      try {
        const realtime = getRealtime()
        realtime.io.emit('conversation:updated', {
          conversationId: conversation.id,
          phone: conversation.phone,
          status: 'BOT_QUEUE',
          sessionExpiryTime: sessionExpiryTime,
          sessionStatus: 'active',
          reason: 'new_conversation'
        })
        console.log(`📡 Evento conversation:updated emitido para nova conversa: ${conversation.id}`)
      } catch (e) {
        console.warn('⚠️ Erro ao emitir evento de nova conversa:', e)
      }

      // Start session in memory manager (only if patient exists)
      if (patient?.id) {
        try {
          await sessionManager.startSession(conversation.id, patient.id)
          console.log(`✅ Sessão iniciada no manager para: ${conversation.id}`)
        } catch (err) {
          console.warn(`⚠️ Erro ao iniciar sessão no manager:`, err)
        }
      }
    } else {
      // ✅ Verificar se conversa está FECHADA
      const isClosed = conversation.status === 'FECHADA'

      // ✅ Verificar se sessão expirou (24 horas desde a última mensagem do usuário)
      // A janela de 24h começa a partir do momento em que o usuário envia a última mensagem (lastUserActivity)
      // Se lastUserActivity for null, considerar como expirada (conversa antiga)
      const lastUserActivityTime = conversation.lastUserActivity ? new Date(conversation.lastUserActivity) : null
      const hoursSinceLastActivity = lastUserActivityTime
        ? (now.getTime() - lastUserActivityTime.getTime()) / (1000 * 60 * 60)
        : Infinity
      const sessionExpired = !lastUserActivityTime || hoursSinceLastActivity >= 24

      // 🔍 DEBUG: Log para entender qual caso está sendo executado
      console.log(`🔍 [DEBUG] Verificação de sessão para ${phone}:`, {
        conversationId: conversation.id,
        status: conversation.status,
        isClosed,
        lastUserActivity: conversation.lastUserActivity,
        hoursSinceLastActivity: hoursSinceLastActivity !== Infinity ? `${hoursSinceLastActivity.toFixed(2)} horas` : 'N/A (sem atividade)',
        sessionExpired,
        now: now.toISOString()
      })

      // ✅ CASO 1: Conversa FECHADA e sessão expirada (>24h desde última mensagem) -> Criar NOVA conversa
      if (isClosed && sessionExpired) {
        console.log(`🔄 Conversa FECHADA com sessão expirada (>24h desde última mensagem) para ${phone} - Criando nova conversa`)

        // ✅ Verificar se já existe uma conversa ativa (não fechada) para este phone
        // Se existir, não criar nova (evitar duplicatas)
        const existingActiveConversation = await prisma.conversation.findFirst({
          where: {
            phone,
            status: { not: 'FECHADA' }
          },
          orderBy: { createdAt: 'desc' }
        })

        if (existingActiveConversation) {
          console.log(`⚠️ Já existe conversa ativa para ${phone} (ID: ${existingActiveConversation.id}). Usando existente em vez de criar nova.`)
          conversation = existingActiveConversation
          // Atualizar lastUserActivity e sessionExpiryTime
          const newExpiryTime = new Date(now.getTime() + 24 * 60 * 60 * 1000)
          await prisma.conversation.update({
            where: { id: conversation.id },
            data: {
              lastUserActivity: now,
              sessionExpiryTime: newExpiryTime,
              sessionStatus: 'active',
              lastMessage: text,
              lastTimestamp: now
            }
          })
          // Pular criação de nova conversa e continuar processamento
        } else {

          // Get workflow BEFORE creating conversation to ensure workflowId is set
          let defaultWorkflowId: string | null = null
          let defaultStartNode: string = 'start'
          try {
            const wf = await getDefaultWorkflow()
            if (wf) {
              defaultWorkflowId = wf.id
              const cfg = (typeof (wf as any).config === 'string') ? (() => { try { return JSON.parse((wf as any).config) } catch { return {} } })() : ((wf as any).config || {})
              const nodes = Array.isArray(cfg?.nodes) ? cfg.nodes : []
              const startNode = nodes.find((n: any) => n.type === 'START')
              defaultStartNode = startNode?.id || 'start'
              console.log(`✅ Workflow encontrado: ${wf.id}, startNode: ${defaultStartNode}`)
            } else {
              console.warn(`⚠️ Nenhum workflow ativo encontrado no banco`)
            }
          } catch (err) {
            console.error(`❌ Erro ao buscar workflow padrão:`, err)
          }

          // Criar NOVA conversa
          const channel = metadata?.platform === 'instagram' ? 'instagram' :
            (metadata?.platform === 'messenger' ? 'messenger' : 'whatsapp')

          const newSessionExpiryTime = new Date(now.getTime() + 24 * 60 * 60 * 1000)

          conversation = await prisma.conversation.create({
            data: {
              phone,
              status: 'BOT_QUEUE',
              patientId: patient?.id || null,
              lastMessage: text,
              lastTimestamp: now,
              sessionStartTime: now,
              sessionExpiryTime: newSessionExpiryTime,
              sessionStatus: 'active',
              lastUserActivity: now,
              channel: channel,
              workflowId: defaultWorkflowId,
              currentWorkflowNode: defaultStartNode,
              workflowContext: {},
              awaitingInput: false
            }
          })

          console.log(`✨ Nova conversa criada após conversa FECHADA expirada: ${conversation.id}`)

          // ✅ NOVO: Disparar webhook de primeira mensagem
          try {
            const { WebhookService } = await import('../services/webhookService.js')

            await WebhookService.trigger('first_message', {
              conversationId: conversation.id,
              phone: phone,
              message: text,
              timestamp: now.toISOString(),
              patientId: patient?.id || null,
              patientName: patient?.name || null,
              source: channel, // 'whatsapp' | 'instagram' | 'messenger'
              metadata: {
                isNewConversation: true,
                hasPatient: !!patient
              }
            })

            console.log(`📤 Webhook "first_message" disparado para ${phone}`)
          } catch (webhookError) {
            console.error('⚠️ Erro ao disparar webhook (não bloqueia fluxo):', webhookError)
            // Não bloqueia o fluxo se webhook falhar
          }

          // ✅ Emitir evento de nova conversa criada
          try {
            const realtime = getRealtime()
            realtime.io.emit('conversation:updated', {
              conversationId: conversation.id,
              phone: conversation.phone,
              status: 'BOT_QUEUE',
              sessionExpiryTime: newSessionExpiryTime,
              sessionStatus: 'active',
              reason: 'new_conversation_after_expired'
            })
            console.log(`📡 Evento conversation:updated emitido para nova conversa: ${conversation.id}`)
          } catch (e) {
            console.warn('⚠️ Erro ao emitir evento de nova conversa:', e)
          }

          // Start session in memory manager
          if (patient?.id) {
            try {
              await sessionManager.startSession(conversation.id, patient.id)
            } catch (err) {
              console.warn(`⚠️ Erro ao iniciar sessão:`, err)
            }
          }
        } // Fim do else (criação de nova conversa quando não existe ativa)
      }
      // ✅ CASO 2: Conversa FECHADA mas sessão ainda ativa (<24h desde última mensagem) -> Reabrir conversa
      // IMPORTANTE: sessionExpired deve ser false (sessão ainda válida) E lastUserActivity deve existir
      else if (isClosed && !sessionExpired && lastUserActivityTime) {
        console.log(`🔄 Conversa FECHADA mas sessão ainda ativa (<24h) para ${phone} - Reabrindo conversa existente: ${conversation.id}`)

        // Determine channel from metadata or keep existing
        const channel = metadata?.platform === 'instagram' ? 'instagram' :
          (metadata?.platform === 'messenger' ? 'messenger' :
            (conversation.channel || 'whatsapp'))

        // ✅ Reabrir conversa: voltar para fila PRINCIPAL e resetar sessão
        // A janela de 24h começa AGORA (quando o usuário envia nova mensagem)
        const newExpiryTime = new Date(now.getTime() + 24 * 60 * 60 * 1000) // +24h a partir de agora

        conversation = await prisma.conversation.update({
          where: { id: conversation.id },
          data: {
            status: 'PRINCIPAL', // ✅ Voltar para fila PRINCIPAL (Fila 0)
            assignedToId: null, // ✅ Remover atribuição
            lastMessage: text,
            lastTimestamp: now,
            lastUserActivity: now, // ✅ Resetar: última atividade do usuário é AGORA
            sessionStartTime: now, // ✅ Resetar início da sessão
            sessionExpiryTime: newExpiryTime, // ✅ Resetar expiração (24h a partir de agora)
            sessionStatus: 'active', // ✅ Ativar sessão
            workflowContext: {}, // ✅ Resetar contexto do workflow
            awaitingInput: false,
            // Update channel if it's different and we have metadata indicating the platform
            ...(metadata?.platform && conversation.channel !== channel ? { channel } : {})
          }
        })

        console.log(`✅ Conversa reaberta: ${conversation.id} - Status: PRINCIPAL - Nova expiração: ${newExpiryTime.toISOString()}`)

        // ✅ Emitir evento de conversa reaberta (com dados completos)
        try {
          const realtime = getRealtime()
          // Buscar dados completos da conversa para incluir no evento
          const fullConversation = await prisma.conversation.findUnique({
            where: { id: conversation.id },
            include: {
              patient: {
                select: { id: true, name: true, cpf: true, insuranceCompany: true }
              },
              assignedTo: {
                select: { id: true, name: true, email: true }
              }
            }
          })

          realtime.io.emit('conversation:updated', {
            conversationId: conversation.id,
            phone: conversation.phone,
            status: 'PRINCIPAL',
            lastMessage: conversation.lastMessage,
            lastTimestamp: conversation.lastTimestamp,
            sessionExpiryTime: newExpiryTime,
            sessionStatus: 'active',
            lastUserActivity: conversation.lastUserActivity,
            assignedToId: null, // ✅ Removido ao reabrir
            patient: fullConversation?.patient || null,
            assignedTo: null, // ✅ Removido ao reabrir
            reason: 'conversation_reopened'
          })
          console.log(`📡 Evento conversation:updated emitido para conversa reaberta: ${conversation.id}`)
        } catch (e) {
          console.warn('⚠️ Erro ao emitir evento de conversa reaberta:', e)
        }

        // Start/update session in memory manager
        if (patient?.id) {
          try {
            await sessionManager.startSession(conversation.id, patient.id)
            console.log(`📊 Sessão reiniciada no manager para: ${conversation.id}`)
          } catch (err) {
            console.warn(`⚠️ Erro ao reiniciar sessão no manager:`, err)
          }
        }
      }
      // ✅ CASO 3: Conversa NÃO FECHADA mas sessão expirada (>24h desde última mensagem)
      else if (!isClosed && sessionExpired) {
        // ✅ REGRA: Se conversa está EM_ATENDIMENTO (assignedToId não é null), NÃO fechar
        // Mas criar nova conversa para a nova mensagem do paciente
        const isInAgentQueue = conversation.status === 'EM_ATENDIMENTO' && conversation.assignedToId !== null

        if (isInAgentQueue) {
          console.log(`⏸️ Conversa expirada mas está na fila do atendente (${conversation.assignedToId}) - NÃO fechando, mas criando nova conversa para nova mensagem`)

          // ✅ NÃO fechar a conversa antiga (deixar na fila do atendente)
          // Apenas marcar como expirada (sessionStatus)
          await prisma.conversation.update({
            where: { id: conversation.id },
            data: {
              sessionStatus: 'expired'
              // ✅ NÃO alterar status nem assignedToId - manter na fila do atendente
            }
          })
        } else {
          // ✅ Conversa expirada mas NÃO está na fila do atendente -> Fechar
          console.log(`🔄 Conversa ativa com sessão expirada (>24h desde última mensagem) para ${phone} - Fechando e criando nova conversa`)

          // Fechar conversa antiga
          await prisma.conversation.update({
            where: { id: conversation.id },
            data: {
              sessionStatus: 'expired',
              status: 'FECHADA',
              lastUserActivity: now
            }
          })

          // Emitir eventos de conversa fechada
          try {
            const realtime = getRealtime()
            // Emitir conversation:closed
            realtime.io.emit('conversation:closed', {
              conversationId: conversation.id,
              phone: conversation.phone,
              reason: 'session_expired'
            })
            // Também emitir conversation:updated
            realtime.io.emit('conversation:updated', {
              conversationId: conversation.id,
              status: 'FECHADA',
              phone: conversation.phone,
              reason: 'session_expired'
            })
            console.log(`📡 Eventos emitidos: conversation:closed e conversation:updated para ${conversation.id} (sessão expirada)`)
          } catch (e) {
            console.warn('⚠️ Erro ao emitir evento de conversa fechada:', e)
          }
        }

        // ✅ Verificar se já existe uma conversa ativa (não fechada) para este phone
        // Se existir outra conversa ativa além desta, não criar nova (evitar duplicatas)
        const otherActiveConversation = await prisma.conversation.findFirst({
          where: {
            phone,
            status: { not: 'FECHADA' },
            id: { not: conversation.id } // Excluir a conversa atual
          },
          orderBy: { createdAt: 'desc' }
        })

        if (otherActiveConversation) {
          console.log(`⚠️ Já existe outra conversa ativa para ${phone} (ID: ${otherActiveConversation.id}). Usando ela.`)
          // Usar a outra conversa ativa
          conversation = otherActiveConversation
          // Atualizar lastUserActivity e sessionExpiryTime
          const newExpiryTime = new Date(now.getTime() + 24 * 60 * 60 * 1000)
          await prisma.conversation.update({
            where: { id: conversation.id },
            data: {
              lastUserActivity: now,
              sessionExpiryTime: newExpiryTime,
              sessionStatus: 'active',
              lastMessage: text,
              lastTimestamp: now
            }
          })
          // Pular criação de nova conversa e continuar processamento
        } else {

          // Get workflow BEFORE creating conversation to ensure workflowId is set
          let defaultWorkflowId: string | null = null
          let defaultStartNode: string = 'start'
          try {
            const wf = await getDefaultWorkflow()
            if (wf) {
              defaultWorkflowId = wf.id
              const cfg = (typeof (wf as any).config === 'string') ? (() => { try { return JSON.parse((wf as any).config) } catch { return {} } })() : ((wf as any).config || {})
              const nodes = Array.isArray(cfg?.nodes) ? cfg.nodes : []
              const startNode = nodes.find((n: any) => n.type === 'START')
              defaultStartNode = startNode?.id || 'start'
              console.log(`✅ Workflow encontrado: ${wf.id}, startNode: ${defaultStartNode}`)
            } else {
              console.warn(`⚠️ Nenhum workflow ativo encontrado no banco`)
            }
          } catch (err) {
            console.error(`❌ Erro ao buscar workflow padrão:`, err)
          }

          // Criar NOVA conversa
          const channel = metadata?.platform === 'instagram' ? 'instagram' :
            (metadata?.platform === 'messenger' ? 'messenger' : 'whatsapp')

          const newSessionExpiryTime = new Date(now.getTime() + 24 * 60 * 60 * 1000)

          conversation = await prisma.conversation.create({
            data: {
              phone,
              status: 'BOT_QUEUE',
              patientId: patient?.id || null,
              lastMessage: text,
              lastTimestamp: now,
              sessionStartTime: now,
              sessionExpiryTime: newSessionExpiryTime,
              sessionStatus: 'active',
              lastUserActivity: now,
              channel: channel,
              workflowId: defaultWorkflowId,
              currentWorkflowNode: defaultStartNode,
              workflowContext: {},
              awaitingInput: false
            }
          })

          console.log(`✨ Nova conversa criada após expiração: ${conversation.id}`)

          // ✅ Emitir evento de nova conversa criada (com dados completos)
          try {
            const realtime = getRealtime()
            // Buscar dados completos da conversa para incluir no evento
            const fullConversation = await prisma.conversation.findUnique({
              where: { id: conversation.id },
              include: {
                patient: {
                  select: { id: true, name: true, cpf: true, insuranceCompany: true }
                },
                assignedTo: {
                  select: { id: true, name: true, email: true }
                }
              }
            })

            realtime.io.emit('conversation:updated', {
              conversationId: conversation.id,
              phone: conversation.phone,
              status: 'BOT_QUEUE',
              lastMessage: conversation.lastMessage,
              lastTimestamp: conversation.lastTimestamp,
              sessionExpiryTime: newSessionExpiryTime,
              sessionStatus: 'active',
              lastUserActivity: conversation.lastUserActivity,
              unreadCount: 1, // Nova mensagem = não lida
              channel: conversation.channel,
              patient: fullConversation?.patient || null,
              assignedTo: fullConversation?.assignedTo || null,
              assignedToId: fullConversation?.assignedToId || null,
              reason: 'new_conversation_after_expired'
            })
            console.log(`📡 Evento conversation:updated emitido para nova conversa: ${conversation.id}`)
          } catch (e) {
            console.warn('⚠️ Erro ao emitir evento de nova conversa:', e)
          }

          // Start session in memory manager
          if (patient?.id) {
            try {
              await sessionManager.startSession(conversation.id, patient.id)
            } catch (err) {
              console.warn(`⚠️ Erro ao iniciar sessão:`, err)
            }
          }
        } // Fim do else (criação de nova conversa)
      }
      // ✅ CASO 4: Conversa NÃO FECHADA e sessão ativa (<24h desde última mensagem) -> Atualizar atividade
      else {
        // Session still active - update activity
        // Determine channel from metadata or keep existing
        const channel = metadata?.platform === 'instagram' ? 'instagram' :
          (metadata?.platform === 'messenger' ? 'messenger' :
            (conversation.channel || 'whatsapp'))

        // ✅ Reset session expiry quando paciente envia mensagem
        // A janela de 24h começa AGORA (quando o usuário envia nova mensagem)
        const newExpiryTime = new Date(now.getTime() + 24 * 60 * 60 * 1000) // +24h a partir de agora

        // Update last activity, session expiry and channel if needed
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: {
            lastUserActivity: now,
            sessionExpiryTime: newExpiryTime, // ✅ Reset timer
            sessionStatus: 'active',
            // Update channel if it's different and we have metadata indicating the platform
            ...(metadata?.platform && conversation.channel !== channel ? { channel } : {})
          }
        })

        console.log(`⏰ Sessão resetada para ${conversation.id} - Nova expiração: ${newExpiryTime.toISOString()}`)

        // Update session in memory manager
        try {
          await sessionManager.updateSessionActivity(conversation.id)
          console.log(`📊 Atividade de sessão atualizada para: ${conversation.id}`)
        } catch (err) {
          // Session might not exist in memory, start it (only if patient exists)
          if (patient?.id) {
            try {
              await sessionManager.startSession(conversation.id, patient.id)
            } catch (startErr) {
              console.warn(`⚠️ Erro ao gerenciar sessão:`, startErr)
            }
          }
        }
      }
    }

    // ✅ VERIFICAR DUPLICAÇÃO antes de criar mensagem (OTIMIZADO: busca por ID, phone e texto)
    let message = null

    // Verificar duplicação por messageId (se disponível)
    if (messageId) {
      const existingMessageById = await prisma.message.findFirst({
        where: {
          metadata: {
            path: ['whatsappMessageId'],
            equals: messageId,
          },
          createdAt: {
            gte: new Date(Date.now() - 5 * 60 * 1000), // Últimos 5 minutos
          },
        },
        select: {
          id: true,
          conversationId: true,
        },
      })

      if (existingMessageById) {
        console.log(`⚠️ Mensagem duplicada detectada por messageId: ${messageId} de ${phone}`)
        // Retornar logs vazios mas não processar novamente
        return workflowLogs
      }
    }

    // ✅ Verificar duplicação por texto e phone (últimos 2 minutos) - proteção adicional
    const existingMessageByContent = await prisma.message.findFirst({
      where: {
        phoneNumber: phone,
        messageText: text,
        direction: 'RECEIVED',
        createdAt: {
          gte: new Date(Date.now() - 2 * 60 * 1000), // Últimos 2 minutos
        },
      },
      select: {
        id: true,
        conversationId: true,
      },
    })

    if (existingMessageByContent) {
      console.log(`⚠️ Mensagem duplicada detectada por conteúdo: "${text?.substring(0, 50) || '[vazio]'}..." de ${phone} (últimos 2 minutos)`)
      // Se a mensagem duplicada está na mesma conversa, não processar
      if (existingMessageByContent.conversationId === conversation.id) {
        console.log(`⚠️ Mensagem duplicada na mesma conversa - ignorando`)
        return workflowLogs
      }
      // Se está em outra conversa, pode ser legítimo (paciente enviou mesma mensagem para outra conversa)
      console.log(`ℹ️ Mensagem similar encontrada em outra conversa (${existingMessageByContent.conversationId}) - processando normalmente`)
    }

    // Garantir que metadata contém whatsappMessageId
    const messageMetadata = {
      ...metadata,
      whatsappMessageId: messageId || metadata?.whatsappMessageId
    }

    // Create message
    message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        phoneNumber: phone,
        messageText: text,
        messageType,
        mediaUrl,
        metadata: messageMetadata,
        direction: 'RECEIVED',
        from: 'USER',
        timestamp: new Date()
      }
    })

    // ⚡ Invalidar cache de mensagens
    messageCacheService.invalidate(conversation.id)

    // ✅ Incrementar contador de mensagens não lidas
    const updatedConversation = await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        unreadCount: { increment: 1 }
      }
    })

    // ✅ Emitir evento GLOBAL para atualizar badge na lista de conversas
    try {
      const realtime = getRealtime()
      realtime.io.emit('conversation:updated', {
        conversationId: conversation.id,
        unreadCount: updatedConversation.unreadCount,
        lastMessage: text,
        lastTimestamp: new Date().toISOString()
      })
      console.log(`📢 Badge atualizado: ${conversation.id} unreadCount=${updatedConversation.unreadCount}`)
    } catch (e) {
      console.warn('⚠️ Erro ao emitir badge update:', e)
    }

    // IMPORTANTE: Emitir evento Socket.IO IMEDIATAMENTE após criar a mensagem
    // Isso reduz a latência percebida pelo usuário
    const shouldProcessWithBot = conversation.status === 'BOT_QUEUE';

    console.log(`🔍 DEBUG: shouldProcessWithBot = ${shouldProcessWithBot}, conversation.status = ${conversation.status}, conversationId = ${conversation.id}`)

    // Emitir eventos em tempo real IMEDIATAMENTE (antes de outras operações)
    const emitStartAt = Date.now()
    try {
      const realtime = getRealtime()
      const messagePayload = {
        message: {
          id: message.id,
          conversationId: message.conversationId,
          phoneNumber: message.phoneNumber,
          messageText: message.messageText,
          messageType: message.messageType,
          mediaUrl: message.mediaUrl,
          metadata: message.metadata,
          direction: message.direction,
          from: message.from,
          timestamp: message.timestamp.toISOString()
        },
        conversation: {
          id: conversation.id,
          phone: conversation.phone,
          status: conversation.status,
          lastMessage: text,
          lastTimestamp: new Date().toISOString()
        },
        phone
      }

      const emitTimestamp = Date.now();
      console.log(`📡 [${new Date().toISOString()}] Emitindo new_message com mediaUrl:`, message.mediaUrl, `tipo:`, message.messageType)
      console.log(`📡 [${new Date().toISOString()}] Payload completo:`, JSON.stringify(messagePayload, null, 2))

      realtime.io.to(`conv:${phone}`).emit('new_message', messagePayload)
      realtime.io.to(`conv:${conversation.id}`).emit('new_message', messagePayload)

      const emitDuration = Date.now() - emitStartAt;
      const totalTimeFromMessage = Date.now() - (new Date(message.timestamp).getTime() || Date.now());
      console.log(`📡 [${new Date().toISOString()}] ✅ Evento new_message emitido para conv:${phone} e conv:${conversation.id} (emit: ${emitDuration}ms, total desde criação: ${totalTimeFromMessage}ms)`)
    } catch (e) {
      console.warn('Realtime update failed:', e)
    }

    // Update conversation (pode ser feito em paralelo ou depois)
    conversation = await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessage: text,
        lastTimestamp: new Date()
      },
      include: {
        patient: {
          select: { id: true, name: true, cpf: true, insuranceCompany: true }
        }
      }
    })

    // Emitir atualização de conversa após atualizar
    try {
      const realtime = getRealtime()
      realtime.io.to(`conv:${conversation.phone}`).emit('conversation_updated', conversation)
      realtime.io.to(`conv:${conversation.id}`).emit('conversation_updated', conversation)
    } catch (e) {
      console.warn('Realtime conversation update failed:', e)
    }

    if (!shouldProcessWithBot) {
      console.log(`👤 Mensagem recebida em conversa com humano (status: ${conversation.status}). Bot não processará.`)
      return workflowLogs
    }

    // ✅ INTEGRAÇÃO N8N: Tentar usar N8N primeiro, fallback para sistema antigo
    console.log(`🤖 Processando mensagem...`)
    console.log(`🔍 DEBUG N8N: isEnabled() = ${n8nBotService.isEnabled()}, status = ${conversation.status}`)

    // ✅ RECARREGAR conversation para ter workflowContext atualizado
    // (conversation pode não ter workflowContext após update se não estiver no include)
    const reloadedConversation = await prisma.conversation.findUnique({
      where: { id: conversation.id },
      include: { patient: true }
    })

    if (!reloadedConversation) {
      console.error('❌ Conversa não encontrada ao recarregar')
      return workflowLogs
    }

    // Buscar contexto da conversa para enviar ao N8N
    const context = await conversationContextService.getContext(reloadedConversation.id)

    // ✅ Incluir selectedUnit e appointmentFlow do workflowContext se existirem
    const workflowContext = reloadedConversation.workflowContext as any || {}
    const selectedUnit = workflowContext.selectedUnit || null
    const appointmentFlow = workflowContext.appointmentFlow || null

    // 🔍 DEBUG - Log completo do contexto
    console.log('━━━━━━━━━━━━━━━━━━━━━')
    console.log('📊 DEBUG N8N CONTEXT')
    console.log('conversation.id:', reloadedConversation.id)
    console.log('workflowContext:', JSON.stringify(workflowContext, null, 2))
    console.log('selectedUnit:', selectedUnit ? `${selectedUnit.name} (${selectedUnit.id})` : 'NULL')
    console.log('appointmentFlow:', appointmentFlow ? appointmentFlow.step : 'NULL')
    console.log('━━━━━━━━━━━━━━━━━━━━━')

    // Preparar contexto completo para N8N
    const n8nContext = {
      ...context,
      selectedUnit: selectedUnit,  // ✅ Persistir unidade selecionada
      appointmentFlow: appointmentFlow
    }

    // Tentar processar com N8N
    const n8nFallbackEnabled = process.env.N8N_FALLBACK_ENABLED !== 'false'
    const openAiKeyConfigured = !!process.env.OPENAI_API_KEY

    if (n8nBotService.isEnabled()) {
      console.log(`🔄 Tentando processar com N8N...`)
      if (selectedUnit) {
        console.log(`📍 Unidade selecionada detectada no contexto:`, selectedUnit.name)
      }
      if (appointmentFlow) {
        console.log(`📋 AppointmentFlow detectado no contexto:`, appointmentFlow.step)
      }
      try {
        const n8nResult = await n8nBotService.processMessage({
          message: text,
          phone: phone,
          conversationId: conversation.id,
          patient: (conversation as any).patient ? {
            id: (conversation as any).patient.id,
            name: (conversation as any).patient.name,
            phone: (conversation as any).patient.phone
          } : undefined,
          context: n8nContext  // ✅ Context com selectedUnit e appointmentFlow
        })

        if (n8nResult.success && n8nResult.source === 'n8n') {
          console.log(`✅ N8N processou com sucesso: ${n8nResult.intent || 'sem intent'}`)

          // N8N já enviou a resposta via webhook-n8n.ts
          workflowLogs.push(`✅ Processado pelo N8N: ${n8nResult.intent || 'sem intent'}`)
          return workflowLogs
        } else {
          // If N8N is the primary system and fallback is disabled (or OpenAI key is absent),
          // do not fall through to the legacy intelligent router — it would crash anyway.
          if (!n8nFallbackEnabled || !openAiKeyConfigured) {
            console.log(`⚠️ N8N falhou e fallback desabilitado (N8N_FALLBACK_ENABLED=false ou OPENAI_API_KEY ausente). Encerrando sem fallback.`)
            workflowLogs.push(`⚠️ N8N falhou — fallback desabilitado`)
            return workflowLogs
          }
          console.log(`⚠️ N8N retornou fallback, usando sistema antigo`)
          // Continua para o sistema antigo abaixo
        }
      } catch (n8nError) {
        console.error(`❌ Erro ao processar com N8N:`, n8nError)
        if (!n8nFallbackEnabled || !openAiKeyConfigured) {
          console.log(`⚠️ N8N falhou e fallback desabilitado. Encerrando sem fallback.`)
          workflowLogs.push(`⚠️ N8N erro — fallback desabilitado`)
          return workflowLogs
        }
        console.log(`🔄 Usando fallback (sistema antigo)`)
        // Continua para o sistema antigo abaixo
      }
    } else {
      if (!openAiKeyConfigured) {
        console.log(`⚠️ N8N não configurado e OPENAI_API_KEY ausente — nenhum bot disponível para processar a mensagem.`)
        workflowLogs.push(`⚠️ Nenhum processador de bot configurado`)
        return workflowLogs
      }
      console.log(`⚠️ N8N não configurado, usando sistema antigo`)
    }

    // ✅ FALLBACK: Usar Roteador Inteligente (sistema antigo — requer OPENAI_API_KEY)
    console.log(`🤖 Processando mensagem com Roteador Inteligente (fallback)...`)

    try {
      // Rotear mensagem usando IA conversacional
      const decision = await intelligentRouter.route(text, conversation.id, phone)

      console.log(`📊 Decisão do roteador: ${decision.type}`)
      console.log(`🔍 DEBUG: decision completa =`, JSON.stringify(decision, null, 2))

      switch (decision.type) {
        case 'TRANSFER_TO_HUMAN':
          // ✅ Verificar se conversa ainda está em BOT_QUEUE antes de transferir
          // Se já foi assumida, não transferir
          const convBeforeTransfer = await prisma.conversation.findUnique({
            where: { id: conversation.id },
            select: { status: true, assignedToId: true }
          })

          if (convBeforeTransfer?.status === 'EM_ATENDIMENTO' && convBeforeTransfer.assignedToId) {
            console.log(`⚠️ Conversa ${conversation.id} já está EM_ATENDIMENTO. Não transferindo para PRINCIPAL.`)
            // Apenas enviar a resposta do bot sem mudar status
            try {
              await whatsappService.sendTextMessage(phone, decision.response)
            } catch (sendError) {
              console.warn('⚠️ Erro ao enviar via WhatsApp (modo dev/teste):', sendError instanceof Error ? sendError.message : sendError)
            }

            // Salvar mensagem no banco
            await prisma.message.create({
              data: {
                conversationId: conversation.id,
                phoneNumber: phone,
                messageText: decision.response,
                direction: 'SENT',
                from: 'BOT',
                timestamp: new Date()
              }
            })

            console.log(`✅ Resposta do bot enviada sem alterar status (conversa já com atendente)`)
            break // Sair do switch sem transferir
          }

          // Transferir para fila de humanos
          console.log(`👤 Transferindo para fila: ${decision.queue}`)
          console.log(`📋 [DEBUG TRANSFER] decision.initialData recebido:`, JSON.stringify(decision.initialData, null, 2))
          console.log(`📋 [DEBUG TRANSFER] decision.initialData keys:`, decision.initialData ? Object.keys(decision.initialData) : 'undefined')

          // ✅ CADASTRO COMPLETO: Criar/atualizar paciente com dados coletados
          if (decision.initialData && Object.keys(decision.initialData).length > 0) {
            console.log(`📝 Salvando cadastro do paciente:`, decision.initialData)

            try {
              // Extrair dados do cadastro das entities
              const entities = decision.initialData as any

              // Parse de data de nascimento (dd/mm/aaaa para Date)
              let birthDate: Date | undefined
              if (entities.nascimento) {
                try {
                  const [dia, mes, ano] = entities.nascimento.split('/')
                  if (dia && mes && ano) {
                    birthDate = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia))
                  }
                } catch (e) {
                  console.warn('⚠️ Erro ao parsear data de nascimento:', entities.nascimento)
                }
              }

              // Preparar dados do cadastro
              const cadastroData: any = {}

              if (entities.nome) cadastroData.name = entities.nome
              if (entities.cpf) cadastroData.cpf = entities.cpf.replace(/\D/g, '') // Remove formatação
              if (entities.email) cadastroData.email = entities.email
              if (birthDate) cadastroData.birthDate = birthDate
              if (entities.convenio) cadastroData.insuranceCompany = entities.convenio
              if (entities.numero_convenio) cadastroData.insuranceNumber = entities.numero_convenio

              // Verificar se paciente já existe
              let patient = await prisma.patient.findUnique({
                where: { phone }
              })

              if (!patient) {
                // Criar novo paciente com dados completos
                patient = await prisma.patient.create({
                  data: {
                    phone,
                    name: cadastroData.name || 'Aguardando cadastro',
                    ...cadastroData
                  }
                })
                console.log(`✅ Paciente criado: ${patient.id} - ${patient.name}`)
              } else {
                // Atualizar paciente existente (não sobrescrever dados já preenchidos)
                const updateData: any = {}
                if (cadastroData.name && (!patient.name || patient.name === 'Aguardando cadastro')) {
                  updateData.name = cadastroData.name
                }
                if (cadastroData.cpf && !patient.cpf) updateData.cpf = cadastroData.cpf
                if (cadastroData.email && !patient.email) updateData.email = cadastroData.email
                if (cadastroData.birthDate && !patient.birthDate) updateData.birthDate = cadastroData.birthDate
                if (cadastroData.insuranceCompany && !patient.insuranceCompany) {
                  updateData.insuranceCompany = cadastroData.insuranceCompany
                }
                if (cadastroData.insuranceNumber && !patient.insuranceNumber) {
                  updateData.insuranceNumber = cadastroData.insuranceNumber
                }

                if (Object.keys(updateData).length > 0) {
                  patient = await prisma.patient.update({
                    where: { id: patient.id },
                    data: updateData
                  })
                  console.log(`✅ Paciente atualizado: ${patient.id} - ${patient.name}`)
                }
              }

              // Vincular conversa ao paciente
              await prisma.conversation.update({
                where: { id: conversation.id },
                data: { patientId: patient.id }
              })

              console.log(`🔗 Conversa vinculada ao paciente ${patient.id}`)
            } catch (patientError) {
              console.error('⚠️ Erro ao criar/atualizar paciente:', patientError)
              // Continua mesmo se falhar
            }
          }

          await prisma.conversation.update({
            where: { id: conversation.id },
            data: {
              status: 'PRINCIPAL', // ✅ Sempre usar 'PRINCIPAL' (padronizar, 'AGUARDANDO' é equivalente)
              assignedToId: null,
              workflowContext: {
                ...conversation.workflowContext as any,
                transferReason: decision.reason,
                collectedData: decision.initialData // Salvar dados coletados
              }
            }
          })

          // Enviar mensagem de resposta (com tratamento de erro para desenvolvimento)
          try {
            await whatsappService.sendTextMessage(phone, decision.response)
          } catch (sendError) {
            console.warn('⚠️ Erro ao enviar via WhatsApp (modo dev/teste):', sendError instanceof Error ? sendError.message : sendError)
            // Em desenvolvimento, continuar mesmo se falhar o envio
          }

          // Salvar mensagem no banco
          const botMessage = await prisma.message.create({
            data: {
              conversationId: conversation.id,
              phoneNumber: phone,
              messageText: decision.response,
              direction: 'SENT',
              from: 'BOT',
              timestamp: new Date()
            }
          })

          // ✅ CRIAR CARD COM DADOS DO PACIENTE
          console.log(`🔍 DEBUG: decision.initialData =`, decision.initialData);
          console.log(`🔍 DEBUG: initialData keys =`, decision.initialData ? Object.keys(decision.initialData) : 'undefined');

          if (decision.initialData && Object.keys(decision.initialData).length > 0) {
            console.log(`📋 Criando card de dados do paciente...`)

            try {
              const { createSystemMessage } = await import('../utils/systemMessages.js')

              // Buscar paciente para pegar dados completos
              const patient = await prisma.patient.findUnique({
                where: { phone }
              })

              if (patient) {
                // Formatar CPF
                const formatCPF = (cpf: string | null) => {
                  if (!cpf) return null
                  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
                }

                // Formatar data
                const formatDate = (date: Date | null) => {
                  if (!date) return null
                  return new Date(date).toLocaleDateString('pt-BR')
                }

                // ✅ INCLUIR PROCEDIMENTO DESEJADO NO CARD
                const allEntities = {
                  ...(decision.aiContext?.entities || {}),
                  ...(decision.initialData || {})
                }

                const cardData = {
                  patientData: {
                    name: patient.name,
                    phone: patient.phone,
                    cpf: formatCPF(patient.cpf),
                    email: patient.email,
                    birthDate: formatDate(patient.birthDate),
                    insuranceCompany: patient.insuranceCompany,
                    insuranceNumber: patient.insuranceNumber
                  },
                  // ✅ ADICIONAR PROCEDIMENTO DESEJADO
                  requestedService: {
                    procedure: allEntities.procedimento || allEntities.procedure || 'Não especificado',
                    clinic: allEntities.clinica || allEntities.clinic || 'Não especificada',
                    preferredDate: allEntities.data || allEntities.date || null,
                    preferredTime: allEntities.horario || allEntities.time || null
                  }
                };

                console.log(`🔍 DEBUG: Criando card com dados:`, JSON.stringify(cardData, null, 2));

                await createSystemMessage(conversation.id, 'PATIENT_DATA_CARD', cardData)

                console.log(`✅ Card de dados do paciente criado: ${patient.name} - Procedimento: ${cardData.requestedService.procedure}`)
              }
            } catch (cardError) {
              console.error('⚠️ Erro ao criar card de dados:', cardError)
            }
          }

          // ✅ CRIAR MENSAGEM INTERNA COM CONTEXTO DA INTENÇÃO (RESUMO COMPLETO)
          try {
            const { createSystemMessage } = await import('../utils/systemMessages.js')

            // Buscar resumo da conversa (últimas 10 mensagens para contexto completo)
            const recentMessages = await prisma.message.findMany({
              where: {
                conversationId: conversation.id,
                messageType: { not: 'SYSTEM' } // ✅ Excluir mensagens do sistema do resumo
              },
              orderBy: { createdAt: 'desc' },
              take: 10
            })

            // Criar resumo da conversa
            const conversationSummary = recentMessages
              .reverse() // Ordem cronológica
              .filter(msg => msg.messageText && msg.messageText.length > 0) // ✅ Filtrar mensagens vazias
              .map(msg => {
                const role = msg.direction === 'RECEIVED' ? '👤 Paciente' : '🤖 Bot'
                const text = msg.messageText || ''
                const content = text.length > 0
                  ? (text.substring(0, 80) + (text.length > 80 ? '...' : ''))
                  : '[Mensagem vazia]'
                return `${role}: ${content}`
              })
              .join('\n')

            // ✅ Combinar entities do decision.initialData com decision.aiContext.entities
            const allEntities = {
              ...(decision.aiContext?.entities || {}),
              ...(decision.initialData || {})
            }

            // Criar contexto da intenção usando dados do decision (que já contém aiContext)
            const intentContext = {
              intent: decision.aiContext?.intent || 'CONVERSA_LIVRE',
              sentiment: decision.aiContext?.sentiment || 'neutral',
              confidence: decision.aiContext?.confidence || 0.5,
              entities: allEntities,
              conversationSummary: conversationSummary || 'Sem histórico disponível',
              collectedData: decision.initialData || {},
              transferReason: decision.reason || 'Cadastro completo'
            }

            console.log(`📋 Criando mensagem interna com contexto da intenção...`)
            console.log(`📋 Intenção: ${intentContext.intent}`)
            console.log(`📋 Entities combinadas:`, JSON.stringify(allEntities, null, 2))

            await createSystemMessage(conversation.id, 'BOT_INTENT_CONTEXT', {
              intentContext
            })

            console.log(`✅ Mensagem interna de contexto criada com ${Object.keys(allEntities).length} campos`)
          } catch (contextError) {
            console.error('⚠️ Erro ao criar mensagem de contexto:', contextError)
            // Não bloquear o fluxo se falhar
          }

          // Invalidar cache
          messageCacheService.invalidate(conversation.id)

          // 🧠 EXTRAÇÃO AUTOMÁTICA DE MEMÓRIAS (Real-Time)
          // A cada 5 mensagens, extrair fatos importantes
          const messageCount = await prisma.message.count({
            where: { conversationId: conversation.id }
          })

          if (messageCount % 5 === 0) {
            console.log(`🧠 Gatilho de memórias atingido (${messageCount} mensagens)`)

              // Executar de forma assíncrona (não bloquear resposta)
              ; (async () => {
                try {
                  const { memoryService } = await import('../services/memoryService.js')

                  // Buscar últimas 10 mensagens
                  const recentMessages = await prisma.message.findMany({
                    where: { conversationId: conversation.id },
                    orderBy: { createdAt: 'desc' },
                    take: 10
                  })

                  const formattedMessages = recentMessages.reverse().map(m =>
                    `${m.from}: ${m.messageText}`
                  )

                  await memoryService.extractMemories(
                    conversation.id,
                    phone,
                    formattedMessages
                  )

                  console.log(`✅ Memórias extraídas para ${phone}`)
                } catch (memError) {
                  console.error('⚠️ Erro ao extrair memórias (não afeta conversa):', memError)
                }
              })()
          }

          // Emitir eventos de atualização em tempo real
          try {
            const realtime = getRealtime()

            // Evento de transferência
            realtime.io.emit('conversation_transferred', {
              conversationId: conversation.id,
              queue: decision.queue,
              reason: decision.reason
            })

            // ✅ NOVO: Evento de nova mensagem
            realtime.io.emit('message:new', {
              conversationId: conversation.id,
              message: {
                id: botMessage.id,
                text: decision.response,
                from: 'BOT',
                direction: 'SENT',
                timestamp: botMessage.timestamp
              }
            })

            // ✅ NOVO: Evento de conversa atualizada
            realtime.io.emit('conversation:updated', {
              conversationId: conversation.id,
              status: 'PRINCIPAL' // ✅ Sempre usar 'PRINCIPAL' (padronizar, 'AGUARDANDO' é equivalente)
            })

            // Evento legado (manter compatibilidade)
            realtime.io.to(`conv:${phone}`).emit('bot_message_sent', {
              conversationId: conversation.id,
              message: decision.response,
              type: 'TRANSFER_TO_HUMAN'
            })
          } catch (e) {
            console.warn('Realtime transfer event failed:', e)
          }

          workflowLogs.push(`Transferido para ${decision.queue}: ${decision.reason}`)
          break

        // ⚠️ REMOVIDO: case 'START_WORKFLOW' - Workflows foram desabilitados para usar apenas IA
        // TODO: Se workflows forem reativados no futuro, restaurar este código

        case 'AI_CONVERSATION':
        default:
          // Resposta direta da IA
          console.log(`💬 Resposta da IA conversacional`)

          // Atualizar contexto se necessário
          if (decision.awaitingInput && decision.expectedData) {
            await prisma.conversation.update({
              where: { id: conversation.id },
              data: {
                awaitingInput: true,
                workflowContext: decision.expectedData
              }
            })
          }

          // Enviar mensagem de resposta (com tratamento de erro)
          try {
            await whatsappService.sendTextMessage(phone, decision.response)
          } catch (sendError) {
            console.warn('⚠️ Erro ao enviar via WhatsApp (modo dev/teste):', sendError instanceof Error ? sendError.message : sendError)
          }

          // Salvar mensagem no banco
          const aiMessage = await prisma.message.create({
            data: {
              conversationId: conversation.id,
              phoneNumber: phone,
              messageText: decision.response,
              direction: 'SENT',
              from: 'BOT',
              timestamp: new Date()
            }
          })

          // Invalidar cache
          messageCacheService.invalidate(conversation.id)

          // ✅ Emitir eventos de atualização em tempo real
          try {
            const realtime = getRealtime()

            // Evento de nova mensagem
            realtime.io.emit('message:new', {
              conversationId: conversation.id,
              message: {
                id: aiMessage.id,
                text: decision.response,
                from: 'BOT',
                direction: 'SENT',
                timestamp: aiMessage.timestamp
              }
            })

            // Evento de conversa atualizada
            realtime.io.emit('conversation:updated', {
              conversationId: conversation.id,
              status: conversation.status
            })
          } catch (e) {
            console.warn('Realtime AI message event failed:', e)
          }

          workflowLogs.push('Resposta da IA conversacional enviada')
          break
      }

      // Emitir evento de nova mensagem do bot
      try {
        const realtime = getRealtime()
        realtime.io.to(`conv:${phone}`).emit('bot_message_sent', {
          conversationId: conversation.id,
          message: decision.response,
          type: decision.type
        })
      } catch (e) {
        console.warn('Realtime bot message event failed:', e)
      }

    } catch (error) {
      console.error('❌ Erro ao processar com roteador inteligente:', error)

      // Fallback: usar lógica antiga
      console.warn('⚠️ Usando fallback para lógica antiga')
      const handled = await handleAppointmentFlow(conversation, patient, text)
      if (!handled) {
        if (process.env.AI_ENABLE_CLASSIFIER === 'true') {
          await processWithAI(conversation, message, patient)
        } else {
          await sendAutoResponse(conversation, patient)
        }
      }
    }

    // Nota: Os eventos Socket.IO já foram emitidos acima (imediatamente após criar a mensagem)
    // Este código não é mais necessário, mas mantido como fallback de segurança

  } catch (error) {
    console.error('Erro ao processar mensagem recebida:', error)
  }

  return workflowLogs
}

async function handleAppointmentFlow(conversation: any, patient: any, text: string): Promise<boolean> {
  const lower = text.toLowerCase()
  let draft = appointmentDrafts.get(conversation.id)
  if (!draft) {
    draft = { procedures: [], insurance: null, state: 'idle', slots: [], patient: {} }
    appointmentDrafts.set(conversation.id, draft)
  }

  if ((lower.includes('agendar') || lower.includes('marcar')) && draft.state !== 'awaiting_schedule_details' && draft.state !== 'awaiting_name') {
    if (!patient?.name) {
      draft.state = 'awaiting_name'
      await sendAIMessage(conversation, '✍️ Para agendar, informe seu nome completo:')
      return true
    }
    draft.patient.name = patient.name
    draft.state = 'awaiting_schedule_details'
    await sendAIMessage(conversation, '📅 Informe dia (AAAA-MM-DD) e turno (manhã/tarde/noite) para cada procedimento.')
    return true
  }

  if (lower.includes('convênio') || lower.includes('convênios') || lower.includes('planos')) {
    try {
      const list = await prisma.insuranceCompany.findMany()
      let result = `📋 Convênios aceitos:\n\n`
      list.forEach((insurance: any) => {
        const name = insurance.displayName || insurance.name || insurance.code
        result += `✅ ${name}\n`
      })
      await sendAIMessage(conversation, result)
      return true
    } catch {
      const list = await prismaClinicDataService.getInsuranceCompanies()
      let result = `📋 Convênios aceitos:\n\n`
      list.forEach((insurance: any) => {
        const name = insurance.displayName || insurance.name || insurance.id
        result += `✅ ${name}\n`
      })
      await sendAIMessage(conversation, result)
      return true
    }
  }

  if (lower.includes('bradesco')) {
    draft.insurance = 'bradesco'
    const ic = await prisma.insuranceCompany.findUnique({ where: { code: 'bradesco' } })
    let names: string[] = []
    if (ic) {
      const links = await prisma.clinicInsuranceProcedure.findMany({ where: { insuranceCode: ic.code } })
      const procs = await prisma.procedure.findMany({ where: { code: { in: links.map(l => l.procedureCode) } } })
      names = procs.map(p => p.name)
    }
    const msg = `🛡️ Bradesco atendido. Procedimentos cobertos: ${names.join(', ')}.`
    await sendAIMessage(conversation, msg)
    return true
  }

  if (lower.includes('acupuntura')) {
    try {
      const proc = await prisma.procedure.findUnique({ where: { code: 'acupuntura' } })
      if (!proc) { await sendAIMessage(conversation, 'Procedimento não cadastrado.'); return true }
      if (!draft.procedures.find((x: any) => x.id === proc.code)) draft.procedures.push({ id: proc.code, name: proc.name })
      const clinics = await prisma.clinic.findMany({ where: { code: { in: ['vieiralves', 'sao-jose'] } } })
      const parts: string[] = []
      for (const c of clinics) {
        const cp = await prismaAny.clinicProcedure.findFirst({ where: { clinicId: c.id, procedureCode: proc.code } })
        const price = cp ? Number(cp.particularPrice || 0) : Number(proc.basePrice || 0)
        parts.push(`• ${c.displayName || c.name}: R$ ${price.toFixed(2)}`)
      }
      let msg = `ℹ️ ${proc.description || proc.name}\n\n`
      msg += `💰 Valores Particular por unidade:\n${parts.join('\n')}\n`
      msg += `\nInforme seu convênio e unidade para confirmar o valor.`
      await sendAIMessage(conversation, msg)
      return true
    } catch {
      const procs = await prismaClinicDataService.getProcedures()
      const proc = procs.find(p => p.id === 'acupuntura') as any
      if (!proc) { await sendAIMessage(conversation, 'Procedimento não cadastrado.'); return true }
      const clinics = await prismaClinicDataService.getLocations()
      const parts: string[] = []
      for (const c of clinics.filter((x: any) => ['vieiralves', 'sao-jose'].includes(x.id))) {
        const price = (proc.priceByLocation && proc.priceByLocation[c.id]) ? Number(proc.priceByLocation[c.id]) : Number(proc.basePrice || 0)
        parts.push(`• ${c.name}: R$ ${price.toFixed(2)}`)
      }
      let msg = `ℹ️ ${proc.description || proc.name}\n\n`
      msg += `💰 Valores Particular por unidade:\n${parts.join('\n')}\n`
      msg += `\nInforme seu convênio e unidade para confirmar o valor.`
      await sendAIMessage(conversation, msg)
      return true
    }
  }

  if (lower.includes('fisioterapia')) {
    try {
      const proc = await prisma.procedure.findUnique({ where: { code: 'fisioterapia-ortopedica' } })
      if (!proc) { await sendAIMessage(conversation, 'Procedimento não cadastrado.'); return true }
      if (!draft.procedures.find((x: any) => x.id === proc.code)) draft.procedures.push({ id: proc.code, name: proc.name })
      const clinics = await prisma.clinic.findMany({ where: { code: { in: ['vieiralves', 'sao-jose'] } } })
      const parts: string[] = []
      for (const c of clinics) {
        const cp = await prismaAny.clinicProcedure.findFirst({ where: { clinicId: c.id, procedureCode: proc.code } })
        const price = cp ? Number(cp.particularPrice || 0) : Number(proc.basePrice || 0)
        parts.push(`• ${c.displayName || c.name}: R$ ${price.toFixed(2)}`)
      }
      let msg = `ℹ️ ${proc.description || proc.name}\n\n`
      msg += `💰 Valores Particular por unidade:\n${parts.join('\n')}\n`
      msg += `\nInforme seu convênio e unidade para confirmar o valor.`
      await sendAIMessage(conversation, msg)
      return true
    } catch {
      const procs = await prismaClinicDataService.getProcedures()
      const proc = procs.find(p => p.id === 'fisioterapia-ortopedica') as any
      if (!proc) { await sendAIMessage(conversation, 'Procedimento não cadastrado.'); return true }
      const clinics = await prismaClinicDataService.getLocations()
      const parts: string[] = []
      for (const c of clinics.filter((x: any) => ['vieiralves', 'sao-jose'].includes(x.id))) {
        const price = (proc.priceByLocation && proc.priceByLocation[c.id]) ? Number(proc.priceByLocation[c.id]) : Number(proc.basePrice || 0)
        parts.push(`• ${c.name}: R$ ${price.toFixed(2)}`)
      }
      let msg = `ℹ️ ${proc.description || proc.name}\n\n`
      msg += `💰 Valores Particular por unidade:\n${parts.join('\n')}\n`
      msg += `\nInforme seu convênio e unidade para confirmar o valor.`
      await sendAIMessage(conversation, msg)
      return true
    }
  }

  if (lower.includes('agendar') || lower.includes('marcar')) {
    if (!patient?.name) {
      draft.state = 'awaiting_name'
      await sendAIMessage(conversation, 'Para agendar, informe seu nome completo.')
      return true
    }
    draft.patient.name = patient.name
    draft.state = 'awaiting_schedule_details'
    await sendAIMessage(conversation, 'Informe dia (AAAA-MM-DD) e turno (manhã/tarde/noite) para cada procedimento.')
    return true
  }

  if (draft.state === 'awaiting_name') {
    draft.patient.name = text.trim()
    await prisma.patient.update({ where: { id: patient.id }, data: { name: draft.patient.name } })
    draft.state = 'awaiting_schedule_details'
    await sendAIMessage(conversation, 'Obrigado. Informe dia (AAAA-MM-DD) e turno (manhã/tarde/noite).')
    return true
  }

  if (draft.state === 'awaiting_schedule_details') {
    const m = text.trim()
    const dateMatch = m.match(/\d{4}-\d{2}-\d{2}/)
    const turnoMatch = /(manhã|tarde|noite)/.exec(m)
    if (dateMatch && turnoMatch) {
      draft.slots.push({ date: dateMatch[0], turno: turnoMatch[1] })
      const procs = draft.procedures.map((p: any) => p.name).join(', ')
      const card = `Resumo do agendamento:\nPaciente: ${draft.patient.name}\nProcedimentos: ${procs || 'não informado'}\nData: ${dateMatch[0]}\nTurno: ${turnoMatch[1]}${draft.insurance ? `\nConvênio: ${draft.insurance}` : ''}`
      await prisma.message.create({ data: { conversationId: conversation.id, phoneNumber: conversation.phone, messageText: card, direction: 'SENT', from: 'BOT', timestamp: new Date() } })
      await prisma.patientInteraction.create({ data: { patientId: patient.id, type: 'APPOINTMENT_CARD', description: 'Card de agendamento gerado', data: { procedures: draft.procedures.map((p: any) => p.id), date: dateMatch[0], turno: turnoMatch[1], insurance: draft.insurance } } })
      await transferToHuman(conversation, 'Agendamento: card enviado')
      appointmentDrafts.delete(conversation.id)
      return true
    } else {
      await sendAIMessage(conversation, 'Formato inválido. Informe dia como AAAA-MM-DD e turno como manhã/tarde/noite.')
      return true
    }
  }

  return false
}

async function processWithAI(conversation: any, message: any, patient: any): Promise<void> {
  try {
    // Build AI context
    const recentMessages = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { timestamp: 'desc' },
      take: 10
    })

    const context: AIContext = {
      patient: {
        id: patient.id,
        name: patient.name,
        phone: patient.phone,
        insuranceCompany: patient.insuranceCompany,
        preferences: patient.preferences
      },
      history: recentMessages.reverse().map(msg => ({
        role: (msg.direction === 'RECEIVED' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: msg.messageText,
        timestamp: msg.timestamp.toISOString()
      })),
      clinicData: await getClinicContextData()
    }

    // Generate AI response
    const aiResponse = await aiService.generateResponse(message.messageText, context)

    // Log AI interaction
    await prisma.aILearningData.create({
      data: {
        phone: conversation.phone,
        intent: aiResponse.intent,
        sentiment: aiResponse.sentiment,
        style: aiResponse.responseStyle,
        context: {
          message: message.messageText,
          response: aiResponse.response,
          confidence: aiResponse.confidence
        }
      }
    })

    // Send AI response
    if (aiResponse.confidence > 0.5) {
      await sendAIMessage(conversation, aiResponse.response)
    } else {
      // Transfer to human if confidence is low
      await transferToHuman(conversation, 'Confiança IA baixa')
    }

  } catch (error) {
    console.error('Erro ao processar com IA:', error)
    // Fallback to auto-response
    await sendAutoResponse(conversation, patient)
  }
}

async function getClinicContextData(): Promise<any> {
  const name = process.env.CLINIC_NAME || 'Clínica'
  const address = process.env.CLINIC_ADDRESS || 'Endereço'
  const phone = process.env.CLINIC_PHONE || '(00) 0000-0000'
  const ins = await prisma.insuranceCompany.findMany()
  const procs = await prisma.procedure.findMany()
  const procedures = procs.map(p => ({ name: p.name, price: Number(p.basePrice || 0), insurance: [] as string[] }))
  const insurancePlans = ins.reduce((acc, i) => { acc[i.code] = []; return acc }, {} as Record<string, string[]>)
  return { name, address, phone, procedures, insurancePlans }
}

async function sendAIMessage(conversation: any, text: string): Promise<void> {
  try {
    // Create AI message in database first
    const aiMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        phoneNumber: conversation.phone,
        messageText: text,
        direction: 'SENT',
        from: 'BOT',
        timestamp: new Date()
      }
    })

    // Update conversation
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessage: text,
        lastTimestamp: new Date()
      }
    })

    // Emit update (even if sending fails) - use same format as other messages
    try {
      const realtime = getRealtime()
      const messagePayload = {
        message: {
          id: aiMessage.id,
          conversationId: aiMessage.conversationId,
          phoneNumber: aiMessage.phoneNumber,
          messageText: aiMessage.messageText,
          messageType: aiMessage.messageType || 'TEXT',
          mediaUrl: aiMessage.mediaUrl,
          metadata: aiMessage.metadata,
          direction: aiMessage.direction, // 'SENT' for bot messages
          from: aiMessage.from, // 'BOT'
          timestamp: aiMessage.timestamp.toISOString()
        },
        conversation: {
          id: conversation.id,
          phone: conversation.phone,
          status: conversation.status,
          lastMessage: text,
          lastTimestamp: new Date().toISOString()
        },
        phone: conversation.phone
      }
      realtime.io.to(`conv:${conversation.phone}`).emit('new_message', messagePayload)
      realtime.io.to(`conv:${conversation.id}`).emit('new_message', messagePayload)
      console.log(`📡 [${new Date().toISOString()}] ✅ Evento new_message emitido para mensagem do bot (conv:${conversation.phone})`)
    } catch (e) {
      console.warn('Realtime update failed:', e)
    }

    // Detect platform by checking the last received message
    let platform: 'whatsapp' | 'instagram' = 'whatsapp'
    try {
      const lastReceivedMessage = await prisma.message.findFirst({
        where: {
          conversationId: conversation.id,
          direction: 'RECEIVED',
          from: 'USER'
        },
        orderBy: { timestamp: 'desc' }
      })

      if (lastReceivedMessage?.metadata) {
        const metadata = lastReceivedMessage.metadata as any
        if (metadata.instagramMessageId || metadata.platform === 'instagram') {
          platform = 'instagram'
        }
      }
    } catch (e) {
      console.warn('Erro ao detectar plataforma, usando WhatsApp como padrão:', e)
    }

    // Try to send via the correct platform (don't fail if it doesn't work)
    try {
      if (platform === 'instagram') {
        await instagramService.sendTextMessage(conversation.phone, text)
        console.log(`✅ Mensagem Instagram enviada para ${conversation.phone}`)
      } else {
        await whatsappService.sendTextMessage(conversation.phone, text)
        console.log(`✅ Mensagem WhatsApp enviada para ${conversation.phone}`)
      }
    } catch (sendError: any) {
      console.error(`Erro ao enviar mensagem ${platform === 'instagram' ? 'Instagram' : 'WhatsApp'}:`, sendError)
      // Don't throw - message was already saved to database
    }

  } catch (error) {
    console.error('Erro ao enviar mensagem IA:', error)
    throw error // Re-throw database errors
  }
}

async function sendAutoResponse(conversation: any, patient: any): Promise<void> {
  const responses = [
    '✅ Recebemos sua mensagem. Em breve um atendente vai te responder.',
    '📲 Estamos preparando uma resposta personalizada. Aguarde alguns instantes.',
    '⏳ Estamos processando sua solicitação. Em caso de urgência, ligue para a clínica.'
  ]
  const response = responses[Math.floor(Math.random() * responses.length)]
  await sendAIMessage(conversation, response)
}

async function transferToHuman(conversation: any, reason: string): Promise<void> {
  try {
    console.log(`🔄 transferToHuman called - conversationId: ${conversation.id}, reason: ${reason}, current status: ${conversation.status}`);

    const updated = await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        status: 'PRINCIPAL',
        assignedToId: null
      }
    })

    console.log(`🔄 ✅ Conversation ${conversation.id} updated to PRINCIPAL status. New status: ${updated.status}`);

    // Log transfer
    if (conversation.patientId) {
      await prisma.patientInteraction.create({
        data: {
          patientId: conversation.patientId,
          type: 'TRANSFER_TO_HUMAN',
          description: `Transferido para atendente humano: ${reason}`,
          data: { reason, previousStatus: conversation.status }
        }
      })
      console.log(`🔄 ✅ Patient interaction logged`);
    }

    // Emit transfer notification
    const realtime = getRealtime()
    realtime.io.emit('transfer_to_human', {
      conversationId: conversation.id,
      phone: conversation.phone,
      reason
    })

    console.log(`🔄 ✅ Transfer notification emitted`);

  } catch (error) {
    console.error('❌ Erro ao transferir para humano:', error)
    throw error;
  }
}

// Update conversation status
router.patch('/:id/status', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { status } = req.body

    if (!status || !['BOT_QUEUE', 'PRINCIPAL', 'EM_ATENDIMENTO', 'HUMAN', 'FECHADA', 'CLOSED'].includes(status)) {
      res.status(400).json({ error: 'Status inválido' })
      return
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id }
    })

    if (!conversation) {
      res.status(404).json({ error: 'Conversa não encontrada' })
      return
    }

    const updatedConversation = await prisma.conversation.update({
      where: { id },
      data: {
        status,
        assignedToId: (status === 'EM_ATENDIMENTO' || status === 'HUMAN') ? req.user.id : null
      },
      include: {
        patient: {
          select: { id: true, name: true, cpf: true, insuranceCompany: true }
        }
      }
    })

    // Log status change
    if (conversation.patientId) {
      await prisma.patientInteraction.create({
        data: {
          patientId: conversation.patientId,
          type: 'STATUS_CHANGED',
          description: `Status da conversa alterado de ${conversation.status} para ${status}`,
          data: {
            previousStatus: conversation.status,
            newStatus: status,
            changedBy: req.user.id,
            changedByName: req.user.name
          }
        }
      })
    }

    // Emit real-time update
    const realtime = getRealtime()
    realtime.io.emit('conversation_status_changed', {
      conversationId: id,
      status,
      assignedTo: status === 'HUMAN' ? req.user : null
    })

    res.json(updatedConversation)
  } catch (error) {
    console.error('Erro ao atualizar status da conversa:', error)
    res.status(500).json({ error: 'Erro interno' })
  }
})

// File upload endpoint
router.post('/:id/files', authMiddleware, upload.array('files', 5), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const files = req.files as Express.Multer.File[]

    if (!files || files.length === 0) {
      res.status(400).json({ error: 'Nenhum arquivo enviado' })
      return
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: { patient: true }
    })

    if (!conversation) {
      res.status(404).json({ error: 'Conversa não encontrada' })
      return
    }

    // Create file records and send via WhatsApp
    const savedFiles = []
    const messages = []

    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'uploads')
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true })
    }

    for (const file of files) {
      const uniqueName = FileValidationService.generateUniqueFilename(file.originalname)
      const filePath = path.join(uploadsDir, uniqueName)
      fs.writeFileSync(filePath, file.buffer)

      const category = file.mimetype.startsWith('image/') ? 'IMAGE' :
        file.mimetype === 'application/pdf' || file.mimetype.includes('document') || file.mimetype === 'application/msword' ? 'DOCUMENT' :
          file.mimetype.startsWith('audio/') ? 'AUDIO' : 'OTHER'

      savedFiles.push({
        conversationId: id,
        originalName: file.originalname,
        fileName: uniqueName,
        mimeType: file.mimetype,
        size: file.size,
        uploadedBy: req.user.id,
        uploadedAt: new Date(),
        category
      })

      // Prepare upload path and mimetype (transcode audio webm/unsupported to mp3)
      let uploadPath = filePath
      let uploadMime = file.mimetype
      let messageMediaFileName = uniqueName
      if (category === 'AUDIO') {
        // Prefer AAC (m4a) for broad playback support; if it fails, fallback to OGG voice then MP3
        try {
          const { outputPath } = await transcodeToAacM4a(filePath)
          uploadPath = outputPath
          uploadMime = 'audio/mp4'
          messageMediaFileName = path.basename(outputPath)
          console.log(`🎧 Audio transcoded to m4a (aac): ${messageMediaFileName}`)
        } catch (errAac) {
          console.warn('⚠️ Failed to transcode to AAC, attempting OGG voice', errAac)
          try {
            const { outputPath } = await transcodeToOggOpus(filePath)
            uploadPath = outputPath
            uploadMime = 'audio/ogg'
            messageMediaFileName = path.basename(outputPath)
            console.log(`🎧 Audio transcoded to ogg: ${messageMediaFileName}`)
          } catch (errOgg) {
            console.warn('⚠️ Failed to transcode to OGG, attempting MP3', errOgg)
            try {
              const { outputPath } = await transcodeToMp3(filePath)
              uploadPath = outputPath
              uploadMime = 'audio/mpeg'
              messageMediaFileName = path.basename(outputPath)
              console.log(`🎧 Audio transcoded to mp3: ${messageMediaFileName}`)
            } catch (errMp3) {
              console.warn('⚠️ Failed to transcode audio, attempting raw upload as audio', errMp3)
            }
          }
        }
      }

      // Send via WhatsApp (upload to Meta and send using media ID)
      let whatsappSent = false
      let uploadedMediaId: string | null = null
      try {
        let whatsappType: 'image' | 'document' | 'audio' = 'document'
        if (category === 'IMAGE') whatsappType = 'image'
        else if (category === 'AUDIO') whatsappType = 'audio'

        uploadedMediaId = await whatsappService.uploadMedia(uploadPath, uploadMime)
        await whatsappService.sendMediaMessage(
          conversation.phone,
          whatsappType,
          uploadedMediaId,
          undefined,
          category === 'IMAGE' ? undefined : undefined,
          whatsappType === 'document' ? file.originalname : undefined,
          (whatsappType === 'audio' && uploadMime === 'audio/ogg')
        )
        whatsappSent = true
        console.log(`✅ Mídia enviada via WhatsApp (mediaId=${uploadedMediaId}): ${uniqueName}`)
      } catch (error) {
        console.error(`❌ Erro ao enviar mídia via WhatsApp:`, error)
        if (category === 'AUDIO') {
          try {
            const fallbackId = uploadedMediaId || (await whatsappService.uploadMedia(uploadPath, uploadMime || 'audio/mpeg'))
            await whatsappService.sendMediaMessage(
              conversation.phone,
              'audio',
              fallbackId,
              undefined,
              undefined,
              undefined,
              false
            )
            whatsappSent = true
            console.log(`✅ Áudio fallback enviado como audio (mediaId=${fallbackId}): ${uniqueName}`)
          } catch (err) {
            console.error('❌ Fallback de áudio como audio falhou:', err)
          }
        }
      }

      // Create message in database
      const messageText = category === 'IMAGE' ? 'Imagem enviada' :
        category === 'AUDIO' ? 'Áudio enviado' :
          `Documento enviado: ${file.originalname}`

      const message = await prisma.message.create({
        data: {
          conversationId: id,
          phoneNumber: conversation.phone,
          messageText,
          messageType: category,
          mediaUrl: `/api/conversations/files/${messageMediaFileName}`,
          metadata: {
            filename: file.originalname,
            mimeType: file.mimetype,
            size: file.size
          },
          direction: 'SENT',
          from: 'AGENT',
          timestamp: new Date()
        }
      })

      messages.push(message)

      const updatedConversation = await prisma.conversation.update({
        where: { id },
        data: {
          lastMessage: message.messageText,
          lastTimestamp: new Date()
        }
      })

      const realtime = getRealtime()
      const payload = {
        message: {
          id: message.id,
          conversationId: message.conversationId,
          phoneNumber: message.phoneNumber,
          messageText: message.messageText,
          messageType: message.messageType,
          mediaUrl: message.mediaUrl,
          metadata: message.metadata,
          direction: message.direction,
          from: message.from,
          timestamp: message.timestamp.toISOString()
        },
        conversation: updatedConversation,
        phone: conversation.phone
      }
      realtime.io.to(`conv:${conversation.phone}`).emit('message_sent', payload)
      realtime.io.to(`conv:${id}`).emit('message_sent', payload)
    }

    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: 'FILE_UPLOAD',
        details: { conversationId: id, files: savedFiles }
      }
    })

    res.json({
      files: savedFiles,
      messages
    })
  } catch (error) {
    console.error('Erro ao fazer upload de arquivos:', error)
    res.status(500).json({ error: 'Erro ao fazer upload de arquivos' })
  }
})

// Get conversation files
router.get('/:id/files', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const logs = await prisma.auditLog.findMany({
      where: { action: 'FILE_UPLOAD' },
      orderBy: { createdAt: 'desc' }
    })
    const files = logs
      .map(l => (l as any).details?.files || [])
      .flat()
      .filter((f: any) => (f as any) && ((f as any).conversationId ? (f as any).conversationId === id : true))
    res.json(files)
  } catch (error) {
    console.error('Erro ao buscar arquivos da conversa:', error)
    res.status(500).json({ error: 'Erro ao buscar arquivos' })
  }
})

// Serve uploaded files
// Serve uploaded files (no auth required for images to load in <img> tags)
router.get('/files/:filename', async (req: Request, res: Response): Promise<void> => {
  try {
    const { filename } = req.params

    // Sanitize filename to prevent directory traversal
    const safeFilename = path.basename(filename)
    const uploadsDir = path.join(process.cwd(), 'uploads')
    const filePath = path.join(uploadsDir, safeFilename)

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Arquivo não encontrado no servidor' })
      return
    }

    res.sendFile(filePath)
  } catch (error) {
    console.error('Erro ao buscar arquivo:', error)
    res.status(500).json({ error: 'Erro ao buscar arquivo' })
  }
})

// ==========================================
// SESSION MANAGEMENT ENDPOINTS
// ==========================================

// Get session status for a conversation
router.get('/:id/session', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      select: {
        id: true,
        phone: true,
        sessionStartTime: true,
        sessionExpiryTime: true,
        sessionStatus: true,
        lastUserActivity: true,
        channel: true,
        channelMetadata: true,
        status: true
      }
    })

    if (!conversation) {
      res.status(404).json({ error: 'Conversa não encontrada' })
      return
    }

    // Get session from memory manager
    let memorySession = null
    try {
      memorySession = sessionManager.getSession(id)
    } catch (err) {
      console.warn('Erro ao buscar sessão do memory manager:', err)
    }

    // Calculate remaining time
    let timeRemaining = null
    let canSendMessage = true
    let requiresTemplate = false

    if (conversation.sessionExpiryTime) {
      const now = new Date()
      const expiry = new Date(conversation.sessionExpiryTime)
      timeRemaining = Math.max(0, expiry.getTime() - now.getTime())

      // Check if session is expired
      if (timeRemaining === 0) {
        canSendMessage = false
        requiresTemplate = true
      }
    }

    // Helper function to format milliseconds
    const formatMs = (ms: number): string => {
      const hours = Math.floor(ms / (1000 * 60 * 60))
      const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
      return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
    }

    res.json({
      conversation: {
        id: conversation.id,
        phone: conversation.phone,
        channel: conversation.channel,
        status: conversation.status
      },
      session: {
        startTime: conversation.sessionStartTime,
        expiryTime: conversation.sessionExpiryTime,
        status: conversation.sessionStatus,
        lastActivity: conversation.lastUserActivity,
        timeRemaining,
        timeRemainingFormatted: timeRemaining ? formatMs(timeRemaining) : null,
        canSendMessage,
        requiresTemplate,
        memorySession: memorySession ? {
          status: memorySession.status,
          messageCount: memorySession.messageCount,
          transferCount: memorySession.transferCount
        } : null
      }
    })
  } catch (error) {
    console.error('Erro ao buscar status da sessão:', error)
    res.status(500).json({ error: 'Erro ao buscar status da sessão' })
  }
})

// Reopen expired session (requires WhatsApp template)
router.post('/:id/session/reopen', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { templateName, templateParams } = req.body

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        patient: true
      }
    })

    if (!conversation) {
      res.status(404).json({ error: 'Conversa não encontrada' })
      return
    }

    // Check if session is actually expired
    const now = new Date()
    const sessionExpired = conversation.sessionExpiryTime && new Date(conversation.sessionExpiryTime) < now

    if (!sessionExpired) {
      res.status(400).json({
        error: 'Sessão ainda está ativa',
        session: {
          expiryTime: conversation.sessionExpiryTime,
          status: conversation.sessionStatus
        }
      })
      return
    }

    // Send template message to reopen session
    if (!templateName) {
      res.status(400).json({
        error: 'Nome do template é obrigatório para reabrir sessão expirada',
        hint: 'Você precisa enviar um template aprovado pelo WhatsApp para reabrir a conversa'
      })
      return
    }

    try {
      // Send template via WhatsApp service
      await whatsappService.sendTemplateMessage(
        conversation.phone,
        templateName,
        templateParams || []
      )

      // Reopen session
      const newExpiryTime = new Date(now.getTime() + 24 * 60 * 60 * 1000)

      const updatedConversation = await prisma.conversation.update({
        where: { id },
        data: {
          sessionStartTime: now,
          sessionExpiryTime: newExpiryTime,
          sessionStatus: 'active',
          lastUserActivity: now,
          status: 'BOT_QUEUE'
        }
      })

      // Restart session in memory manager
      try {
        await sessionManager.startSession(id, conversation.patient?.id || 'system')
      } catch (err) {
        console.warn('Erro ao reiniciar sessão no memory manager:', err)
      }

      // Log reopening
      if (conversation.patient) {
        await prisma.patientInteraction.create({
          data: {
            patientId: conversation.patient.id,
            type: 'SESSION_REOPENED',
            description: 'Sessão reaberta via template do WhatsApp',
            data: {
              conversationId: id,
              templateName,
              reopenedBy: req.user.id
            }
          }
        })
      }

      res.json({
        success: true,
        message: 'Sessão reaberta com sucesso',
        conversation: updatedConversation,
        session: {
          startTime: updatedConversation.sessionStartTime,
          expiryTime: updatedConversation.sessionExpiryTime,
          status: updatedConversation.sessionStatus
        }
      })
    } catch (whatsappError: any) {
      console.error('Erro ao enviar template do WhatsApp:', whatsappError)
      res.status(500).json({
        error: 'Erro ao enviar template do WhatsApp',
        details: whatsappError.message
      })
    }
  } catch (error) {
    console.error('Erro ao reabrir sessão:', error)
    res.status(500).json({ error: 'Erro ao reabrir sessão' })
  }
})

// Get session statistics
router.get('/sessions/stats', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = sessionManager.getSessionStats()

    // Also get database stats
    const now = new Date()
    const activeSessionsDb = await prisma.conversation.count({
      where: {
        sessionStatus: 'active',
        sessionExpiryTime: {
          gte: now
        }
      }
    })

    const expiredSessionsDb = await prisma.conversation.count({
      where: {
        OR: [
          { sessionStatus: 'expired' },
          {
            sessionExpiryTime: {
              lt: now
            },
            sessionStatus: { not: 'closed' }
          }
        ]
      }
    })

    res.json({
      memory: stats,
      database: {
        activeSessions: activeSessionsDb,
        expiredSessions: expiredSessionsDb
      }
    })
  } catch (error) {
    console.error('Erro ao buscar estatísticas de sessão:', error)
    res.status(500).json({ error: 'Erro ao buscar estatísticas' })
  }
})

/**
 * POST /:phone/close
 * Encerra uma conversa e envia mensagem de encerramento
 */
router.post('/:phone/close', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone } = req.params
    const userId = req.user?.id

    // Buscar conversa
    const conversation = await prisma.conversation.findFirst({
      where: { phone },
      include: { assignedTo: true }
    })

    if (!conversation) {
      res.status(404).json({ error: 'Conversa não encontrada' })
      return
    }

    // Buscar configurações do sistema
    const settings = await prisma.systemSettings.findFirst()
    const closingMessage = settings?.closingMessage ||
      'Obrigado pelo contato! Estamos à disposição. 😊'

    // Atualizar status da conversa
    const updatedConversation = await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        status: 'FECHADA',
        sessionStatus: 'closed'
      },
      include: { assignedTo: true }
    })

    // Criar mensagem do sistema
    const { createSystemMessage } = await import('../utils/systemMessages.js')
    await createSystemMessage(conversation.id, 'CONVERSATION_CLOSED', {
      agentName: conversation.assignedTo?.name || req.user?.name || 'Sistema'
    })

    // ✅ Verificar se a sessão está expirada (mais de 24h sem resposta do cliente)
    const isSessionExpired = conversation.sessionExpiryTime
      ? new Date(conversation.sessionExpiryTime) < new Date()
      : false

    // ✅ Só envia mensagem de encerramento se a sessão NÃO estiver expirada
    if (!isSessionExpired) {
      // ✅ Tentar enviar via WhatsApp (mas continuar mesmo se falhar)
      try {
        console.log(`📨 Enviando mensagem de encerramento para ${phone}...`)
        await whatsappService.sendTextMessage(phone, closingMessage)
        console.log(`✅ Mensagem de encerramento enviada com sucesso para ${phone}`)
      } catch (sendError) {
        console.warn('⚠️ WhatsApp falhou (continuando mesmo assim):', sendError)
      }

      // ✅ SEMPRE salvar mensagem no histórico (mesmo se WhatsApp falhar)
      try {
        const closingMsg = await prisma.message.create({
          data: {
            conversationId: conversation.id,
            phoneNumber: phone,
            direction: 'SENT', // ✅ Usar 'SENT' em vez de 'outgoing' para compatibilidade com frontend
            from: 'AGENT',
            messageText: closingMessage,
            messageType: 'TEXT',
            timestamp: new Date(),
            metadata: { isClosingMessage: true }
          }
        })

        console.log(`✅ Mensagem de encerramento salva no histórico: ${closingMsg.id}`)

        // ✅ Emitir evento para atualizar frontend imediatamente
        try {
          const { getRealtime } = await import('../realtime.js')
          const { io } = getRealtime()
          io.to(`conv:${phone}`).emit('new_message', {
            conversation: { phone, id: conversation.id },
            message: closingMsg
          })
          // Também emitir para a sala específica da conversa
          io.to(`conv:${conversation.id}`).emit('new_message', {
            conversation: { phone, id: conversation.id },
            message: closingMsg
          })
          console.log(`📡 Eventos Socket.IO emitidos para mensagem de encerramento`)
        } catch (e) {
          console.warn('⚠️ Erro ao emitir evento de nova mensagem:', e)
        }
      } catch (dbError) {
        console.error('❌ Erro ao salvar mensagem de encerramento no histórico:', dbError)
      }
    } else {
      console.log(`⏰ Sessão expirada para ${phone} - mensagem de encerramento não enviada`)
    }

    // Emitir eventos Socket.IO
    try {
      const { getRealtime } = await import('../realtime.js')
      const { io } = getRealtime()

      // Emitir evento específico de conversa fechada
      io.emit('conversation:closed', {
        conversationId: conversation.id,
        phone,
        closedBy: req.user?.name
      })

      // Também emitir conversation:updated para garantir que frontend atualize
      io.emit('conversation:updated', {
        conversationId: updatedConversation.id,
        status: 'FECHADA',
        phone: updatedConversation.phone,
        lastMessage: updatedConversation.lastMessage,
        lastTimestamp: updatedConversation.lastTimestamp
      })

      console.log(`📡 Eventos emitidos: conversation:closed e conversation:updated para ${conversation.id}`)
    } catch (error) {
      console.error('Erro ao emitir evento Socket.IO:', error)
    }

    res.json({
      success: true,
      conversation: updatedConversation,
      message: 'Conversa encerrada com sucesso'
    })
  } catch (error) {
    console.error('Erro ao encerrar conversa:', error)
    res.status(500).json({ error: 'Erro ao encerrar conversa' })
  }
})

export default router
async function getDefaultWorkflow(): Promise<any | null> {
  const latest = await prisma.auditLog.findFirst({ where: { action: 'DEFAULT_WORKFLOW' }, orderBy: { createdAt: 'desc' } })
  const details: any = latest?.details as any
  if (details?.id) {
    const wf = await prisma.workflow.findUnique({ where: { id: String(details.id) } })
    if (wf) return wf
  }

  const actives = await prisma.workflow.findMany({ where: { isActive: true }, orderBy: { createdAt: 'desc' } })
  for (const wf of actives) {
    const cfg = typeof (wf as any).config === 'string' ? (() => { try { return JSON.parse((wf as any).config) } catch { return {} } })() : ((wf as any).config || {})
    const nodes = Array.isArray(cfg?.nodes) ? cfg.nodes : []
    const hasClinicSelection = nodes.some((n: any) => n.id === 'clinic_selection' || (n.type === 'CONDITION' && ((n.data?.condition || n.content?.condition) === 'clinic_selection')))
    if (hasClinicSelection) return wf
  }
  return actives[0] || null
}

function buildConnectionsFromConfig(cfg: any): Record<string, string[]> {
  const nodes = Array.isArray(cfg?.nodes) ? cfg.nodes : []
  const edges = Array.isArray(cfg?.edges) ? cfg.edges : []
  const map: Record<string, string[]> = {}
  nodes.forEach((n: any) => { map[n.id] = Array.isArray(n.connections) ? n.connections : [] })
  edges.forEach((e: any) => { if (e?.source && e?.target) (map[e.source] ||= []).push(e.target) })
  return map
}

async function executeDefaultWorkflowStart(conversation: any): Promise<void> {
  const wf = await getDefaultWorkflow()
  if (!wf) return
  const cfg = (typeof (wf as any).config === 'string') ? (() => { try { return JSON.parse((wf as any).config) } catch { return {} } })() : ((wf as any).config || {})
  const nodes = Array.isArray(cfg?.nodes) ? cfg.nodes : []
  const byId: Record<string, any> = {}
  nodes.forEach((n: any) => byId[n.id] = n)
  const conns = buildConnectionsFromConfig(cfg)
  const start = nodes.find((n: any) => n.type === 'START')
  if (!start) return
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      workflowId: wf.id,
      currentWorkflowNode: start.id,
      workflowContext: {},
      awaitingInput: false
    }
  })
  // Let the workflow engine handle the welcome message
  await advanceWorkflow(conversation, '')
}

function evaluateCondition(condition: string, phone: string, message: string, context: any): boolean {
  try {
    const lowerMessage = (message || '').toLowerCase()
    if (condition.includes('agendamento') || condition.includes('marcar')) {
      return lowerMessage.includes('agendamento') || lowerMessage.includes('marcar')
    }
    if (condition.includes('preço') || condition.includes('valor')) {
      return lowerMessage.includes('preço') || lowerMessage.includes('valor') || lowerMessage.includes('quanto')
    }
    if (condition.includes('informação') || condition.includes('informações')) {
      return lowerMessage.includes('informação') || lowerMessage.includes('informações')
    }
    return true
  } catch {
    return false
  }
}

async function advanceWorkflow(conversation: any, incomingText: string): Promise<string[]> {
  const workflowLogs: string[] = []
  const addLog = (msg: string) => {
    workflowLogs.push(msg)
    console.log(`🔄 [WORKFLOW] ${msg}`)
  }

  try {
    const conv = await prisma.conversation.findUnique({ where: { id: conversation.id } })
    if (!conv?.workflowId) {
      addLog('⚠️ Conversa sem workflowId')
      return workflowLogs
    }
    const wf = await prisma.workflow.findUnique({ where: { id: conv.workflowId } })
    if (!wf) {
      addLog('⚠️ Workflow não encontrado no banco')
      return workflowLogs
    }

    const cfg = (typeof (wf as any).config === 'string') ? (() => { try { return JSON.parse((wf as any).config) } catch { return {} } })() : ((wf as any).config || {})
    const nodes = (Array.isArray(cfg?.nodes) ? cfg.nodes : []).map((node: any) => ({
      id: node.id,
      type: node.type,
      content: node.content || node.data || {},
      position: node.position || { x: 0, y: 0 },
      connections: node.connections || []
    })) as WorkflowNode[]

    if (nodes.length === 0) {
      addLog('⚠️ Workflow sem nodes configurados')
      return workflowLogs
    }

    // Create or get existing engine context
    let context: any = conv.workflowContext || {}
    let currentNodeId = conv.currentWorkflowNode || ''

    console.log(`🔄 advanceWorkflow called for conversation ${conversation.id}`)
    console.log(`🔄 Conversation state - currentWorkflowNode: ${currentNodeId}, workflowContext:`, context)
    console.log(`🔄 Incoming text: "${incomingText}"`)

    // Se há uma nova mensagem do usuário (não vazia), verificar se devemos voltar ao GPT classifier
    // MAS APENAS se não estiver em processo de coleta de dados (DATA_COLLECTION)
    if (incomingText && incomingText.trim()) {
      const isAwaitingInput = !!conv.awaitingInput
      const isCollectingData = context.userData?.collectingField || context.userData?.currentCollectField || (isAwaitingInput ? 'awaiting' : '')

      // Se estiver coletando dados, NÃO fazer nenhuma reclassificação de intenção
      // A mensagem será processada apenas como resposta ao campo atual
      if (isCollectingData) {
        addLog(`🔒 Em processo de coleta de dados (campo: ${context.userData?.collectingField}). Ignorando reclassificação de intenção.`)
      } else {
        // Apenas processar intenções se NÃO estiver coletando dados
        // Verificar se é mensagem genérica (oi, olá, etc.)
        const normalized = incomingText.toLowerCase().trim()
        const genericGreetings = ['oi', 'olá', 'ola', 'opa', 'eae', 'e aí', 'e ai', 'hey', 'hi', 'hello',
          'tchau', 'tchauzinho', 'obrigado', 'obrigada', 'valeu', 'vlw', 'ok', 'okay', 'beleza', 'blz',
          'tudo bem', 'td bem', 'como vai', 'tudo certo', 'td certo', 'claro', 'pode ser']
        const isGenericMessage = genericGreetings.some(g => {
          return normalized === g || normalized.startsWith(g + ' ') || normalized.endsWith(' ' + g) ||
            normalized.includes(' ' + g + ' ') || (normalized.length <= 10 && normalized.includes(g))
        })

        // Encontrar o nó GPT classifier no workflow
        // Procura por: gpt_classifier, qualquer nó GPT_RESPONSE que seja usado como classificador
        let gptClassifierNode = nodes.find((n: any) =>
          n.type === 'GPT_RESPONSE' && n.id === 'gpt_classifier'
        )

        // Se não encontrou pelo ID exato, procura por qualquer GPT_RESPONSE que pareça ser classificador
        if (!gptClassifierNode) {
          gptClassifierNode = nodes.find((n: any) => {
            if (n.type !== 'GPT_RESPONSE') return false
            const prompt = (n.content?.systemPrompt || '').toLowerCase()
            return prompt.includes('classificador') || prompt.includes('classificar') || prompt.includes('intenção') || prompt.includes('intent')
          })
        }

        // Se ainda não encontrou, pega o primeiro GPT_RESPONSE disponível
        if (!gptClassifierNode) {
          gptClassifierNode = nodes.find((n: any) => n.type === 'GPT_RESPONSE')
        }

        const currentNode = nodes.find((n: any) => n.id === currentNodeId)

        // Se estiver em CONDITION node (ex: aguardando "sim/não", "1/2"), não desviar o fluxo
        const isInConditionFlow = currentNode && currentNode.type === 'CONDITION'
        const isInDataCollection = currentNode && (currentNode.type === 'DATA_COLLECTION' || currentNode.type === 'COLLECT_INFO')

        // Detectar seleção de clínica (mas apenas se não estiver em outro fluxo estruturado)
        const isClinicSelectionResponse = !isCollectingData && !isInConditionFlow && (() => {
          const trimmed = normalized.replace(/\s+/g, ' ').trim()
          const numericOptions = ['1', '2', 'um', 'dois']
          const clinicKeywords = ['vieiralves', 'vieira', 'sao jose', 'são josé', 'sao josé', 'são jose', 'salvador', 'centro']

          if (numericOptions.includes(trimmed)) return true

          return clinicKeywords.some(keyword => trimmed.includes(keyword))
        })()

        const clinicSelectionNode = nodes.find((n: any) => n.id === 'clinic_selection')

        if (isClinicSelectionResponse && clinicSelectionNode) {
          addLog(`Mensagem "${incomingText}" identificada como seleção de clínica. Enviando para clinic_selection.`)
          currentNodeId = clinicSelectionNode.id
        } else if (gptClassifierNode) {
          // Se for mensagem genérica e já está no GPT classifier, não fazer nada (aguardar intenção clara)
          if (isGenericMessage && currentNode?.id === gptClassifierNode.id) {
            addLog(`Mensagem genérica "${incomingText}" recebida no GPT classifier. Aguardando intenção clara.`)
            // Não alterar currentNodeId, deixar o GPT classifier tratar
          }
          // Se o nó atual não é o GPT classifier e não está coletando dados e não é mensagem genérica,
          // voltar ao GPT classifier para reclassificar a intenção
          else if (!isGenericMessage && !isCollectingData && !isInConditionFlow && !isInDataCollection && !isAwaitingInput) {
            const shouldReturnToGPT = currentNode &&
              currentNode.id !== gptClassifierNode.id && // Não é o próprio GPT classifier
              currentNode.type !== 'COLLECT_INFO' && // Não está coletando informações estruturadas
              currentNode.type !== 'DATA_COLLECTION' && // Não está coletando dados
              currentNode.type !== 'CONDITION' && // Não é uma condição
              currentNode.type !== 'ACTION' && // Não é uma ação
              currentNode.type !== 'API_CALL' // Não é uma chamada de API

            if (shouldReturnToGPT) {
              addLog(`Nova mensagem "${incomingText}". Voltando ao GPT classifier para reclassificar intenção.`)
              addLog(`Nó atual era: ${currentNodeId} (${currentNode?.type})`)
              currentNodeId = gptClassifierNode.id
              // Limpar tópico anterior para permitir nova classificação
              if (context.userData?.lastTopic) {
                delete context.userData.lastTopic
              }
            }
          }
          // Se for mensagem genérica e não está no GPT classifier e não está em fluxo estruturado,
          // voltar ao início (START)
          else if (isGenericMessage && currentNode?.id !== gptClassifierNode.id && !isCollectingData && !isInConditionFlow && !isInDataCollection && !isAwaitingInput) {
            const startNode = nodes.find((n: any) => n.type === 'START')
            if (startNode) {
              addLog(`Mensagem genérica "${incomingText}" recebida. Resetando workflow para início.`)
              currentNodeId = startNode.id
              // Limpar contexto para reiniciar conversa
              context.userData = {}
            }
          }
        } else {
          addLog(`⚠️ Nenhum nó GPT_RESPONSE encontrado no workflow`)
        }
      }
    }

    // Create engine with current state and connections
    let connections: any[] = []
    if (Array.isArray(cfg?.connections) && cfg.connections.length > 0) {
      connections = cfg.connections as any[]
    } else if (Array.isArray((cfg as any)?.edges) && (cfg as any).edges.length > 0) {
      connections = (cfg as any).edges.map((e: any) => ({
        source: e.source,
        target: e.target,
        condition: (e.data && e.data.condition) || e.condition,
        sourcePort: (e.data && e.data.port) || e.sourcePort,
        data: e.data
      }))
    }
    console.log(`🔄 Creating WorkflowEngine with ${nodes.length} nodes and ${connections.length} connections`)
    console.log(`🔄 First few connections:`, connections.slice(0, 3))

    // Prepare context for engine
    const engineContext = {
      currentNodeId: currentNodeId || '',
      conversationHistory: context.conversationHistory || [],
      userData: context.userData || {}
    }

    // Find start node if no current node
    if (!currentNodeId) {
      console.log(`🔄 No current node found, finding start node`)
      const startNode = nodes.find(node => node.type === 'START')
      if (startNode) {
        currentNodeId = startNode.id
        engineContext.currentNodeId = currentNodeId
        console.log(`🔄 Found start node: ${currentNodeId}`)
      } else {
        console.log(`🔄 No start node found, engine will start from default`)
      }
    }

    // Create engine with context
    const engine = new WorkflowEngine(
      nodes,
      conv.workflowId,
      conv.phone,
      incomingText,
      connections,
      engineContext
    )

    console.log(`🔄 Engine created with current node: ${engine.getContext().currentNodeId}`)

    // Execute next node
    addLog(`Executando node: ${currentNodeId || 'start'}`)
    let result = await engine.executeNextNode()

    const currentNode = nodes.find((n: any) => n.id === (currentNodeId || ''))
    if (currentNode) {
      addLog(`Node atual: ${currentNode.id} (${currentNode.type})`)
    }

    // Handle response from first node
    if (result.response) {
      console.log(`🔄 Sending workflow response: ${result.response}`)
      await sendAIMessage(conversation, result.response)
    }

    // Continue executing nodes if we shouldn't stop and have a next node
    while (!result.shouldStop && result.nextNodeId) {
      addLog(`Continuando para próximo node: ${result.nextNodeId}`)
      result = await engine.executeNextNode()

      const nextNode = nodes.find((n: any) => n.id === result.nextNodeId)
      if (nextNode) {
        addLog(`Node executado: ${nextNode.id} (${nextNode.type})`)
      }

      // Handle response from continued execution
      if (result.response) {
        addLog(`Enviando resposta: "${result.response.substring(0, 50)}..."`)
        await sendAIMessage(conversation, result.response)
      }
    }

    if (result.shouldStop) {
      addLog(`Workflow pausado - aguardando resposta do usuário`)
    }

    // Update conversation state
    const updatedContext = engine.getContext()
    console.log(`🔄 Updating conversation state - currentNodeId: ${updatedContext.currentNodeId}, userData:`, updatedContext.userData)

    // DISABLED: Check if we just executed msg_paciente_encontrado or msg_cadastro_sucesso
    // This code was bypassing the workflow nodes (action_get_procedimentos_insurance, msg_procedimentos_insurance, transfer_to_queue)
    // Now the workflow handles this through explicit TRANSFER_HUMAN nodes
    // Only transfer if the message already contains the queue message (meaning TRANSFER_HUMAN node was executed)
    try {
      const lastBotMessage = await prisma.message.findFirst({
        where: {
          conversationId: conversation.id,
          direction: 'SENT',
          from: 'BOT'
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      if (lastBotMessage) {
        const messageContent = (lastBotMessage.messageText || '').toLowerCase();
        // Only check for queue message - if it's there, the TRANSFER_HUMAN node already executed
        const hasQueueMessage = messageContent.includes('foi encaminhado para um de nossos atendentes') ||
          messageContent.includes('encaminhado para um de nossos atendentes') ||
          messageContent.includes('aguarda o atendimento');

        // Only transfer if queue message is present (TRANSFER_HUMAN node executed)
        // Don't transfer just because of registration success message
        if (hasQueueMessage) {
          console.log(`🔄 ✅ Detected queue message, transferring to PRINCIPAL queue`);
          await transferToHuman(conversation, 'Paciente cadastrado/encontrado - aguardando agendamento');
          console.log(`🔄 ✅ Transfer completed`);
        }
      }
    } catch (error) {
      console.error(`❌ Error checking last bot message:`, error);
    }

    const ctxUserData: any = updatedContext.userData || {}
    if (ctxUserData.intentReady && !ctxUserData.intentLogged) {
      const intent = ctxUserData.intentSummary || {}
      try {
        const locations = await prismaClinicDataService.getLocations()
        const clinic = locations.find(l => l.id === String(intent.clinic || ''))
        const procedures = await prismaClinicDataService.getProcedures()
        const collected = (ctxUserData.collectedData || {}) as any
        let patientName = String(collected.name || '')
        if (!patientName && conv.patientId) {
          try {
            const pat2 = await prisma.patient.findUnique({ where: { id: conv.patientId } })
            patientName = String(pat2?.name || '')
          } catch { }
        }
        const birthISO = (collected.birth_date || '') as string
        const birthLine = birthISO ? `\nNascimento: ${new Date(birthISO).toLocaleDateString('pt-BR')}` : ''
        const insuranceDisplay = String(intent.insurance || collected.insurance || 'Particular')
        const procRaw = (collected.procedure_type || intent.procedure || '') as string
        const procName = procedures.find(p => p.id === procRaw || p.name === procRaw)?.name || procRaw
        const day = String(collected.preferred_date || intent.date || '')
        const shift = String(collected.preferred_shift || intent.shift || '')
        const convText = `📝 Intenção de Agendamento\nPaciente: ${patientName || '-'}${birthLine}\nUnidade: ${clinic?.name || intent.clinic}\nConvênio: ${insuranceDisplay}\nProcedimento: ${procName}\nDia: ${day}\nTurno: ${shift}`
        await prisma.message.create({ data: { conversationId: conv.id, phoneNumber: conv.phone, messageText: convText, direction: 'SENT', from: 'BOT' } })
        if (conv.patientId) {
          await prisma.patientInteraction.create({ data: { patientId: conv.patientId, type: 'INTENT_SCHEDULING', description: 'Intenção de agendamento registrada', data: intent } })
        }
        ctxUserData.intentLogged = true
        // Move conversation to principal queue for human follow-up
        await transferToHuman(conversation, 'Intenção de agendamento registrada')
      } catch { }
    }
    // Update conversation with patientId if patient was created
    const updateData: any = {
      currentWorkflowNode: updatedContext.currentNodeId,
      workflowContext: { userData: ctxUserData },
      awaitingInput: !!ctxUserData.collectingField
    };

    // CRITICAL FIX: If patient was created or found, update conversation with patientId
    // Always update if we have a patientId in context (not just when conv.patientId is empty)
    // This ensures we use the patient from THIS workflow execution
    if (ctxUserData.patientId) {
      console.log(`🔄 Patient ID in context: ${ctxUserData.patientId}, current conv patientId: ${conv.patientId || 'none'}`);
      updateData.patientId = ctxUserData.patientId;
      console.log(`🔄 Updating conversation ${conv.id} with patientId: ${ctxUserData.patientId}`);

      // Verify patient exists before associating
      try {
        const patientExists = await prisma.patient.findUnique({
          where: { id: ctxUserData.patientId },
          select: { id: true, name: true, phone: true }
        });

        if (patientExists) {
          console.log(`✅ Patient verified before association: ${patientExists.name} (${patientExists.id})`);
        } else {
          console.error(`❌ Patient ${ctxUserData.patientId} not found in database - cannot associate with conversation`);
          delete updateData.patientId; // Don't associate if patient doesn't exist
        }
      } catch (error: any) {
        console.error(`❌ Error verifying patient before association:`, error);
        delete updateData.patientId; // Don't associate if verification fails
      }
    }

    console.log(`🔄 Updating conversation ${conv.id} with data:`, {
      currentWorkflowNode: updateData.currentWorkflowNode,
      patientId: updateData.patientId || conv.patientId || 'none',
      awaitingInput: updateData.awaitingInput
    });

    await prisma.conversation.update({
      where: { id: conv.id },
      data: updateData
    })

    console.log(`🔄 Conversation state updated successfully`)

    // Handle transfer to human
    if (result.shouldStop && updatedContext.currentNodeId) {
      const currentNode = nodes.find(n => n.id === updatedContext.currentNodeId)
      console.log(`🔄 Checking transfer - currentNodeId: ${updatedContext.currentNodeId}, node found: ${!!currentNode}, node type: ${currentNode?.type}, node id: ${currentNode?.id}`);

      if (currentNode?.type === 'TRANSFER_HUMAN') {
        await transferToHuman(conversation, 'Transferência automática do workflow')
        return
      }
      if (currentNode?.type === 'END') {
        // Workflow completed
        return
      }
      // DISABLED: Transfer to human queue when showing registration success or patient found message
      // This code was bypassing the workflow nodes (action_get_procedimentos_insurance, msg_procedimentos_insurance, transfer_to_queue)
      // Now the workflow handles this through explicit TRANSFER_HUMAN nodes
      /*
      if (currentNode?.id === 'msg_cadastro_sucesso' || currentNode?.id === 'msg_paciente_encontrado') {
        console.log(`🔄 Transferring conversation to PRINCIPAL queue after ${currentNode.id}`);
        await transferToHuman(conversation, 'Paciente cadastrado/encontrado - aguardando agendamento');
      }
      */
    }

    // DISABLED: Also check if the last executed node was one of these messages
    // This was also bypassing the workflow nodes
    /*
    if (result.shouldStop) {
      const lastExecutedNode = nodes.find(n => {
        // Check if this node's message was just sent
        const lastBotMessage = updatedContext.conversationHistory
          ?.filter((h: any) => h.role === 'bot')
          ?.slice(-1)[0];
        if (lastBotMessage && n.type === 'MESSAGE') {
          const nodeMessage = n.content?.message || n.data?.message || '';
          const nodeMsgSafe = nodeMessage || ''
          const lastMsgSafe = lastBotMessage.content || ''
          return lastMsgSafe.includes(nodeMsgSafe.substring(0, Math.min(50, nodeMsgSafe.length))) ||
            nodeMsgSafe.substring(0, Math.min(50, nodeMsgSafe.length)).includes(lastMsgSafe.substring(0, Math.min(50, lastMsgSafe.length)));
        }
        return false;
      });

      if (lastExecutedNode && (lastExecutedNode.id === 'msg_cadastro_sucesso' || lastExecutedNode.id === 'msg_paciente_encontrado')) {
        console.log(`🔄 Transferring conversation to PRINCIPAL queue after detecting ${lastExecutedNode.id} in last message`);
        await transferToHuman(conversation, 'Paciente cadastrado/encontrado - aguardando agendamento');
      }
    }
    */

    // Continue execution if there's a next node and we shouldn't stop
    if (result.nextNodeId && !result.shouldStop) {
      const moreLogs = await advanceWorkflow(conversation, '')
      workflowLogs.push(...moreLogs)
    }

    return workflowLogs
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    addLog(`❌ Erro ao executar workflow: ${errorMsg}`)
    console.error('❌ Erro em advanceWorkflow:', error)
    return workflowLogs
  }
}
