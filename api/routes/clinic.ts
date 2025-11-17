import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import prisma from '../prisma/client.js'
import { authMiddleware, requireRole } from '../utils/auth.js'
import { clinicDataService } from '../data/clinicData.js'

const router = Router()
const readAuth = process.env.NODE_ENV === 'development'
  ? ((req: Request, res: Response, next: any) => next())
  : authMiddleware
const prismaAny = prisma as any
export const availabilityStore: Record<string, Record<string, string>> = {}

const insuranceSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  displayName: z.string().min(1),
  discount: z.boolean().optional(),
  notes: z.string().optional()
})

const procedureSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  basePrice: z.number().min(0),
  requiresEvaluation: z.boolean().optional().default(false),
  duration: z.number().min(1),
  categories: z.array(z.string()).default([])
})

const clinicSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  displayName: z.string().min(1),
  address: z.string().min(1),
  neighborhood: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  zipCode: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().optional(),
  openingHours: z.record(z.string()).default({}),
  coordinates: z.object({
    lat: z.number(),
    lng: z.number()
  }).optional(),
  specialties: z.array(z.string()).default([]),
  parkingAvailable: z.boolean().optional().default(false),
  accessibility: z.array(z.string()).default([]),
  isActive: z.boolean().optional().default(true)
})

const clinicInsuranceSchema = z.object({
  coveragePercentage: z.number().min(0).max(100).default(70),
  copayment: z.number().min(0).default(0),
  requiresPreAuthorization: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true)
})

const clinicProcedureSchema = z.object({
  particularPrice: z.number().min(0),
  insurancePrice: z.record(z.number()).default({}),
  isActive: z.boolean().optional().default(true)
})

router.get('/insurances', readAuth, async (req: Request, res: Response): Promise<void> => {
  const { q = '', page = 1, limit = 20 } = req.query as any
  try {
    const skip = (Number(page) - 1) * Number(limit)
    const where: any = q ? {
      OR: [
        { name: { contains: String(q), mode: 'insensitive' } },
        { displayName: { contains: String(q), mode: 'insensitive' } },
        { code: { contains: String(q), mode: 'insensitive' } }
      ]
    } : {}
    const [list, total] = await Promise.all([
      prismaAny.insuranceCompany.findMany({ where, skip, take: Number(limit), orderBy: { name: 'asc' } }),
      prismaAny.insuranceCompany.count({ where })
    ])
    const counts = await Promise.all(list.map((ic: any) => prismaAny.insuranceProcedure.count({ where: { insuranceId: ic.id } })))
    const insurances = list.map((ic, i) => ({ ...ic, procedureCount: counts[i] }))
    res.json({ insurances, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } })
  } catch (error) {
    const catalog = clinicDataService.getInsuranceCompanies()
    const filtered = catalog.filter(ic => {
      const s = String(q).trim().toLowerCase()
      return !s || ic.name.toLowerCase().includes(s) || ic.displayName.toLowerCase().includes(s) || ic.id.toLowerCase().includes(s)
    })
    const start = (Number(page) - 1) * Number(limit)
    const slice = filtered.slice(start, start + Number(limit))
    const insurances = slice.map(ic => ({ code: ic.id, name: ic.name, displayName: ic.displayName, discount: !!(ic as any).discount, notes: (ic as any).notes || '', procedureCount: (ic.procedures || []).length }))
    res.json({ insurances, pagination: { page: Number(page), limit: Number(limit), total: filtered.length, pages: Math.ceil(filtered.length / Number(limit)) } })
  }
})

router.post('/insurances', authMiddleware, requireRole('ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const data = insuranceSchema.parse(req.body)
    const created = await prismaAny.insuranceCompany.create({ data: { ...data } })
    res.status(201).json(created)
  } catch (error) {
    res.status(400).json({ error: 'Dados inválidos' })
  }
})

router.put('/insurances/:code', authMiddleware, requireRole('ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const data = insuranceSchema.parse(req.body)
    const updated = await prismaAny.insuranceCompany.update({ where: { code: req.params.code }, data })
    res.json(updated)
  } catch (error) {
    res.status(400).json({ error: 'Dados inválidos' })
  }
})

