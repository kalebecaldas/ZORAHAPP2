import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

async function run() {
  const prisma = new PrismaClient()
  try {
    const outDir = path.resolve(process.cwd(), 'api/data/exported')
    fs.mkdirSync(outDir, { recursive: true })

    const insurances = await prisma.insuranceCompany.findMany()
    const procedures = await prisma.procedure.findMany()
    const clinics = await prisma.clinic.findMany()

    const clinicInsurancesRaw = await prisma.clinicInsurance.findMany({ include: { clinic: true } })
    const clinicInsurances = clinicInsurancesRaw.map(ci => ({ clinicCode: ci.clinic.code, insuranceCode: ci.insuranceCode, isActive: ci.isActive }))

    const clinicProceduresRaw = await prisma.clinicProcedure.findMany({ include: { clinic: true, procedure: true } })
    const clinicProcedures = clinicProceduresRaw.map(cp => ({ clinicCode: cp.clinic.code, procedureCode: cp.procedure.code, defaultPrice: cp.defaultPrice, notes: cp.notes, isActive: cp.isActive }))

    const clinicInsuranceProceduresRaw = await prisma.clinicInsuranceProcedure.findMany({ include: { clinic: true, procedure: true, insurance: true } })
    const clinicInsuranceProcedures = clinicInsuranceProceduresRaw.map(cip => ({ clinicCode: cip.clinic.code, insuranceCode: cip.insurance.code, procedureCode: cip.procedure.code, price: cip.price, hasPackage: cip.hasPackage, packageInfo: cip.packageInfo, isActive: cip.isActive }))

    const templates = await prisma.template.findMany()
    const workflows = await prisma.workflow.findMany()

    fs.writeFileSync(path.join(outDir, 'insurances.json'), JSON.stringify(insurances, null, 2))
    fs.writeFileSync(path.join(outDir, 'procedures.json'), JSON.stringify(procedures, null, 2))
    fs.writeFileSync(path.join(outDir, 'clinics.json'), JSON.stringify(clinics, null, 2))
    fs.writeFileSync(path.join(outDir, 'clinicInsurances.json'), JSON.stringify(clinicInsurances, null, 2))
    fs.writeFileSync(path.join(outDir, 'clinicProcedures.json'), JSON.stringify(clinicProcedures, null, 2))
    fs.writeFileSync(path.join(outDir, 'clinicInsuranceProcedures.json'), JSON.stringify(clinicInsuranceProcedures, null, 2))
    fs.writeFileSync(path.join(outDir, 'templates.json'), JSON.stringify(templates, null, 2))
    fs.writeFileSync(path.join(outDir, 'workflows.json'), JSON.stringify(workflows, null, 2))
  } finally {
    await prisma.$disconnect()
  }
}

run()

