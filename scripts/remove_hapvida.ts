import prisma from '../api/prisma/client.js'

/**
 * Script para REMOVER HAPVIDA do banco de dados
 * HAPVIDA não é um convênio atendido pela clínica
 * 
 * USO:
 * npx tsx scripts/remove_hapvida.ts
 */

async function removeHapvida() {
    console.log('🗑️  Removendo HAPVIDA do banco de dados...\n')

    try {
        // 1. Verificar se HAPVIDA existe
        const hapvida = await prisma.insuranceCompany.findUnique({
            where: { code: 'HAPVIDA' }
        })

        if (!hapvida) {
            console.log('✅ HAPVIDA não encontrado no banco de dados. Nada a fazer.\n')
            await prisma.$disconnect()
            return
        }

        console.log(`⚠️  HAPVIDA encontrado: ${hapvida.name} (${hapvida.code})`)

        // 2. Remover relações com clínicas
        const clinicInsurances = await prisma.clinicInsurance.deleteMany({
            where: { insuranceCode: 'HAPVIDA' }
        })
        console.log(`✅ ${clinicInsurances.count} relação(ões) com clínicas removida(s)`)

        // 3. Remover preços de procedimentos
        const prices = await prisma.clinicInsuranceProcedure.deleteMany({
            where: { insuranceCode: 'HAPVIDA' }
        })
        console.log(`✅ ${prices.count} preço(s) de procedimento(s) removido(s)`)

        // 4. Remover o convênio
        await prisma.insuranceCompany.delete({
            where: { code: 'HAPVIDA' }
        })
        console.log(`✅ HAPVIDA removido do banco de dados\n`)

        console.log('🎉 Limpeza concluída! HAPVIDA foi completamente removido.\n')

    } catch (error) {
        console.error('❌ Erro ao remover HAPVIDA:', error)
        throw error
    } finally {
        await prisma.$disconnect()
    }
}

removeHapvida()
