import prisma from './api/prisma/client.js'

async function checkDatabase() {
    try {
        console.log('🔍 Verificando banco de dados...\n')

        // Workflows
        const workflows = await prisma.workflow.findMany({
            where: { isActive: true },
            select: { id: true, name: true, type: true }
        })
        console.log('✅ Workflows ativos:', workflows.length)
        workflows.forEach(w => console.log(`   - ${w.name} (${w.type})`))

        // Usuários
        const users = await prisma.user.count()
        console.log(`\n✅ Usuários: ${users}`)

        // Pacientes
        const patients = await prisma.patient.count()
        console.log(`✅ Pacientes: ${patients}`)

        // Conversações
        const conversations = await prisma.conversation.count()
        const botQueue = await prisma.conversation.count({ where: { status: 'BOT_QUEUE' } })
        const humanQueue = await prisma.conversation.count({ where: { status: 'AGUARDANDO' } })
        const assigned = await prisma.conversation.count({ where: { status: 'EM_ATENDIMENTO' } })
        console.log(`✅ Conversações: ${conversations}`)
        console.log(`   - BOT_QUEUE: ${botQueue}`)
        console.log(`   - AGUARDANDO: ${humanQueue}`)
        console.log(`   - EM_ATENDIMENTO: ${assigned}`)

        // Clínicas
        const clinics = await prisma.clinic.count()
        console.log(`\n✅ Clínicas: ${clinics}`)

        // Procedimentos
        const procedures = await prisma.procedure.count()
        console.log(`✅ Procedimentos: ${procedures}`)

        // Convênios
        const insurances = await prisma.insuranceCompany.count()
        console.log(`✅ Convênios: ${insurances}`)

        // AI Configuration
        const aiConfig = await prisma.aIConfiguration.findFirst({
            where: { isActive: true },
            select: { id: true, name: true, isActive: true }
        })
        console.log(`\n✅ Configuração IA:`, aiConfig ? aiConfig.name : '❌ Não encontrada')

        console.log('\n✅ Verificação completa!\n')

    } catch (error) {
        console.error('❌ Erro ao verificar banco:', error)
    } finally {
        await prisma.$disconnect()
    }
}

checkDatabase()
