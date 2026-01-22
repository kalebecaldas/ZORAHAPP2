import prisma from '../prisma/client.js'

/**
 * Adiciona evento de webhook ao contexto da conversa
 * Os eventos são acumulados e enviados em batch ao encerrar a conversa
 */
export async function addWebhookEvent(
    conversationId: string,
    eventType: string,
    eventData: any
): Promise<void> {
    try {
        const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId },
            select: { workflowContext: true }
        })

        if (!conversation) {
            console.warn(`⚠️ Conversa ${conversationId} não encontrada para adicionar evento`)
            return
        }

        const context = (conversation.workflowContext as any) || {}
        const events = context.webhookEvents || []

        // Adicionar novo evento
        events.push({
            type: eventType,
            timestamp: new Date().toISOString(),
            data: eventData
        })

        // Atualizar contexto
        await prisma.conversation.update({
            where: { id: conversationId },
            data: {
                workflowContext: {
                    ...context,
                    webhookEvents: events
                }
            }
        })

        console.log(`📝 Evento "${eventType}" adicionado à conversa ${conversationId} (total: ${events.length})`)
    } catch (error) {
        console.error(`❌ Erro ao adicionar evento de webhook:`, error)
        // Não lança erro para não quebrar o fluxo principal
    }
}

/**
 * Busca todos os eventos acumulados de uma conversa
 */
export async function getWebhookEvents(conversationId: string): Promise<any[]> {
    try {
        const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId },
            select: { workflowContext: true }
        })

        if (!conversation) return []

        const context = (conversation.workflowContext as any) || {}
        return context.webhookEvents || []
    } catch (error) {
        console.error(`❌ Erro ao buscar eventos de webhook:`, error)
        return []
    }
}

/**
 * Limpa eventos de webhook após envio bem-sucedido
 */
export async function clearWebhookEvents(conversationId: string): Promise<void> {
    try {
        const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId },
            select: { workflowContext: true }
        })

        if (!conversation) return

        const context = (conversation.workflowContext as any) || {}
        delete context.webhookEvents

        await prisma.conversation.update({
            where: { id: conversationId },
            data: { workflowContext: context }
        })

        console.log(`🧹 Eventos de webhook limpos da conversa ${conversationId}`)
    } catch (error) {
        console.error(`❌ Erro ao limpar eventos de webhook:`, error)
    }
}
