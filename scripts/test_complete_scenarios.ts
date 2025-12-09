import axios from 'axios'
import { setTimeout } from 'timers/promises'

const API_URL = process.env.API_URL || 'http://localhost:3001'

// Convênios que ATENDEMOS (do infor_clinic.txt)
const CONVENIOS_ACEITOS = [
  'BRADESCO',
  'SULAMÉRICA',
  'MEDISERVICE',
  'SAÚDE CAIXA',
  'PETROBRAS',
  'GEAP',
  'PRO SOCIAL',
  'POSTAL SAÚDE',
  'CONAB'
]

// Convênios que NÃO atendemos
const CONVENIOS_NAO_ACEITOS = [
  'HAPVIDA',
  'UNIMED',
  'AMIL',
  'NOTREDAME',
  'GOLDEN CROSS'
]

// Procedimentos que existem
const PROCEDIMENTOS_EXISTENTES = [
  'Fisioterapia',
  'Acupuntura',
  'RPG',
  'Pilates',
  'Consulta com Ortopedista'
]

// Procedimentos que NÃO existem
const PROCEDIMENTOS_INEXISTENTES = [
  'Massagem',
  'Yoga',
  'Psicologia',
  'Nutrição'
]

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

// Função para buscar conversa e verificar status
async function checkConversationStatus(phone: string): Promise<any> {
  try {
    const response = await axios.get(`${API_URL}/api/conversations/${phone}`)
    const conversation = response.data
    
    return {
      success: true,
      status: conversation.status,
      assignedToId: conversation.assignedToId,
      messages: conversation.messages || []
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data || error.message
    }
  }
}

// Função para aguardar processamento
async function wait(seconds: number) {
  await setTimeout(seconds * 1000)
}

// Função para imprimir resultado
function printResult(testName: string, result: any) {
  console.log(`\n${'='.repeat(80)}`)
  console.log(`🧪 TESTE: ${testName}`)
  console.log(`${'='.repeat(80)}`)
  
  if (result.success) {
    console.log(`✅ SUCESSO`)
    if (result.data) {
      console.log(`📊 Dados:`, JSON.stringify(result.data, null, 2))
    }
  } else {
    console.log(`❌ ERRO:`, result.error)
  }
}

