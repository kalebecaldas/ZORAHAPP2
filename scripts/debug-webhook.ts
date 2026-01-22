import prisma from '../api/prisma/client.js'

async function debugWebhook() {
    const token = 'whk_6c89d8da1a45719b4ba2a86b17e908200616a6364d0c0c3ba05caf8162fa5103'

    console.log('🔍 Buscando webhook por token...\n')

    // Buscar webhook
    const webhook = await prisma.webhookSubscription.findUnique({
        where: { token },
        include: {
            logs: {
                orderBy: { createdAt: 'desc' },
                take: 10
            },
            _count: {
                select: { logs: true }
            }
        }
    })

    if (!webhook) {
        console.log('❌ Webhook não encontrado com este token!')
        console.log('\n📋 Listando todos os webhooks cadastrados:\n')

        const allWebhooks = await prisma.webhookSubscription.findMany({
            select: {
                id: true,
                name: true,
                url: true,
                token: true,
                events: true,
                isActive: true,
                createdAt: true
            }
        })

        if (allWebhooks.length === 0) {
            console.log('   Nenhum webhook cadastrado')
        } else {
            allWebhooks.forEach((wh, i) => {
                console.log(`${i + 1}. ${wh.name}`)
                console.log(`   URL: ${wh.url}`)
                console.log(`   Token: ${wh.token}`)
                console.log(`   Eventos: ${wh.events.join(', ')}`)
                console.log(`   Ativo: ${wh.isActive ? '✅' : '❌'}`)
                console.log(`   Criado: ${wh.createdAt}`)
                console.log('')
            })
        }

        return
    }

    console.log('✅ Webhook encontrado!\n')
    console.log('📋 Informações:')
    console.log(`   Nome: ${webhook.name}`)
    console.log(`   URL: ${webhook.url}`)
    console.log(`   Eventos: ${webhook.events.join(', ')}`)
    console.log(`   Ativo: ${webhook.isActive ? '✅ Sim' : '❌ Não'}`)
    console.log(`   Total de logs: ${webhook._count.logs}`)
    console.log(`   Último disparo: ${webhook.lastTriggeredAt || 'Nunca'}`)
    console.log(`   Criado em: ${webhook.createdAt}`)

    if (webhook.logs.length > 0) {
        console.log(`\n📊 Últimos ${webhook.logs.length} logs:\n`)

        webhook.logs.forEach((log, i) => {
            console.log(`${i + 1}. ${log.eventType} - ${log.createdAt}`)
            console.log(`   Status: ${log.success ? '✅ Sucesso' : '❌ Falha'}`)
            console.log(`   HTTP: ${log.statusCode || 'N/A'}`)
            console.log(`   Tempo: ${log.responseTime}ms`)
            if (log.error) {
                console.log(`   Erro: ${log.error}`)
            }
            console.log('')
        })
    } else {
        console.log('\n⚠️  Nenhum log encontrado - webhook nunca foi disparado!')
    }

    // Verificar eventos que deveriam disparar
    console.log('\n🔍 Verificando eventos configurados:')
    webhook.events.forEach(event => {
        console.log(`   - ${event}`)
    })

    // Verificar se evento first_message está sendo disparado
    console.log('\n🔍 Verificando se evento "first_message" está sendo disparado no código...')

    // Buscar conversas recentes
    const recentConversations = await prisma.conversation.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
            id: true,
            phone: true,
            createdAt: true,
            status: true
        }
    })

    console.log(`\n📱 Últimas ${recentConversations.length} conversas criadas:`)
    recentConversations.forEach((conv, i) => {
        console.log(`${i + 1}. ${conv.phone} - ${conv.createdAt} (${conv.status})`)
    })

    await prisma.$disconnect()
}

debugWebhook().catch(console.error)
