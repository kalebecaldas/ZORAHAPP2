import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function findProceduresWithoutPackages() {
    const procedures = await prisma.procedure.findMany({
        orderBy: { name: 'asc' }
    })

    console.log('\\n📊 PROCEDIMENTOS PARTICULAR SEM PACOTES:\\n')

    const withoutPackages: any[] = []

    for (const proc of procedures) {
        const particularConfigs = await prisma.clinicInsuranceProcedure.findMany({
            where: {
                procedureCode: proc.code,
                insurance: { code: 'PARTICULAR' }
            },
            include: {
                insurance: true,
                clinic: true
            }
        })

        for (const config of particularConfigs) {
            if (!config.hasPackage || !config.packageInfo) {
                withoutPackages.push({
                    procedure: proc.name,
                    clinic: config.clinic.displayName,
                    price: config.price
                })
            }
        }
    }

    console.log('\\n❌ PROCEDIMENTOS SEM PACOTES (PARTICULAR):')
    for (const item of withoutPackages) {
        console.log(`  • ${item.procedure} (${item.clinic}) - R$ ${item.price}`)
    }

    console.log(`\\n\\nTotal: ${withoutPackages.length} procedimentos sem pacotes`)

    await prisma.$disconnect()
}

findProceduresWithoutPackages().catch(console.error)
