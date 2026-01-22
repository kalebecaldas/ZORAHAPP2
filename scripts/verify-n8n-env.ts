#!/usr/bin/env ts-node
/**
 * Script para verificar se N8N está configurado corretamente
 */

import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Carregar .env
dotenv.config({ path: path.join(__dirname, '..', '.env') })

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || ''
const N8N_TIMEOUT = process.env.N8N_TIMEOUT || '30000'
const N8N_RETRIES = process.env.N8N_RETRIES || '2'
const N8N_FALLBACK_ENABLED = process.env.N8N_FALLBACK_ENABLED || 'true'

console.log('🔍 Verificando configuração N8N...\n')
console.log('='.repeat(60))

console.log('\n📋 Variáveis de Ambiente:')
console.log(`   N8N_WEBHOOK_URL: ${N8N_WEBHOOK_URL || '❌ NÃO CONFIGURADA'}`)
console.log(`   N8N_TIMEOUT: ${N8N_TIMEOUT}ms`)
console.log(`   N8N_RETRIES: ${N8N_RETRIES}`)
console.log(`   N8N_FALLBACK_ENABLED: ${N8N_FALLBACK_ENABLED}`)

console.log('\n✅ Verificações:')

// Verificar se está configurada
if (!N8N_WEBHOOK_URL) {
  console.log('   ❌ N8N_WEBHOOK_URL não está configurada')
  console.log('   💡 Adicione no .env:')
  console.log('      N8N_WEBHOOK_URL=https://n8nserver.iaamazonas.com.br/webhook-test/zorahbot')
  process.exit(1)
} else {
  console.log(`   ✅ N8N_WEBHOOK_URL configurada: ${N8N_WEBHOOK_URL}`)
}

// Verificar URL válida
try {
  const url = new URL(N8N_WEBHOOK_URL)
  console.log(`   ✅ URL válida`)
  console.log(`      - Protocolo: ${url.protocol}`)
  console.log(`      - Host: ${url.host}`)
  console.log(`      - Path: ${url.pathname}`)
} catch (error) {
  console.log(`   ❌ URL inválida: ${error}`)
  process.exit(1)
}

// Verificar se N8NBotService está habilitado
console.log('\n🤖 Verificando N8NBotService...')

// Importar serviço (usando import dinâmico para verificar)
import('../api/services/n8nBotService.js').then(({ n8nBotService }) => {
  const stats = n8nBotService.getStats()
  
  console.log('\n📊 Status do Serviço:')
  console.log(`   Enabled: ${stats.enabled ? '✅ SIM' : '❌ NÃO'}`)
  console.log(`   Webhook URL: ${stats.webhookUrl}`)
  console.log(`   Timeout: ${stats.timeout}ms`)
  console.log(`   Retries: ${stats.retries}`)
  console.log(`   Fallback Enabled: ${stats.fallbackEnabled ? '✅ SIM' : '❌ NÃO'}`)

  if (!stats.enabled) {
    console.log('\n⚠️  ATENÇÃO: N8N não está habilitado!')
    console.log('   O servidor pode não estar lendo o .env corretamente.')
    console.log('   💡 Solução:')
    console.log('      1. Verifique se o .env está no diretório raiz')
    console.log('      2. Reinicie o servidor completamente')
    console.log('      3. Verifique se não há espaços extras na URL')
    process.exit(1)
  }

  console.log('\n' + '='.repeat(60))
  console.log('✅ Tudo configurado corretamente!')
  console.log('\n💡 Próximos passos:')
  console.log('   1. Certifique-se de que o servidor foi reiniciado')
  console.log('   2. Verifique se o workflow está ATIVO no N8N')
  console.log('   3. Teste enviando uma mensagem pela página de teste')
  console.log('   4. Verifique os logs do servidor para ver se está chamando o N8N')
})
.catch(error => {
  console.error('\n❌ Erro ao importar N8NBotService:', error)
  console.log('\n💡 Isso pode acontecer se:')
  console.log('   - O arquivo n8nBotService.ts não existe')
  console.log('   - Há erros de sintaxe no arquivo')
  console.log('   - Dependências não estão instaladas')
  process.exit(1)
})
