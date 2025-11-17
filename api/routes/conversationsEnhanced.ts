import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import prisma from '../prisma/client.js'
import { authMiddleware } from '../utils/auth.js'
import { IntelligentBotService } from '../services/intelligentBot.js'
import type { AIContext } from '../services/intelligentBot'
import { clinicDataService } from '../data/clinicData.js'
import { ConversationTransferService } from '../services/conversationTransfer.js'
import { sessionManager } from '../services/conversationSession.js'
import { upload, FileValidationService } from '../services/fileValidation.js'
import crypto from 'crypto'
import { logger, conversationLogger, transferLogger, sessionLogger } from '../utils/logger.js'
import { Server as SocketIOServer } from 'socket.io'

const router = Router()

// Initialize services
let transferService: ConversationTransferService
let io: SocketIOServer

// Initialize intelligent bot service
const botService = new IntelligentBotService(
  process.env.OPENAI_API_KEY || '',
  'gpt-3.5-turbo'
)

// Initialize services with Socket.IO
export const initializeConversationServices = (socketIO: SocketIOServer) => {
  io = socketIO
  transferService = new ConversationTransferService(io)
}

// Enhanced conversation schema
const conversationSchema = z.object({
  patientPhone: z.string().regex(/^\d{10,15}$/),
  status: z.enum(['BOT_QUEUE', 'PRINCIPAL', 'HUMAN', 'MINHAS_CONVERSAS', 'BOT', 'CLOSED']).default('BOT_QUEUE'),
  assignedToId: z.string().optional(),
  workflowId: z.string().optional(),
  currentWorkflowNode: z.string().optional(),
  notes: z.string().optional()
})

// Get conversations with enhanced filtering
router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      status, 
      priority, 
      assignedTo, 
      page = 1, 
      limit = 20, 
      search,
      workflowId,
      includeHistory = false
    } = req.query

    const skip = (Number(page) - 1) * Number(limit)

    const where: any = {}
    
    // Status filtering
    if (status) {
      if (status === 'ACTIVE') {
        where.status = { in: ['BOT_QUEUE', 'PRINCIPAL', 'HUMAN', 'MINHAS_CONVERSAS'] }
      } else if (status === 'BOT') {
        where.status = { in: ['BOT', 'BOT_QUEUE'] }
      } else if (status === 'HUMAN') {
        where.status = { in: ['PRINCIPAL', 'HUMAN', 'MINHAS_CONVERSAS'] }
      } else {
        where.status = status
      }
    }

    if (!includeHistory) {
      where.status = { not: 'HISTORY' }
    }

    if (priority) where.priority = priority
    if (workflowId) where.workflowId = workflowId
    if (assignedTo) where.assignedToId = assignedTo

    // Search functionality
    if (search) {
      where.OR = [
        { patient: { name: { contains: search, mode: 'insensitive' } } },
        { patient: { phone: { contains: search, mode: 'insensitive' } } },
        { patient: { email: { contains: search, mode: 'insensitive' } } },
        { lastMessage: { contains: search, mode: 'insensitive' } }
      ]
    }

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          patient: true,
          assignedTo: {
            select: { id: true, name: true, email: true, role: true }
          },
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' }
          }
        },
        orderBy: [
          { updatedAt: 'desc' }
        ]
      }),
      prisma.conversation.count({ where })
    ])

    res.json({
      conversations: conversations.map(conv => ({
        ...conv,
        lastMessage: conv.messages[0] || null,
        messages: undefined // Remove messages array to reduce payload
      })),
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

// Get conversation by ID with full details
router.get('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        patient: true,
        assignedTo: {
          select: { id: true, name: true, email: true, role: true }
        },
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    if (!conversation) {
      res.status(404).json({ error: 'Conversa não encontrada' })
      return
    }

    res.json(conversation)
  } catch (error) {
    console.error('Erro ao buscar conversa:', error)
    res.status(500).json({ error: 'Erro interno' })
  }
})