// Cenário de teste completo
async function runTestScenario(phone: string, scenarioNumber: number) {
  console.log(`\n${'#'.repeat(80)}`)
  console.log(`🚀 INICIANDO CENÁRIO ${scenarioNumber} - Telefone: ${phone}`)
  console.log(`${'#'.repeat(80)}\n`)

  const results: any[] = []

  // 1. Mensagem inicial
  console.log(`📤 1. Enviando mensagem inicial: "Olá"`)
  let result = await sendMessage(phone, 'Olá')
  printResult('Mensagem Inicial', result)
  results.push({ step: 'Mensagem Inicial', result })
  await wait(3)

  // 2. Pergunta sobre convênio que ATENDEMOS
  const convenioAceito = CONVENIOS_ACEITOS[Math.floor(Math.random() * CONVENIOS_ACEITOS.length)]
  console.log(`\n📤 2. Perguntando sobre convênio que ATENDEMOS: "${convenioAceito}"`)
  result = await sendMessage(phone, `Vocês atendem ${convenioAceito}?`)
  printResult(`Convênio Aceito: ${convenioAceito}`, result)
  results.push({ step: `Convênio Aceito: ${convenioAceito}`, result })
  await wait(3)

  // 3. Pergunta sobre convênio que NÃO atendemos
  const convenioNaoAceito = CONVENIOS_NAO_ACEITOS[Math.floor(Math.random() * CONVENIOS_NAO_ACEITOS.length)]
  console.log(`\n📤 3. Perguntando sobre convênio que NÃO atendemos: "${convenioNaoAceito}"`)
  result = await sendMessage(phone, `Vocês atendem ${convenioNaoAceito}?`)
  printResult(`Convênio Não Aceito: ${convenioNaoAceito}`, result)
  results.push({ step: `Convênio Não Aceito: ${convenioNaoAceito}`, result })
  await wait(3)

  // 4. Pergunta sobre procedimento que EXISTE
  const procedimentoExistente = PROCEDIMENTOS_EXISTENTES[Math.floor(Math.random() * PROCEDIMENTOS_EXISTENTES.length)]
  console.log(`\n📤 4. Perguntando sobre procedimento que EXISTE: "${procedimentoExistente}"`)
  result = await sendMessage(phone, `Vocês fazem ${procedimentoExistente}?`)
  printResult(`Procedimento Existente: ${procedimentoExistente}`, result)
  results.push({ step: `Procedimento Existente: ${procedimentoExistente}`, result })
  await wait(3)

  // 5. Pergunta sobre procedimento que NÃO existe
  const procedimentoInexistente = PROCEDIMENTOS_INEXISTENTES[Math.floor(Math.random() * PROCEDIMENTOS_INEXISTENTES.length)]
  console.log(`\n📤 5. Perguntando sobre procedimento que NÃO existe: "${procedimentoInexistente}"`)
  result = await sendMessage(phone, `Vocês fazem ${procedimentoInexistente}?`)
  printResult(`Procedimento Inexistente: ${procedimentoInexistente}`, result)
  results.push({ step: `Procedimento Inexistente: ${procedimentoInexistente}`, result })
  await wait(3)

  // 6. SOLICITAÇÃO DE AGENDAMENTO (TESTE PRINCIPAL)
  console.log(`\n📤 6. SOLICITANDO AGENDAMENTO: "quero agendar fisioterapia"`)
  result = await sendMessage(phone, 'quero agendar fisioterapia')
  printResult('Solicitação de Agendamento', result)
  results.push({ step: 'Solicitação de Agendamento', result })
  await wait(5)

  // 7. Verificar se bot perguntou NOME primeiro (não procedimento/unidade/data)
  console.log(`\n📤 7. Verificando resposta do bot...`)
  const conversationStatus = await checkConversationStatus(phone)
  if (conversationStatus.success && conversationStatus.messages) {
    const lastBotMessage = conversationStatus.messages
      .filter((m: any) => m.from === 'BOT')
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
    
    if (lastBotMessage) {
      const messageText = lastBotMessage.messageText.toLowerCase()
      console.log(`🤖 Última mensagem do bot: "${lastBotMessage.messageText}"`)
      
      const askedName = messageText.includes('nome') || messageText.includes('cadastro')
      const askedProcedure = messageText.includes('procedimento') || messageText.includes('qual procedimento')
      const askedUnit = messageText.includes('unidade') || messageText.includes('clínica')
      const askedDate = messageText.includes('data') || messageText.includes('dia') || messageText.includes('quando')
      
      console.log(`\n📊 Análise da resposta:`)
      console.log(`  ✅ Perguntou NOME/CADASTRO: ${askedName ? 'SIM ✅' : 'NÃO ❌'}`)
      console.log(`  ❌ Perguntou PROCEDIMENTO: ${askedProcedure ? 'SIM ❌ (ERRADO!)' : 'NÃO ✅'}`)
      console.log(`  ❌ Perguntou UNIDADE: ${askedUnit ? 'SIM ❌ (ERRADO!)' : 'NÃO ✅'}`)
      console.log(`  ❌ Perguntou DATA: ${askedDate ? 'SIM ❌ (ERRADO!)' : 'NÃO ✅'}`)
      
      if (askedName && !askedProcedure && !askedUnit && !askedDate) {
        console.log(`\n✅ TESTE PASSOU: Bot perguntou NOME primeiro (correto!)`)
      } else {
        console.log(`\n❌ TESTE FALHOU: Bot não seguiu a regra "cadastro primeiro"`)
      }
    }
  }

  // 8. Continuar fluxo de cadastro
  console.log(`\n📤 8. Respondendo com nome: "João Silva"`)
  result = await sendMessage(phone, 'João Silva')
  printResult('Resposta: Nome', result)
  results.push({ step: 'Resposta: Nome', result })
  await wait(3)

  console.log(`\n📤 9. Respondendo com CPF: "12345678900"`)
  result = await sendMessage(phone, '12345678900')
  printResult('Resposta: CPF', result)
  results.push({ step: 'Resposta: CPF', result })
  await wait(3)

  console.log(`\n📤 10. Respondendo com email: "joao@email.com"`)
  result = await sendMessage(phone, 'joao@email.com')
  printResult('Resposta: Email', result)
  results.push({ step: 'Resposta: Email', result })
  await wait(3)

  console.log(`\n📤 11. Respondendo com data nascimento: "01/01/1990"`)
  result = await sendMessage(phone, '01/01/1990')
  printResult('Resposta: Data Nascimento', result)
  results.push({ step: 'Resposta: Data Nascimento', result })
  await wait(3)

  console.log(`\n📤 12. Respondendo sobre convênio: "Sim, tenho BRADESCO"`)
  result = await sendMessage(phone, 'Sim, tenho BRADESCO')
  printResult('Resposta: Convênio', result)
  results.push({ step: 'Resposta: Convênio', result })
  await wait(3)

  console.log(`\n📤 13. Respondendo número carteirinha: "123456"`)
  result = await sendMessage(phone, '123456')
  printResult('Resposta: Carteirinha', result)
  results.push({ step: 'Resposta: Carteirinha', result })
  await wait(5)

  // 9. VERIFICAR SE FOI ENCAMINHADO PARA FILA
  console.log(`\n📤 14. VERIFICANDO SE FOI ENCAMINHADO PARA FILA...`)
  const finalStatus = await checkConversationStatus(phone)
  
  if (finalStatus.success) {
    console.log(`\n📊 Status Final da Conversa:`)
    console.log(`  Status: ${finalStatus.status}`)
    console.log(`  Atribuído a: ${finalStatus.assignedToId || 'Ninguém (aguardando na fila)'}`)
    
    if (finalStatus.status === 'PRINCIPAL' || finalStatus.status === 'EM_ATENDIMENTO') {
      console.log(`\n✅ TESTE PASSOU: Paciente foi encaminhado para fila!`)
      console.log(`   Status: ${finalStatus.status}`)
    } else if (finalStatus.status === 'BOT_QUEUE') {
      console.log(`\n⚠️ ATENÇÃO: Conversa ainda está na fila do bot`)
      console.log(`   Isso pode significar que o cadastro não foi completado`)
    } else {
      console.log(`\n❌ TESTE FALHOU: Status inesperado: ${finalStatus.status}`)
    }
  } else {
    console.log(`\n❌ Erro ao verificar status:`, finalStatus.error)
  }

  return results
}

