import { AIService } from './api/services/ai.ts'

async function testAI() {
  console.log('🧠 Testando serviço AI...')
  
  const aiService = new AIService(
    process.env.OPENAI_API_KEY || '',
    process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
    Number(process.env.OPENAI_TIMEOUT) || 20000
  )

  const context = {
    patient: {
      name: 'Paciente Teste',
      phone: '5511999999999'
    },
    conversation: {
      status: 'BOT_QUEUE',
      messageCount: 1
    },
    history: [{
      role: 'user',
      content: 'Oi, preciso de uma consulta de rotina. Quais dias tem disponível?'
    }]
  }

  try {
    console.log('📤 Enviando mensagem para OpenAI...')
    const response = await aiService.generateResponse('Oi, preciso de uma consulta de rotina. Quais dias tem disponível?', context)
    console.log('✅ Resposta da IA:', response)
  } catch (error) {
    console.error('❌ Erro na IA:', error)
  }
}

testAI()