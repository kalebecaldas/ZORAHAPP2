import OpenAI from 'openai'
import dotenv from 'dotenv'

dotenv.config()

const apiKey = process.env.OPENAI_API_KEY

if (!apiKey) {
  console.error('❌ OPENAI_API_KEY não configurada no .env')
  process.exit(1)
}

const client = new OpenAI({ apiKey })

// Modelos configurados
const classificationModel = process.env.OPENAI_CLASSIFICATION_MODEL || 'gpt-4o-mini'
const responseModel = process.env.OPENAI_RESPONSE_MODEL || 'gpt-4o'

console.log('🧪 Testando Modelos GPT\n')
console.log('📋 Configuração:')
console.log(`   Classificação: ${classificationModel}`)
console.log(`   Respostas: ${responseModel}\n`)

async function testClassificationModel() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📊 TESTE 1: Modelo de Classificação')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  
  const testMessages = [
    'tenho encaminhamento pra fisioterapia',
    'quanto custa o rpg?',
    'quero agendar',
    'vocês atendem bradesco?'
  ]
  
  for (const message of testMessages) {
    console.log(`💬 Testando: "${message}"`)
    
    const startTime = Date.now()
    
    try {
      const completion = await client.chat.completions.create({
        model: classificationModel,
        messages: [
          {
            role: 'system',
            content: 'Você é um classificador de intenção. Responda APENAS com JSON: {"intent_port":"1-6","brief":"resposta útil","confidence":0.0-1.0}'
          },
          {
            role: 'user',
            content: `Classifique esta mensagem: "${message}"`
          }
        ],
        temperature: 0.3,
        max_tokens: 150
      })
      
      const elapsed = Date.now() - startTime
      const response = completion.choices[0]?.message?.content || ''
      
      console.log(`   ✅ Modelo: ${classificationModel}`)
      console.log(`   ⏱️  Tempo: ${elapsed}ms`)
      console.log(`   📝 Resposta: ${response.substring(0, 100)}...`)
      console.log(`   💰 Tokens: ${completion.usage?.total_tokens || 'N/A'}`)
      console.log('')
    } catch (error: any) {
      console.log(`   ❌ Erro: ${error.message}`)
      console.log('')
    }
  }
}

async function testResponseModel() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('💬 TESTE 2: Modelo de Resposta Complexa')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  
  const testMessages = [
    {
      message: 'tenho encaminhamento pra fisioterapia',
      context: 'Clínica: Unidade Vieiralves\nProcedimentos: Fisioterapia Ortopédica (R$ 90), RPG (R$ 120), Acupuntura (R$ 180)'
    },
    {
      message: 'me explique o que é RPG',
      context: 'RPG é um método de reequilíbrio postural que atua em cadeias musculares.'
    }
  ]
  
  for (const test of testMessages) {
    console.log(`💬 Testando: "${test.message}"`)
    
    const startTime = Date.now()
    
    try {
      const completion = await client.chat.completions.create({
        model: responseModel,
        messages: [
          {
            role: 'system',
            content: `Você é um assistente de clínica de fisioterapia. Seja conversacional e útil.\n\nContexto:\n${test.context}`
          },
          {
            role: 'user',
            content: test.message
          }
        ],
        temperature: 0.7,
        max_tokens: 300
      })
      
      const elapsed = Date.now() - startTime
      const response = completion.choices[0]?.message?.content || ''
      
      console.log(`   ✅ Modelo: ${responseModel}`)
      console.log(`   ⏱️  Tempo: ${elapsed}ms`)
      console.log(`   📝 Resposta: ${response.substring(0, 150)}...`)
      console.log(`   💰 Tokens: ${completion.usage?.total_tokens || 'N/A'}`)
      console.log('')
    } catch (error: any) {
      console.log(`   ❌ Erro: ${error.message}`)
      console.log('')
    }
  }
}

async function testModelComparison() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('⚖️  TESTE 3: Comparação de Modelos')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  
  const testMessage = 'tenho encaminhamento pra fisioterapia'
  
  console.log(`💬 Mensagem: "${testMessage}"\n`)
  
  // Testar com gpt-4o-mini
  console.log('📊 Testando com gpt-4o-mini:')
  const start1 = Date.now()
  try {
    const result1 = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Seja útil e conversacional.' },
        { role: 'user', content: testMessage }
      ],
      temperature: 0.7,
      max_tokens: 200
    })
    const time1 = Date.now() - start1
    console.log(`   ⏱️  Tempo: ${time1}ms`)
    console.log(`   📝 Resposta: ${result1.choices[0]?.message?.content?.substring(0, 100)}...`)
    console.log(`   💰 Tokens: ${result1.usage?.total_tokens}`)
  } catch (error: any) {
    console.log(`   ❌ Erro: ${error.message}`)
  }
  
  console.log('')
  
  // Testar com gpt-4o
  console.log('📊 Testando com gpt-4o:')
  const start2 = Date.now()
  try {
    const result2 = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'Seja útil e conversacional.' },
        { role: 'user', content: testMessage }
      ],
      temperature: 0.7,
      max_tokens: 200
    })
    const time2 = Date.now() - start2
    console.log(`   ⏱️  Tempo: ${time2}ms`)
    console.log(`   📝 Resposta: ${result2.choices[0]?.message?.content?.substring(0, 100)}...`)
    console.log(`   💰 Tokens: ${result2.usage?.total_tokens}`)
  } catch (error: any) {
    console.log(`   ❌ Erro: ${error.message}`)
  }
  
  console.log('')
}

async function runAllTests() {
  try {
    await testClassificationModel()
    await testResponseModel()
    await testModelComparison()
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅ Todos os testes concluídos!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    
    console.log('📊 Resumo:')
    console.log(`   ✅ Modelo de classificação: ${classificationModel}`)
    console.log(`   ✅ Modelo de resposta: ${responseModel}`)
    console.log('\n💡 Dica: Verifique os logs acima para confirmar que cada modelo está sendo usado corretamente!')
    
  } catch (error) {
    console.error('❌ Erro nos testes:', error)
    process.exit(1)
  }
}

runAllTests()

