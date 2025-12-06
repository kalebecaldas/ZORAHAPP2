import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixSpecificDurations() {
    console.log('\n🔧 Corrigindo durações específicas...\n')

    // Quiropraxia → 60 minutos
    const quiropraxia = await prisma.procedure.findFirst({
        where: { code: 'QUIROPRAXIA' }
    })

    if (quiropraxia) {
        await prisma.procedure.update({
            where: { id: quiropraxia.id },
            data: { duration: 60 }
        })
        console.log(`✅ Quiropraxia: 30min → 60min`)
    }

    // Fisioterapia Pélvica → 40 minutos
    const pelvica = await prisma.procedure.findFirst({
        where: { code: 'FISIO_PELVICA' }
    })

    if (pelvica) {
        await prisma.procedure.update({
            where: { id: pelvica.id },
            data: { duration: 40 }
        })
        console.log(`✅ Fisioterapia Pélvica: 30min → 40min`)
    }

    // Avaliação Fisioterapia Pélvica → 40 minutos também
    const avaliacaoPelvica = await prisma.procedure.findFirst({
        where: { code: 'AVALIACAO_FISIO_PELVICA' }
    })

    if (avaliacaoPelvica) {
        await prisma.procedure.update({
            where: { id: avaliacaoPelvica.id },
            data: { duration: 40 }
        })
        console.log(`✅ Avaliação Fisioterapia Pélvica: 30min → 40min`)
    }

    console.log('\n✅ Correções aplicadas com sucesso!')

    await prisma.$disconnect()
}

fixSpecificDurations().catch(console.error)
