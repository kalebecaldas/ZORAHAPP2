import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ConversationTransferService } from '../services/conversationTransfer.js'
import { IntelligentBotService } from '../services/intelligentBot.js'
import { FileValidationService } from '../services/fileValidation.js'
import { sessionManager } from '../services/conversationSession.js'
import { Server as SocketIOServer } from 'socket.io'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

describe('Workflow Integration Tests', () => {
  let transferService: ConversationTransferService
  let botService: IntelligentBotService
  let mockIO: SocketIOServer

  beforeEach(async () => {
    // Create mock Socket.IO server
    mockIO = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn()
    } as any

    // Initialize services
    transferService = new ConversationTransferService(mockIO)
    botService = new IntelligentBotService(
      process.env.OPENAI_API_KEY || 'test-key',
      'gpt-3.5-turbo'
    )
  })

  afterEach(async () => {
    // Cleanup
    sessionManager.stop()
    jest.clearAllMocks()
  })

  describe('Conversation Queue System', () => {
    it('should handle conversation flow from BOT to PRINCIPAL to MINHAS_CONVERSAS', async () => {
      // Create test conversation
      const conversation = await prisma.conversation.create({
        data: {
          patientId: 'test-patient-1',
          status: 'BOT_QUEUE',
          priority: 'MEDIUM',
          sessionExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      })

      // Verify initial state
      expect(conversation.status).toBe('BOT_QUEUE')

      // Simulate bot processing
      const botContext = {
        patient: { id: 'test-patient-1', name: 'Test Patient' },
        conversationStage: 'greeting',
        workflowContext: { currentNode: 'start' }
      }

      botService.updateContext(conversation.id, botContext)
      expect(botService.getContext(conversation.id)).toEqual(botContext)

      // Simulate transfer to principal queue
      const updatedConversation = await prisma.conversation.update({
        where: { id: conversation.id },
        data: { status: 'PRINCIPAL' }
      })

      expect(updatedConversation.status).toBe('PRINCIPAL')
    })

    it('should handle priority-based conversation assignment', async () => {
      // Create conversations with different priorities
      const conversations = await Promise.all([
        prisma.conversation.create({
          data: {
            patientId: 'test-patient-1',
            status: 'PRINCIPAL',
            priority: 'URGENT',
            sessionExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000)
          }
        }),
        prisma.conversation.create({
          data: {
            patientId: 'test-patient-2',
            status: 'PRINCIPAL',
            priority: 'HIGH',
            sessionExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000)
          }
        }),
        prisma.conversation.create({
          data: {
            patientId: 'test-patient-3',
            status: 'PRINCIPAL',
            priority: 'LOW',
            sessionExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000)
          }
        })
      ])

      // Verify priority ordering
      const principalConversations = await prisma.conversation.findMany({
        where: { status: 'PRINCIPAL' },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }]
      })

      expect(principalConversations[0].priority).toBe('URGENT')
      expect(principalConversations[1].priority).toBe('HIGH')
      expect(principalConversations[2].priority).toBe('LOW')
    })
  })

  describe('Conversation Transfer System', () => {
    it('should handle conversation transfer with 30-second timeout', async () => {
      const conversationId = 'test-conv-1'
      const fromUserId = 'user-1'
      const toUserId = 'user-2'

      // Mock conversation in database
      jest.spyOn(prisma.conversation, 'findFirst').mockResolvedValue({
        id: conversationId,
        assignedToId: fromUserId,
        status: 'active',
        assignedTo: { name: 'John Doe' },
        patient: { name: 'Test Patient' },
        lastMessage: 'Hello, I need help'
      } as any)

      jest.spyOn(prisma.user, 'findFirst').mockResolvedValue({
        id: toUserId,
        name: 'Jane Smith',
        role: 'attendant',
        status: 'active'
      } as any)

      // Request transfer
      const result = await transferService.requestTransfer(conversationId, fromUserId, toUserId)
      expect(result).toBe(true)

      // Verify socket notifications
      expect(mockIO.to).toHaveBeenCalledWith(`user_${toUserId}`)
      expect(mockIO.emit).toHaveBeenCalledWith('transfer_request', expect.objectContaining({
        conversationId,
        fromUserId,
        fromUserName: 'John Doe',
        patientName: 'Test Patient',
        message: 'Hello, I need help',
        timeout: 30000
      }))
    })

    it('should handle transfer acceptance', async () => {
      const conversationId = 'test-conv-1'
      const fromUserId = 'user-1'
      const toUserId = 'user-2'

      // First create a transfer request
      await transferService.requestTransfer(conversationId, fromUserId, toUserId)

      // Mock database update
      jest.spyOn(prisma.conversation, 'update').mockResolvedValue({
        id: conversationId,
        assignedToId: toUserId,
        patient: { name: 'Test Patient' },
        assignedTo: { name: 'Jane Smith' }
      } as any)

      // Accept transfer
      const result = await transferService.acceptTransfer(conversationId, toUserId)
      expect(result).toBe(true)

      // Verify socket notifications
      expect(mockIO.to).toHaveBeenCalledWith(`user_${fromUserId}`)
      expect(mockIO.emit).toHaveBeenCalledWith('transfer_completed', expect.objectContaining({
        conversationId,
        acceptedBy: toUserId
      }))
    })

    it('should handle transfer timeout', async () => {
      const conversationId = 'test-conv-1'
      const fromUserId = 'user-1'
      const toUserId = 'user-2'

      // Mock conversation data
      jest.spyOn(prisma.conversation, 'findFirst').mockResolvedValue({
        id: conversationId,
        assignedToId: fromUserId,
        status: 'active'
      } as any)

      jest.spyOn(prisma.user, 'findFirst').mockResolvedValue({
        id: toUserId,
        role: 'attendant',
        status: 'active'
      } as any)

      jest.spyOn(prisma.conversation, 'update').mockResolvedValue({
        id: conversationId
      } as any)

      // Request transfer
      await transferService.requestTransfer(conversationId, fromUserId, toUserId)

      // Fast-forward time to trigger timeout
      jest.useFakeTimers()
      jest.advanceTimersByTime(31000) // 31 seconds

      // Verify timeout handling
      expect(mockIO.emit).toHaveBeenCalledWith('transfer_timeout', expect.objectContaining({
        conversationId
      }))

      jest.useRealTimers()
    })
  })

  describe('File Upload Validation', () => {
    it('should validate allowed file types', () => {
      const validFiles = [
        { originalname: 'test.pdf', mimetype: 'application/pdf', buffer: Buffer.from('%PDF-1.4'), size: 1024 },
        { originalname: 'test.docx', mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: Buffer.from('PK'), size: 2048 },
        { originalname: 'test.jpg', mimetype: 'image/jpeg', buffer: Buffer.from([0xFF, 0xD8, 0xFF]), size: 1024 },
        { originalname: 'test.png', mimetype: 'image/png', buffer: Buffer.from([0x89, 0x50, 0x4E, 0x47]), size: 1024 }
      ] as Express.Multer.File[]

      const validation = FileValidationService.validateFiles(validFiles)
      
      expect(validation.valid).toBe(true)
      expect(validation.errors).toHaveLength(0)
      expect(validation.validatedFiles).toHaveLength(4)
    })

    it('should reject invalid file types', () => {
      const invalidFiles = [
        { originalname: 'test.exe', mimetype: 'application/x-msdownload', buffer: Buffer.from('MZ'), size: 1024 },
        { originalname: 'test.js', mimetype: 'application/javascript', buffer: Buffer.from('console.log()'), size: 1024 }
      ] as Express.Multer.File[]

      const validation = FileValidationService.validateFiles(invalidFiles)
      
      expect(validation.valid).toBe(false)
      expect(validation.errors).toHaveLength(2)
    })

    it('should validate file size limits', () => {
      const largeFile = {
        originalname: 'large.pdf',
        mimetype: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4'),
        size: 15 * 1024 * 1024 // 15MB, exceeds 10MB limit
      } as Express.Multer.File

      const validation = FileValidationService.validateFiles([largeFile])
      
      expect(validation.valid).toBe(false)
      expect(validation.errors[0]).toContain('exceeds maximum')
    })

    it('should detect malicious content', () => {
      const maliciousFile = {
        originalname: 'malicious.pdf',
        mimetype: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4\n<script>alert("xss")</script>'),
        size: 1024
      } as Express.Multer.File

      const validation = FileValidationService.validateFiles([maliciousFile])
      
      expect(validation.valid).toBe(false)
      expect(validation.errors[0]).toContain('malicious content')
    })
  })

  describe('Session Management', () => {
    it('should create and manage 24-hour sessions', async () => {
      const conversationId = 'test-session-1'
      const userId = 'test-user-1'

      // Start session
      const session = await sessionManager.startSession(conversationId, userId)
      
      expect(session.conversationId).toBe(conversationId)
      expect(session.userId).toBe(userId)
      expect(session.status).toBe('active')
      
      // Verify 24-hour expiry
      const expectedExpiry = new Date(session.startTime.getTime() + 24 * 60 * 60 * 1000)
      expect(session.expiryTime.getTime()).toBe(expectedExpiry.getTime())
    })

    it('should update session activity', async () => {
      const conversationId = 'test-session-2'
      const userId = 'test-user-2'

      // Start session
      const session = await sessionManager.startSession(conversationId, userId)
      const initialMessageCount = session.messageCount
      const initialActivity = session.lastActivity

      // Update activity
      await new Promise(resolve => setTimeout(resolve, 100)) // Small delay
      const updatedSession = await sessionManager.updateSessionActivity(conversationId)

      expect(updatedSession.messageCount).toBe(initialMessageCount + 1)
      expect(updatedSession.lastActivity.getTime()).toBeGreaterThan(initialActivity.getTime())
    })

    it('should handle session expiry', async () => {
      const conversationId = 'test-session-3'
      const userId = 'test-user-3'

      // Start session with short expiry for testing
      const originalConfig = sessionManager.getSessionStats()
      sessionManager.updateConfig({ maxSessionDuration: 2000 }) // 2 seconds

      await sessionManager.startSession(conversationId, userId)

      // Fast-forward time
      jest.useFakeTimers()
      jest.advanceTimersByTime(3000) // 3 seconds

      // Check session status
      const session = sessionManager.getSession(conversationId)
      expect(session?.status).toBe('expired')

      // Restore original config
      sessionManager.updateConfig({ maxSessionDuration: 24 * 60 * 60 * 1000 })
      jest.useRealTimers()
    })
  })

  describe('Intelligent Bot Integration', () => {
    it('should process messages with context awareness', async () => {
      const conversationId = 'test-bot-1'
      const patientPhone = '+5511999999999'

      const botContext = {
        patient: {
          id: 'patient-1',
          name: 'João Silva',
          phone: patientPhone,
          insuranceCompany: 'Unimed',
          registrationComplete: true
        },
        conversationStage: 'greeting',
        workflowContext: {
          collectedData: {},
          scheduledProcedures: [],
          currentNode: 'start'
        }
      }

      botService.updateContext(conversationId, botContext)

      // Test message processing
      const message = 'Quero marcar uma consulta de cardiologia'
      const response = await botService.processMessage(message, patientPhone, conversationId, botContext)

      expect(response).toHaveProperty('response')
      expect(response).toHaveProperty('intent')
      expect(response).toHaveProperty('sentiment')
      expect(response).toHaveProperty('confidence')
      expect(response).toHaveProperty('suggestedAction')
    })

    it('should handle appointment scheduling requests', async () => {
      const conversationId = 'test-bot-2'
      const patientPhone = '+5511888888888'

      const botContext = {
        patient: {
          id: 'patient-2',
          name: 'Maria Santos',
          phone: patientPhone,
          insuranceCompany: 'Amil',
          registrationComplete: true
        },
        conversationStage: 'scheduling',
        workflowContext: {
          collectedData: { preferredDate: '2024-01-15' },
          scheduledProcedures: ['cardiology-consultation'],
          currentNode: 'date-selection'
        }
      }

      botService.updateContext(conversationId, botContext)

      const message = 'Tenho disponibilidade às 14h'
      const response = await botService.processMessage(message, patientPhone, conversationId, botContext)

      expect(response.intent).toBe('schedule_appointment')
      expect(response.suggestedAction).toMatch(/confirm|schedule|book/)
    })
  })

  describe('Performance and Error Handling', () => {
    it('should handle high-volume conversation processing', async () => {
      const startTime = Date.now()
      const promises = []

      // Create 100 conversations simultaneously
      for (let i = 0; i < 100; i++) {
        promises.push(
          prisma.conversation.create({
            data: {
              patientId: `test-patient-${i}`,
              status: 'BOT_QUEUE',
              priority: 'MEDIUM',
              sessionExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000)
            }
          })
        )
      }

      await Promise.all(promises)
      const endTime = Date.now()
      const duration = endTime - startTime

      expect(duration).toBeLessThan(10000) // Should complete within 10 seconds
    })

    it('should handle bot service failures gracefully', async () => {
      const conversationId = 'test-error-1'
      const patientPhone = '+5511777777777'

      // Mock bot service failure
      jest.spyOn(botService, 'processMessage').mockRejectedValue(new Error('AI Service Error'))

      const botContext = {
        patient: { id: 'patient-error', name: 'Error Patient', phone: patientPhone },
        conversationStage: 'error',
        workflowContext: { currentNode: 'error' }
      }

      try {
        await botService.processMessage('test message', patientPhone, conversationId, botContext)
        fail('Should have thrown an error')
      } catch (error) {
        expect(error.message).toBe('AI Service Error')
      }
    })

    it('should provide comprehensive logging for all operations', async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation()

      // Create conversation
      const conversation = await prisma.conversation.create({
        data: {
          patientId: 'log-test-patient',
          status: 'BOT_QUEUE',
          priority: 'HIGH',
          sessionExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      })

      // Update status
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { status: 'PRINCIPAL' }
      })

      // Verify logging occurred
      expect(logSpy).toHaveBeenCalled()

      logSpy.mockRestore()
    })
  })
})

