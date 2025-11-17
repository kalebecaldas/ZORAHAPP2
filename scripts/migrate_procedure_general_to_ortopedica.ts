import { PrismaClient } from '@prisma/client'
import { clinicDataService } from '../api/data/clinicData'

async function run() {
  const prisma = new PrismaClient()
  let movedLinks = 0
  let movedClinicProcs = 0
  let updatedAppointments = 0
  let updatedInteractions = 0
  try {
    const general = await prisma.procedure.findUnique({ where: { code: 'fisioterapia-geral' } })
    let ortho = await prisma.procedure.findUnique({ where: { code: 'fisioterapia-ortopedica' } })
    const catalog = clinicDataService.getProcedureById('fisioterapia-ortopedica') as any
    if (!ortho && general) {
      ortho = await prisma.procedure.update({ where: { id: general.id }, data: {
        code: 'fisioterapia-ortopedica',
        name: catalog?.name || 'Fisioterapia Ortopédica',
        description: catalog?.description || 'Reabilitação ortopédica',
        basePrice: catalog?.basePrice ?? 90,
        requiresEvaluation: catalog?.requiresEvaluation ?? true,
        duration: catalog?.duration ?? 60,
        categories: catalog?.categories || ['fisioterapia']
      } })
    }
    if (general && ortho && general.id !== ortho.id) {
      const ip = (prisma as any).insuranceProcedure
      if (ip) {
        const links = await ip.findMany({ where: { procedureId: general.id } })
        for (const link of links) {
          try {
            const exists = await ip.findUnique({ where: { insuranceId_procedureId: { insuranceId: link.insuranceId, procedureId: ortho.id } } })
            if (!exists) {
              await ip.create({ data: { insuranceId: link.insuranceId, procedureId: ortho.id } })
              movedLinks++
            }
            await ip.delete({ where: { insuranceId_procedureId: { insuranceId: link.insuranceId, procedureId: general.id } } })
          } catch {}
        }
      }
      await prisma.procedure.delete({ where: { id: general.id } })
    }
    const cpClient = (prisma as any).clinicProcedure
    if (cpClient) {
      const clinicProcs = await cpClient.findMany({ where: { procedureCode: 'fisioterapia-geral' } })
      for (const cp of clinicProcs) {
        const existsNew = await cpClient.findUnique({ where: { clinicId_procedureCode: { clinicId: cp.clinicId, procedureCode: 'fisioterapia-ortopedica' } } })
        if (!existsNew) {
          await cpClient.create({ data: {
            clinicId: cp.clinicId,
            procedureCode: 'fisioterapia-ortopedica',
            particularPrice: cp.particularPrice,
            insurancePrice: cp.insurancePrice,
            isActive: cp.isActive
          } })
        }
        await cpClient.delete({ where: { clinicId_procedureCode: { clinicId: cp.clinicId, procedureCode: 'fisioterapia-geral' } } })
        movedClinicProcs++
      }
    }
    const apptRes = await prisma.appointment.updateMany({ where: { procedure: 'Fisioterapia Geral' }, data: { procedure: 'Fisioterapia Ortopédica' } })
    updatedAppointments = apptRes.count
    const interactions = await prisma.patientInteraction.findMany()
    for (const it of interactions) {
      const d = it.data as any
      if (!d) continue
      const replaced = JSON.parse(JSON.stringify(d, (_k, v) => {
        if (typeof v === 'string') {
          if (v === 'fisioterapia-geral') return 'fisioterapia-ortopedica'
          if (v === 'Fisioterapia Geral') return 'Fisioterapia Ortopédica'
        }
        return v
      }))
      const changed = JSON.stringify(d) !== JSON.stringify(replaced)
      if (changed) {
        await prisma.patientInteraction.update({ where: { id: it.id }, data: { data: replaced } })
        updatedInteractions++
      }
    }
    console.log(JSON.stringify({ movedLinks, movedClinicProcs, updatedAppointments, updatedInteractions }))
  } finally {
    await prisma.$disconnect()
  }
}

run().catch(err => { console.error(err); process.exit(1) })
