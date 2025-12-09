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

// Função para buscar paciente
async function getPatient(phone: string): Promise<any> {
  try {
    const response = await axios.get(`${API_URL}/api/patients?phone=${phone}`)
    return { success: true, data: response.data }
  } catch (error: any) {
    return { success: false, error: error.response?.data || error.message }
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
  const testData = {
    nome: 'Maria Silva Santos',
    cpf: '12345678901',
    email: 'maria.silva@email.com',
    nascimento: '15/03/1990',
    convenio: 'BRADESCO',
    carteirinha: '987654321'
  }

  console.log(`\n${'='.repeat(80)}`)
  console.log(`🧪 TESTE DE CADASTRO COMPLETO - ACUPUNTURA`)
  console.log(`${'='.repeat(80)}`)
  console.log(`📱 Número: ${phone}`)
  console.log(`📋 Dados de teste:`)
  console.log(`   Nome: ${testData.nome}`)
  console.log(`   CPF: ${testData.cpf}`)
  console.log(`   Email: ${testData.email}`)
  console.log(`   Nascimento: ${testData.nascimento}`)
  console.log(`   Convênio: ${testData.convenio}`)
  console.log(`   Carteirinha: ${testData.carteirinha}`)
  console.log(`${'='.repeat(80)}\n`)

  // 1. Verificar se paciente já existe (não deveria)
  console.log(`📤 1. Verificando se paciente já existe...`)
  let patientCheck = await getPatient(phone)
  if (patientCheck.success && patientCheck.data && patientCheck.data.length > 0) {
    console.log(`⚠️  ATENÇÃO: Paciente já existe!`)
    console.log(`   Dados:`, JSON.stringify(patientCheck.data[0], null, 2))
  } else {
    console.log(`✅ Paciente não existe ainda (correto para teste novo)`)
  }
  await wait(2)

  // 2. Mensagem inicial
  console.log(`\n📤 2. Enviando mensagem inicial: "Olá"`)
  await sendMessage(phone, 'Olá')
  await wait(3)

  // 3. SOLICITAÇÃO DE AGENDAMENTO DE ACUPUNTURA
  console.log(`\n📤 3. SOLICITANDO AGENDAMENTO: "quero agendar acupuntura"`)
  await sendMessage(phone, 'quero agendar acupuntura')
  await wait(5)

  // 4. Verificar resposta do bot
  console.log(`\n📤 4. Verificando resposta do bot...`)
  const conv1 = await getConversation(phone)
  if (conv1.success && conv1.data.messages) {
    const lastBotMessage = conv1.data.messages
      .filter((m: any) => m.from === 'BOT')
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
    
    if (lastBotMessage) {
      console.log(`🤖 Última mensagem do bot:`)
      console.log(`"${lastBotMessage.messageText}"`)
      
      const messageText = lastBotMessage.messageText.toLowerCase()
      const askedName = messageText.includes('nome') || messageText.includes('cadastro')
      
      if (askedName) {
        console.log(`✅ Bot perguntou NOME primeiro (correto!)`)
      } else {
        console.log(`❌ Bot NÃO perguntou NOME primeiro (errado!)`)
      }
    }
  }

  // 5. Responder com NOME
  console.log(`\n📤 5. Respondendo com NOME: "${testData.nome}"`)
  await sendMessage(phone, testData.nome)
  await wait(3)

  // 6. Verificar se bot perguntou CPF
  const conv2 = await getConversation(phone)
  if (conv2.success && conv2.data.messages) {
    const lastBotMsg = conv2.data.messages
      .filter((m: any) => m.from === 'BOT')
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
    if (lastBotMsg) {
      console.log(`🤖 Bot perguntou: "${lastBotMsg.messageText.substring(0, 100)}..."`)
    }
  }

  // 7. Responder com CPF
  console.log(`\n📤 6. Respondendo com CPF: "${testData.cpf}"`)
  await sendMessage(phone, testData.cpf)
  await wait(3)

  // 8. Responder com EMAIL
  console.log(`\n📤 7. Respondendo com EMAIL: "${testData.email}"`)
  await sendMessage(phone, testData.email)
  await wait(3)

  // 9. Responder com DATA DE NASCIMENTO
  console.log(`\n📤 8. Respondendo com DATA NASCIMENTO: "${testData.nascimento}"`)
  await sendMessage(phone, testData.nascimento)
  await wait(3)

  // 10. Responder sobre CONVÊNIO
  console.log(`\n📤 9. Respondendo sobre CONVÊNIO: "Sim, tenho ${testData.convenio}"`)
  await sendMessage(phone, `Sim, tenho ${testData.convenio}`)
  await wait(3)

  // 11. Responder com CARTEIRINHA
  console.log(`\n📤 10. Respondendo com CARTEIRINHA: "${testData.carteirinha}"`)
  await sendMessage(phone, testData.carteirinha)
  await wait(5)

  // 12. VERIFICAR SE PACIENTE FOI CRIADO NO BANCO
  console.log(`\n${'='.repeat(80)}`)
  console.log(`📊 VERIFICANDO CADASTRO COMPLETO`)
  console.log(`${'='.repeat(80)}\n`)

  console.log(`📤 11. Buscando paciente no banco de dados...`)
  const patientResult = await getPatient(phone)
  
  if (patientResult.success && patientResult.data && patientResult.data.length > 0) {
    const patient = patientResult.data[0]
    console.log(`✅ PACIENTE ENCONTRADO NO BANCO!`)
    console.log(`\n📋 Dados do paciente:`)
    console.log(`   ID: ${patient.id}`)
    console.log(`   Nome: ${patient.name || 'NÃO PREENCHIDO ❌'}`)
    console.log(`   CPF: ${patient.cpf || 'NÃO PREENCHIDO ❌'}`)
    console.log(`   Email: ${patient.email || 'NÃO PREENCHIDO ❌'}`)
    console.log(`   Data Nascimento: ${patient.birthDate ? new Date(patient.birthDate).toLocaleDateString('pt-BR') : 'NÃO PREENCHIDO ❌'}`)
    console.log(`   Convênio: ${patient.insuranceCompany || 'NÃO PREENCHIDO ❌'}`)
    console.log(`   Telefone: ${patient.phone || 'NÃO PREENCHIDO ❌'}`)
    console.log(`   Criado em: ${patient.createdAt ? new Date(patient.createdAt).toLocaleString('pt-BR') : 'N/A'}`)
    console.log(`   Atualizado em: ${patient.updatedAt ? new Date(patient.updatedAt).toLocaleString('pt-BR') : 'N/A'}`)

    // Verificar campos obrigatórios
    console.log(`\n📊 Validação dos campos:`)
    const campos = {
      'Nome': patient.name === testData.nome,
      'CPF': patient.cpf === testData.cpf,
      'Email': patient.email === testData.email,
      'Data Nascimento': patient.birthDate !== null,
      'Convênio': patient.insuranceCompany === testData.convenio,
      'Telefone': patient.phone === phone
    }

    let todosPreenchidos = true
    Object.entries(campos).forEach(([campo, preenchido]) => {
      const status = preenchido ? '✅' : '❌'
      console.log(`   ${campo}: ${status}`)
      if (!preenchido) todosPreenchidos = false
    })

    if (todosPreenchidos) {
      console.log(`\n✅ CADASTRO COMPLETO! Todos os campos foram preenchidos corretamente.`)
    } else {
      console.log(`\n⚠️  CADASTRO INCOMPLETO! Alguns campos não foram preenchidos.`)
    }

    // Verificar se aparece na API de pacientes
    console.log(`\n📤 12. Verificando se aparece na listagem de pacientes...`)
    try {
      const allPatients = await axios.get(`${API_URL}/api/patients`)
      const foundInList = allPatients.data.some((p: any) => p.phone === phone)
      if (foundInList) {
        console.log(`✅ Paciente aparece na listagem de pacientes!`)
      } else {
        console.log(`❌ Paciente NÃO aparece na listagem de pacientes!`)
      }
    } catch (error) {
      console.log(`⚠️  Erro ao verificar listagem:`, error)
    }

  } else {
    console.log(`❌ PACIENTE NÃO ENCONTRADO NO BANCO!`)
    console.log(`   Isso significa que o cadastro não foi salvo.`)
    if (patientResult.error) {
      console.log(`   Erro:`, patientResult.error)
    }
  }

  // 13. Verificar status da conversa
  console.log(`\n📤 13. Verificando status da conversa...`)
  const finalConv = await getConversation(phone)
  if (finalConv.success) {
    console.log(`   Status: ${finalConv.data.status}`)
    console.log(`   Atribuído a: ${finalConv.data.assignedToId || 'Ninguém (aguardando na fila)'}`)
    
    if (finalConv.data.status === 'PRINCIPAL' || finalConv.data.status === 'EM_ATENDIMENTO') {
      console.log(`✅ Conversa foi encaminhada para fila!`)
    } else {
      console.log(`⚠️  Conversa ainda está em: ${finalConv.data.status}`)
    }
  }

  console.log(`\n${'='.repeat(80)}`)
  console.log(`✅ TESTE CONCLUÍDO!`)
  console.log(`${'='.repeat(80)}\n`)
}

main().catch(console.error)
