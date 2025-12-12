/**
 * Script de teste para validar normalização de convênios
 * Testa 4 convênios diferentes: SULAMÉRICA, SAÚDE CAIXA, MEDISERVICE, BRADESCO
 */

import axios from 'axios';

const API_BASE = 'http://localhost:4002/api';
const AUTH_TOKEN = process.env.AUTH_TOKEN || ''; // Você pode precisar ajustar isso

// Função para gerar um número de telefone aleatório
function generateRandomPhone(): string {
  const random = Math.floor(Math.random() * 10000000000);
  return `55929${random.toString().padStart(9, '0')}`;
}

// Função para enviar mensagem
async function sendMessage(phone: string, text: string, from: 'USER' | 'AGENT' = 'USER') {
  try {
    const response = await axios.post(
      `${API_BASE}/conversations/send`,
      { phone, text, from },
      {
        headers: {
          'Content-Type': 'application/json',
          ...(AUTH_TOKEN && { Authorization: `Bearer ${AUTH_TOKEN}` })
        }
      }
    );
    return response.data;
  } catch (error: any) {
    console.error(`Erro ao enviar mensagem "${text}":`, error.response?.data || error.message);
    throw error;
  }
}

// Função para buscar mensagens da conversa
async function getMessages(phone: string) {
  try {
    const response = await axios.get(
      `${API_BASE}/conversations/${phone}?limit=200`,
      {
        headers: {
          ...(AUTH_TOKEN && { Authorization: `Bearer ${AUTH_TOKEN}` })
        }
      }
    );
    return response.data.messages || [];
  } catch (error: any) {
    if (error.response?.status === 404) {
      return [];
    }
    console.error(`Erro ao buscar mensagens:`, error.response?.data || error.message);
    throw error;
  }
}

// Função para aguardar
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Função para testar um convênio
async function testInsurance(insuranceName: string, testNumber: number) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`TESTE ${testNumber}: ${insuranceName.toUpperCase()}`);
  console.log('='.repeat(60));
  
  const phone = generateRandomPhone();
  console.log(`📱 Telefone de teste: ${phone}`);
  
  try {
    // 1. Iniciar conversa
    console.log('\n1️⃣ Enviando "Olá!"...');
    await sendMessage(phone, 'Olá!');
    await sleep(2000);
    
    // 2. Escolher unidade
    console.log('2️⃣ Escolhendo unidade (1)...');
    await sendMessage(phone, '1');
    await sleep(2000);
    
    // 3. Iniciar agendamento
    console.log('3️⃣ Iniciando agendamento...');
    await sendMessage(phone, 'quero agendar');
    await sleep(3000);
    
    // 4. Preencher dados
    console.log('4️⃣ Preenchendo dados...');
    await sendMessage(phone, `Teste ${insuranceName}`);
    await sleep(2000);
    
    await sendMessage(phone, '01130399214');
    await sleep(2000);
    
    await sendMessage(phone, '02/03/1990');
    await sleep(2000);
    
    await sendMessage(phone, `teste${testNumber}@teste.com`);
    await sleep(2000);
    
    // 5. Informar convênio
    console.log(`5️⃣ Informando convênio: "${insuranceName}"...`);
    await sendMessage(phone, insuranceName);
    await sleep(3000);
    
    // 6. Confirmar
    console.log('6️⃣ Confirmando dados...');
    await sendMessage(phone, 'sim');
    await sleep(4000);
    
    // 7. Verificar mensagens finais
    console.log('7️⃣ Verificando mensagens finais...');
    const messages = await getMessages(phone);
    const lastBotMessage = messages
      .filter((m: any) => m.from === 'BOT')
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
    
    if (lastBotMessage) {
      const messageText = lastBotMessage.messageText || '';
      console.log(`\n📨 Última mensagem do bot:`);
      console.log(messageText.substring(0, 500));
      
      // Verificar se o convênio está correto
      const insuranceUpper = insuranceName.toUpperCase();
      const hasCorrectInsurance = messageText.includes(insuranceUpper) || 
                                   messageText.includes(insuranceName);
      
      if (hasCorrectInsurance) {
        console.log(`\n✅ SUCESSO: Mensagem contém "${insuranceName}"`);
      } else {
        console.log(`\n❌ ERRO: Mensagem NÃO contém "${insuranceName}"`);
        console.log(`   Procurando por: "${insuranceName}" ou "${insuranceUpper}"`);
      }
      
      // Verificar se não contém BRADESCO incorretamente
      if (insuranceName.toLowerCase() !== 'bradesco' && messageText.includes('BRADESCO')) {
        console.log(`\n⚠️  AVISO: Mensagem contém "BRADESCO" mas o convênio deveria ser "${insuranceName}"`);
      }
    } else {
      console.log('\n⚠️  Nenhuma mensagem do bot encontrada');
    }
    
    return { phone, success: true };
  } catch (error: any) {
    console.error(`\n❌ Erro no teste:`, error.message);
    return { phone, success: false, error: error.message };
  }
}

// Função principal
async function main() {
  console.log('🧪 INICIANDO TESTES DE NORMALIZAÇÃO DE CONVÊNIOS\n');
  
  const insurances = [
    'sulamerica',
    'saude caixa',
    'mediservice',
    'bradesco'
  ];
  
  const results = [];
  
  for (let i = 0; i < insurances.length; i++) {
    const result = await testInsurance(insurances[i], i + 1);
    results.push(result);
    
    // Aguardar entre testes
    if (i < insurances.length - 1) {
      console.log('\n⏳ Aguardando 5 segundos antes do próximo teste...\n');
      await sleep(5000);
    }
  }
  
  // Resumo
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 RESUMO DOS TESTES');
  console.log('='.repeat(60));
  
  results.forEach((result, index) => {
    console.log(`\nTeste ${index + 1} (${insurances[index]}):`);
    console.log(`  Telefone: ${result.phone}`);
    console.log(`  Status: ${result.success ? '✅ SUCESSO' : '❌ FALHA'}`);
    if (result.error) {
      console.log(`  Erro: ${result.error}`);
    }
  });
  
  const successCount = results.filter(r => r.success).length;
  console.log(`\n✅ Testes bem-sucedidos: ${successCount}/${results.length}`);
}

// Executar
main().catch(console.error);