router.delete('/insurances/:code', authMiddleware, requireRole('ADMIN'), async (req: Request, res: Response): Promise<void> => {
  await prismaAny.insuranceCompany.delete({ where: { code: req.params.code } })
  res.json({ success: true })
})

router.get('/procedures', readAuth, async (req: Request, res: Response): Promise<void> => {
  const { q = '', page = 1, limit = 20, order = 'name' } = req.query as any
  try {
    const skip = (Number(page) - 1) * Number(limit)
    const where: any = q ? {
      OR: [
        { name: { contains: String(q), mode: 'insensitive' } },
        { description: { contains: String(q), mode: 'insensitive' } },
        { code: { contains: String(q), mode: 'insensitive' } }
      ]
    } : {}
    const [list, total] = await Promise.all([
      prismaAny.procedure.findMany({ where, skip, take: Number(limit), orderBy: { [String(order)]: 'asc' as any } }),
      prismaAny.procedure.count({ where })
    ])
    res.json({ procedures: list, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } })
  } catch (error) {
    const catalog = clinicDataService.getProcedures()
    const filtered = catalog.filter(p => {
      const s = String(q).trim().toLowerCase()
      return !s || p.name.toLowerCase().includes(s) || p.description.toLowerCase().includes(s) || p.id.toLowerCase().includes(s)
    })
    const start = (Number(page) - 1) * Number(limit)
    const slice = filtered.slice(start, start + Number(limit))
    const procedures = slice.map(p => ({ code: p.id, name: p.name, description: p.description, basePrice: p.basePrice, requiresEvaluation: p.requiresEvaluation, duration: p.duration, categories: p.categories }))
    res.json({ procedures, pagination: { page: Number(page), limit: Number(limit), total: filtered.length, pages: Math.ceil(filtered.length / Number(limit)) } })
  }
})

router.post('/procedures', authMiddleware, requireRole('ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const data = procedureSchema.parse(req.body)
    const created = await prismaAny.procedure.create({ data: { ...data, categories: data.categories } })
    res.status(201).json(created)
  } catch (error) {
    res.status(400).json({ error: 'Dados inválidos' })
  }
})

router.put('/procedures/:code', authMiddleware, requireRole('ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const data = procedureSchema.parse(req.body)
    const updated = await prismaAny.procedure.update({ where: { code: req.params.code }, data: { ...data, categories: data.categories } })
    res.json(updated)
  } catch (error) {
    res.status(400).json({ error: 'Dados inválidos' })
  }
})

router.delete('/procedures/:code', authMiddleware, requireRole('ADMIN'), async (req: Request, res: Response): Promise<void> => {
  await prismaAny.procedure.delete({ where: { code: req.params.code } })
  res.json({ success: true })
})

router.post('/insurances/:code/procedures/:pcode', authMiddleware, requireRole('ADMIN'), async (req: Request, res: Response): Promise<void> => {
  const insurance = await prismaAny.insuranceCompany.findUnique({ where: { code: req.params.code } })
  const proc = await prismaAny.procedure.findUnique({ where: { code: req.params.pcode } })
  if (!insurance || !proc) {
    res.status(404).json({ error: 'Convênio ou procedimento não encontrado' })
    return
  }
  await prismaAny.insuranceProcedure.create({ data: { insuranceId: insurance.id, procedureId: proc.id } })
  res.json({ success: true })
})

router.delete('/insurances/:code/procedures/:pcode', authMiddleware, requireRole('ADMIN'), async (req: Request, res: Response): Promise<void> => {
  const insurance = await prismaAny.insuranceCompany.findUnique({ where: { code: req.params.code } })
  const proc = await prismaAny.procedure.findUnique({ where: { code: req.params.pcode } })
  if (!insurance || !proc) {
    res.status(404).json({ error: 'Convênio ou procedimento não encontrado' })
    return
  }
  await prismaAny.insuranceProcedure.delete({ where: { insuranceId_procedureId: { insuranceId: insurance.id, procedureId: proc.id } } })
  res.json({ success: true })
})