// Create new conversation with intelligent bot integration
router.post('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const data = conversationSchema.parse(req.body)

    // Check if patient exists
    const patient = await prisma.patient.findUnique({
      where: { phone: data.patientPhone }
    })

    if (!patient) {
      conversationLogger.warn('Patient not found', { phone: data.patientPhone })
      res.status(404).json({ error: 'Paciente não encontrado' })
      return
    }

    // Create conversation
    const conversation = await prisma.conversation.create({
      data: {
        phone: data.patientPhone,
        patientId: patient.id,
        status: data.status || 'BOT_QUEUE',
        assignedToId: data.assignedToId,
        workflowId: data.workflowId,
        currentWorkflowNode: data.currentWorkflowNode,
        lastMessage: 'Conversação iniciada',
        lastTimestamp: new Date(),
        awaitingInput: false
      },
      include: {
        patient: true,
        assignedTo: true
      }
    })

    // Initialize session management
    await sessionManager.startSession(conversation.id, req.user.id)

    // Initialize bot context
    // Contexto inicial ficará disponível no serviço ao processar a primeira mensagem

    conversationLogger.info('Conversation created', {
      conversationId: conversation.id,
      patientId: patient.id,
      status: conversation.status,
      userId: req.user.id
    })

    res.status(201).json(conversation)
  } catch (error) {
    if (error instanceof z.ZodError) {
      conversationLogger.warn('Invalid conversation data', { errors: error.errors })
      res.status(400).json({ error: 'Dados inválidos', details: error.errors })
      return
    }
    conversationLogger.error('Error creating conversation', { error })
    res.status(500).json({ error: 'Erro interno' })
  }
})

// Update conversation status with queue management
router.patch('/:id/status', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { status, assignedTo, notes } = req.body

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: { 
        patient: true, 
        assignedTo: { select: { id: true, name: true, email: true, role: true } }
      }
    })

    if (!conversation) {
      res.status(404).json({ error: 'Conversa não encontrada' })
      return
    }

    // Handle queue transitions
    let updateData: any = { status, notes }
    
    if (status === 'MINHAS_CONVERSAS' && assignedTo) {
      updateData.assignedToId = assignedTo
    } else if (status === 'PRINCIPAL') {
      updateData.assignedToId = null
    }

    const updatedConversation = await prisma.conversation.update({
      where: { id },
      data: updateData,
      include: {
        patient: true,
        assignedTo: { select: { id: true, name: true, email: true, role: true } }
      }
    })

    res.json(updatedConversation)
  } catch (error) {
    console.error('Erro ao atualizar status da conversa:', error)
    res.status(500).json({ error: 'Erro interno' })
  }
})

// Assign conversation to user with timeout mechanism
router.post('/:id/assign', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { userId, timeout = 30 } = req.body // 30 seconds default timeout

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: { 
        patient: true, 
        assignedTo: { select: { id: true, name: true, email: true, role: true } }
      }
    })

    if (!conversation) {
      res.status(404).json({ error: 'Conversa não encontrada' })
      return
    }

    if (conversation.assignedTo?.id && conversation.assignedTo.id !== userId) {
      res.status(400).json({ error: 'Conversa já atribuída a outro usuário' })
      return
    }

    // Assign conversation
    const updatedConversation = await prisma.conversation.update({
      where: { id },
      data: {
        assignedToId: userId,
        status: 'EM_ATENDIMENTO',
      },
      include: {
        patient: true,
        assignedTo: { select: { id: true, name: true, email: true, role: true } }
      }
    })

    // Set up timeout mechanism
    setTimeout(async () => {
      try {
        const currentConv = await prisma.conversation.findUnique({
          where: { id }
        })
        
        if (currentConv?.assignedToId === userId && currentConv.status === 'EM_ATENDIMENTO') {
          // Auto-release conversation
          await prisma.conversation.update({
            where: { id },
            data: {
              assignedToId: null,
              status: 'PRINCIPAL'
            }
          })
          
          // Notify via socket
          const io = req.app.get('io')
          if (io) {
            io.to(`user-${userId}`).emit('conversation_auto_released', {
              conversationId: id,
              reason: 'timeout'
            })
          }
        }
      } catch (error) {
        console.error('Erro ao liberar conversa por timeout:', error)
      }
    }, timeout * 1000)

    res.json(updatedConversation)
  } catch (error) {
    console.error('Erro ao atribuir conversa:', error)
    res.status(500).json({ error: 'Erro interno' })
  }
})

