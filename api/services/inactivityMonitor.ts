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
    const timeoutMinutes = settings?.inactivityTimeoutMinutes || 20

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
 * Verifica conversas inativas e retorna para fila PRINCIPAL
 */
async function checkInactiveConversations(timeoutMinutes: number) {
    try {
        const now = new Date()
        const timeoutDate = new Date()
        timeoutDate.setMinutes(timeoutDate.getMinutes() - timeoutMinutes)

        // Buscar conversas inativas (atribuídas a agente mas sem atividade recente)
        // ✅ IMPORTANTE: Usar lastUserActivity em vez de lastTimestamp
        // lastTimestamp é atualizado quando QUALQUER mensagem é enviada (agente ou paciente)
        // lastUserActivity é atualizado apenas quando o PACIENTE envia mensagem
        // Para inatividade, queremos verificar se o PACIENTE não respondeu há X minutos
        const inactiveConversations = await prisma.conversation.findMany({
            where: {
                status: 'EM_ATENDIMENTO',
                assignedToId: { not: null },
                OR: [
                    // Se lastUserActivity existe, usar ele
                    { lastUserActivity: { lt: timeoutDate } },
                    // Se não existe, usar lastTimestamp como fallback
                    { lastUserActivity: null, lastTimestamp: { lt: timeoutDate } }
                ]
            },
            include: {
                assignedTo: true
            }
        })

        // Log para debug: mostrar quantas conversas foram encontradas e o timeout usado
        if (inactiveConversations.length > 0) {
            console.log(`⏰ [Monitor] Verificando ${inactiveConversations.length} conversas inativas (timeout: ${timeoutMinutes}min)`)
            inactiveConversations.forEach(conv => {
                const lastActivity = conv.lastUserActivity || conv.lastTimestamp
                const minutesSinceActivity = lastActivity
                    ? Math.floor((now.getTime() - new Date(lastActivity).getTime()) / (1000 * 60))
                    : 'N/A'
                console.log(`  - ${conv.phone}: ${minutesSinceActivity}min desde última atividade (agente: ${conv.assignedTo?.name})`)
            })
        }

        // #region agent log
        if (inactiveConversations.length === 0) {
            return
        }

        console.log(`⏰ Encontradas ${inactiveConversations.length} conversas inativas`)

        for (const conversation of inactiveConversations) {
            // ✅ Recarregar conversa para verificar status atual
            // Evitar race condition: conversa pode ter sido modificada entre busca e update
            const currentConv = await prisma.conversation.findUnique({
                where: { id: conversation.id },
                select: { status: true, assignedToId: true, lastUserActivity: true }
            })

            // Verificar se conversa ainda está EM_ATENDIMENTO e inativa
            if (!currentConv || currentConv.status !== 'EM_ATENDIMENTO' || !currentConv.assignedToId) {
                console.log(`⏭️ Conversa ${conversation.phone} não está mais EM_ATENDIMENTO, pulando...`)
                continue
            }

            // Verificar novamente se realmente está inativa (pode ter recebido mensagem recente)
            const now = new Date()
            const timeoutDate = new Date()
            timeoutDate.setMinutes(timeoutDate.getMinutes() - timeoutMinutes)
            const lastActivity = currentConv.lastUserActivity || conversation.lastTimestamp
            
            if (lastActivity && new Date(lastActivity) >= timeoutDate) {
                console.log(`⏭️ Conversa ${conversation.phone} recebeu atividade recente, pulando...`)
                continue
            }

            // Retornar para fila PRINCIPAL
            await prisma.conversation.update({
                where: { id: conversation.id },
                data: {
                    status: 'PRINCIPAL',
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
