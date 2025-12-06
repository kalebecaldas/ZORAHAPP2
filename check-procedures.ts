import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkProcedures() {
    const procedures = await prisma.procedure.findMany({
        orderBy: { name: 'asc' }
    })

    console.log('\\n📊 VERIFICANDO PROCEDIMENTOS E PACOTES:\\n')

    for (const proc of procedures) {
        console.log(`\\n${proc.name} (${proc.code})`)
        console.log(`  Preço base: R$ ${proc.basePrice}`)

        const insuranceProcedures = await prisma.clinicInsuranceProcedure.findMany({
            where: { procedureCode: proc.code },
            include: {
                insurance: true,
                clinic: true
            }
        })

        if (insuranceProcedures.length === 0) {
            console.log(`  ⚠️ Sem configurações`)
        } else {
            for (const ip of insuranceProcedures) {
                console.log(`  • ${ip.clinic.displayName} - ${ip.insurance.displayName}`)
                console.log(`    Preço: R$ ${ip.price}`)
                if (ip.hasPackage && ip.packageInfo) {
                    try {
                        const packages = JSON.parse(ip.packageInfo)
                        console.log(`    ✅ Pacotes:`, packages)
                    } catch {
                        console.log(`    ⚠️ Pacote mal formatado`)
                    }
                } else {
                    console.log(`    ❌ Sem pacotes`)
                }
            }
        }
    }

    console.log('\\n\\n🎯 FOCO: PILATES')
    const pilates = procedures.find(p => p.name.toLowerCase().includes('pilates'))
    if (pilates) {
        console.log(`\\nEncontrado: ${pilates.name}`)
        const pilatesConfigs = await prisma.clinicInsuranceProcedure.findMany({
            where: { procedureCode: pilates.code },
            include: { insurance: true, clinic: true }
        })

        for (const config of pilatesConfigs) {
            console.log(`\\n  ${config.clinic.displayName} - ${config.insurance.displayName}`)
            console.log(`  Preço: R$ ${config.price}`)
            console.log(`  Tem pacote: ${config.hasPackage}`)
            console.log(`  PackageInfo:`, config.packageInfo)
        }
    }

    await prisma.$disconnect()
}

checkProcedures().catch(console.error)
