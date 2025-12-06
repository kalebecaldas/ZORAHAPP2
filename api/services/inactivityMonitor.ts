import prisma from '../prisma/client.js'
import { createSystemMessage } from '../utils/systemMessages.js'
import { getRealtime } from '../realtime.js'

let timeoutCheckInterval: NodeJS.Timeout | null = null

/**
 * Inicia o monitor de inatividade
 */
export async function startInactivityMonitor() {
    // Buscar configuração
    const settings = await prisma.systemSettings.findFirst()
    const timeoutMinutes = settings?.inactivityTimeoutMinutes || 10

    // Rodar a cada 1 minuto
    timeoutCheckInterval = setInterval(async () => {
        await checkInactiveConversations(timeoutMinutes)
    }, 60000) // 1 minuto

    console.log(`✅ Monitor de inatividade iniciado (timeout: ${timeoutMinutes}min)`)
}

/**
 * Para o monitor de inatividade
 */
export function stopInactivityMonitor() {
    if (timeoutCheckInterval) {
        clearInterval(timeoutCheckInterval)
        timeoutCheckInterval = null
        console.log('🛑 Monitor de inatividade parado')
    }
}

/**
 * Verifica conversas inativas e retorna para BOT_QUEUE
 */
async function checkInactiveConversations(timeoutMinutes: number) {
    try {
        const timeoutDate = new Date()
        timeoutDate.setMinutes(timeoutDate.getMinutes() - timeoutMinutes)

        // Buscar conversas inativas (atribuídas a agente mas sem atividade recente)
        const inactiveConversations = await prisma.conversation.findMany({
            where: {
                status: 'ATIVA',
                assignedToId: { not: null },
                lastTimestamp: { lt: timeoutDate }
            },
            include: {
                assignedTo: true
            }
        })

        if (inactiveConversations.length === 0) {
            return
        }

        console.log(`⏰ Encontradas ${inactiveConversations.length} conversas inativas`)

        for (const conversation of inactiveConversations) {
            // Retornar para BOT_QUEUE
            await prisma.conversation.update({
                where: { id: conversation.id },
                data: {
                    status: 'BOT_QUEUE',
                    assignedToId: null
                }
            })

            // Criar mensagem do sistema
            await createSystemMessage(conversation.id, 'TIMEOUT_INACTIVITY', {
                agentName: conversation.assignedTo?.name || 'Agente',
                reason: `Sem resposta por ${timeoutMinutes} minutos`
            })

            // Emitir evento Socket.IO
            try {
                const { io } = getRealtime()
                io.emit('conversation:timeout', {
                    conversationId: conversation.id,
                    phone: conversation.phone,
                    previousAgent: conversation.assignedTo?.name,
                    previousAgentId: conversation.assignedToId
                })
            } catch (error) {
                console.error('Erro ao emitir evento Socket.IO:', error)
            }

            console.log(`⏰ Conversa ${conversation.phone} retornou por inatividade (agente: ${conversation.assignedTo?.name})`)
        }
    } catch (error) {
        console.error('Erro ao verificar conversas inativas:', error)
    }
}

/**
 * Atualiza o timeout dinamicamente (quando configuração muda)
 */
export async function updateInactivityTimeout() {
    stopInactivityMonitor()
    await startInactivityMonitor()
}
