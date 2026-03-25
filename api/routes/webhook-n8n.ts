import { Router, Request, Response } from 'express'
import prisma from '../prisma/client.js'
import { WhatsAppService } from '../services/whatsapp.js'
import { getRealtime } from '../realtime.js'

const router = Router()

// Middleware de logging para debug
router.use((req, res, next) => {
  console.log('🔍 [N8N Webhook] Requisição recebida:', {
    method: req.method,
    path: req.path,
    headers: {
      'content-type': req.headers['content-type'],
      'user-agent': req.headers['user-agent']
    },
    bodySize: JSON.stringify(req.body).length
  })
  next()
})

// WhatsApp service instance
const whatsappService = new WhatsAppService(
  process.env.META_ACCESS_TOKEN || '',
  process.env.META_PHONE_NUMBER_ID || ''
)

/**
 * Endpoint para receber respostas do N8N
 * N8N chama este endpoint após processar a mensagem
 */
router.post('/n8n-response', async (req: Request, res: Response) => {
  try {
    console.log('📨 Body completo recebido:', JSON.stringify(req.body, null, 2))

    const {
      conversationId,
      message,
      intent,
      action,
      entities,
      aiProvider
    } = req.body

    console.log('📨 Resposta do N8N recebida:', {
      conversationId,
      message: message?.substring(0, 50) + '...',
      intent,
      action,
      aiProvider
    })

    // Validação básica
    if (!conversationId || !message) {
      console.error('❌ Validação falhou:', { conversationId: !!conversationId, message: !!message })
      return res.status(400).json({
        error: 'conversationId e message são obrigatórios'
      })
    }

    // 1. Buscar conversa
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { patient: true, assignedTo: true }
    })

    if (!conversation) {
      console.error('❌ Conversa não encontrada:', conversationId)
      return res.status(404).json({ error: 'Conversa não encontrada' })
    }

    // ✅ VERIFICAR SE CONVERSA AINDA ESTÁ EM BOT_QUEUE
    // Qualquer status diferente de BOT_QUEUE indica handoff para humano:
    //   EM_ATENDIMENTO = atendente assumiu
    //   PRINCIPAL      = na fila humana (assumida e devolvida, ou timeout do bot)
    //   AGUARDANDO     = aguardando input humano
    // Em todos esses casos o bot NÃO deve enviar mensagem nem alterar o status.
    if (conversation.status !== 'BOT_QUEUE') {
      console.log(`⚠️ Conversa ${conversationId} não está mais em BOT_QUEUE (status atual: ${conversation.status}, agente: ${conversation.assignedTo?.name || 'nenhum'}). Ignorando resposta do bot.`)
      return res.status(200).json({
        success: true,
        skipped: true,
        reason: 'Conversa não está mais em BOT_QUEUE',
        conversationId,
        currentStatus: conversation.status,
        assignedTo: conversation.assignedTo?.name ?? null
      })
    }

    // 2. Enviar mensagem ao WhatsApp
    try {
      await whatsappService.sendTextMessage(conversation.phone, message)
      console.log('✅ Mensagem enviada ao WhatsApp')
    } catch (error) {
      console.error('❌ Erro ao enviar WhatsApp:', error)
      // Não retorna erro aqui, continua o processamento
    }

    // 3. Salvar mensagem no histórico
    let savedMessage
    try {
      console.log('💾 Tentando salvar mensagem:', {
        conversationId,
        phoneNumber: conversation.phone,
        messageLength: message.length,
        messageType: 'TEXT',
        direction: 'SENT',
        from: 'BOT'
      })

      savedMessage = await prisma.message.create({
        data: {
          conversationId,
          phoneNumber: conversation.phone,
          messageText: message,
          messageType: 'TEXT',
          direction: 'SENT',
          from: 'BOT', // Usar maiúsculo para consistência
          metadata: {
            intent,
            entities: entities || {},
            aiProvider: aiProvider || 'n8n',
            source: 'n8n',
            timestamp: new Date().toISOString()
          }
        }
      })

      console.log('💾 Mensagem salva no banco:', savedMessage.id)
    } catch (dbError: any) {
      console.error('❌ Erro ao salvar mensagem no banco:', dbError)
      console.error('❌ Detalhes do erro:', {
        message: dbError.message,
        code: dbError.code,
        meta: dbError.meta
      })
      throw dbError
    }

    // 4. Atualizar contexto da conversa
    try {
      console.log('🔄 Atualizando contexto da conversa...')

      // Preparar workflowContext com appointmentFlow e selectedUnit
      const workflowContext: any = {
        ...(conversation.workflowContext as any || {}),
        lastAiProvider: aiProvider,
        lastIntent: intent,
        entities: entities || {}
      }

      // ✅ SALVAR selectedUnit se existir
      if (req.body.selectedUnit) {
        workflowContext.selectedUnit = req.body.selectedUnit
        console.log('💾 Salvando selectedUnit no contexto:', {
          id: req.body.selectedUnit.id,
          name: req.body.selectedUnit.name
        })
      }

      // Se tem appointmentFlow na requisição, salvar no contexto
      if (req.body.appointmentFlow) {
        workflowContext.appointmentFlow = req.body.appointmentFlow
        console.log('💾 Salvando appointmentFlow no contexto:', req.body.appointmentFlow.step)
      }

      await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          workflowContext: workflowContext,
          lastTimestamp: new Date(),
          channelMetadata: {
            ...(conversation.channelMetadata as any || {}),
            lastAiProvider: aiProvider,
            lastIntent: intent
          }
        }
      })
      console.log('✅ Contexto da conversa atualizado')
    } catch (updateError: any) {
      console.error('❌ Erro ao atualizar contexto da conversa:', updateError)
      // Não falha o processamento se a atualização falhar
    }

    // 5. Notificar frontend via Socket.IO
    try {
      const realtime = getRealtime()
      if (realtime && realtime.io) {
        realtime.io.to(`conv:${conversationId}`).emit('new_message', {
          id: savedMessage.id,
          conversationId,
          from: 'bot',
          content: message,
          timestamp: savedMessage.timestamp,
          metadata: savedMessage.metadata
        })
        console.log('📡 Mensagem enviada via Socket.IO')
      }
    } catch (error) {
      console.warn('⚠️ Socket.IO não disponível (modo dev/teste):', error)
      // Não falha o processamento se Socket.IO não estiver disponível
    }

    // 6. Ações especiais baseadas no intent ou action
    // ✅ Suporta múltiplos formatos de transferência
    const shouldTransfer =
      action === 'transfer_human' ||
      action === 'TRANSFER_TO_QUEUE' ||
      intent === 'FALAR_ATENDENTE' ||
      intent === 'AGENDAR' ||
      (req.body.requiresQueueTransfer === true) ||
      (req.body.requiresTransfer === true)

    if (shouldTransfer) {
      console.log('👤 Transferindo para fila principal...', {
        action,
        intent,
        requiresQueueTransfer: req.body.requiresQueueTransfer,
        requiresTransfer: req.body.requiresTransfer
      })

      // ✅ Verificar se conversa não está EM_ATENDIMENTO antes de transferir
      // Se já estiver com atendente, não transferir de volta para PRINCIPAL
      const currentConv = await prisma.conversation.findUnique({
        where: { id: conversationId },
        select: { status: true, assignedToId: true }
      })

      if (currentConv?.status === 'EM_ATENDIMENTO' && currentConv.assignedToId) {
        console.log('⚠️ Conversa já está EM_ATENDIMENTO. Não transferindo para PRINCIPAL.')
        // Continuar processamento sem transferir
      } else {
        await prisma.conversation.update({
          where: { id: conversationId },
          data: {
            status: 'PRINCIPAL',
            assignedToId: null,
            awaitingInput: true
          }
        })

        // Criar mensagem de sistema para o atendente (somente se transferiu)
        const systemMessage = await prisma.message.create({
          data: {
            conversationId,
            phoneNumber: conversation.phone,
            messageText: `🤖 Bot transferiu conversa:

Motivo: ${entities?.transferReason || req.body.queueName || 'Paciente solicitou atendimento'}
Última intenção: ${intent}
Histórico: Paciente estava em conversa com bot N8N`,
            messageType: 'SYSTEM',
            direction: 'SENT',
            from: 'SYSTEM', // Usar maiúsculo para consistência
            systemMessageType: 'TRANSFERRED_TO_QUEUE',
            metadata: {
              type: 'system',
              action: 'transfer',
              source: 'n8n',
              transferReason: entities?.transferReason || 'Paciente solicitou atendimento humano'
            }
          }
        })

        try {
          const realtime = getRealtime()
          if (realtime && realtime.io) {
            realtime.io.to(`conv:${conversationId}`).emit('new_message', systemMessage)
            realtime.io.emit('conversation:updated', {
              id: conversationId,
              status: 'PRINCIPAL',
              reason: 'transfer_human'
            })
          }
        } catch (error) {
          console.warn('⚠️ Socket.IO não disponível:', error)
        }

        console.log('✅ Conversa transferida para fila PRINCIPAL')
      }
    }

    // 7. Se agendamento foi criado
    if (action === 'appointment_created' || intent === 'AGENDAR') {
      if (entities?.appointmentId) {
        console.log('📅 Agendamento criado:', entities.appointmentId)

        // Criar mensagem de sistema com resumo
        const summaryMessage = await prisma.message.create({
          data: {
            conversationId,
            phoneNumber: conversation.phone,
            messageText: `✅ **Agendamento criado via Bot N8N**\n\n` +
              `Procedimento: ${entities.procedimento || 'N/A'}\n` +
              `Unidade: ${entities.clinica || 'N/A'}\n` +
              `Data: ${entities.data || 'N/A'}\n` +
              `Horário: ${entities.horario || 'N/A'}\n` +
              `Convênio: ${entities.convenio || 'Particular'}`,
            messageType: 'SYSTEM',
            direction: 'SENT',
            from: 'SYSTEM', // Usar maiúsculo para consistência
            systemMessageType: 'APPOINTMENT_CREATED',
            metadata: {
              type: 'system',
              action: 'appointment_created',
              appointmentId: entities.appointmentId,
              source: 'n8n'
            }
          }
        })

        try {
          const realtime = getRealtime()
          if (realtime && realtime.io) {
            realtime.io.to(`conv:${conversationId}`).emit('new_message', summaryMessage)
          }
        } catch (error) {
          console.warn('⚠️ Socket.IO não disponível:', error)
        }

        // ✅ Verificar se conversa não está EM_ATENDIMENTO antes de transferir
        const currentConv = await prisma.conversation.findUnique({
          where: { id: conversationId },
          select: { status: true, assignedToId: true }
        })

        if (currentConv?.status === 'EM_ATENDIMENTO' && currentConv.assignedToId) {
          console.log('⚠️ Conversa já está EM_ATENDIMENTO. Não transferindo para PRINCIPAL após agendamento.')
        } else {
          // Transferir para fila para confirmação
          await prisma.conversation.update({
            where: { id: conversationId },
            data: {
              status: 'PRINCIPAL',
              assignedToId: null,
              awaitingInput: true
            }
          })

          try {
            const realtime = getRealtime()
            if (realtime && realtime.io) {
              realtime.io.emit('conversation:updated', {
                id: conversationId,
                status: 'PRINCIPAL',
                reason: 'appointment_created'
              })
            }
          } catch (error) {
            console.warn('⚠️ Socket.IO não disponível:', error)
          }
        }
      }
    }

    console.log('✅ Processamento concluído com sucesso')
    res.json({
      success: true,
      messageId: savedMessage?.id || 'unknown',
      conversationId,
      delivered: true
    })
  } catch (error: any) {
    console.error('❌ Erro ao processar resposta N8N:', error)
    console.error('❌ Tipo do erro:', error.name || typeof error)
    console.error('❌ Mensagem do erro:', error.message)
    console.error('❌ Stack trace:', error.stack)
    console.error('❌ Body recebido:', JSON.stringify(req.body, null, 2))

    // Se for erro de validação do Prisma, retornar erro mais específico
    if (error.code === 'P2002') {
      return res.status(400).json({
        error: 'Erro de validação',
        details: 'Registro duplicado',
        code: error.code
      })
    }

    if (error.code === 'P2025') {
      return res.status(404).json({
        error: 'Registro não encontrado',
        details: error.meta?.cause || 'O registro solicitado não existe',
        code: error.code
      })
    }

    res.status(500).json({
      error: 'Erro ao processar resposta',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno do servidor',
      type: error.name || 'UnknownError',
      code: error.code || 'UNKNOWN'
    })
  }
})

/**
 * Endpoint para N8N testar conectividade
 */
router.get('/n8n-health', async (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'zorahapp-n8n-webhook'
  })
})

/**
 * Endpoint de teste para N8N verificar se consegue enviar dados
 */
router.post('/n8n-test', async (req: Request, res: Response) => {
  console.log('🧪 [TEST] N8N test endpoint chamado')
  console.log('🧪 [TEST] Body recebido:', JSON.stringify(req.body, null, 2))

  res.json({
    success: true,
    message: 'Endpoint de teste funcionando!',
    received: req.body,
    timestamp: new Date().toISOString()
  })
})

export default router
