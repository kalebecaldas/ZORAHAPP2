import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function updatePilatesPackages() {
    // Buscar configuração do Pilates Particular Vieiralves
    const pilatesConfig = await prisma.clinicInsuranceProcedure.findFirst({
        where: {
            procedureCode: 'PILATES',
            insurance: { code: 'PARTICULAR' },
            clinic: { code: 'VIEIRALVES' }
        }
    })

    if (!pilatesConfig) {
        console.log('❌ Configuração do Pilates não encontrada')
        return
    }

    // Criar estrutura de pacotes
    const packages = [
        {
            name: 'Pilates 2x na semana',
            price: 39,
            sessions: 8, // 2x/semana x 4 semanas
            description: '2 sessões por semana'
        },
        {
            name: 'Pilates 3x na semana',
            price: 56,
            sessions: 12, // 3x/semana x 4 semanas
            description: '3 sessões por semana'
        },
        {
            name: 'Pilates sessão avulsa',
            price: 70,
            sessions: 1,
            description: 'Sessão avulsa'
        }
    ]

    // Atualizar no banco
    await prisma.clinicInsuranceProcedure.update({
        where: { id: pilatesConfig.id },
        data: {
            hasPackage: true,
            packageInfo: JSON.stringify(packages)
        }
    })

    console.log('✅ Pacotes do Pilates atualizados com sucesso!')
    console.log('\\nPacotes configurados:')
    for (const pkg of packages) {
        console.log(`  • ${pkg.name}: R$ ${pkg.price} (${pkg.sessions} sessões)`)
    }

    await prisma.$disconnect()
}

updatePilatesPackages().catch(console.error)