// Process message with intelligent bot
router.post('/:id/process', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { message } = req.body

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: { patient: true, messages: { orderBy: { createdAt: 'desc' }, take: 10 } }
    })

    if (!conversation) {
      conversationLogger.warn('Conversation not found for processing', { conversationId: id })
      res.status(404).json({ error: 'Conversa não encontrada' })
      return
    }

    // Update session activity
    try {
      await sessionManager.updateSessionActivity(id)
    } catch (sessionError) {
      conversationLogger.warn('Failed to update session activity', { conversationId: id, error: sessionError })
    }

    // Save user message
    const userMessage = await prisma.message.create({
      data: {
        conversationId: id,
        phoneNumber: conversation.patient?.phone || conversation.phone,
        messageText: message,
        direction: 'RECEIVED',
        from: 'USER'
      }
    })

    conversationLogger.info('User message saved', {
      conversationId: id,
      messageId: userMessage.id,
      userId: req.user.id
    })

    // Process with intelligent bot
    if (conversation.status === 'BOT_QUEUE') {
      try {
        const botContext = botService.getContext(id) || {
          patient: {
            id: conversation.patient.id,
            name: conversation.patient.name,
            phone: conversation.patient.phone,
            insuranceCompany: conversation.patient.insuranceCompany
          },
          history: conversation.messages.map(msg => ({
            role: ((msg as any).from === 'USER' ? 'user' : 'assistant') as 'user' | 'assistant',
            content: String((msg as any).messageText || ''),
            timestamp: String((msg as any).createdAt?.toISOString?.() || new Date().toISOString())
          })).reverse()
        }

        const startTime = Date.now()
        const aiResponse = await botService.processMessage(
          message,
          conversation.patient.phone,
          id,
          botContext
        )
        const processingTime = Date.now() - startTime

        conversationLogger.info('AI processing completed', {
          conversationId: id,
          intent: aiResponse.intent,
          sentiment: aiResponse.sentiment,
          confidence: aiResponse.confidence,
          processingTime,
          suggestedAction: aiResponse.suggestedAction
        })

        // Save bot response
        const botMessage = await prisma.message.create({
          data: {
            conversationId: id,
            phoneNumber: conversation.patient?.phone || conversation.phone,
            messageText: aiResponse.response,
            direction: 'SENT',
            from: 'BOT',
            timestamp: new Date()
          }
        })

        // Handle suggested actions
        if (aiResponse.suggestedAction === 'transfer_human') {
          await prisma.conversation.update({
            where: { id },
            data: {
              status: 'PRINCIPAL',
              awaitingInput: true
            }
          })

          conversationLogger.info('Conversation transferred to human', {
            conversationId: id,
            reason: 'bot_suggestion',
            intent: aiResponse.intent,
            confidence: aiResponse.confidence
          })
        } else if (aiResponse.suggestedAction === 'schedule_appointment') {
          await prisma.conversation.update({
            where: { id },
            data: {
              status: 'PRINCIPAL',
              awaitingInput: true
            }
          })

          conversationLogger.info('Scheduling intent detected - moved to principal', {
            conversationId: id,
            intent: aiResponse.intent,
            confidence: aiResponse.confidence
          })
        }

        res.json({
          message: userMessage,
          botResponse: botMessage,
          aiAnalysis: {
            intent: aiResponse.intent,
            sentiment: aiResponse.sentiment,
            confidence: aiResponse.confidence,
            suggestedAction: aiResponse.suggestedAction,
            context: aiResponse.context
          }
        })
      } catch (botError) {
        conversationLogger.error('AI processing failed', {
          conversationId: id,
          error: botError,
          message: message
        })
        
        // Fallback to simple response
        const fallbackMessage = await prisma.message.create({
          data: {
            conversationId: id,
            phoneNumber: conversation.patient?.phone || conversation.phone,
            messageText: 'Desculpe, estou com dificuldades para processar sua mensagem. Vou transferir você para um atendente humano. Por favor, aguarde.',
            direction: 'SENT',
            from: 'BOT'
          }
        })

        // Transfer to human
          await prisma.conversation.update({
            where: { id },
            data: {
              status: 'PRINCIPAL',
              awaitingInput: true
            }
          })

        conversationLogger.info('Conversation transferred to human due to bot error', {
          conversationId: id,
          reason: 'bot_processing_error'
        })

        res.json({
          message: userMessage,
          botResponse: fallbackMessage,
          error: 'Bot processing error'
        })
      }
    } else {
      // Human conversation - just save the message
      conversationLogger.info('Human conversation message saved', {
        conversationId: id,
        messageId: userMessage.id,
        assignedToId: conversation.assignedToId
      })
      res.json({ message: userMessage })
    }
  } catch (error) {
    conversationLogger.error('Error processing message', {
      conversationId: req.params.id,
      error,
      message: req.body.message
    })
    res.status(500).json({ error: 'Erro interno' })
  }
})

