import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

async function run() {
  const prisma = new PrismaClient()
  try {
    const inDir = path.resolve(process.cwd(), 'api/data/exported')

    const readJson = (name: string) => {
      const p = path.join(inDir, name)
      if (!fs.existsSync(p)) return null
      const raw = fs.readFileSync(p, 'utf-8')
      return JSON.parse(raw)
    }

    const insurances = readJson('insurances.json') || []
    const procedures = readJson('procedures.json') || []
    const clinics = readJson('clinics.json') || []
    const clinicInsurances = readJson('clinicInsurances.json') || []
    const clinicProcedures = readJson('clinicProcedures.json') || []
    const clinicInsuranceProcedures = readJson('clinicInsuranceProcedures.json') || []
    const templates = readJson('templates.json') || []
    const workflows = readJson('workflows.json') || []

    for (const i of insurances) {
      const exists = await prisma.insuranceCompany.findUnique({ where: { code: i.code } })
      if (exists) {
        await prisma.insuranceCompany.update({ where: { code: i.code }, data: { name: i.name, displayName: i.displayName, discount: !!i.discount, discountPercentage: i.discountPercentage ?? 0, isParticular: !!i.isParticular, isActive: !!i.isActive, notes: i.notes ?? null } })
      } else {
        await prisma.insuranceCompany.create({ data: { code: i.code, name: i.name, displayName: i.displayName, discount: !!i.discount, discountPercentage: i.discountPercentage ?? 0, isParticular: !!i.isParticular, isActive: !!i.isActive, notes: i.notes ?? null } })
      }
    }

    for (const p of procedures) {
      const exists = await prisma.procedure.findUnique({ where: { code: p.code } })
      if (exists) {
        await prisma.procedure.update({ where: { code: p.code }, data: { name: p.name, description: p.description, importantInfo: p.importantInfo ?? null, basePrice: p.basePrice, requiresEvaluation: !!p.requiresEvaluation, duration: p.duration, categories: p.categories } })
      } else {
        await prisma.procedure.create({ data: { code: p.code, name: p.name, description: p.description, importantInfo: p.importantInfo ?? null, basePrice: p.basePrice, requiresEvaluation: !!p.requiresEvaluation, duration: p.duration, categories: p.categories } })
      }
    }

    for (const c of clinics) {
      const exists = await prisma.clinic.findUnique({ where: { code: c.code } })
      const data = { code: c.code, name: c.name, displayName: c.displayName, address: c.address, neighborhood: c.neighborhood, city: c.city, state: c.state, zipCode: c.zipCode, phone: c.phone, email: c.email ?? null, openingHours: c.openingHours, coordinates: c.coordinates ?? null, specialties: c.specialties, parkingAvailable: !!c.parkingAvailable, accessibility: c.accessibility, isActive: !!c.isActive }
      if (exists) {
        await prisma.clinic.update({ where: { code: c.code }, data })
      } else {
        await prisma.clinic.create({ data })
      }
    }

    const clinicsAll = await prisma.clinic.findMany()
    const clinicIdByCode = new Map(clinicsAll.map(c => [c.code, c.id]))

    for (const ci of clinicInsurances) {
      const clinicId = clinicIdByCode.get(ci.clinicCode)
      if (!clinicId) continue
      const exists = await prisma.clinicInsurance.findFirst({ where: { clinicId, insuranceCode: ci.insuranceCode } })
      if (exists) {
        await prisma.clinicInsurance.update({ where: { id: exists.id }, data: { isActive: !!ci.isActive } })
      } else {
        await prisma.clinicInsurance.create({ data: { clinicId, insuranceCode: ci.insuranceCode, isActive: !!ci.isActive } })
      }
    }

    for (const cp of clinicProcedures) {
      const clinicId = clinicIdByCode.get(cp.clinicCode)
      if (!clinicId) continue
      const exists = await prisma.clinicProcedure.findFirst({ where: { clinicId, procedureCode: cp.procedureCode } })
      if (exists) {
        await prisma.clinicProcedure.update({ where: { id: exists.id }, data: { defaultPrice: cp.defaultPrice ?? null, notes: cp.notes ?? null, isActive: !!cp.isActive } })
      } else {
        await prisma.clinicProcedure.create({ data: { clinicId, procedureCode: cp.procedureCode, defaultPrice: cp.defaultPrice ?? null, notes: cp.notes ?? null, isActive: !!cp.isActive } })
      }
    }

    for (const cip of clinicInsuranceProcedures) {
      const clinicId = clinicIdByCode.get(cip.clinicCode)
      if (!clinicId) continue
      const exists = await prisma.clinicInsuranceProcedure.findFirst({ where: { clinicId, insuranceCode: cip.insuranceCode, procedureCode: cip.procedureCode } })
      if (exists) {
        await prisma.clinicInsuranceProcedure.update({ where: { id: exists.id }, data: { price: cip.price, hasPackage: !!cip.hasPackage, packageInfo: cip.packageInfo ?? null, isActive: !!cip.isActive } })
      } else {
        await prisma.clinicInsuranceProcedure.create({ data: { clinicId, insuranceCode: cip.insuranceCode, procedureCode: cip.procedureCode, price: cip.price, hasPackage: !!cip.hasPackage, packageInfo: cip.packageInfo ?? null, isActive: !!cip.isActive } })
      }
    }

    for (const t of templates) {
      const exists = await prisma.template.findUnique({ where: { key: t.key } })
      if (exists) {
        await prisma.template.update({ where: { key: t.key }, data: { category: t.category, title: t.title, description: t.description ?? null, content: t.content, variables: t.variables, example: t.example ?? null, isActive: !!t.isActive } })
      } else {
        await prisma.template.create({ data: { key: t.key, category: t.category, title: t.title, description: t.description ?? null, content: t.content, variables: t.variables, example: t.example ?? null, isActive: !!t.isActive } })
      }
    }

    for (const w of workflows) {
      const exists = await prisma.workflow.findFirst({ where: { name: w.name } })
      const data = { name: w.name, description: w.description ?? null, type: w.type, config: w.config, isActive: !!w.isActive }
      if (exists) {
        await prisma.workflow.update({ where: { id: exists.id }, data })
      } else {
        await prisma.workflow.create({ data })
      }
    }
  } finally {
    await prisma.$disconnect()
  }
}

run()

