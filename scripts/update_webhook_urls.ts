import prisma from '../api/prisma/client.js'

/**
 * Script para atualizar URLs dos webhooks de exemplo para URLs reais de teste
 * 
 * Como usar:
 * 1. Vá em https://webhook.site e pegue sua URL única
 * 2. Substitua YOUR_UNIQUE_ID abaixo pela sua URL
 * 3. Execute: npx tsx scripts/update_webhook_urls.ts
 */

const WEBHOOK_SITE_URL = 'https://webhook.site/YOUR_UNIQUE_ID' // ← Substitua aqui!

async function updateWebhookUrls() {
  console.log('📝 Atualizando URLs dos webhooks para URLs de teste reais...\n')

  if (WEBHOOK_SITE_URL.includes('YOUR_UNIQUE_ID')) {
    console.log('⚠️  ATENÇÃO: Você precisa configurar a URL primeiro!')
    console.log('\n📋 Passos:')
    console.log('   1. Acesse: https://webhook.site')
    console.log('   2. Copie a URL única que aparece (ex: https://webhook.site/abc123...)')
    console.log('   3. Abra: scripts/update_webhook_urls.ts')
    console.log('   4. Substitua "YOUR_UNIQUE_ID" pela sua URL completa')
    console.log('   5. Execute novamente este script\n')
    
    console.log('💡 Alternativa: Atualize manualmente na interface web!')
    return
  }

  // Buscar todos os webhooks com URLs de exemplo
  const webhooks = await prisma.webhookSubscription.findMany({
    where: {
      url: {
        contains: 'webhook.example.com'
      }
    }
  })

  if (webhooks.length === 0) {
    console.log('✅ Nenhum webhook com URL de exemplo encontrado!')
    return
  }

  console.log(`📦 Encontrados ${webhooks.length} webhooks com URLs de exemplo\n`)

  let updated = 0

  for (const webhook of webhooks) {
    try {
      // Criar endpoint específico para cada webhook
      const endpoint = webhook.name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')

      const newUrl = `${WEBHOOK_SITE_URL}/${endpoint}`

      await prisma.webhookSubscription.update({
        where: { id: webhook.id },
        data: { url: newUrl }
      })

      console.log(`✅ Atualizado: ${webhook.name}`)
      console.log(`   Antes: ${webhook.url}`)
      console.log(`   Depois: ${newUrl}\n`)

      updated++
    } catch (error: any) {
      console.error(`❌ Erro ao atualizar "${webhook.name}":`, error.message)
    }
  }

  console.log(`\n📊 Total atualizado: ${updated}/${webhooks.length}`)
  console.log('\n✅ Agora você pode testar os webhooks!')
  console.log('   Acesse webhook.site para ver as requisições chegando em tempo real!')
}

updateWebhookUrls()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Erro:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