// Get conversation statistics
router.get('/stats/overview', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const [
      totalConversations,
      activeConversations,
      botConversations,
      humanConversations,
      closedConversations,
      todayConversations
    ] = await Promise.all([
      prisma.conversation.count(),
      prisma.conversation.count({
        where: { status: { in: ['BOT_QUEUE', 'PRINCIPAL', 'HUMAN', 'MINHAS_CONVERSAS'] } }
      }),
      prisma.conversation.count({
        where: { status: { in: ['BOT', 'BOT_QUEUE'] } }
      }),
      prisma.conversation.count({
        where: { status: { in: ['PRINCIPAL', 'HUMAN', 'MINHAS_CONVERSAS'] } }
      }),
      prisma.conversation.count({
        where: { status: 'CLOSED' }
      }),
      prisma.conversation.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      })
    ])

    res.json({
      totalConversations,
      activeConversations,
      botConversations,
      humanConversations,
      closedConversations,
      avgResponseTime: 0,
      todayConversations,
      conversionRate: totalConversations > 0 ? (closedConversations / totalConversations * 100).toFixed(1) : 0
    })
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error)
    res.status(500).json({ error: 'Erro interno' })
  }
})

// Transfer conversation request with 30-second timeout
router.post('/:id/transfer-request', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { targetUserId, reason } = req.body
    const currentUserId = req.user.id

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: { 
        assignedTo: { select: { id: true, name: true, email: true, role: true } },
        patient: true,
        messages: { orderBy: { createdAt: 'desc' }, take: 1 }
      }
    })

    if (!conversation) {
      transferLogger.warn('Transfer request failed - conversation not found', { conversationId: id })
      res.status(404).json({ error: 'Conversa não encontrada' })
      return
    }

    if (conversation.assignedToId !== currentUserId) {
      transferLogger.warn('Transfer request failed - unauthorized', { 
        conversationId: id,
        requestedBy: currentUserId,
        assignedTo: conversation.assignedToId
      })
      res.status(403).json({ error: 'Você não tem permissão para transferir esta conversa' })
      return
    }

    // Use the transfer service for 30-second timeout mechanism
    const transferSuccess = await transferService.requestTransfer(id, currentUserId, targetUserId)

    if (!transferSuccess) {
      transferLogger.warn('Transfer request failed - service error', { 
        conversationId: id,
        fromUserId: currentUserId,
        toUserId: targetUserId
      })
      res.status(400).json({ error: 'Falha ao criar solicitação de transferência' })
      return
    }

    transferLogger.info('Transfer request created', {
      conversationId: id,
      fromUserId: currentUserId,
      toUserId: targetUserId,
      reason
    })

    res.json({
      success: true,
      message: 'Solicitação de transferência enviada com sucesso',
      timeout: 30 // 30 seconds
    })
  } catch (error) {
    transferLogger.error('Error creating transfer request', { error, conversationId: req.params.id })
    res.status(500).json({ error: 'Erro interno' })
  }
})

// Accept/Reject transfer request
router.patch('/transfers/:transferId/respond', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { transferId } = req.params
    const { action, reason } = req.body // 'accept' or 'reject'
    const currentUserId = req.user.id

    const transferRequest = await (prisma as any).conversationTransfer.findUnique({
      where: { id: transferId },
      include: { conversation: true, fromUser: true, toUser: true }
    })

    if (!transferRequest) {
      res.status(404).json({ error: 'Solicitação de transferência não encontrada' })
      return
    }

    if (transferRequest.toUserId !== currentUserId) {
      res.status(403).json({ error: 'Você não tem permissão para responder esta solicitação' })
      return
    }

    if (transferRequest.status !== 'PENDING') {
      res.status(400).json({ error: 'Esta solicitação já foi respondida' })
      return
    }

    const updatedTransfer = await (prisma as any).conversationTransfer.update({
      where: { id: transferId },
      data: {
        status: action === 'accept' ? 'ACCEPTED' : 'REJECTED',
        responseReason: reason,
        respondedAt: new Date()
      }
    })

    if (action === 'accept') {
      // Transfer the conversation
      await prisma.conversation.update({
        where: { id: transferRequest.conversationId },
        data: {
          assignedToId: currentUserId,
          status: 'EM_ATENDIMENTO'
        }
      })
    }

    // Notify original user
    const io = req.app.get('io')
    if (io) {
      io.to(`user-${transferRequest.fromUserId}`).emit('transfer_response', {
        transferRequest: updatedTransfer,
        action,
        reason
      })
    }

    res.json(updatedTransfer)
  } catch (error) {
    console.error('Erro ao responder solicitação de transferência:', error)
    res.status(500).json({ error: 'Erro interno' })
  }
})

