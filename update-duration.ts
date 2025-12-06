import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function updateAllProceduresDuration() {
    // Buscar todos os procedimentos
    const procedures = await prisma.procedure.findMany()

    console.log(`\n📊 Atualizando duração de ${procedures.length} procedimentos para 30 minutos...\n`)

    let updated = 0
    let alreadyCorrect = 0

    for (const proc of procedures) {
        if (proc.duration !== 30) {
            await prisma.procedure.update({
                where: { id: proc.id },
                data: { duration: 30 }
            })
            console.log(`✅ ${proc.name}: ${proc.duration}min → 30min`)
            updated++
        } else {
            console.log(`⏭️  ${proc.name}: já está em 30min`)
            alreadyCorrect++
        }
    }

    console.log(`\n\n📈 RESUMO:`)
    console.log(`Total de procedimentos: ${procedures.length}`)
    console.log(`Atualizados: ${updated}`)
    console.log(`Já corretos: ${alreadyCorrect}`)

    await prisma.$disconnect()
}

updateAllProceduresDuration().catch(console.error)