// Clinic Management Routes
router.get('/clinics', readAuth, async (req: Request, res: Response): Promise<void> => {
  const { q = '', page = 1, limit = 20 } = req.query as any
  try {
    const skip = (Number(page) - 1) * Number(limit)
    const where: any = q ? {
      OR: [
        { name: { contains: String(q), mode: 'insensitive' } },
        { displayName: { contains: String(q), mode: 'insensitive' } },
        { code: { contains: String(q), mode: 'insensitive' } },
        { city: { contains: String(q), mode: 'insensitive' } }
      ]
    } : {}
    const [list, total] = await Promise.all([
      prismaAny.clinic.findMany({ 
        where, 
        skip, 
        take: Number(limit), 
        orderBy: { name: 'asc' },
        include: {
          clinicInsurances: true,
          clinicProcedures: true
        }
      }),
      prismaAny.clinic.count({ where })
    ])
    res.json({ clinics: list, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } })
  } catch (error) {
    const catalog = clinicDataService.getLocations()
    const filtered = catalog.filter(c => {
      const s = String(q).trim().toLowerCase()
      return !s || c.name.toLowerCase().includes(s) || c.id.toLowerCase().includes(s) || c.city.toLowerCase().includes(s)
    })
    const start = (Number(page) - 1) * Number(limit)
    const slice = filtered.slice(start, start + Number(limit))
    const clinics = slice.map(c => ({
      code: c.id,
      name: c.name,
      displayName: c.name,
      address: c.address,
      neighborhood: c.neighborhood,
      city: c.city,
      state: c.state,
      zipCode: c.zipCode,
      phone: c.phone,
      email: c.email,
      openingHours: c.openingHours as any,
      specialties: c.specialties,
      parkingAvailable: !!c.parkingAvailable,
      accessibility: c.accessibility,
      clinicProcedures: (clinicDataService.getProcedures() || []).map(p => ({ procedureCode: p.id, procedure: { name: p.name } }))
    }))
    res.json({ clinics, pagination: { page: Number(page), limit: Number(limit), total: filtered.length, pages: Math.ceil(filtered.length / Number(limit)) } })
  }
})

router.get('/clinics/:code', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const clinic = await prismaAny.clinic.findUnique({ 
    where: { code: req.params.code },
    include: {
      clinicInsurances: {
        include: {
          insurance: true
        }
      },
      clinicProcedures: {
        include: {
          procedure: true
        }
      }
    }
  })
  if (!clinic) {
    res.status(404).json({ error: 'Clínica não encontrada' })
    return
  }
  res.json(clinic)
})

router.post('/clinics', authMiddleware, requireRole('ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const data = clinicSchema.parse(req.body)
    const created = await prismaAny.clinic.create({ data: { ...data } })
    res.status(201).json(created)
  } catch (error) {
    res.status(400).json({ error: 'Dados inválidos' })
  }
})

router.put('/clinics/:code', authMiddleware, requireRole('ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const data = clinicSchema.parse(req.body)
    const updated = await prismaAny.clinic.update({ where: { code: req.params.code }, data: { ...data } })
    res.json(updated)
  } catch (error) {
    res.status(400).json({ error: 'Dados inválidos' })
  }
})

router.delete('/clinics/:code', authMiddleware, requireRole('ADMIN'), async (req: Request, res: Response): Promise<void> => {
  await prismaAny.clinic.delete({ where: { code: req.params.code } })
  res.json({ success: true })
})

// Clinic Insurance Management
router.get('/clinics/:code/insurances', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const clinic = await prismaAny.clinic.findUnique({ 
    where: { code: req.params.code },
    include: {
      clinicInsurances: {
        include: {
          insurance: true
        }
      }
    }
  })
  if (!clinic) {
    res.status(404).json({ error: 'Clínica não encontrada' })
    return
  }
  res.json({ insurances: clinic.clinicInsurances })
})

router.post('/clinics/:code/insurances/:insuranceCode', authMiddleware, requireRole('ADMIN'), async (req: Request, res: Response): Promise<void> => {
  const clinic = await prismaAny.clinic.findUnique({ where: { code: req.params.code } })
  const insurance = await prismaAny.insuranceCompany.findUnique({ where: { code: req.params.insuranceCode } })
  if (!clinic || !insurance) {
    res.status(404).json({ error: 'Clínica ou convênio não encontrado' })
    return
  }
  try {
    const data = clinicInsuranceSchema.parse(req.body)
    const created = await prismaAny.clinicInsurance.create({ 
      data: { 
        clinicId: clinic.id,
        insuranceCode: insurance.code,
        ...data
      } 
    })
    res.status(201).json(created)
  } catch (error) {
    res.status(400).json({ error: 'Dados inválidos' })
  }
})

