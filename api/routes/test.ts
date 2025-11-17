import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import prisma from '../prisma/client.js'
import { intelligentBotService } from '../services/intelligentBot.js'
import { CLINIC_DATA } from '../data/clinic.js'
import { getRealtime } from '../realtime.js'
import { processIncomingMessage } from './conversations.js'

const router = Router()

// AI service instance - using intelligent bot service

/**
 * Test endpoint for bot functionality
 * This simulates receiving a WhatsApp message and processes it through the AI
 */
router.post('/test-bot', async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone, message } = req.body

    if (!phone || !message) {
      res.status(400).json({ 
        error: 'Telefone e mensagem são obrigatórios',
        example: { phone: '5511999999999', message: 'Olá, gostaria de marcar uma consulta' }
      })
      return
    }

    console.log(`🤖 Testando bot - Telefone: ${phone}, Mensagem: ${message}`)

    // Process the message directly using AI service
    console.log(`🤖 Processando mensagem: "${message}" do telefone: ${phone}`)
    
    // Create or get patient
    let patient = await prisma.patient.findFirst({
      where: { phone }
    })
    
    if (!patient) {
      patient = await prisma.patient.create({
        data: {
          phone,
          name: `Paciente ${phone.slice(-4)}`
        }
      })
      console.log(`👤 Paciente criado: ${patient.id}`)
    }

    // Create or get conversation
    let conversation = await prisma.conversation.findFirst({
      where: { phone },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    })

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          phone,
          status: 'BOT_QUEUE',
          lastMessage: message,
          patientId: patient.id
        },
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 10
          }
        }
      })
      console.log(`💬 Conversa criada: ${conversation.id}`)
    }

    // Add user message
    const userMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        phoneNumber: phone,
        messageText: message,
        direction: 'RECEIVED',
        from: 'USER'
      }
    })
    console.log(`📨 Mensagem do usuário salva: ${userMessage.id}`)

    // Process with workflow engine unless noWorkflow is requested
    try {
      const noWorkflow = String(req.query.noWorkflow || '').toLowerCase() === 'true' || String(req.query.noWorkflow || '') === '1' || !!req.body?.noWorkflow;
      // Get default workflow
      const latest = await prisma.auditLog.findFirst({ 
        where: { action: 'DEFAULT_WORKFLOW' }, 
        orderBy: { createdAt: 'desc' } 
      })
      
      let workflowId = null
      const details: any = latest?.details as any
      if (details?.id) {
        const wf = await prisma.workflow.findUnique({ where: { id: String(details.id) } })
        if (wf) {
          const cfg = typeof (wf as any).config === 'string' ? (() => { try { return JSON.parse((wf as any).config) } catch { return {} } })() : ((wf as any).config || {})
          const nodes = Array.isArray(cfg?.nodes) ? cfg.nodes : []
          const hasClinicSelection = nodes.some((n: any) => n.id === 'clinic_selection' || (n.type === 'CONDITION' && ((n.data?.condition || n.content?.condition) === 'clinic_selection')))
          if (hasClinicSelection) {
            workflowId = wf.id
          }
        }
      }

      if (!workflowId) {
        // Prefer active workflow that supports clinic_selection
        const activeWorkflows = await prisma.workflow.findMany({ where: { isActive: true }, orderBy: { createdAt: 'desc' } })
        for (const wf of activeWorkflows) {
          const cfg = typeof (wf as any).config === 'string' ? (() => { try { return JSON.parse((wf as any).config) } catch { return {} } })() : ((wf as any).config || {})
          const nodes = Array.isArray(cfg?.nodes) ? cfg.nodes : []
          const hasClinicSelection = nodes.some((n: any) => n.id === 'clinic_selection' || (n.type === 'CONDITION' && ((n.data?.condition || n.content?.condition) === 'clinic_selection')))
          if (hasClinicSelection) { workflowId = wf.id; break }
        }
        // Fallback to most recent active
        if (!workflowId && activeWorkflows[0]) workflowId = activeWorkflows[0].id
      }

      if (workflowId && !noWorkflow) {
        console.log(`🔄 Usando workflow: ${workflowId}`)
        
        // Update conversation to use workflow
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: { 
            workflowId: workflowId,
            status: 'BOT_QUEUE'
          }
        })
        
        // Process with workflow engine
        const { processIncomingMessage } = await import('./conversations.js')
        await processIncomingMessage(phone, message, userMessage.id)
        
        console.log(`✅ Mensagem processada com workflow`)
      } else {
        console.log(`⚠️ Nenhum workflow encontrado ou noWorkflow, usando fluxo direto`)
        
        // Fallback to AI
        const recentMessages = await prisma.message.findMany({
          where: { conversationId: conversation.id },
          orderBy: { createdAt: 'desc' },
          take: 5
        })

        const context = {
          patient: {
            name: patient.name,
            phone: patient.phone
          },
          conversation: {
            status: conversation.status,
            messageCount: recentMessages.length
          },
          history: recentMessages.reverse().map(msg => ({
            role: (msg.direction === 'RECEIVED' ? 'user' : 'assistant') as 'user' | 'assistant',
            content: msg.messageText,
            timestamp: msg.createdAt.toISOString()
          })),
          clinicData: {
            name: CLINIC_DATA.name,
            address: CLINIC_DATA.address,
            phone: CLINIC_DATA.phone,
            procedures: (await import('../data/clinicData.js')).clinicDataService.getProcedures(),
            insuranceCompanies: (await import('../data/clinicData.js')).clinicDataService.getInsuranceCompanies(),
            locations: (await import('../data/clinicData.js')).clinicDataService.getLocations()
          }
        }

        console.log(`🧠 Enviando para IA com contexto:`, JSON.stringify(context, null, 2))
        
        // Process using the same message handler (conversation path)
        await processIncomingMessage(phone, message, userMessage.id)
      }

    } catch (error) {
      console.error('❌ Erro no processamento:', error)
      // Fallback response
      const fallbackMessage = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          phoneNumber: phone,
          messageText: 'Desculpe, estou tendo dificuldades para processar sua mensagem. Vou transferir você para um atendente humano.',
          direction: 'SENT',
          from: 'BOT'
        }
      })
      
      // Transfer to human queue
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { status: 'PRINCIPAL' }
      })
    }

    // Get the updated conversation to see the bot response
    const updatedConversation = await prisma.conversation.findFirst({
      where: { phone },
      include: {
        messages: {
          orderBy: { timestamp: 'asc' },
          take: 10
        }
      }
    })

    if (!updatedConversation) {
      res.status(404).json({ error: 'Conversa não encontrada' })
      return
    }

    // Get the latest bot message (should be the workflow/AI response)
    const botMessage = updatedConversation.messages.filter(m => m.direction === 'SENT').pop()

    res.json({
      success: true,
      conversationId: updatedConversation.id,
      status: updatedConversation.status,
      workflowId: updatedConversation.workflowId,
      botResponse: botMessage?.messageText || 'Bot processou a mensagem',
      messageCount: updatedConversation.messages.length,
      lastMessages: updatedConversation.messages // Already in chronological order
    })

  } catch (error) {
    console.error('❌ Erro no teste do bot:', error)
    res.status(500).json({ 
      error: 'Erro ao testar bot',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    })
  }
})

