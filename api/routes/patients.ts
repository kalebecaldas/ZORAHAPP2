import { Router, type Request, type Response } from 'express'
import { Prisma } from '@prisma/client'
import prisma from '../prisma/client.js'
import { authMiddleware } from '../utils/auth.js'

const router = Router()

// In development, allow public access to simplify testing
const patientsAuth = process.env.NODE_ENV === 'development'
  ? ((req: Request, res: Response, next: any) => next())
  : authMiddleware

// Get all patients
router.get('/', patientsAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 15, search = '' } = req.query
    const skip = (Number(page) - 1) * Number(limit)

    const where = search ? {
      OR: [
        { name: { contains: String(search), mode: Prisma.QueryMode.insensitive } },
        { phone: { contains: String(search), mode: Prisma.QueryMode.insensitive } },
        { cpf: { contains: String(search), mode: Prisma.QueryMode.insensitive } },
      ]
    } : {}

    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { name: 'asc' },
        include: {
          conversations: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            select: { status: true, lastMessage: true, lastTimestamp: true }
          }
        }
      }),
      prisma.patient.count({ where })
    ])

    res.json({
      patients,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    })
  } catch (error) {
    console.error('Erro ao buscar pacientes:', error)
    res.status(500).json({ error: 'Erro interno' })
  }
})

// Get patient by ID
router.get('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const patient = await prisma.patient.findUnique({
      where: { id: req.params.id },
      include: {
        conversations: {
          orderBy: { createdAt: 'desc' },
          include: {
            messages: {
              take: 10,
              orderBy: { timestamp: 'desc' }
            },
            assignedTo: {
              select: { id: true, name: true, email: true }
            }
          }
        },
        interactions: {
          orderBy: { createdAt: 'desc' },
          take: 20
        },
        appointments: {
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!patient) {
      res.status(404).json({ error: 'Paciente não encontrado' })
      return
    }

    res.json(patient)
  } catch (error) {
    console.error('Erro ao buscar paciente:', error)
    res.status(500).json({ error: 'Erro interno' })
  }
})

// Create patient
router.post('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const data = req.body

    // Validate CPF format if provided
    if (data.cpf && !isValidCPF(data.cpf)) {
      res.status(400).json({ error: 'CPF inválido' })
      return
    }

    // Validate phone format
    if (!isValidPhone(data.phone)) {
      res.status(400).json({ error: 'Telefone inválido' })
      return
    }

    const patient = await prisma.patient.create({
      data: {
        phone: cleanPhone(data.phone),
        name: data.name.trim(),
        cpf: data.cpf ? cleanCPF(data.cpf) : null,
        email: data.email?.toLowerCase().trim() || null,
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
        address: data.address?.trim() || null,
        emergencyContact: data.emergencyContact?.trim() || null,
        insuranceCompany: data.insuranceCompany?.trim() || null,
        insuranceNumber: data.insuranceNumber?.trim() || null,
        preferences: data.preferences || {},
      }
    })

    // Log patient creation
    await prisma.patientInteraction.create({
      data: {
        patientId: patient.id,
        type: 'PATIENT_CREATED',
        description: 'Paciente criado no sistema',
        data: { source: 'manual' }
      }
    })

    res.status(201).json(patient)
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'Telefone ou CPF já cadastrado' })
      return
    }
    console.error('Erro ao criar paciente:', error)
    res.status(500).json({ error: 'Erro interno' })
  }
})

// Update patient
router.put('/:id', patientsAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const data = req.body

    // Check if patient exists
    const existingPatient = await prisma.patient.findUnique({ where: { id } })
    if (!existingPatient) {
      res.status(404).json({ error: 'Paciente não encontrado' })
      return
    }

    // Validate CPF format if provided
    if (data.cpf && !isValidCPF(data.cpf)) {
      res.status(400).json({ error: 'CPF inválido' })
      return
    }

    // Validate phone format
    if (data.phone && !isValidPhone(data.phone)) {
      res.status(400).json({ error: 'Telefone inválido' })
      return
    }

    const updatedData: any = {}
    if (data.name !== undefined) updatedData.name = data.name.trim()
    if (data.phone !== undefined) updatedData.phone = cleanPhone(data.phone)
    if (data.cpf !== undefined) updatedData.cpf = data.cpf ? cleanCPF(data.cpf) : null
    if (data.email !== undefined) updatedData.email = data.email?.toLowerCase().trim() || null
    if (data.birthDate !== undefined) updatedData.birthDate = data.birthDate ? new Date(data.birthDate) : null
    if (data.address !== undefined) updatedData.address = data.address?.trim() || null
    if (data.emergencyContact !== undefined) updatedData.emergencyContact = data.emergencyContact?.trim() || null
    if (data.insuranceCompany !== undefined) updatedData.insuranceCompany = data.insuranceCompany?.trim() || null
    if (data.insuranceNumber !== undefined) updatedData.insuranceNumber = data.insuranceNumber?.trim() || null
    if (data.preferences !== undefined) updatedData.preferences = data.preferences

    const patient = await prisma.patient.update({
      where: { id },
      data: updatedData
    })

    // Log patient update
    await prisma.patientInteraction.create({
      data: {
        patientId: patient.id,
        type: 'PATIENT_UPDATED',
        description: 'Dados do paciente atualizados',
        data: { updatedFields: Object.keys(updatedData) }
      }
    })

    res.json(patient)
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'Telefone ou CPF já cadastrado' })
      return
    }
    console.error('Erro ao atualizar paciente:', error)
    res.status(500).json({ error: 'Erro interno' })
  }
})

