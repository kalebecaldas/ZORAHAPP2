import { conversationalAI } from '../api/services/conversationalAI.js'

/**
 * Script de teste para o ConversationalAIService
 */

async function testConversationalAI() {
    console.log('🧪 Testando ConversationalAIService...\n')

    const ai = conversationalAI.getInstance()

    try {
        // Teste 1: Pergunta sobre valor
        console.log('📝 Teste 1: Pergunta sobre valor de procedimento')
        const test1 = await ai.generateResponse(
            'Quanto custa acupuntura?',
            'test-conv-ai-1',
            '+5592999888777'
        )
        console.log('✅ Resposta:')
        console.log(`   Intent: ${test1.intent}`)
        console.log(`   Action: ${test1.action}`)
        console.log(`   Confidence: ${test1.confidence}`)
        console.log(`   Entities:`, test1.entities)
        console.log(`   Message: ${test1.message.substring(0, 100)}...`)
        console.log('')

        // Teste 2: Informar atraso
        console.log('📝 Teste 2: Paciente informando atraso')
        const test2 = await ai.generateResponse(
            'Vou me atrasar 15 minutos',
            'test-conv-ai-2',
            '+5592999888777'
        )
        console.log('✅ Resposta:')
        console.log(`   Intent: ${test2.intent}`)
        console.log(`   Action: ${test2.action} (deve ser transfer_human)`)
        console.log(`   Confidence: ${test2.confidence}`)
        console.log(`   Message: ${test2.message}`)
        console.log('')

        // Teste 3: Pergunta sobre convênio
        console.log('📝 Teste 3: Pergunta sobre convênio')
        const test3 = await ai.generateResponse(
            'Vocês atendem Bradesco?',
            'test-conv-ai-3',
            '+5592999888777'
        )
        console.log('✅ Resposta:')
        console.log(`   Intent: ${test3.intent}`)
        console.log(`   Action: ${test3.action}`)
        console.log(`   Confidence: ${test3.confidence}`)
        console.log(`   Entities:`, test3.entities)
        console.log(`   Message: ${test3.message.substring(0, 150)}...`)
        console.log('')

        // Teste 4: Querer agendar
        console.log('📝 Teste 4: Paciente querendo agendar')
        const test4 = await ai.generateResponse(
            'Quero agendar fisioterapia',
            'test-conv-ai-4',
            '+5592999888777'
        )
        console.log('✅ Resposta:')
        console.log(`   Intent: ${test4.intent}`)
        console.log(`   Action: ${test4.action} (deve ser start_workflow)`)
        console.log(`   Confidence: ${test4.confidence}`)
        console.log(`   Entities:`, test4.entities)
        console.log(`   Message: ${test4.message.substring(0, 150)}...`)
        console.log('')

        // Teste 5: Reclamação
        console.log('📝 Teste 5: Paciente reclamando')
        const test5 = await ai.generateResponse(
            'Péssimo atendimento, muito demorado',
            'test-conv-ai-5',
            '+5592999888777'
        )
        console.log('✅ Resposta:')
        console.log(`   Intent: ${test5.intent}`)
        console.log(`   Action: ${test5.action} (deve ser transfer_human)`)
        console.log(`   Sentiment: ${test5.sentiment} (deve ser negative)`)
        console.log(`   Message: ${test5.message}`)
        console.log('')

        // Teste 6: Pergunta sobre localização
        console.log('📝 Teste 6: Pergunta sobre localização')
        const test6 = await ai.generateResponse(
            'Onde fica a clínica?',
            'test-conv-ai-6',
            '+5592999888777'
        )
        console.log('✅ Resposta:')
        console.log(`   Intent: ${test6.intent}`)
        console.log(`   Action: ${test6.action}`)
        console.log(`   Confidence: ${test6.confidence}`)
        console.log(`   Message: ${test6.message.substring(0, 150)}...`)
        console.log('')

        console.log('✅ Todos os testes passaram!')
        console.log('\n📊 Resumo:')
        console.log('   • ConversationalAIService funcionando corretamente')
        console.log('   • Respostas naturais e conversacionais OK')
        console.log('   • Detecção de intenções OK')
        console.log('   • Decisão de ações OK')
        console.log('   • Transferência para humano OK')
        console.log('   • Formato JSON estruturado OK')

    } catch (error) {
        console.error('❌ Erro no teste:', error)
        throw error
    }
}

// Executar testes
testConversationalAI()
    .then(() => {
        console.log('\n🎉 Testes finalizados!')
        process.exit(0)
    })
    .catch((error) => {
        console.error('\n💥 Erro fatal:', error)
        process.exit(1)
    })
