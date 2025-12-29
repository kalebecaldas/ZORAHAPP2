import prisma from '../api/prisma/client.js'

async function checkWebhooks() {
  try {
    const webhooks = await prisma.webhookSubscription.findMany()
    console.log('✅ Total de webhooks:', webhooks.length)
    console.log('Webhooks:', JSON.stringify(webhooks, null, 2))
  } catch (error: any) {
    console.error('❌ Erro:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkWebhooks()
