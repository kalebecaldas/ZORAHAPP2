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
  isActive: z.boolean().optional().default(true),
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
    const insurances = list.map((ic, i) => ({ ...ic, procedureCount: counts[i], isParticular: Boolean(ic.isParticular), isActive: Boolean(ic.isActive) }))
    res.json({ insurances, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } })
  } catch (error) {
    const catalog = clinicDataService.getInsuranceCompanies()
    const filtered = catalog.filter(ic => {
      const s = String(q).trim().toLowerCase()
      return !s || ic.name.toLowerCase().includes(s) || ic.displayName.toLowerCase().includes(s) || ic.id.toLowerCase().includes(s)
    })
    const start = (Number(page) - 1) * Number(limit)
    const slice = filtered.slice(start, start + Number(limit))
    const insurances = slice.map(ic => ({ code: ic.id, name: ic.name, displayName: ic.displayName, discount: !!(ic as any).discount, isParticular: false, isActive: true, notes: (ic as any).notes || '', procedureCount: (ic.procedures || []).length }))
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
    const [rawClinics, total] = await Promise.all([
      prismaAny.clinic.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { name: 'asc' },
        include: {
          clinicInsuranceProcedures: {
            include: { insurance: true }
          }
        }
      }),
      prismaAny.clinic.count({ where })
    ])

    const clinics = rawClinics.map((clinic: any) => {
      const insurancesMap = new Map()
      clinic.clinicInsuranceProcedures.forEach((cip: any) => {
        if (cip.insurance && !insurancesMap.has(cip.insurance.code)) {
          insurancesMap.set(cip.insurance.code, cip.insurance)
        }
      })
      const { clinicInsuranceProcedures, ...rest } = clinic
      return {
        ...rest,
        insurances: Array.from(insurancesMap.values())
      }
    })

    res.json({ clinics, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } })
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
      insurances: []
    }))
    res.json({ clinics, pagination: { page: Number(page), limit: Number(limit), total: filtered.length, pages: Math.ceil(filtered.length / Number(limit)) } })
  }
})

