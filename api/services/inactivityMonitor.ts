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
 * 
 * Lógica de inatividade:
 * - Verifica se o PACIENTE enviou mensagem e está esperando resposta há mais de X minutos
 * - lastUserActivity = última mensagem do PACIENTE (para sessão de 24h)
 * - lastAgentActivity = última ação do ATENDENTE (resposta ou heartbeat)
 * 
 * Conversa é considerada inativa SE:
 * 1. Está EM_ATENDIMENTO
 * 2. Paciente enviou mensagem DEPOIS da última ação do atendente (lastUserActivity > lastAgentActivity)
 * 3. Paciente está esperando há mais de X minutos ((now - lastUserActivity) > timeout)
 */
async function checkInactiveConversations(timeoutMinutes: number) {
    try {
        const now = new Date()
        const timeoutDate = new Date()
        timeoutDate.setMinutes(timeoutDate.getMinutes() - timeoutMinutes)

        // Buscar conversas onde:
        // 1. Está EM_ATENDIMENTO
        // 2. Paciente enviou mensagem há mais de X minutos
        // 3. Paciente enviou mensagem DEPOIS da última ação do atendente
        const inactiveConversations = await prisma.conversation.findMany({
            where: {
                status: 'EM_ATENDIMENTO',
                assignedToId: { not: null },
                lastUserActivity: {
                    lt: timeoutDate, // Paciente enviou há mais de X minutos
                    not: null
                }
            },
            include: {
                assignedTo: true
            }
        })

        // Filtrar conversas onde paciente está ESPERANDO resposta
        const conversationsAwaitingResponse = inactiveConversations.filter(conv => {
            // Se não há lastAgentActivity, significa que atendente nunca respondeu
            if (!conv.lastAgentActivity) return true
            
            // Se lastUserActivity é mais recente que lastAgentActivity,
            // significa que paciente enviou mensagem depois da última ação do atendente
            const userActivityTime = conv.lastUserActivity ? new Date(conv.lastUserActivity).getTime() : 0
            const agentActivityTime = conv.lastAgentActivity ? new Date(conv.lastAgentActivity).getTime() : 0
            
            return userActivityTime > agentActivityTime
        })

        // Log para debug
        if (conversationsAwaitingResponse.length > 0) {
            console.log(`⏰ [Monitor] Verificando ${conversationsAwaitingResponse.length} conversas aguardando resposta (timeout: ${timeoutMinutes}min)`)
            conversationsAwaitingResponse.forEach(conv => {
                const minutesSinceUserActivity = conv.lastUserActivity
                    ? Math.floor((now.getTime() - new Date(conv.lastUserActivity).getTime()) / (1000 * 60))
                    : 'N/A'
                const minutesSinceAgentActivity = conv.lastAgentActivity
                    ? Math.floor((now.getTime() - new Date(conv.lastAgentActivity).getTime()) / (1000 * 60))
                    : 'N/A'
                console.log(`  - ${conv.phone}: ${minutesSinceUserActivity}min desde msg paciente, ${minutesSinceAgentActivity}min desde ação atendente (${conv.assignedTo?.name})`)
            })
        }

        if (conversationsAwaitingResponse.length === 0) {
            return
        }

        console.log(`⏰ Encontradas ${conversationsAwaitingResponse.length} conversas sem resposta`)

        for (const conversation of conversationsAwaitingResponse) {
            // ✅ Recarregar conversa para verificar status atual
            const currentConv = await prisma.conversation.findUnique({
                where: { id: conversation.id },
                select: { 
                    status: true, 
                    assignedToId: true, 
                    lastUserActivity: true,
                    lastAgentActivity: true
                }
            })

            // Verificar se conversa ainda está EM_ATENDIMENTO e inativa
            if (!currentConv || currentConv.status !== 'EM_ATENDIMENTO' || !currentConv.assignedToId) {
                console.log(`⏭️ Conversa ${conversation.phone} não está mais EM_ATENDIMENTO, pulando...`)
                continue
            }

            // Verificar novamente se paciente ainda está esperando resposta
            const userActivityTime = currentConv.lastUserActivity ? new Date(currentConv.lastUserActivity).getTime() : 0
            const agentActivityTime = currentConv.lastAgentActivity ? new Date(currentConv.lastAgentActivity).getTime() : 0
            
            // Se atendente respondeu depois da última mensagem do paciente, não devolver
            if (agentActivityTime >= userActivityTime) {
                console.log(`⏭️ Conversa ${conversation.phone} já foi respondida pelo atendente, pulando...`)
                continue
            }
            
            // Verificar se ainda está dentro do timeout
            if (currentConv.lastUserActivity && new Date(currentConv.lastUserActivity) >= timeoutDate) {
                console.log(`⏭️ Conversa ${conversation.phone} recebeu mensagem recente do paciente, pulando...`)
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

            // Emitir evento Socket.IO apenas para o usuário específico
            try {
                const { io } = getRealtime()
                
                // ✅ Emitir notificação individual para o usuário que perdeu a conversa
                if (conversation.assignedToId) {
                    io.to(`user_${conversation.assignedToId}`).emit('conversation:timeout', {
                        conversationId: conversation.id,
                        phone: conversation.phone,
                        previousAgent: conversation.assignedTo?.name,
                        previousAgentId: conversation.assignedToId
                    })
                    console.log(`📡 Notificação de timeout enviada apenas para usuário ${conversation.assignedToId}`)
                }
                
                // Emitir evento geral de atualização para todos (sem notificação)
                io.emit('conversation:updated', {
                    conversationId: conversation.id,
                    phone: conversation.phone,
                    status: 'PRINCIPAL',
                    assignedToId: null,
                    reason: 'inactivity_timeout'
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
