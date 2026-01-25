import { Router, type Request, type Response } from 'express'
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
        { name: { contains: String(search), mode: 'insensitive' } },
        { phone: { contains: String(search), mode: 'insensitive' } },
        { cpf: { contains: String(search), mode: 'insensitive' } },
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

export default router
