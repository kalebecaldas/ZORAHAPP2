import prisma from '../api/prisma/client.js'
import crypto from 'crypto'

/**
 * Script para criar webhooks de exemplo baseado na documentação
 * Baseado nos eventos disponíveis e casos de uso do WEBHOOKS_API.md
 */

function generateToken(): string {
  return `whk_${crypto.randomBytes(32).toString('hex')}`
}

async function seedWebhooks() {
  console.log('📡 Criando webhooks de exemplo...\n')

  const webhooksToCreate = [
    {
      name: 'Google Ads - Conversões',
      description: 'Rastrear primeira mensagem de novos pacientes para conversões do Google Ads',
      url: 'https://webhook.example.com/google-ads/conversion',
      events: ['received_message', 'started_chat'],
      metadata: {
        platform: 'Google Ads',
        campaign: 'Aquisição de Pacientes 2025',
        conversionLabel: 'CONVERSION_LABEL_HERE'
      }
    },
    {
      name: 'CRM - Sync de Leads',
      description: 'Sincronizar novos contatos automaticamente com CRM externo',
      url: 'https://webhook.example.com/crm/new-lead',
      events: ['created_patient', 'started_chat'],
      metadata: {
        platform: 'CRM',
        integration: 'Salesforce',
        autoAssign: true
      }
    },
    {
      name: 'Analytics - Métricas de Atendimento',
      description: 'Coletar dados de tempo de espera e duração de atendimentos',
      url: 'https://webhook.example.com/analytics/metrics',
      events: ['agent_entered', 'closed_chat', 'left_queue'],
      metadata: {
        platform: 'Analytics',
        dashboard: 'Métricas de Atendimento',
        includeAgentData: true
      }
    },
    {
      name: 'Notificações - Slack',
      description: 'Enviar notificações para canal do Slack quando agente assume conversa',
      url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL',
      events: ['agent_entered', 'closed_chat'],
      metadata: {
        platform: 'Slack',
        channel: '#atendimento',
        mentionOnUrgent: true
      }
    },
    {
      name: 'Sistema de Pagamento',
      description: 'Notificar sobre novos pacientes cadastrados para processar pagamentos',
      url: 'https://webhook.example.com/payments/new-patient',
      events: ['created_patient'],
      metadata: {
        platform: 'Payment Gateway',
        autoCreateAccount: true,
        sendWelcomeEmail: true
      }
    }
  ]

  let created = 0
  let skipped = 0

  for (const webhookData of webhooksToCreate) {
    try {
      // Verificar se já existe
      const existing = await prisma.webhookSubscription.findFirst({
        where: { name: webhookData.name }
      })

      if (existing) {
        console.log(`⏭️  Webhook "${webhookData.name}" já existe, pulando...`)
        skipped++
        continue
      }

      const token = generateToken()
      
      const webhook = await prisma.webhookSubscription.create({
        data: {
          name: webhookData.name,
          description: webhookData.description,
          url: webhookData.url,
          token,
          events: webhookData.events,
          isActive: true,
          metadata: webhookData.metadata || {}
        }
      })

      console.log(`✅ Criado: ${webhook.name}`)
      console.log(`   Token: ${webhook.token}`)
      console.log(`   URL: ${webhook.url}`)
      console.log(`   Eventos: ${webhook.events.join(', ')}`)
      console.log('')

      created++
    } catch (error: any) {
      console.error(`❌ Erro ao criar webhook "${webhookData.name}":`, error.message)
    }
  }

  console.log('\n📊 Resumo:')
  console.log(`   ✅ Criados: ${created}`)
  console.log(`   ⏭️  Pulados: ${skipped}`)
  console.log(`   📦 Total no banco: ${created + skipped}`)

  // Listar todos os webhooks
  const allWebhooks = await prisma.webhookSubscription.findMany({
    orderBy: { createdAt: 'desc' }
  })

  console.log('\n📋 Webhooks cadastrados:')
  for (const wh of allWebhooks) {
    console.log(`   ${wh.isActive ? '🟢' : '🔴'} ${wh.name} (${wh.events.length} eventos)`)
  }
}

// Executar seed
seedWebhooks()
  .then(() => {
    console.log('\n✅ Seed de webhooks concluído!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Erro ao executar seed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
