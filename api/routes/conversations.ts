import { Router, type Request, type Response } from 'express'
import path from 'path'
import fs from 'fs'
import { z } from 'zod'
import prisma from '../prisma/client.js'
const prismaAny = prisma as any
import { authMiddleware } from '../utils/auth.js'
import { WhatsAppService } from '../services/whatsapp.js'
import { AIService } from '../services/ai.js'
import type { AIContext } from '../services/ai.js'
import axios from 'axios'
import { getRealtime } from '../realtime.js'
import { upload, FileValidationService } from '../services/fileValidation.js'
import { transcodeToMp3, transcodeToOggOpus, transcodeToAacM4a } from '../utils/audioTranscode.js'
import { WorkflowEngine, type WorkflowNode } from '../../src/services/workflowEngine.js'
import { prismaClinicDataService } from '../services/prismaClinicDataService.js'
import { sessionManager } from '../services/conversationSession.js'

const router = Router()

// WhatsApp service instance
const whatsappService = new WhatsAppService(
  process.env.META_ACCESS_TOKEN || '',
  process.env.META_PHONE_NUMBER_ID || ''
)

// AI service instance
const aiService = new AIService(
  process.env.OPENAI_API_KEY || '',
  process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
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
    const { status, page = 1, limit = 20, search = '' } = req.query
    const skip = (Number(page) - 1) * Number(limit)

    const where: any = {}
    if (status) {
      const s = String(status)
      if (s === 'ACTIVE') {
        where.status = { in: ['BOT_QUEUE', 'PRINCIPAL', 'EM_ATENDIMENTO'] }
      } else if (s === 'BOT') {
        where.status = { in: ['BOT_QUEUE'] }
      } else if (s === 'HUMAN') {
        where.status = { in: ['PRINCIPAL', 'EM_ATENDIMENTO'] }
      } else if (s === 'CLOSED') {
        where.status = 'FECHADA'
      } else {
        where.status = s
      }
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

// Get conversation by phone
router.get('/:phone', listAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone } = req.params
    const { limit = 50 } = req.query

    const conversation = await prisma.conversation.findFirst({
      where: { phone },
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

    // Reverse messages to get chronological order
    conversation.messages.reverse()

    res.json(conversation)
  } catch (error) {
    console.error('Erro ao buscar conversa:', error)
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
  try {
    const { action, phone, assignTo } = req.body

    const conversation = await prisma.conversation.findFirst({
      where: { phone },
      include: { patient: true, assignedTo: true }
    })

    if (!conversation) {
      res.status(404).json({ error: 'Conversa não encontrada' })
      return
    }

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
        updateData = {
          status: 'EM_ATENDIMENTO',
          assignedToId: assigneeId
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
        updateData = {
          status: 'FECHADA',
          assignedToId: null
        }
        actionDescription = 'Conversa fechada'
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
          select: { id: true, name: true, cpf: true, insuranceCompany: true }
        },
        assignedTo: {
          select: { id: true, name: true, email: true }
        }
      }
    })

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
      realtime.io.to(`conv:${phone}`).emit('conversation_updated', updatedConversation)
      realtime.io.emit('queue_updated', { action, conversation: updatedConversation })
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

    // OTIMIZAÇÃO CRÍTICA: Enviar WhatsApp PRIMEIRO (mais importante para latência)
    const startTime = Date.now()
    let whatsappSent = false
    let whatsappError: any = null

    // Enviar WhatsApp IMEDIATAMENTE (não esperar banco)
    try {
      await whatsappService.sendTextMessage(phone, text)
      whatsappSent = true
      const whatsappTime = Date.now() - startTime
      console.log(`⚡ [FAST] WhatsApp enviado em ${whatsappTime}ms`)
    } catch (error) {
      whatsappError = error
      console.error('❌ Erro ao enviar via WhatsApp:', error)
    }

    // Enquanto isso, fazer operações de banco (podem ser feitas depois)
    let conversation = await prisma.conversation.findFirst({
      where: { phone }
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

    // Atualizar conversa (sem include pesado)
    const updatedConversation = await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessage: text,
        lastTimestamp: new Date()
      }
    })

    // Log de interação de forma assíncrona (não bloqueia resposta)
    if (updatedConversation.patientId) {
      prisma.patientInteraction.create({
        data: {
          patientId: updatedConversation.patientId,
          type: whatsappSent ? 'MESSAGE_SENT' : 'MESSAGE_FAILED',
          description: whatsappSent ? 'Mensagem enviada via WhatsApp' : 'Falha ao enviar mensagem via WhatsApp',
          data: {
            messageId: message.id,
            sentBy: req.user.id,
            sentByName: req.user.name,
            ...(whatsappError ? { error: whatsappError instanceof Error ? whatsappError.message : 'Erro desconhecido' } : {})
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
        conversation: updatedConversation,
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
    console.log(`⚡ [PERF] Mensagem enviada em ${elapsed}ms (WhatsApp: ${whatsappSent ? 'OK' : 'FAIL'})`)

    // Retornar resposta
    if (whatsappSent) {
      res.json({ message, conversation: updatedConversation, delivery: 'ok' })
    } else {
      const failOpen = process.env.NODE_ENV !== 'production' || !process.env.META_ACCESS_TOKEN || !process.env.META_PHONE_NUMBER_ID || process.env.WHATSAPP_FAIL_OPEN === 'true'
      if (failOpen) {
        res.json({ message, conversation: updatedConversation, delivery: 'failed' })
      } else {
        res.status(500).json({ error: 'Erro ao enviar mensagem via WhatsApp' })
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
): Promise<void> {
  try {
    // Find or create patient
    let patient = await prisma.patient.findUnique({
      where: { phone }
    })

    if (!patient) {
      patient = await prisma.patient.create({
        data: {
          phone,
          name: 'Paciente ' + phone.slice(-4), // Temporary name
          preferences: {}
        }
      })

      // Log new patient
      await prisma.patientInteraction.create({
        data: {
          patientId: patient.id,
          type: 'PATIENT_CREATED',
          description: 'Paciente criado via WhatsApp',
          data: { source: 'whatsapp', messageId }
        }
      })
    }

    // Find or create conversation
    let conversation = await prisma.conversation.findFirst({
      where: { phone }
    })

    // Initialize session times
    const now = new Date()
    const sessionExpiryTime = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          phone,
          status: 'BOT_QUEUE',
          patientId: patient.id,
          lastMessage: text,
          lastTimestamp: new Date(),
          sessionStartTime: now,
          sessionExpiryTime: sessionExpiryTime,
          sessionStatus: 'active',
          lastUserActivity: now,
          channel: 'whatsapp'
        }
      })
      console.log(`💬 Nova conversa criada: ${conversation.id} com sessão de 24h`)

      // Start session in memory manager
      try {
        await sessionManager.startSession(conversation.id, patient.id)
        console.log(`✅ Sessão iniciada no manager para: ${conversation.id}`)
      } catch (err) {
        console.warn(`⚠️ Erro ao iniciar sessão no manager:`, err)
      }

      try {
        const wf = await getDefaultWorkflow()
        if (wf) {
          await prisma.conversation.update({
            where: { id: conversation.id },
            data: {
              workflowId: wf.id,
              currentWorkflowNode: (Array.isArray((wf as any).config?.nodes) ? (wf as any).config.nodes.find((n: any) => n.type === 'START')?.id : 'start') || 'start',
              workflowContext: {},
              awaitingInput: false
            }
          })
        }
      } catch { }
    } else {
      // Check session status and update
      const sessionExpired = conversation.sessionExpiryTime && new Date(conversation.sessionExpiryTime) < now

      if (sessionExpired && conversation.sessionStatus !== 'expired') {
        console.log(`⏰ Sessão expirada para conversa ${conversation.id}`)
        conversation = await prisma.conversation.update({
          where: { id: conversation.id },
          data: {
            sessionStatus: 'expired',
            lastUserActivity: now
          }
        })
      } else if (!sessionExpired) {
        // Update last activity
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: {
            lastUserActivity: now
          }
        })

        // Update session in memory manager
        try {
          await sessionManager.updateSessionActivity(conversation.id)
          console.log(`📊 Atividade de sessão atualizada para: ${conversation.id}`)
        } catch (err) {
          // Session might not exist in memory, start it
          try {
            await sessionManager.startSession(conversation.id, patient.id)
          } catch (startErr) {
            console.warn(`⚠️ Erro ao gerenciar sessão:`, startErr)
          }
        }
      }
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        phoneNumber: phone,
        messageText: text,
        messageType,
        mediaUrl,
        metadata,
        direction: 'RECEIVED',
        from: 'USER',
        timestamp: new Date()
      }
    })

    // IMPORTANTE: Emitir evento Socket.IO IMEDIATAMENTE após criar a mensagem
    // Isso reduz a latência percebida pelo usuário
    const shouldProcessWithBot = conversation.status === 'BOT_QUEUE';

    // Emitir eventos em tempo real IMEDIATAMENTE (antes de outras operações)
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

      console.log(`📡 Emitindo new_message com mediaUrl:`, message.mediaUrl, `tipo:`, message.messageType)
      realtime.io.to(`conv:${phone}`).emit('new_message', messagePayload)
      realtime.io.to(`conv:${conversation.id}`).emit('new_message', messagePayload)
      console.log(`📡 [ROOMS] Evento new_message emitido para conv:${phone} e conv:${conversation.id}`)
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
      return
    }

    // Processar apenas se estiver na fila do bot
    if (conversation.workflowId && shouldProcessWithBot) {
      try {
        const def = await getDefaultWorkflow()
        if (def && def.id !== conversation.workflowId) {
          const cfg = (typeof (def as any).config === 'string') ? (() => { try { return JSON.parse((def as any).config) } catch { return {} } })() : ((def as any).config || {})
          const nodes = Array.isArray(cfg?.nodes) ? cfg.nodes : []
          const start = nodes.find((n: any) => n.type === 'START')
          await prisma.conversation.update({
            where: { id: conversation.id },
            data: {
              workflowId: def.id,
              currentWorkflowNode: start?.id || 'start',
              workflowContext: {},
              awaitingInput: false
            }
          })
        }
      } catch { }
      await advanceWorkflow(conversation, text)
    } else if (shouldProcessWithBot) {
      // Fallback para conversas sem workflow mas ainda na fila do bot
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

    // Emit update (even if WhatsApp fails)
    try {
      const realtime = getRealtime()
      realtime.io.to(`conv:${conversation.phone}`).emit('ai_message_sent', {
        message: aiMessage
      })
    } catch (e) {
      console.warn('Realtime update failed:', e)
    }

    // Try to send via WhatsApp (don't fail if it doesn't work)
    try {
      await whatsappService.sendTextMessage(conversation.phone, text)
    } catch (whatsappError) {
      console.error('Erro ao enviar mensagem WhatsApp:', whatsappError)
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
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        status: 'PRINCIPAL',
        assignedToId: null
      }
    })

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
    }

    // Emit transfer notification
    const realtime = getRealtime()
    realtime.io.emit('transfer_to_human', {
      conversationId: conversation.id,
      phone: conversation.phone,
      reason
    })

  } catch (error) {
    console.error('Erro ao transferir para humano:', error)
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

async function advanceWorkflow(conversation: any, incomingText: string): Promise<void> {
  const conv = await prisma.conversation.findUnique({ where: { id: conversation.id } })
  if (!conv?.workflowId) return
  const wf = await prisma.workflow.findUnique({ where: { id: conv.workflowId } })
  if (!wf) return

  const cfg = (typeof (wf as any).config === 'string') ? (() => { try { return JSON.parse((wf as any).config) } catch { return {} } })() : ((wf as any).config || {})
  const nodes = (Array.isArray(cfg?.nodes) ? cfg.nodes : []).map((node: any) => ({
    id: node.id,
    type: node.type,
    content: node.content || node.data || {},
    position: node.position || { x: 0, y: 0 },
    connections: node.connections || []
  })) as WorkflowNode[]

  if (nodes.length === 0) return

  // Create or get existing engine context
  let context: any = conv.workflowContext || {}
  let currentNodeId = conv.currentWorkflowNode || ''

  console.log(`🔄 advanceWorkflow called for conversation ${conversation.id}`)
  console.log(`🔄 Conversation state - currentWorkflowNode: ${currentNodeId}, workflowContext:`, context)

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

  const engine = new WorkflowEngine(nodes, conv.workflowId, conv.phone, incomingText, connections)
  engine.setUserResponse(incomingText)

  // Set existing context if available
  if (context.userData) {
    engine.getContext().userData = context.userData
  }

  // Set current node if available
  if (currentNodeId) {
    console.log(`🔄 Setting current node in engine: ${currentNodeId}`)
    engine.setCurrentNodeId(currentNodeId)
  } else {
    console.log(`🔄 No current node found, finding start node`)
    // Find the start node when no current node is set
    const startNode = nodes.find(node => node.type === 'START')
    if (startNode) {
      currentNodeId = startNode.id
      console.log(`🔄 Found start node: ${currentNodeId}`)
      engine.setCurrentNodeId(currentNodeId)
    } else {
      console.log(`🔄 No start node found, engine will start from default`)
    }
  }

  // Execute next node
  console.log(`🔄 Executing workflow node: ${currentNodeId || 'start'}`)
  let result = await engine.executeNextNode()
  console.log(`🔄 Workflow execution result:`, result)

  // Handle response from first node
  if (result.response) {
    console.log(`🔄 Sending workflow response: ${result.response}`)
    await sendAIMessage(conversation, result.response)
  }

  // Continue executing nodes if we shouldn't stop and have a next node
  while (!result.shouldStop && result.nextNodeId) {
    console.log(`🔄 Continuing to next node: ${result.nextNodeId}`)
    result = await engine.executeNextNode()
    console.log(`🔄 Continued execution result:`, result)

    // Handle response from continued execution
    if (result.response) {
      console.log(`🔄 Sending workflow response: ${result.response}`)
      await sendAIMessage(conversation, result.response)
    }
  }

  // Update conversation state
  const updatedContext = engine.getContext()
  console.log(`🔄 Updating conversation state - currentNodeId: ${updatedContext.currentNodeId}, userData:`, updatedContext.userData)

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
  await prisma.conversation.update({
    where: { id: conv.id },
    data: {
      currentWorkflowNode: updatedContext.currentNodeId,
      workflowContext: { userData: ctxUserData },
      awaitingInput: !!ctxUserData.collectingField
    }
  })

  console.log(`🔄 Conversation state updated successfully`)

  // Handle transfer to human
  if (result.shouldStop && updatedContext.currentNodeId) {
    const currentNode = nodes.find(n => n.id === updatedContext.currentNodeId)
    if (currentNode?.type === 'TRANSFER_HUMAN') {
      await transferToHuman(conversation, 'Transferência automática do workflow')
      return
    }
    if (currentNode?.type === 'END') {
      // Workflow completed
      return
    }
  }

  // Continue execution if there's a next node and we shouldn't stop
  if (result.nextNodeId && !result.shouldStop) {
    await advanceWorkflow(conversation, '')
  }
}
