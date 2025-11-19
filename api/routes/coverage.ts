import { Router, type Request, type Response } from 'express'
import prisma from '../prisma/client.js'
import { clinicDataService } from '../data/clinicData.js'

const router = Router()

async function ensureSeed(): Promise<void> {
  const count = await prisma.insuranceCompany.count()
  if (count > 0) return
  for (const ic of clinicDataService.getInsuranceCompanies()) {
    await prisma.insuranceCompany.create({
      data: {
        code: ic.id,
        name: ic.name,
        displayName: ic.displayName,
        discount: Boolean((ic as any).discount),
        notes: (ic as any).notes || null
      }
    })
  }
  for (const p of clinicDataService.getProcedures()) {
    await prisma.procedure.create({
      data: {
        code: p.id,
        name: p.name,
        description: p.description,
        basePrice: p.basePrice,
        requiresEvaluation: p.requiresEvaluation,
        duration: p.duration,
        categories: p.categories
      }
    })
  }
  for (const ic of clinicDataService.getInsuranceCompanies()) {
    for (const pid of ic.procedures) {
      const insurance = await prisma.insuranceCompany.findUnique({ where: { code: ic.id } })
      const proc = await prisma.procedure.findUnique({ where: { code: pid } })
      const clinic = await prisma.clinic.findFirst()
      if (insurance && proc && clinic) {
        await prisma.clinicInsuranceProcedure.create({ data: { clinicId: clinic.code, insuranceCode: insurance.code, procedureCode: proc.code, price: proc.basePrice, isActive: true } })
      }
    }
  }
}

router.get('/convenios', async (req: Request, res: Response): Promise<void> => {
  await ensureSeed()
  const list = await prisma.insuranceCompany.findMany({ orderBy: { name: 'asc' } })
  res.json({ convenios: list.map(ic => ({ id: ic.code, name: ic.name, displayName: ic.displayName, procedureCount: 0, discount: ic.discount })) })
})

router.get('/convenios/:id/procedimentos', async (req: Request, res: Response): Promise<void> => {
  await ensureSeed()
  const code = String(req.params.id)
  const ic = await prisma.insuranceCompany.findUnique({ where: { code } })
  if (!ic) {
    res.status(404).json({ error: 'Convênio não encontrado' })
    return
  }
  const links = await prisma.clinicInsuranceProcedure.findMany({ where: { insuranceCode: ic.code } })
  const procs = await prisma.procedure.findMany({ where: { code: { in: links.map(l => l.procedureCode) } }, orderBy: { name: 'asc' } })
  const byCode = new Map(procs.map(p => [p.code, p]))
  const list = links.map(l => {
    const p = byCode.get(l.procedureCode)
    return {
      id: p?.code || '',
      name: p?.name || '',
      description: p?.description || '',
      duration: p?.duration || 0,
      requiresEvaluation: !!p?.requiresEvaluation,
      defaultParticularPrice: l.price ?? null,
      defaultPackageInfo: l.packageInfo ?? null,
      isActive: !!l.isActive
    }
  }).sort((a, b) => a.name.localeCompare(b.name))
  res.json({ convenio: { id: ic.code, name: ic.name, displayName: ic.displayName, discount: ic.discount, isParticular: !!ic.isParticular, isActive: !!ic.isActive, notes: ic.notes || undefined }, procedimentos: list })
})

export default router
