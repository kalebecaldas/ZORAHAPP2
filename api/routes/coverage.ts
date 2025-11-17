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
      if (insurance && proc) {
        await prisma.insuranceProcedure.create({ data: { insuranceId: insurance.id, procedureId: proc.id } })
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
  const links = await prisma.insuranceProcedure.findMany({ where: { insuranceId: ic.id } })
  const procs = await prisma.procedure.findMany({ where: { id: { in: links.map(l => l.procedureId) } }, orderBy: { name: 'asc' } })
  const list = procs.map(p => ({ id: p.code, name: p.name, description: p.description, duration: p.duration, requiresEvaluation: p.requiresEvaluation }))
  res.json({ convenio: { id: ic.code, name: ic.name, displayName: ic.displayName, discount: ic.discount, notes: ic.notes || undefined }, procedimentos: list })
})

export default router