router.put('/clinics/:code/insurances/:insuranceCode', authMiddleware, requireRole('ADMIN'), async (req: Request, res: Response): Promise<void> => {
  const clinicInsurance = await prismaAny.clinicInsurance.findFirst({ 
    where: { 
      clinic: { code: req.params.code },
      insuranceCode: req.params.insuranceCode
    }
  })
  if (!clinicInsurance) {
    res.status(404).json({ error: 'Relação clínica-convênio não encontrada' })
    return
  }
  try {
    const data = clinicInsuranceSchema.parse(req.body)
    const updated = await prismaAny.clinicInsurance.update({ 
      where: { id: clinicInsurance.id },
      data: { ...data }
    })
    res.json(updated)
  } catch (error) {
    res.status(400).json({ error: 'Dados inválidos' })
  }
})

router.delete('/clinics/:code/insurances/:insuranceCode', authMiddleware, requireRole('ADMIN'), async (req: Request, res: Response): Promise<void> => {
  const clinicInsurance = await prismaAny.clinicInsurance.findFirst({ 
    where: { 
      clinic: { code: req.params.code },
      insuranceCode: req.params.insuranceCode
    }
  })
  if (!clinicInsurance) {
    res.status(404).json({ error: 'Relação clínica-convênio não encontrada' })
    return
  }
  await prismaAny.clinicInsurance.delete({ where: { id: clinicInsurance.id } })
  res.json({ success: true })
})

// Clinic Procedure Management
router.get('/clinics/:code/procedures', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const clinic = await prismaAny.clinic.findUnique({ 
    where: { code: req.params.code },
    include: {
      clinicProcedures: {
        include: {
          procedure: true
        }
      }
    }
  })
  if (!clinic) {
    res.status(404).json({ error: 'Clínica não encontrada' })
    return
  }
  res.json({ procedures: clinic.clinicProcedures })
})

router.post('/clinics/:code/procedures/:procedureCode', authMiddleware, requireRole('ADMIN'), async (req: Request, res: Response): Promise<void> => {
  const clinic = await prismaAny.clinic.findUnique({ where: { code: req.params.code } })
  const procedure = await prismaAny.procedure.findUnique({ where: { code: req.params.procedureCode } })
  if (!clinic || !procedure) {
    res.status(404).json({ error: 'Clínica ou procedimento não encontrado' })
    return
  }
  try {
    const data = clinicProcedureSchema.parse(req.body)
    const created = await prismaAny.clinicProcedure.create({ 
      data: { 
        clinicId: clinic.id,
        procedureCode: procedure.code,
        ...data
      } 
    })
    res.status(201).json(created)
  } catch (error) {
    res.status(400).json({ error: 'Dados inválidos' })
  }
})

router.put('/clinics/:code/procedures/:procedureCode', authMiddleware, requireRole('ADMIN'), async (req: Request, res: Response): Promise<void> => {
  const clinicProcedure = await prismaAny.clinicProcedure.findFirst({ 
    where: { 
      clinic: { code: req.params.code },
      procedureCode: req.params.procedureCode
    }
  })
  if (!clinicProcedure) {
    res.status(404).json({ error: 'Relação clínica-procedimento não encontrada' })
    return
  }
  try {
    const data = clinicProcedureSchema.parse(req.body)
    const updated = await prismaAny.clinicProcedure.update({ 
      where: { id: clinicProcedure.id },
      data: { ...data }
    })
    res.json(updated)
  } catch (error) {
    res.status(400).json({ error: 'Dados inválidos' })
  }
})

router.delete('/clinics/:code/procedures/:procedureCode', authMiddleware, requireRole('ADMIN'), async (req: Request, res: Response): Promise<void> => {
  const clinicProcedure = await prismaAny.clinicProcedure.findFirst({ 
    where: { 
      clinic: { code: req.params.code },
      procedureCode: req.params.procedureCode
    }
  })
  if (!clinicProcedure) {
    res.status(404).json({ error: 'Relação clínica-procedimento não encontrada' })
    return
  }
  await prismaAny.clinicProcedure.delete({ where: { id: clinicProcedure.id } })
  res.json({ success: true })
})

