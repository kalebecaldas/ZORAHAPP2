#!/usr/bin/env ts-node
/**
 * Script para testar conexão com webhook N8N
 */

import axios from 'axios'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Carregar .env
dotenv.config({ path: path.join(__dirname, '..', '.env') })

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || ''

async function testN8NWebhook() {
  console.log('🧪 Testando conexão com N8N Webhook\n')
  console.log('='.repeat(60))

  // 1. Verificar configuração
  console.log('\n1️⃣ Verificando configuração...')
  if (!N8N_WEBHOOK_URL) {
    console.error('❌ N8N_WEBHOOK_URL não está configurada no .env')
    console.log('\n💡 Adicione no .env:')
    console.log('   N8N_WEBHOOK_URL=https://n8nserver.iaamazonas.com.br/webhook-test/zorahbot')
    process.exit(1)
  }
  console.log(`✅ URL configurada: ${N8N_WEBHOOK_URL}`)

  // 2. Validar URL
  console.log('\n2️⃣ Validando URL...')
  try {
    const url = new URL(N8N_WEBHOOK_URL)
    console.log(`✅ URL válida:`)
    console.log(`   - Protocolo: ${url.protocol}`)
    console.log(`   - Host: ${url.host}`)
    console.log(`   - Path: ${url.pathname}`)
  } catch (error) {
    console.error('❌ URL inválida:', error)
    process.exit(1)
  }

  // 3. Preparar payload de teste
  const testPayload = {
    message: 'Teste de conexão - ' + new Date().toISOString(),
    phone: '5511999999999',
    conversationId: `test-${Date.now()}`,
    patient: {
      id: 'test-patient',
      name: 'Teste',
      phone: '5511999999999'
    },
    context: {
      history: [],
      currentIntent: null,
      workflowContext: {}
    }
  }

  console.log('\n3️⃣ Preparando requisição de teste...')
  console.log(`📦 Payload:`, JSON.stringify(testPayload, null, 2))

  // 4. Testar conexão
  console.log('\n4️⃣ Enviando requisição para N8N...')
  console.log(`📤 POST ${N8N_WEBHOOK_URL}`)
  
  const startTime = Date.now()
  
  try {
    const response = await axios.post(
      N8N_WEBHOOK_URL,
      testPayload,
      {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'ZorahApp-Test-Script'
        },
        validateStatus: (status) => status < 500 // Aceitar qualquer status < 500
      }
    )

    const latency = Date.now() - startTime

    console.log('\n✅ Requisição bem-sucedida!')
    console.log(`📊 Status: ${response.status} ${response.statusText}`)
    console.log(`⏱️  Latência: ${latency}ms`)
    console.log(`📥 Resposta:`, JSON.stringify(response.data, null, 2))

    if (response.status === 200 || response.status === 201) {
      console.log('\n🎉 Webhook está funcionando corretamente!')
    } else {
      console.log(`\n⚠️  Status inesperado: ${response.status}`)
    }

  } catch (error: any) {
    const latency = Date.now() - startTime

    console.log('\n❌ Erro ao conectar com N8N:')
    
    if (axios.isAxiosError(error)) {
      console.log(`🔍 Tipo: ${error.code || 'HTTP Error'}`)
      console.log(`📊 Status: ${error.response?.status || 'N/A'}`)
      console.log(`⏱️  Latência: ${latency}ms`)
      
      if (error.code === 'ECONNREFUSED') {
        console.log('\n💡 Solução: N8N não está acessível nesta URL')
        console.log('   - Verifique se o N8N está rodando')
        console.log('   - Verifique se a URL está correta')
        console.log('   - Se usar ngrok, verifique se o túnel está ativo')
      } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
        console.log('\n💡 Solução: Timeout ao conectar')
        console.log('   - Verifique se o N8N está respondendo')
        console.log('   - Tente aumentar o timeout')
      } else if (error.response) {
        console.log(`📥 Resposta do servidor:`, error.response.data)
        
        if (error.response.status === 404) {
          console.log('\n💡 Solução: Webhook não encontrado (404)')
          console.log('   - Verifique se a URL do webhook está correta no N8N')
          console.log('   - Copie a URL EXATA do node "Webhook Start" no N8N')
          console.log('   - Certifique-se de que o workflow está ATIVO')
        } else if (error.response.status === 401 || error.response.status === 403) {
          console.log('\n💡 Solução: Problema de autenticação')
          console.log('   - Verifique configurações de segurança do N8N')
        } else if (error.response.status >= 500) {
          console.log('\n💡 Solução: Erro no servidor N8N')
          console.log('   - Verifique os logs do N8N')
          console.log('   - Verifique se o workflow tem erros')
        }
      } else {
        console.log(`📝 Mensagem: ${error.message}`)
      }
    } else {
      console.log(`📝 Erro: ${error.message}`)
    }

    process.exit(1)
  }

  // 5. Verificar resposta do webhook de retorno
  console.log('\n5️⃣ Verificando se N8N processou...')
  console.log('💡 Verifique no N8N:')
  console.log('   1. Acesse https://n8nserver.iaamazonas.com.br/executions')
  console.log('   2. Procure pela execução mais recente')
  console.log('   3. Veja se foi executada com sucesso ou se há erros')
  
  console.log('\n' + '='.repeat(60))
  console.log('✅ Teste concluído!')
}

// Executar teste
testN8NWebhook().catch(error => {
  console.error('❌ Erro fatal:', error)
  process.exit(1)
})
