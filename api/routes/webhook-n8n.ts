import { Router, Request, Response } from 'express'
import prisma from '../prisma/client.js'
import { whatsAppService } from '../services/whatsapp.js'
import { getRealtime } from '../services/realtime.js'

const router = Router()

/**
 * Endpoint para receber respostas do N8N
 * N8N chama este endpoint após processar a mensagem
 */
router.post('/n8n-response', async (req: Request, res: Response) => {
  try {
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
      intent,
      action,
      aiProvider
    })

    // Validação básica
    if (!conversationId || !message) {
      return res.status(400).json({
        error: 'conversationId e message são obrigatórios'
      })
    }

    // 1. Buscar conversa
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { patient: true }
    })

    if (!conversation) {
      console.error('❌ Conversa não encontrada:', conversationId)
      return res.status(404).json({ error: 'Conversa não encontrada' })
    }

    // 2. Enviar mensagem ao WhatsApp
    try {
      await whatsAppService.sendMessage(conversation.phone, message)
      console.log('✅ Mensagem enviada ao WhatsApp')
    } catch (error) {
      console.error('❌ Erro ao enviar WhatsApp:', error)
      // Não retorna erro aqui, continua o processamento
    }

    // 3. Salvar mensagem no histórico
    const savedMessage = await prisma.message.create({
      data: {
        conversationId,
        from: 'bot',
        content: message,
        metadata: {
          intent,
          entities,
          aiProvider: aiProvider || 'n8n',
          source: 'n8n',
          timestamp: new Date().toISOString()
        }
      }
    })

    console.log('💾 Mensagem salva no banco:', savedMessage.id)

    // 4. Atualizar contexto da conversa
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        currentIntent: intent,
        workflowContext: entities || {},
        lastTimestamp: new Date(),
        metadata: {
          ...(conversation.metadata as any || {}),
          lastAiProvider: aiProvider,
          lastIntent: intent
        }
      }
    })

    // 5. Notificar frontend via Socket.IO
    const io = getRealtime()
    if (io) {
      io.to(conversationId).emit('new_message', {
        id: savedMessage.id,
        conversationId,
        from: 'bot',
        content: message,
        timestamp: savedMessage.timestamp,
        metadata: savedMessage.metadata
      })
      console.log('📡 Mensagem enviada via Socket.IO')
    }

    // 6. Ações especiais baseadas no intent
    if (action === 'transfer_human' || intent === 'FALAR_ATENDENTE') {
      console.log('👤 Transferindo para humano...')

      await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          queue: 'PRINCIPAL',
          status: 'WAITING',
          priority: 'NORMAL'
        }
      })

      // Criar mensagem de sistema para o atendente
      const systemMessage = await prisma.message.create({
        data: {
          conversationId,
          from: 'system',
          content: `🤖 Bot transferiu conversa:\n\n**Motivo:** ${entities?.transferReason || 'Paciente solicitou atendimento humano'}\n\n**Última intenção:** ${intent}\n**Histórico:** Paciente estava em conversa com bot N8N`,
          metadata: {
            type: 'system',
            action: 'transfer',
            source: 'n8n'
          }
        }
      })

      if (io) {
        io.to(conversationId).emit('new_message', systemMessage)
        io.emit('conversation_updated', {
          id: conversationId,
          queue: 'PRINCIPAL',
          status: 'WAITING'
        })
      }

      console.log('✅ Conversa transferida para fila PRINCIPAL')
    }

    // 7. Se agendamento foi criado
    if (action === 'appointment_created' || intent === 'AGENDAR') {
      if (entities?.appointmentId) {
        console.log('📅 Agendamento criado:', entities.appointmentId)

        // Criar mensagem de sistema com resumo
        const summaryMessage = await prisma.message.create({
          data: {
            conversationId,
            from: 'system',
            content: `✅ **Agendamento criado via Bot N8N**\n\n` +
              `**Procedimento:** ${entities.procedimento || 'N/A'}\n` +
              `**Unidade:** ${entities.clinica || 'N/A'}\n` +
              `**Data:** ${entities.data || 'N/A'}\n` +
              `**Horário:** ${entities.horario || 'N/A'}\n` +
              `**Convênio:** ${entities.convenio || 'Particular'}`,
            metadata: {
              type: 'system',
              action: 'appointment_created',
              appointmentId: entities.appointmentId,
              source: 'n8n'
            }
          }
        })

        if (io) {
          io.to(conversationId).emit('new_message', summaryMessage)
        }

        // Transferir para fila para confirmação
        await prisma.conversation.update({
          where: { id: conversationId },
          data: {
            queue: 'PRINCIPAL',
            status: 'WAITING',
            priority: 'HIGH'
          }
        })

        if (io) {
          io.emit('conversation_updated', {
            id: conversationId,
            queue: 'PRINCIPAL',
            status: 'WAITING',
            priority: 'HIGH'
          })
        }
      }
    }

    res.json({
      success: true,
      messageId: savedMessage.id,
      conversationId,
      delivered: true
    })
  } catch (error: any) {
    console.error('❌ Erro ao processar resposta N8N:', error)
    res.status(500).json({
      error: 'Erro ao processar resposta',
      details: error.message
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

export default router
