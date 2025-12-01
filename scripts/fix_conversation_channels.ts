import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixConversationChannels() {
  console.log('🔧 Iniciando correção de channels das conversas...')

  try {
    // Find all messages with Instagram metadata
    const instagramMessages = await prisma.message.findMany({
      where: {
        metadata: {
          path: ['platform'],
          equals: 'instagram'
        }
      },
      select: {
        conversationId: true,
        metadata: true
      },
      distinct: ['conversationId']
    })

    console.log(`📱 Encontradas ${instagramMessages.length} conversas com mensagens do Instagram`)

    // Update conversations to have channel='instagram'
    for (const msg of instagramMessages) {
      if (msg.conversationId) {
        const updated = await prisma.conversation.update({
          where: { id: msg.conversationId },
          data: { channel: 'instagram' }
        })
        console.log(`✅ Conversa ${updated.id} atualizada para channel='instagram'`)
      }
    }

    // Also check for conversations with Instagram user IDs (long numeric IDs)
    const instagramConversations = await prisma.conversation.findMany({
      where: {
        channel: 'whatsapp',
        phone: {
          // Instagram user IDs are typically long numeric strings (10+ digits)
          // and don't start with country codes like WhatsApp numbers
          not: {
            startsWith: '55' // Brazil country code
          }
        }
      }
    })

    // Filter to only update if phone looks like Instagram ID (10+ digits, all numeric)
    const instagramLikeConversations = instagramConversations.filter(conv => {
      const phone = conv.phone.replace(/\D/g, '') // Remove non-digits
      return phone.length >= 10 && phone.length <= 20 && /^\d+$/.test(phone)
    })

    console.log(`📱 Encontradas ${instagramLikeConversations.length} conversas com IDs que parecem Instagram`)

    for (const conv of instagramLikeConversations) {
      // Check if there are any Instagram messages in this conversation
      const hasInstagramMessages = await prisma.message.findFirst({
        where: {
          conversationId: conv.id,
          metadata: {
            path: ['platform'],
            equals: 'instagram'
          }
        }
      })

      if (hasInstagramMessages) {
        const updated = await prisma.conversation.update({
          where: { id: conv.id },
          data: { channel: 'instagram' }
        })
        console.log(`✅ Conversa ${updated.id} (${updated.phone}) atualizada para channel='instagram'`)
      }
    }

    console.log('✅ Correção de channels concluída!')
  } catch (error) {
    console.error('❌ Erro ao corrigir channels:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

fixConversationChannels()
  .then(() => {
    console.log('✅ Script executado com sucesso')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Erro ao executar script:', error)
    process.exit(1)
  })

