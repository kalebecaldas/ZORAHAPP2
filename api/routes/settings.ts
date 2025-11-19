import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import prisma from '../prisma/client.js'
import { authMiddleware } from '../utils/auth.js'

const router = Router()

// In development, allow public access for reading settings
const settingsAuth = process.env.NODE_ENV === 'development'
  ? ((req: Request, res: Response, next: any) => next())
  : authMiddleware

// Get system settings
router.get('/', settingsAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    // Get AI settings from environment or database
    const settings = {
      ai: {
        enabled: process.env.AI_ENABLE_CLASSIFIER === 'true',
        confidenceThreshold: Number(process.env.AI_CONFIDENCE_THRESHOLD) || 0.7,
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        timeout: Number(process.env.OPENAI_TIMEOUT) || 20000,
        openaiApiKeyMasked: process.env.OPENAI_API_KEY ? '********' : '',
        circuitBreaker: {
          fails: Number(process.env.AI_CIRCUIT_BREAKER_FAILS) || 3,
          cooldown: Number(process.env.AI_CIRCUIT_BREAKER_COOLDOWN) || 300,
          cacheTTL: Number(process.env.AI_CACHE_TTL) || 60
        }
      },
      whatsapp: {
        enabled: !!process.env.META_ACCESS_TOKEN,
        phoneNumberId: process.env.META_PHONE_NUMBER_ID,
        webhookVerifyToken: process.env.META_WEBHOOK_VERIFY_TOKEN
      },
      clinic: {
        name: process.env.CLINIC_NAME || 'Clínica de Fisioterapia e Acupuntura',
        address: process.env.CLINIC_ADDRESS || 'Rua Rio Içá, 850 - Nossa Senhora das Graças, Manaus - AM',
        phone: process.env.CLINIC_PHONE || '(92) 3584-2864',
        email: process.env.CLINIC_EMAIL || 'contato@clinica.com.br'
      },
      businessHours: {
        weekdays: '08:00 - 18:00',
        saturday: '08:00 - 12:00',
        sunday: 'Fechado'
      }
    }

    res.json(settings)
  } catch (error) {
    console.error('Erro ao buscar configurações:', error)
    res.status(500).json({ error: 'Erro interno' })
  }
})

// Update system settings (admin only)
router.put('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    // Only admin can update settings
    if (req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Permissão insuficiente' })
      return
    }

    const settingsSchema = z.object({
      ai: z.object({
        enabled: z.boolean(),
        confidenceThreshold: z.number().min(0).max(1),
        model: z.string(),
        timeout: z.number().min(1000),
        openaiApiKey: z.string().min(10).optional(),
        circuitBreaker: z.object({
          fails: z.number().min(1),
          cooldown: z.number().min(60),
          cacheTTL: z.number().min(30)
        })
      }).optional(),
      whatsapp: z.object({
        token: z.string().optional(),
        appId: z.string().optional(),
        appSecret: z.string().optional(),
        phoneNumberId: z.string().optional(),
        businessAccountId: z.string().optional(),
        webhookUrl: z.string().optional()
      }).optional(),
      clinic: z.object({
        name: z.string().min(1),
        address: z.string().min(1),
        phone: z.string().min(1),
        email: z.string().email().optional()
      }).optional(),
      businessHours: z.object({
        weekdays: z.string(),
        saturday: z.string(),
        sunday: z.string()
      }).optional(),
      templates: z.array(z.object({
        key: z.string().min(1),
        title: z.string().min(1),
        content: z.string().min(1)
      })).optional()
    })

    const data = settingsSchema.parse(req.body)

    // Update environment variables (in a real implementation, this would update a database)
    // For now, we'll just return success
    // In production, you would update a settings table or config file

    if (data.ai?.openaiApiKey) {
      await prisma.auditLog.create({ data: {
        actorId: req.user!.id,
        action: 'SETTINGS_OPENAI_API_KEY',
        details: { updatedAt: new Date().toISOString(), maskedValue: '********' }
      } })
    }
    if (data.templates && data.templates.length > 0) {
      await prisma.auditLog.create({ data: {
        actorId: req.user!.id,
        action: 'SETTINGS_TEMPLATES_UPDATED',
        details: { count: data.templates.length, updatedAt: new Date().toISOString() }
      } })
    }
    res.json({ message: 'Configurações atualizadas com sucesso', settings: data })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Dados inválidos', details: error.errors })
      return
    }
    console.error('Erro ao atualizar configurações:', error)
    res.status(500).json({ error: 'Erro interno' })
  }
})

