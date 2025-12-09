import axios from 'axios'
import { setTimeout } from 'timers/promises'

const API_URL = process.env.API_URL || 'http://localhost:3001'

// Função para gerar número aleatório brasileiro
function generateRandomPhone(): string {
  const ddd = ['92', '11', '21', '85', '61', '48']
  const randomDDD = ddd[Math.floor(Math.random() * ddd.length)]
  const randomNumber = Math.floor(100000000 + Math.random() * 900000000)
  return `55${randomDDD}${randomNumber}`
}

// Função para simular mensagem WhatsApp
async function sendMessage(phone: string, message: string): Promise<any> {
  const payload = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'test',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: phone,
                phone_number_id: 'test'
              },
              messages: [
                {
                  from: phone,
                  id: `wamid.test.${Date.now()}.${Math.random()}`,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  text: { body: message },
                  type: 'text'
                }
              ]
            },
            field: 'messages'
          }
        ]
      }
    ]
  }

  try {
    const response = await axios.post(`${API_URL}/webhook`, payload)
    return { success: true, data: response.data }
  } catch (error: any) {
    return { 
      success: false, 
      error: error.response?.data || error.message 
    }
  }
}

// Função para buscar conversa
async function getConversation(phone: string): Promise<any> {
  try {
    const response = await axios.get(`${API_URL}/api/conversations/${phone}?limit=200`)
    return { success: true, data: response.data }
  } catch (error: any) {
    return { success: false, error: error.response?.data || error.message }
  }
}

async function wait(seconds: number) {
  await setTimeout(seconds * 1000)
}

async function main() {
  const phone = generateRandomPhone()
  console.log(`\n📱 Testando com número: ${phone}\n`)

  // 1. Mensagem inicial
  console.log(`📤 1. Enviando: "Olá"`)
  await sendMessage(phone, 'Olá')
  await wait(3)

  // 2. Pergunta sobre convênio que NÃO atendemos
  console.log(`\n📤 2. Enviando: "Vocês atendem HAPVIDA?"`)
  await sendMessage(phone, 'Vocês atendem HAPVIDA?')
  await wait(3)

  // 3. Pergunta sobre convênio que atendemos
  console.log(`\n📤 3. Enviando: "Vocês atendem BRADESCO?"`)
  await sendMessage(phone, 'Vocês atendem BRADESCO?')
  await wait(3)

  // 4. SOLICITAÇÃO DE AGENDAMENTO (TESTE PRINCIPAL)
  console.log(`\n📤 4. Enviando: "quero agendar fisioterapia"`)
  await sendMessage(phone, 'quero agendar fisioterapia')
  await wait(5)

  // 5. Verificar resposta
  console.log(`\n📤 5. Verificando resposta do bot...`)
  const conv = await getConversation(phone)
  
  if (conv.success && conv.data.messages) {
    const lastBotMessage = conv.data.messages
      .filter((m: any) => m.from === 'BOT')
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
    
    if (lastBotMessage) {
      console.log(`\n🤖 Última mensagem do bot:`)
      console.log(`"${lastBotMessage.messageText}"`)
      
      const messageText = lastBotMessage.messageText.toLowerCase()
      const askedName = messageText.includes('nome') || messageText.includes('cadastro')
      const askedProcedure = messageText.includes('procedimento') || messageText.includes('qual procedimento')
      const askedUnit = messageText.includes('unidade') || messageText.includes('clínica')
      const askedDate = messageText.includes('data') || messageText.includes('dia') || messageText.includes('quando')
      
      console.log(`\n📊 Análise:`)
      console.log(`  ✅ Perguntou NOME/CADASTRO: ${askedName ? 'SIM ✅' : 'NÃO ❌'}`)
      console.log(`  ❌ Perguntou PROCEDIMENTO: ${askedProcedure ? 'SIM ❌ (ERRADO!)' : 'NÃO ✅'}`)
      console.log(`  ❌ Perguntou UNIDADE: ${askedUnit ? 'SIM ❌ (ERRADO!)' : 'NÃO ✅'}`)
      console.log(`  ❌ Perguntou DATA: ${askedDate ? 'SIM ❌ (ERRADO!)' : 'NÃO ✅'}`)
      
      if (askedName && !askedProcedure && !askedUnit && !askedDate) {
        console.log(`\n✅ TESTE PASSOU: Bot perguntou NOME primeiro!`)
      } else {
        console.log(`\n❌ TESTE FALHOU: Bot não seguiu a regra "cadastro primeiro"`)
      }
    }
  }

  console.log(`\n✅ Teste concluído!`)
}

main().catch(console.error)