describe('End-to-End Workflow Test', () => {
  it('should complete full patient journey from bot to appointment', async () => {
    // 1. Patient initiates conversation
    const patient = await prisma.patient.create({
      data: {
        name: 'Test Patient',
        phone: '+5511666666666',
        email: 'test@example.com',
        insuranceCompany: 'Unimed'
      }
    })

    // 2. Create conversation in bot queue
    const conversation = await prisma.conversation.create({
      data: {
        patientId: patient.id,
        status: 'BOT_QUEUE',
        priority: 'MEDIUM',
        sessionExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    })

    // 3. Initialize bot context
    const botService = new IntelligentBotService('test-key', 'gpt-3.5-turbo')
    const botContext = {
      patient: {
        id: patient.id,
        name: patient.name,
        phone: patient.phone,
        insuranceCompany: patient.insuranceCompany
      },
      conversationStage: 'greeting',
      workflowContext: { currentNode: 'start' }
    }

    botService.updateContext(conversation.id, botContext)

    // 4. Process patient message
    const patientMessage = 'Quero marcar uma consulta de cardiologia'
    const aiResponse = await botService.processMessage(
      patientMessage,
      patient.phone,
      conversation.id,
      botContext
    )

    expect(aiResponse.intent).toBe('schedule_appointment')

    // 5. Transfer to human if needed
    if (aiResponse.suggestedAction === 'transfer_human') {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { status: 'PRINCIPAL' }
      })
    }

    // 6. Assign to attendant
    const attendant = await prisma.user.create({
      data: {
        name: 'Dr. Smith',
        email: 'smith@clinic.com',
        role: 'attendant',
        status: 'active'
      }
    })

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        assignedTo: attendant.id,
        status: 'MINHAS_CONVERSAS'
      }
    })

    // 7. Complete appointment scheduling
    const finalConversation = await prisma.conversation.findUnique({
      where: { id: conversation.id }
    })

    expect(finalConversation?.status).toBe('MINHAS_CONVERSAS')
    expect(finalConversation?.assignedTo).toBe(attendant.id)
  })
})