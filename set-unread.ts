import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function setUnreadCount() {
    // Pegar a primeira conversa ativa
    const conversation = await prisma.conversation.findFirst({
        where: { status: { not: 'FECHADA' } },
        orderBy: { lastTimestamp: 'desc' }
    })

    if (!conversation) {
        console.log('❌ Nenhuma conversa ativa encontrada')
        return
    }

    // Setar unreadCount para 3
    await prisma.conversation.update({
        where: { id: conversation.id },
        data: { unreadCount: 3 }
    })

    console.log(`✅ UnreadCount atualizado para 3 na conversa:`, conversation.phone)

    await prisma.$disconnect()
}

setUnreadCount().catch(console.error)