// File upload endpoint with validation
router.post('/:id/upload-files', authMiddleware, upload.array('files', 5), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const files = req.files as Express.Multer.File[]

    if (!files || files.length === 0) {
      res.status(400).json({ error: 'Nenhum arquivo enviado' })
      return
    }

    // Validate files
    const validation = FileValidationService.validateFiles(files)

    if (!validation.valid) {
      res.status(400).json({ 
        error: 'Validação de arquivos falhou', 
        details: validation.errors 
      })
      return
    }

    // Check if conversation exists
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: { patient: true }
    })

    if (!conversation) {
      res.status(404).json({ error: 'Conversa não encontrada' })
      return
    }

    const savedFiles = validation.validatedFiles.map((file) => ({
      id: crypto.randomUUID(),
      conversationId: id,
      originalName: file.originalName,
      fileName: FileValidationService.generateUniqueFilename(file.originalName),
      mimeType: file.mimeType,
      size: file.size,
      category: file.category,
      uploadedBy: req.user.id,
      status: 'ACTIVE',
      uploadedAt: new Date()
    }))

    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: 'FILE_UPLOAD',
        details: { conversationId: id, files: savedFiles }
      }
    })

    // Create system message about file upload
    const fileList = savedFiles.map(f => `${f.originalName} (${f.category})`).join(', ')
    await prisma.message.create({
      data: {
        conversationId: id,
        phoneNumber: conversation.patient?.phone || conversation.phone,
        messageText: `Arquivos enviados: ${fileList}`,
        direction: 'SENT',
        from: 'BOT'
      }
    })

    conversationLogger.info('Files uploaded successfully', {
      conversationId: id,
      fileCount: savedFiles.length,
      categories: validation.validatedFiles.map(f => f.category),
      userId: req.user.id
    })

    res.json({
      success: true,
      files: savedFiles,
      message: `${savedFiles.length} arquivo(s) enviado(s) com sucesso`
    })
  } catch (error) {
    conversationLogger.error('File upload error', { error, conversationId: req.params.id })
    res.status(500).json({ error: 'Erro ao processar arquivos' })
  }
})

// Get conversation files
router.get('/:id/files', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const uploadLogs = await prisma.auditLog.findMany({
      where: { action: 'FILE_UPLOAD' },
      orderBy: { createdAt: 'desc' }
    })
    const deleteLogs = await prisma.auditLog.findMany({
      where: { action: 'FILE_DELETE' },
      orderBy: { createdAt: 'desc' }
    })
    const deletedIds = new Set(deleteLogs.flatMap(l => {
      const d: any = (l as any).details
      return d?.fileId ? [d.fileId] : []
    }))
    const files = uploadLogs
      .flatMap(l => ((l as any).details?.files || []) as any[])
      .filter(f => f.conversationId === id && !deletedIds.has(f.id))

    res.json(files)
  } catch (error) {
    conversationLogger.error('Error fetching conversation files', { error, conversationId: req.params.id })
    res.status(500).json({ error: 'Erro ao buscar arquivos' })
  }
})

// Delete conversation file
router.delete('/files/:fileId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { fileId } = req.params

    await prisma.auditLog.create({ data: { actorId: req.user.id, action: 'FILE_DELETE', details: { fileId } } })
    conversationLogger.info('File deleted', { fileId, userId: req.user.id })

    res.json({ success: true, message: 'Arquivo removido com sucesso' })
  } catch (error) {
    conversationLogger.error('Error deleting file', { error, fileId: req.params.fileId })
    res.status(500).json({ error: 'Erro ao remover arquivo' })
  }
})

export default router
