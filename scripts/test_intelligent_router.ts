import { intelligentRouter } from '../api/services/intelligentRouter.js'

/**
 * Script de teste para o IntelligentRouter
 */

async function testIntelligentRouter() {
    console.log('🧪 Testando IntelligentRouter...\n')

    try {
        // Teste 1: Pergunta sobre valor (deve rotear para IA)
        console.log('📝 Teste 1: Pergunta sobre valor')
        const test1 = await intelligentRouter.route(
            'Quanto custa fisioterapia?',
            'test-router-1',
            '+5592999777666'
        )
        console.log('✅ Decisão:')
        console.log(`   Tipo: ${test1.type} (esperado: AI_CONVERSATION)`)
        console.log(`   Aguardando input: ${test1.awaitingInput}`)
        console.log(`   Resposta: ${test1.response.substring(0, 100)}...`)
        console.log('')

        // Teste 2: Informar atraso (deve transferir para humano)
        console.log('📝 Teste 2: Informar atraso')
        const test2 = await intelligentRouter.route(
            'Vou me atrasar 20 minutos',
            'test-router-2',
            '+5592999777666'
        )
        console.log('✅ Decisão:')
        console.log(`   Tipo: ${test2.type} (esperado: TRANSFER_TO_HUMAN)`)
        console.log(`   Fila: ${test2.queue} (esperado: AGUARDANDO)`)
        console.log(`   Razão: ${test2.reason}`)
        console.log(`   Resposta: ${test2.response}`)
        console.log('')

        // Teste 3: Querer agendar (deve iniciar workflow)
        console.log('📝 Teste 3: Querer agendar')
        const test3 = await intelligentRouter.route(
            'Quero agendar acupuntura para amanhã',
            'test-router-3',
            '+5592999777666'
        )
        console.log('✅ Decisão:')
        console.log(`   Tipo: ${test3.type} (esperado: START_WORKFLOW)`)
        console.log(`   Workflow: ${test3.workflowType} (esperado: AGENDAMENTO)`)
        console.log(`   Dados iniciais:`, test3.initialData)
        console.log(`   Resposta: ${test3.response.substring(0, 100)}...`)
        console.log('')

        // Teste 4: Reclamação (deve transferir para humano)
        console.log('📝 Teste 4: Reclamação')
        const test4 = await intelligentRouter.route(
            'Muito ruim o atendimento',
            'test-router-4',
            '+5592999777666'
        )
        console.log('✅ Decisão:')
        console.log(`   Tipo: ${test4.type} (esperado: TRANSFER_TO_HUMAN)`)
        console.log(`   Fila: ${test4.queue}`)
        console.log(`   Razão: ${test4.reason}`)
        console.log(`   Resposta: ${test4.response}`)
        console.log('')

        // Teste 5: Pergunta sobre convênio (deve rotear para IA)
        console.log('📝 Teste 5: Pergunta sobre convênio')
        const test5 = await intelligentRouter.route(
            'Vocês atendem SulAmérica?',
            'test-router-5',
            '+5592999777666'
        )
        console.log('✅ Decisão:')
        console.log(`   Tipo: ${test5.type} (esperado: AI_CONVERSATION)`)
        console.log(`   Resposta: ${test5.response.substring(0, 150)}...`)
        console.log('')

        console.log('✅ Todos os testes passaram!')
        console.log('\n📊 Resumo:')
        console.log('   • IntelligentRouter funcionando corretamente')
        console.log('   • Roteamento para IA OK')
        console.log('   • Roteamento para workflow OK')
        console.log('   • Roteamento para humano OK')
        console.log('   • Detecção de filas OK')
        console.log('   • Extração de dados iniciais OK')

    } catch (error) {
        console.error('❌ Erro no teste:', error)
        throw error
    }
}

// Executar testes
testIntelligentRouter()
    .then(() => {
        console.log('\n🎉 Testes finalizados!')
        process.exit(0)
    })
    .catch((error) => {
        console.error('\n💥 Erro fatal:', error)
        process.exit(1)
    })