// Get patient interactions
router.get('/:id/interactions', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { page = 1, limit = 50 } = req.query
    const skip = (Number(page) - 1) * Number(limit)

    const [interactions, total] = await Promise.all([
      prisma.patientInteraction.findMany({
        where: { patientId: id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit)
      }),
      prisma.patientInteraction.count({ where: { patientId: id } })
    ])

    res.json({
      interactions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    })
  } catch (error) {
    console.error('Erro ao buscar interações:', error)
    res.status(500).json({ error: 'Erro interno' })
  }
})

// Helper functions
function isValidCPF(cpf: string): boolean {
  const cleanCPF = cpf.replace(/\D/g, '')
  if (cleanCPF.length !== 11) return false
  
  // Basic CPF validation
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false
  
  let sum = 0
  let remainder
  
  for (let i = 1; i <= 9; i++) {
    sum = sum + parseInt(cleanCPF.substring(i - 1, i)) * (11 - i)
  }
  
  remainder = (sum * 10) % 11
  if ((remainder === 10) || (remainder === 11)) remainder = 0
  if (remainder !== parseInt(cleanCPF.substring(9, 10))) return false
  
  sum = 0
  for (let i = 1; i <= 10; i++) {
    sum = sum + parseInt(cleanCPF.substring(i - 1, i)) * (12 - i)
  }
  
  remainder = (sum * 10) % 11
  if ((remainder === 10) || (remainder === 11)) remainder = 0
  if (remainder !== parseInt(cleanCPF.substring(10, 11))) return false
  
  return true
}

function isValidPhone(phone: string): boolean {
  const cleanPhone = phone.replace(/\D/g, '')
  return cleanPhone.length >= 10 && cleanPhone.length <= 11
}

function cleanCPF(cpf: string): string {
  return cpf.replace(/\D/g, '')
}

function cleanPhone(phone: string): string {
  return phone.replace(/\D/g, '')
}

// Middleware para autenticação via API key do bot (N8N)
function botKeyMiddleware(req: Request, res: Response, next: any): void {
  const botKey = process.env.N8N_BOT_API_KEY
  if (!botKey) {
    res.status(503).json({ error: 'N8N_BOT_API_KEY não configurada no servidor' })
    return
  }
  const provided = req.headers['x-bot-key']
  if (!provided || provided !== botKey) {
    res.status(401).json({ error: 'Não autorizado' })
    return
  }
  next()
}

/**
 * POST /api/patients/upsert-from-bot
 * Cria ou retorna paciente existente pelo telefone.
 * Autenticado via header x-bot-key (N8N_BOT_API_KEY).
 * Usado pelo N8N após lookup na Clínica Ágil.
 */
router.post('/upsert-from-bot', botKeyMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone, name, email, insuranceCompany, source } = req.body

    if (!phone) {
      res.status(400).json({ error: 'phone é obrigatório' })
      return
    }

    const cleaned = cleanPhone(phone)
    if (cleaned.length < 10 || cleaned.length > 11) {
      res.status(400).json({ error: 'Telefone inválido' })
      return
    }

    const safeName = (name && name.trim() && name !== 'Novo Paciente')
      ? name.trim()
      : `Paciente Bot ${cleaned.slice(-4)}`

    const existing = await prisma.patient.findFirst({ where: { phone: cleaned } })

    if (existing) {
      // Atualizar apenas campos que chegaram com valor real
      const updateData: Record<string, any> = {}
      if (name && name.trim() && name !== 'Novo Paciente' && existing.name.startsWith('Paciente Bot')) {
        updateData.name = name.trim()
      }
      if (email && !existing.email) updateData.email = email.toLowerCase().trim()
      if (insuranceCompany && !existing.insuranceCompany) updateData.insuranceCompany = String(insuranceCompany).trim()

      const updated = Object.keys(updateData).length > 0
        ? await prisma.patient.update({ where: { id: existing.id }, data: updateData })
        : existing

      res.json({ patient: updated, created: false })
      return
    }

    const patient = await prisma.patient.create({
      data: {
        phone: cleaned,
        name: safeName,
        email: email ? email.toLowerCase().trim() : null,
        insuranceCompany: insuranceCompany ? String(insuranceCompany).trim() : null,
        preferences: { source: source || 'bot' },
      }
    })

    await prisma.patientInteraction.create({
      data: {
        patientId: patient.id,
        type: 'PATIENT_CREATED',
        description: 'Paciente criado automaticamente via bot',
        data: { source: source || 'bot' }
      }
    })

    res.status(201).json({ patient, created: true })
  } catch (error: any) {
    console.error('Erro ao upsert paciente via bot:', error)
    res.status(500).json({ error: 'Erro interno' })
  }
})

export default router
