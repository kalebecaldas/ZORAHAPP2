import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import prisma from '../prisma/client.js'
import { authMiddleware } from '../utils/auth.js'
import fs from 'fs/promises'
import path from 'path'

const router = Router()

const CLINIC_DATA_PATH = path.join(process.cwd(), 'src', 'data', 'clinicData.json')
const SYSTEM_BRANDING_PATH = path.join(process.cwd(), 'src', 'data', 'systemBranding.json')

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
        model: process.env.OPENAI_MODEL || 'gpt-4o',
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
      await prisma.auditLog.create({
        data: {
          actorId: req.user!.id,
          action: 'SETTINGS_OPENAI_API_KEY',
          details: { updatedAt: new Date().toISOString(), maskedValue: '********' }
        }
      })
    }
    if (data.templates && data.templates.length > 0) {
      await prisma.auditLog.create({
        data: {
          actorId: req.user!.id,
          action: 'SETTINGS_TEMPLATES_UPDATED',
          details: { count: data.templates.length, updatedAt: new Date().toISOString() }
        }
      })
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
      process.env.OPENAI_MODEL || 'gpt-4o',
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

// Get clinic data JSON
router.get('/clinic-data', settingsAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await fs.readFile(CLINIC_DATA_PATH, 'utf-8')
    res.json(JSON.parse(data))
  } catch (error) {
    console.error('Erro ao ler clinicData.json:', error)
    res.status(500).json({ error: 'Erro ao ler dados da clínica' })
  }
})

// Update clinic data JSON
router.post('/clinic-data', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    // Only admin can update settings
    if (req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Permissão insuficiente' })
      return
    }

    const newData = req.body

    // Basic validation to ensure it's a valid object
    if (!newData || typeof newData !== 'object') {
      res.status(400).json({ error: 'Dados inválidos' })
      return
    }

    // Write to file
    await fs.writeFile(CLINIC_DATA_PATH, JSON.stringify(newData, null, 2), 'utf-8')

    res.json({ success: true, message: 'Dados da clínica atualizados com sucesso' })
  } catch (error) {
    console.error('Erro ao salvar clinicData.json:', error)
    res.status(500).json({ error: 'Erro ao salvar dados da clínica' })
  }
})

// Get system branding (name and logo)
router.get('/system-branding', settingsAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    // Try to read from file, fallback to defaults
    try {
      const data = await fs.readFile(SYSTEM_BRANDING_PATH, 'utf-8')
      const branding = JSON.parse(data)
      res.json(branding)
    } catch (fileError) {
      // File doesn't exist, return defaults
      res.json({
        systemName: 'ZoraH',
        logoUrl: '/favicon.svg'
      })
    }
  } catch (error) {
    console.error('Erro ao ler systemBranding.json:', error)
    res.status(500).json({ error: 'Erro ao ler configurações de marca' })
  }
})

// Update system branding
router.put('/system-branding', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    // Only admin can update settings
    if (req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Permissão insuficiente' })
      return
    }

    const brandingSchema = z.object({
      systemName: z.string().min(1).max(100),
      logoUrl: z.string().min(1)
    })

    const data = brandingSchema.parse(req.body)

    // Ensure directory exists
    const brandingDir = path.dirname(SYSTEM_BRANDING_PATH)
    await fs.mkdir(brandingDir, { recursive: true })

    // Write to file
    await fs.writeFile(SYSTEM_BRANDING_PATH, JSON.stringify(data, null, 2), 'utf-8')

    // Log the change
    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        action: 'SETTINGS_SYSTEM_BRANDING_UPDATED',
        details: { 
          systemName: data.systemName,
          logoUrl: data.logoUrl,
          updatedAt: new Date().toISOString() 
        }
      }
    })

    res.json({ success: true, message: 'Configurações de marca atualizadas com sucesso', branding: data })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Dados inválidos', details: error.errors })
      return
    }
    console.error('Erro ao salvar systemBranding.json:', error)
    res.status(500).json({ error: 'Erro ao salvar configurações de marca' })
  }
})

// Upload logo file
router.post('/upload-logo', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    // Only admin can upload
    if (req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Permissão insuficiente' })
      return
    }

    const multer = (await import('multer')).default
    const uploadsDir = path.join(process.cwd(), 'public', 'logos')
    await fs.mkdir(uploadsDir, { recursive: true })

    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, uploadsDir)
      },
      filename: (req, file, cb) => {
        const ext = path.extname(file.originalname)
        const name = `logo-${Date.now()}${ext}`
        cb(null, name)
      }
    })

    const upload = multer({
      storage,
      limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
      fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|svg/
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
        const mimetype = allowedTypes.test(file.mimetype) || file.mimetype === 'image/svg+xml'
        
        if (extname && mimetype) {
          cb(null, true)
        } else {
          cb(new Error('Formato de arquivo inválido. Use SVG, PNG ou JPG.'))
        }
      }
    })

    upload.single('logo')(req as any, res as any, async (err: any) => {
      if (err) {
        console.error('Erro no upload:', err)
        res.status(400).json({ error: err.message || 'Erro ao fazer upload do arquivo' })
        return
      }

      const file = (req as any).file
      if (!file) {
        res.status(400).json({ error: 'Nenhum arquivo enviado' })
        return
      }

      const logoUrl = `/logos/${file.filename}`

      // Update system branding with new logo URL
      try {
        let branding = { systemName: 'ZoraH', logoUrl: '/favicon.svg' }
        try {
          const brandingData = await fs.readFile(SYSTEM_BRANDING_PATH, 'utf-8')
          branding = JSON.parse(brandingData)
        } catch {
          // File doesn't exist, use defaults
        }

        branding.logoUrl = logoUrl

        const brandingDir = path.dirname(SYSTEM_BRANDING_PATH)
        await fs.mkdir(brandingDir, { recursive: true })
        await fs.writeFile(SYSTEM_BRANDING_PATH, JSON.stringify(branding, null, 2), 'utf-8')

        await prisma.auditLog.create({
          data: {
            actorId: req.user!.id,
            action: 'SETTINGS_LOGO_UPLOADED',
            details: { 
              logoUrl,
              filename: file.filename,
              updatedAt: new Date().toISOString() 
            }
          }
        })

        res.json({ success: true, logoUrl, message: 'Logo enviada com sucesso' })
      } catch (error) {
        console.error('Erro ao atualizar branding:', error)
        res.status(500).json({ error: 'Erro ao atualizar configurações de marca' })
      }
    })
  } catch (error) {
    console.error('Erro ao fazer upload da logo:', error)
    res.status(500).json({ error: 'Erro interno' })
  }
})

export default router
