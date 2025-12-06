import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkUnreadCounts() {
    const conversations = await prisma.conversation.findMany({
        where: {
            status: { not: 'FECHADA' }
        },
        select: {
            id: true,
            phone: true,
            unreadCount: true,
            lastMessage: true,
            patient: {
                select: { name: true }
            }
        },
        orderBy: { lastTimestamp: 'desc' },
        take: 10
    })

    console.log('📊 Conversas ativas e seus unreadCount:')
    console.table(conversations.map(c => ({
        phone: c.phone,
        name: c.patient?.name || '(sem nome)',
        unreadCount: c.unreadCount,
        lastMessage: c.lastMessage?.substring(0, 30)
    })))

    await prisma.$disconnect()
}

checkUnreadCounts().catch(console.error)