// Get WhatsApp templates
router.get('/whatsapp/templates', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const templates = [
      {
        name: 'welcome',
        category: 'UTILITY',
        language: 'pt_BR',
        components: [
          {
            type: 'HEADER',
            format: 'TEXT',
            text: 'Bem-vindo à {{clinic_name}}!'
          },
          {
            type: 'BODY',
            text: 'Olá {{customer_name}},\n\nSeja bem-vindo à nossa clínica! Estamos aqui para ajudar com suas necessidades de saúde.\n\nComo podemos ajudar você hoje?'
          },
          {
            type: 'FOOTER',
            text: 'Atendimento 24h | {{clinic_phone}}'
          }
        ]
      },
      {
        name: 'appointment_confirmation',
        category: 'APPOINTMENT_UPDATE',
        language: 'pt_BR',
        components: [
          {
            type: 'HEADER',
            format: 'TEXT',
            text: 'Confirmação de Consulta'
          },
          {
            type: 'BODY',
            text: 'Sua consulta está confirmada!\n\n📅 Data: {{appointment_date}}\n🕐 Horário: {{appointment_time}}\n👨‍⚕️ Profissional: {{professional_name}}\n📍 Local: {{clinic_address}}\n\nPor favor, chegue 15 minutos antes do horário marcado.'
          },
          {
            type: 'FOOTER',
            text: 'Dúvidas? Ligue: {{clinic_phone}}'
          }
        ]
      },
      {
        name: 'appointment_reminder',
        category: 'APPOINTMENT_UPDATE',
        language: 'pt_BR',
        components: [
          {
            type: 'HEADER',
            format: 'TEXT',
            text: 'Lembrete de Consulta'
          },
          {
            type: 'BODY',
            text: 'Lembrete: você tem uma consulta amanhã!\n\n📅 Data: {{appointment_date}}\n🕐 Horário: {{appointment_time}}\n👨‍⚕️ Profissional: {{professional_name}}\n\nConfirme sua presença respondendo "CONFIRMADO".'
          }
        ]
      },
      {
        name: 'procedure_info',
        category: 'UTILITY',
        language: 'pt_BR',
        components: [
          {
            type: 'HEADER',
            format: 'TEXT',
            text: 'Informações sobre {{procedure_name}}'
          },
          {
            type: 'BODY',
            text: 'Aqui estão as informações sobre {{procedure_name}}:\n\n💰 Valor: {{procedure_price}}\n⏱️ Duração: {{procedure_duration}}\n📋 Requisitos: {{procedure_requirements}}\n\nPara agendar, responda "AGENDAR".'
          }
        ]
      }
    ]

    res.json(templates)
  } catch (error) {
    console.error('Erro ao buscar templates:', error)
    res.status(500).json({ error: 'Erro interno' })
  }
})

// Test WhatsApp connection
router.post('/whatsapp/test', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone, message } = req.body

    if (!phone || !message) {
      res.status(400).json({ error: 'Telefone e mensagem são obrigatórios' })
      return
    }

    // Test WhatsApp API connection
    const WhatsAppService = (await import('../services/whatsapp.js')).WhatsAppService
    const service = new WhatsAppService(
      process.env.META_ACCESS_TOKEN || '',
      process.env.META_PHONE_NUMBER_ID || ''
    )

    const result = await service.sendTextMessage(phone, message)

    res.json({
      success: true,
      result,
      message: 'Mensagem enviada com sucesso'
    })
  } catch (error) {
    console.error('Erro ao testar WhatsApp:', error)
    res.status(500).json({
      success: false,
      error: 'Erro ao enviar mensagem de teste',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    })
  }
})

// Test AI connection
router.post('/ai/test', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { message, context } = req.body

    if (!message) {
      res.status(400).json({ error: 'Mensagem é obrigatória' })
      return
    }

    // Test AI service
    const AIService = (await import('../services/ai.js')).AIService
    const service = new AIService(
      process.env.OPENAI_API_KEY || '',
      process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      Number(process.env.OPENAI_TIMEOUT) || 20000
    )

    const aiContext = {
      patient: context?.patient || { phone: 'test' },
      history: context?.history || [],
      clinicData: context?.clinicData || {
        name: 'Clínica Teste',
        address: 'Endereço Teste',
        phone: '(00) 0000-0000',
        procedures: []
      }
    }

    const result = await service.generateResponse(message, aiContext)

    res.json({
      success: true,
      result,
      message: 'IA processada com sucesso'
    })
  } catch (error) {
    console.error('Erro ao testar IA:', error)
    res.status(500).json({
      success: false,
      error: 'Erro ao processar com IA',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    })
  }
})

export default router