/**
 * Get test conversation
 */
router.get('/test-conversation/:phone', async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone } = req.params

    const conversation = await prisma.conversation.findFirst({
      where: { phone },
      include: {
        messages: {
          orderBy: { timestamp: 'asc' },
          take: 50
        },
        patient: true
      }
    })

    if (!conversation) {
      res.status(404).json({ error: 'Conversa não encontrada' })
      return
    }

    res.json({
      success: true,
      conversation: {
        id: conversation.id,
        phone: conversation.phone,
        status: conversation.status,
        assignedTo: conversation.assignedToId,
        patient: conversation.patient,
        messages: conversation.messages,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt
      }
    })

  } catch (error) {
    console.error('❌ Erro ao buscar conversa de teste:', error)
    res.status(500).json({ 
      error: 'Erro ao buscar conversa',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    })
  }
})

/**
 * Clear test data
 */
router.delete('/test-cleanup/all', async (req: Request, res: Response): Promise<void> => {
  try {
    const msgResult = await prisma.message.deleteMany({})
    const convResult = await prisma.conversation.deleteMany({})

    res.json({
      success: true,
      message: 'Todas as conversas e mensagens foram removidas',
      deleted: {
        messages: msgResult.count,
        conversations: convResult.count
      }
    })
  } catch (error) {
    console.error('❌ Erro ao limpar todas as conversas:', error)
    res.status(500).json({ 
      error: 'Erro ao limpar conversas',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    })
  }
})

router.delete('/test-cleanup/:phone', async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone } = req.params

    // Delete messages first (due to foreign key constraints)
    await prisma.message.deleteMany({
      where: {
        conversation: {
          phone
        }
      }
    })

    // Delete conversation
    const result = await prisma.conversation.deleteMany({
      where: { phone }
    })

    res.json({
      success: true,
      message: `Dados de teste limpos para ${phone}`,
      deletedCount: result.count
    })

  } catch (error) {
    console.error('❌ Erro ao limpar dados de teste:', error)
    res.status(500).json({ 
      error: 'Erro ao limpar dados',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    })
  }
})

export default router