// Função principal
async function main() {
  console.log(`\n${'='.repeat(80)}`)
  console.log(`🧪 TESTE COMPLETO DE CENÁRIOS DO BOT`)
  console.log(`${'='.repeat(80)}`)
  console.log(`API URL: ${API_URL}`)
  console.log(`\n📋 Cenários a testar:`)
  console.log(`  1. Convênios que atendemos vs não atendemos`)
  console.log(`  2. Procedimentos que existem vs não existem`)
  console.log(`  3. Fluxo completo de agendamento`)
  console.log(`  4. Verificação de "cadastro primeiro"`)
  console.log(`  5. Verificação de encaminhamento para fila`)
  console.log(`${'='.repeat(80)}\n`)

  // Gerar 3 números aleatórios
  const phones = [
    generateRandomPhone(),
    generateRandomPhone(),
    generateRandomPhone()
  ]

  console.log(`📱 Números gerados para teste:`)
  phones.forEach((phone, index) => {
    console.log(`  ${index + 1}. ${phone}`)
  })

  const allResults: any[] = []

  // Executar testes sequencialmente
  for (let i = 0; i < phones.length; i++) {
    console.log(`\n\n${'='.repeat(80)}`)
    console.log(`🔄 EXECUTANDO TESTE ${i + 1} DE ${phones.length}`)
    console.log(`${'='.repeat(80)}`)
    
    const results = await runTestScenario(phones[i], i + 1)
    allResults.push({
      phone: phones[i],
      scenario: i + 1,
      results
    })

    // Aguardar entre testes
    if (i < phones.length - 1) {
      console.log(`\n⏳ Aguardando 10 segundos antes do próximo teste...`)
      await wait(10)
    }
  }

  // Resumo final
  console.log(`\n\n${'='.repeat(80)}`)
  console.log(`📊 RESUMO FINAL DOS TESTES`)
  console.log(`${'='.repeat(80)}`)
  
  allResults.forEach((testResult, index) => {
    console.log(`\n📱 Teste ${index + 1} - ${testResult.phone}:`)
    const successCount = testResult.results.filter((r: any) => r.result.success).length
    const totalCount = testResult.results.length
    console.log(`  ✅ Sucessos: ${successCount}/${totalCount}`)
  })

  console.log(`\n✅ Testes concluídos!`)
  console.log(`\n📝 Verifique os logs acima para detalhes de cada teste.`)
}

// Executar
main().catch(console.error)