router.get('/clinics/:code/procedures/:procedureCode/availability', readAuth, async (req: Request, res: Response): Promise<void> => {
  const key = `${String(req.params.code)}:${String(req.params.procedureCode)}`
  const availability = availabilityStore[key] || {}
  res.json({ availability })
})

router.put('/clinics/:code/procedures/:procedureCode/availability', authMiddleware, requireRole('ADMIN'), async (req: Request, res: Response): Promise<void> => {
  const payload = req.body || {}
  const key = `${String(req.params.code)}:${String(req.params.procedureCode)}`
  availabilityStore[key] = payload?.availability || {}
  res.json({ success: true })
})

// Seed database from static catalog (development convenience)
router.post('/seed', readAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const procedures = clinicDataService.getProcedures();
    const insurances = clinicDataService.getInsuranceCompanies();
    const locations = clinicDataService.getLocations();

    let procCount = 0, insCount = 0, locCount = 0, linksCount = 0;

    // Seed procedures
    for (const p of procedures) {
      const exists = await prismaAny.procedure.findUnique({ where: { code: p.id } });
      if (exists) {
        await prismaAny.procedure.update({ where: { code: p.id }, data: {
          name: p.name,
          description: p.description,
          basePrice: p.basePrice,
          requiresEvaluation: p.requiresEvaluation,
          duration: p.duration,
          categories: p.categories
        } });
      } else {
        await prismaAny.procedure.create({ data: {
          code: p.id,
          name: p.name,
          description: p.description,
          basePrice: p.basePrice,
          requiresEvaluation: p.requiresEvaluation,
          duration: p.duration,
          categories: p.categories
        } });
        procCount++;
      }
    }

    // Seed insurances and link procedures
    for (const i of insurances) {
      const exists = await prismaAny.insuranceCompany.findUnique({ where: { code: i.id } });
      let insuranceId: string;
      if (exists) {
        const updated = await prismaAny.insuranceCompany.update({ where: { code: i.id }, data: {
          name: i.name,
          displayName: i.displayName,
          discount: !!i.discount,
          notes: i.notes || ''
        } });
        insuranceId = updated.id;
      } else {
        const created = await prismaAny.insuranceCompany.create({ data: {
          code: i.id,
          name: i.name,
          displayName: i.displayName,
          discount: !!i.discount,
          notes: i.notes || ''
        } });
        insuranceId = created.id;
        insCount++;
      }
      for (const pid of i.procedures) {
        const proc = await prismaAny.procedure.findUnique({ where: { code: pid } });
        if (!proc) continue;
        const existsLink = await prismaAny.insuranceProcedure.findUnique({ where: { insuranceId_procedureId: { insuranceId, procedureId: proc.id } } });
        if (!existsLink) {
          await prismaAny.insuranceProcedure.create({ data: { insuranceId, procedureId: proc.id } });
          linksCount++;
        }
      }
    }

    // Seed clinics
    for (const l of locations) {
      const exists = await prismaAny.clinic.findUnique({ where: { code: l.id } });
      const data = {
        code: l.id,
        name: l.name,
        displayName: l.name,
        address: l.address,
        neighborhood: l.neighborhood,
        city: l.city,
        state: l.state,
        zipCode: l.zipCode,
        phone: l.phone,
        email: l.email,
        openingHours: l.openingHours as any,
        specialties: l.specialties,
        parkingAvailable: !!l.parkingAvailable,
        accessibility: l.accessibility
      };
      if (exists) {
        await prismaAny.clinic.update({ where: { code: l.id }, data });
      } else {
        await prismaAny.clinic.create({ data });
        locCount++;
      }
    }

    res.json({ success: true, created: { procedures: procCount, insurances: insCount, clinics: locCount, links: linksCount } });
  } catch (error: any) {
    console.error('Seed error:', error);
    res.status(500).json({ success: false, error: 'Failed to seed from static catalog', details: String(error?.message || error) });
  }
});

export default router
