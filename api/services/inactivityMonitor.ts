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

        // #region agent log
        const fs = require('fs');
        const logPath = '/Users/kalebecaldas/Documents/cursor_projects/ZORAHAPP2-1/.cursor/debug.log';
        fs.appendFileSync(logPath, JSON.stringify({location:'inactivityMonitor.ts:37',message:'checkInactiveConversations START',data:{now:now.toISOString(),timeoutDate:timeoutDate.toISOString(),timeoutMinutes},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})+'\n');
        // #endregion

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

        // #region agent log
        for (const conv of inactiveConversations) {
            const lastTimestamp = conv.lastTimestamp ? new Date(conv.lastTimestamp) : null;
            const lastUserActivity = conv.lastUserActivity ? new Date(conv.lastUserActivity) : null;
            const diffLastTimestamp = lastTimestamp ? Math.round((now.getTime() - lastTimestamp.getTime()) / 60000) : null;
            const diffLastUserActivity = lastUserActivity ? Math.round((now.getTime() - lastUserActivity.getTime()) / 60000) : null;
            fs.appendFileSync(logPath, JSON.stringify({location:'inactivityMonitor.ts:71',message:'INACTIVE CONVERSATION FOUND',data:{conversationId:conv.id,phone:conv.phone,lastTimestamp:lastTimestamp?.toISOString(),lastUserActivity:lastUserActivity?.toISOString(),diffLastTimestamp,diffLastUserActivity,timeoutMinutes,now:now.toISOString(),timeoutDate:timeoutDate.toISOString()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})+'\n');
        }
        // #endregion

        if (inactiveConversations.length === 0) {
            return
        }

        console.log(`⏰ Encontradas ${inactiveConversations.length} conversas inativas`)

        for (const conversation of inactiveConversations) {
            // #region agent log
            const lastTimestamp = conversation.lastTimestamp ? new Date(conversation.lastTimestamp) : null;
            const lastUserActivity = conversation.lastUserActivity ? new Date(conversation.lastUserActivity) : null;
            const diffLastTimestamp = lastTimestamp ? Math.round((now.getTime() - lastTimestamp.getTime()) / 60000) : null;
            const diffLastUserActivity = lastUserActivity ? Math.round((now.getTime() - lastUserActivity.getTime()) / 60000) : null;
            fs.appendFileSync(logPath, JSON.stringify({location:'inactivityMonitor.ts:85',message:'RETURNING CONVERSATION',data:{conversationId:conversation.id,phone:conversation.phone,lastTimestamp:lastTimestamp?.toISOString(),lastUserActivity:lastUserActivity?.toISOString(),diffLastTimestamp,diffLastUserActivity,timeoutMinutes},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})+'\n');
            // #endregion
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