router.get('/clinics/:code', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const rawClinic = await prismaAny.clinic.findUnique({
    where: { code: req.params.code },
    include: {
      clinicInsuranceProcedures: {
        include: {
          insurance: true
        }
      }
    }
  })

  if (!rawClinic) {
    res.status(404).json({ error: 'Clínica não encontrada' })
    return
  }

  const insurancesMap = new Map()
  rawClinic.clinicInsuranceProcedures.forEach((cip: any) => {
    if (cip.insurance && !insurancesMap.has(cip.insurance.code)) {
      insurancesMap.set(cip.insurance.code, cip.insurance)
    }
  })
  const { clinicInsuranceProcedures, ...clinic } = rawClinic
  const result = {
    ...clinic,
    insurances: Array.from(insurancesMap.values())
  }

  res.json(result)
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
router.get('/clinics/:code/insurances', readAuth, async (req: Request, res: Response): Promise<void> => {
  const clinic = await prismaAny.clinic.findUnique({ where: { code: req.params.code }, include: { clinicInsurances: true } })
  if (!clinic) {
    res.status(404).json({ error: 'Clínica não encontrada' })
    return
  }
  const codes = clinic.clinicInsurances.map(ci => ci.insuranceCode)
  const details = await prismaAny.insuranceCompany.findMany({ where: { code: { in: codes } } })
  const byCode = new Map(details.map((d: any) => [d.code, d]))
  const list = clinic.clinicInsurances.map(ci => {
    const d: any = byCode.get(ci.insuranceCode) || {}
    return {
      ...ci,
      name: d.name || ci.insuranceCode,
      displayName: d.displayName || d.name || ci.insuranceCode,
      isParticular: !!d.isParticular
    }
  })
  res.json({ insurances: list })
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

const clinicInsuranceProcedureSchema = z.object({
  price: z.number().min(0),
  isActive: z.boolean().optional().default(true),
  hasPackage: z.boolean().optional().default(false),
  packageInfo: z.string().optional()
})

// Clinic Insurance Procedure Management
router.get('/clinics/:clinicCode/insurances/:insuranceCode/procedures', readAuth, async (req: Request, res: Response) => {
  const { clinicCode, insuranceCode } = req.params
  try {
    const procedures = await prisma.clinicInsuranceProcedure.findMany({
      where: {
        clinicId: clinicCode,
        insuranceCode: insuranceCode
      },
      include: {
        procedure: true
      }
    })
    res.json(procedures.map(p => ({ ...p.procedure, ...p, procedure: undefined })))
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar procedimentos do convênio' })
  }
})

router.post('/clinics/:clinicCode/insurances/:insuranceCode/procedures/:procedureCode', authMiddleware, requireRole('ADMIN'), async (req: Request, res: Response) => {
  const { clinicCode, insuranceCode, procedureCode } = req.params
  try {
    const data = clinicInsuranceProcedureSchema.parse(req.body)
    const newProcedure = await prisma.clinicInsuranceProcedure.create({
      data: {
        clinicId: clinicCode,
        insuranceCode: insuranceCode,
        procedureCode: procedureCode,
        price: data.price,
        isActive: data.isActive,
        hasPackage: data.hasPackage,
        packageInfo: data.packageInfo
      }
    })
    res.status(201).json(newProcedure)
  } catch (error) {
    res.status(400).json({ error: 'Dados inválidos' })
  }
})

router.put('/clinics/:clinicCode/insurances/:insuranceCode/procedures/:procedureCode', authMiddleware, requireRole('ADMIN'), async (req: Request, res: Response) => {
  const { clinicCode, insuranceCode, procedureCode } = req.params
  try {
    const data = clinicInsuranceProcedureSchema.parse(req.body)
    const updatedProcedure = await prisma.clinicInsuranceProcedure.update({
      where: {
        clinicId_insuranceCode_procedureCode: {
          clinicId: clinicCode,
          insuranceCode: insuranceCode,
          procedureCode: procedureCode
        }
      },
      data: {
        price: data.price,
        isActive: data.isActive,
        hasPackage: data.hasPackage,
        packageInfo: data.packageInfo
      }
    })
    res.json(updatedProcedure)
  } catch (error) {
    res.status(400).json({ error: 'Dados inválidos' })
  }
})

router.delete('/clinics/:clinicCode/insurances/:insuranceCode/procedures/:procedureCode', authMiddleware, requireRole('ADMIN'), async (req: Request, res: Response) => {
  const { clinicCode, insuranceCode, procedureCode } = req.params
  await prisma.clinicInsuranceProcedure.delete({
    where: {
      clinicId_insuranceCode_procedureCode: {
        clinicId: clinicCode,
        insuranceCode: insuranceCode,
        procedureCode: procedureCode
      }
    }
  })
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

    // Seed insurances
    for (const i of insurances) {
      const exists = await prismaAny.insuranceCompany.findUnique({ where: { code: i.id } });
      if (exists) {
        await prismaAny.insuranceCompany.update({ where: { code: i.id }, data: {
          name: i.name,
          displayName: i.displayName,
          discount: !!i.discount,
          notes: i.notes || ''
        } });
      } else {
        await prismaAny.insuranceCompany.create({ data: {
          code: i.id,
          name: i.name,
          displayName: i.displayName,
          discount: !!i.discount,
          notes: i.notes || ''
        } });
        insCount++;
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

    // Ensure 'particular' insurance exists (convênio particular)
    const particular = await prismaAny.insuranceCompany.findUnique({ where: { code: 'particular' } })
    if (!particular) {
      await prismaAny.insuranceCompany.create({ data: { code: 'particular', name: 'Particular', displayName: 'Particular', discount: false, isParticular: true, isActive: true } })
      insCount++
    }

    // Link common insurances to all clinics by default (development convenience)
    const allIns = await prismaAny.insuranceCompany.findMany({ });
    const allClinics = await prismaAny.clinic.findMany({ });
    for (const clinic of allClinics) {
      for (const ic of allIns) {
        const existsLink = await prismaAny.clinicInsurance.findFirst({ where: { clinicId: clinic.id, insuranceCode: ic.code } });
        if (!existsLink) {
          await prismaAny.clinicInsurance.create({ data: { clinicId: clinic.id, insuranceCode: ic.code, isActive: true } });
        }
      }
    }

    // Seed ClinicInsuranceProcedures
    const allProcedures = await prismaAny.procedure.findMany({});
    for (const clinic of allClinics) {
      for (const proc of allProcedures) {
        for (const ic of allIns) {
          const exists = await prismaAny.clinicInsuranceProcedure.findFirst({
            where: {
              clinicId: clinic.id,
              procedureCode: proc.code,
              insuranceCode: ic.code,
            },
          });

          if (!exists) {
            let price = proc.basePrice;
            if (ic.code !== 'particular') {
              // Apply a 30% markup for other insurances as an example
              price = parseFloat((proc.basePrice * 1.3).toFixed(2));
            }

            await prismaAny.clinicInsuranceProcedure.create({
              data: {
                clinicId: clinic.id,
                procedureCode: proc.code,
                insuranceCode: ic.code,
                price: price,
                isActive: true,
              },
            });
            linksCount++;
          }
        }
      }
    }

    res.json({ success: true, created: { procedures: procCount, insurances: insCount, clinics: locCount, links: linksCount } });
  } catch (error: any) {
    console.error('Seed error:', error);
    res.status(500).json({ success: false, error: 'Failed to seed from static catalog', details: String(error?.message || error) });
  }
});

router.post('/import/infor-text', readAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const fs = await import('fs')
    const path = '/Users/kalebecaldas/Documents/trae_projects/Zorah APP 2/src/infor_clinic.txt'
    const raw = fs.readFileSync(path, 'utf-8')
    const lines = raw.split(/\r?\n/)
    const mapNames: Record<string, string> = {
      'FISIOTERAPIA ORTOPEDICA': 'fisioterapia-ortopedica',
      'FISIOTERAPIA NEUROLOGICA': 'fisioterapia-neurologica',
      'FISIOTERAPIA RESPIRATORIA': 'fisioterapia-respiratoria',
      'FISIOTERAPIA PÓS OPERATÓRIA': 'fisioterapia-pos-operatoria',
      'FISIOTERAPIA PELVICA': 'fisioterapia-pelvica',
      'CONSULTA ORTOPEDISTA': 'consulta-ortopedista',
      'CONSULTA ORTOPEDICA': 'consulta-ortopedista',
      'CONSULTA CLINICO GERAL': 'consulta-clinico-geral',
      'AVALIAÇÃO ACUPUNTURA': 'avaliacao-acupuntura',
      'AVALIAÇÃO FISIOTERAPIA PÉLVICA': 'avaliacao-fisio-pelvica',
      'ACUPUNTURA': 'acupuntura',
      'RPG': 'rpg',
      'PILATES 2x NA SEMANA': 'pilates-2x',
      'PILATES 3x NA SEMANA': 'pilates-3x',
      'PILATES SESSÃO AVULSA': 'pilates-avulsa',
      'QUIROPRAXIA': 'quiropraxia',
      'ESTIMULAÇÃO ELÉTRICA TRANSCUTÂNEA': 'tens',
      'ESTIMULAÇÃO ELÉTRICA TRANSCUTÂNEA (TENS)': 'tens',
      'ESTIMULAÇÃO ELÉTRICA TRANSCUTÂNEA ( TENS )': 'tens',
      'TERAPIAS POR ONDAS DE CHOQUE': 'ondas-de-choque',
      'INFILTRAÇÃO DE PONTO GATILHO': 'infiltracao-ponto-gatilho',
      'AGULHAMENTO A SECO': 'agulhamento-seco'
    }
    const priceRegex = /(R\$\s*[0-9]+,[0-9]{2})/i
    const parsePrice = (s: string): number => {
      const m = s.match(priceRegex)
      if (!m) return 0
      const v = m[1].replace(/[^0-9,]/g, '').replace(',', '.')
      return Number(v)
    }
    const sectionVieiralves = [] as string[]
    const sectionSaoJose = [] as string[]
    const insuranceBlocks: Array<{ insuranceName: string, procedures: string[] }> = []
    let currentBlock: { insuranceName: string, procedures: string[] } | null = null
    let current: 'none' | 'vieiralves' | 'sao-jose' = 'none'
    for (const line of lines) {
      const l = line.trim()
      if (!l) continue
      if (l.startsWith('(')) {
        const header = l.replace(/[()]/g, '')
        const parts = header.split('-')
        const insuranceName = parts[0].trim()
        const firstProc = parts.slice(1).join('-').trim()
        currentBlock = { insuranceName, procedures: [] }
        if (firstProc) currentBlock.procedures.push(firstProc)
        continue
      }
      if (l.endsWith(')') && currentBlock) {
        const content = l.replace(/[)]/g, '')
        if (content) currentBlock.procedures.push(content.trim())
        insuranceBlocks.push(currentBlock)
        currentBlock = null
        continue
      }
      if (currentBlock) {
        currentBlock.procedures.push(l)
        continue
      }
      if (l.startsWith('PARTICULAR UNIDADE VIEIRALVES')) { current = 'vieiralves'; continue }
      if (l.startsWith('PARTICULAR SÃO JOSÉ') || l.startsWith('PARTICULAR SÃO JOSE') || l.startsWith('PARTICULAR SAO JOSÉ') || l.startsWith('PARTICULAR SAO JOSE')) { current = 'sao-jose'; continue }
      if (l.startsWith('PACOTES UNIDADE SÃO JOSÉ') || l.startsWith('PACOTES UNIDADE SAO JOSE')) { current = 'sao-jose'; continue }
      if (current === 'vieiralves') sectionVieiralves.push(l)
      if (current === 'sao-jose') sectionSaoJose.push(l)
    }
    const upsertClinicProc = async (clinicCode: string, name: string, line: string) => {
      const procCode = mapNames[name]
      if (!procCode) return
      const clinic = await prismaAny.clinic.findUnique({ where: { code: clinicCode } })
      if (!clinic) return
      const price = parsePrice(line)
      const exists = await prismaAny.clinicProcedure.findFirst({ where: { clinicId: clinic.id, procedureCode: procCode } })
      if (exists) {
        await prismaAny.clinicProcedure.update({ where: { id: exists.id }, data: { particularPrice: price } })
      } else {
        await prismaAny.clinicProcedure.create({ data: { clinicId: clinic.id, procedureCode: procCode, particularPrice: price, insurancePrice: {} } })
      }
    }
    for (const l of sectionVieiralves) {
      const name = l.split(' R$')[0].trim()
      if (mapNames[name]) await upsertClinicProc('vieiralves', name, l)
    }
    for (const l of sectionSaoJose) {
      if (l.toUpperCase().startsWith('PACOTES')) continue
      const name = l.split(' R$')[0].trim()
      if (mapNames[name]) await upsertClinicProc('sao-jose', name, l)
    }
    const packageLines = sectionSaoJose.filter(s => /R\$/.test(s))
    const pkgMap: Record<string, string> = {}
    for (const l of packageLines) {
      const name = l.split(' R$')[0].trim().toUpperCase()
      const code = mapNames[name]
      if (!code) continue
      const info = l
      pkgMap[code] = info
    }
    const sj = await prismaAny.clinic.findUnique({ where: { code: 'sao-jose' } })
    if (sj) {
      for (const [code, info] of Object.entries(pkgMap)) {
        const exists = await prismaAny.clinicProcedure.findFirst({ where: { clinicId: sj.id, procedureCode: code } })
        if (exists) {
          await prismaAny.clinicProcedure.update({ where: { id: exists.id }, data: { hasPackage: true, packageInfo: info } })
        } else {
          await prismaAny.clinicProcedure.create({ data: { clinicId: sj.id, procedureCode: code, particularPrice: 0, insurancePrice: {}, hasPackage: true, packageInfo: info } })
        }
      }
    }
    const ensureCode = (name: string) => name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')
    const allClinics = await prismaAny.clinic.findMany({})
    const vCode = 'particular-vieiralves'
    const sjCode = 'particular-sao-jose'
    if (!await prismaAny.insuranceCompany.findUnique({ where: { code: vCode } })) {
      await prismaAny.insuranceCompany.create({ data: { code: vCode, name: 'Convênio Particular Vieiralves', displayName: 'Convênio Particular Vieiralves', isActive: true } })
    }
    if (!await prismaAny.insuranceCompany.findUnique({ where: { code: sjCode } })) {
      await prismaAny.insuranceCompany.create({ data: { code: sjCode, name: 'Convênio Particular São José', displayName: 'Convênio Particular São José', isActive: true } })
    }
    const vieiralves = allClinics.find((c:any)=> c.code==='vieiralves')
    const saoJose = allClinics.find((c:any)=> c.code==='sao-jose')
    if (vieiralves) {
      const link = await prismaAny.clinicInsurance.findFirst({ where: { clinicId: vieiralves.id, insuranceCode: vCode } })
      if (!link) await prismaAny.clinicInsurance.create({ data: { clinicId: vieiralves.id, insuranceCode: vCode, isActive: true } })
      const cprocs = await prismaAny.clinicProcedure.findMany({ where: { clinicId: vieiralves.id } })
      for (const cp of cprocs) {
        const price = Number(cp.particularPrice || 0)
        const cip = await prismaAny.clinicInsuranceProcedure.findFirst({ where: { clinicId: vieiralves.id, insuranceCode: vCode, procedureCode: cp.procedureCode } })
        if (cip) {
          await prismaAny.clinicInsuranceProcedure.update({ where: { id: cip.id }, data: { price, isActive: true, hasPackage: !!cp.hasPackage, packageInfo: cp.packageInfo || null } })
        } else {
          await prismaAny.clinicInsuranceProcedure.create({ data: { clinicId: vieiralves.id, insuranceCode: vCode, procedureCode: cp.procedureCode, price, isActive: true, hasPackage: !!cp.hasPackage, packageInfo: cp.packageInfo || null } })
        }
      }
    }
    if (saoJose) {
      const link = await prismaAny.clinicInsurance.findFirst({ where: { clinicId: saoJose.id, insuranceCode: sjCode } })
      if (!link) await prismaAny.clinicInsurance.create({ data: { clinicId: saoJose.id, insuranceCode: sjCode, isActive: true } })
      const cprocs = await prismaAny.clinicProcedure.findMany({ where: { clinicId: saoJose.id } })
      for (const cp of cprocs) {
        const price = Number(cp.particularPrice || 0)
        const cip = await prismaAny.clinicInsuranceProcedure.findFirst({ where: { clinicId: saoJose.id, insuranceCode: sjCode, procedureCode: cp.procedureCode } })
        if (cip) {
          await prismaAny.clinicInsuranceProcedure.update({ where: { id: cip.id }, data: { price, isActive: true, hasPackage: !!cp.hasPackage, packageInfo: cp.packageInfo || null } })
        } else {
          await prismaAny.clinicInsuranceProcedure.create({ data: { clinicId: saoJose.id, insuranceCode: sjCode, procedureCode: cp.procedureCode, price, isActive: true, hasPackage: !!cp.hasPackage, packageInfo: cp.packageInfo || null } })
        }
      }
    }
    // Upsert insurance companies and coverage to clinics based on parsed blocks
    for (const b of insuranceBlocks) {
      const code = ensureCode(b.insuranceName)
      const insExists = await prismaAny.insuranceCompany.findUnique({ where: { code } })
      if (insExists) {
        await prismaAny.insuranceCompany.update({ where: { code }, data: { name: b.insuranceName, displayName: b.insuranceName, isActive: true } })
      } else {
        await prismaAny.insuranceCompany.create({ data: { code, name: b.insuranceName, displayName: b.insuranceName, isActive: true } })
      }
      // Link insurance to clinics
      for (const clinic of allClinics) {
        const link = await prismaAny.clinicInsurance.findFirst({ where: { clinicId: clinic.id, insuranceCode: code } })
        if (!link) await prismaAny.clinicInsurance.create({ data: { clinicId: clinic.id, insuranceCode: code, isActive: true } })
      }
      // Create coverage procedure records with price 0
      for (const pn of b.procedures) {
        const key = pn.replace(/[)]/g,'').trim().toUpperCase()
        const procCode = mapNames[key]
        if (!procCode) continue
        for (const clinic of allClinics) {
          const cip = await prismaAny.clinicInsuranceProcedure.findFirst({ where: { clinicId: clinic.id, insuranceCode: code, procedureCode: procCode } })
          if (!cip) {
            await prismaAny.clinicInsuranceProcedure.create({ data: { clinicId: clinic.id, insuranceCode: code, procedureCode: procCode, price: 0, isActive: true } })
          }
        }
      }
    }
    res.json({ success: true })
  } catch (error: any) {
    res.status(500).json({ success: false, error: String(error?.message || error) })
  }
})

router.get('/clinics/:code/procedures/:procedureCode/price', readAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, procedureCode } = req.params
    const clinic = await prismaAny.clinic.findUnique({ where: { code } })
    if (!clinic) { res.status(404).json({ error: 'Clínica não encontrada' }); return }
    const proc = await prismaAny.procedure.findUnique({ where: { code: procedureCode } })
    if (!proc) { res.status(404).json({ error: 'Procedimento não encontrado' }); return }
    const clinicProc = await prismaAny.clinicProcedure.findFirst({ where: { clinicId: clinic.id, procedureCode } })
    const particular = clinicProc ? Number(clinicProc.particularPrice || 0) : Number(proc.basePrice || 0)
    const insProcs = await prismaAny.clinicInsuranceProcedure.findMany({ where: { clinicId: clinic.id, procedureCode } })
    const byInsurance: Record<string, number> = {}
    for (const ip of insProcs) byInsurance[ip.insuranceCode] = Number(ip.price || 0)
    res.json({ particular, byInsurance })
  } catch {
    res.status(500).json({ error: 'Erro ao buscar preços' })
  }
})

export default router
