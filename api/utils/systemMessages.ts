import prisma from '../prisma/client.js'

export type SystemMessageType =
    | 'AGENT_ASSIGNED'
    | 'TRANSFERRED_TO_QUEUE'
    | 'TRANSFERRED_TO_AGENT'
    | 'RETURNED_TO_QUEUE'
    | 'TIMEOUT_INACTIVITY'
    | 'CONVERSATION_CLOSED'
    | 'BOT_TO_HUMAN'
    | 'PATIENT_DATA_CARD'
    | 'BOT_INTENT_CONTEXT'

interface SystemMessageMetadata {
    agentName?: string
    queueName?: string
    targetAgentName?: string
    reason?: string
    // Dados do paciente para o card
    patientData?: {
        name?: string
        phone: string
        cpf?: string | null
        email?: string | null
        birthDate?: string | null
        insuranceCompany?: string | null
        insuranceNumber?: string | null
        // Campos antigos (manter compatibilidade)
        convenio?: string
        procedimento?: string
        clinica?: string
        data?: string
        horario?: string
    }
    // Contexto da intenção do bot
    intentContext?: {
        intent?: string
        sentiment?: string
        confidence?: number
        entities?: Record<string, any>
        conversationSummary?: string
        collectedData?: Record<string, any>
    }
}

/**
 * Cria uma mensagem do sistema no chat
 */
export async function createSystemMessage(
    conversationId: string,
    type: SystemMessageType,
    metadata: SystemMessageMetadata = {}
) {
    const messageText = getSystemMessageText(type, metadata)

    return await prisma.message.create({
        data: {
            conversationId,
            phoneNumber: 'system',
            messageText,
            messageType: 'SYSTEM',
            direction: 'system',
            from: 'system',
            systemMessageType: type,
            systemMetadata: metadata as any
        }
    })
}

/**
 * Gera o texto da mensagem do sistema baseado no tipo
 */
function getSystemMessageText(type: SystemMessageType, metadata: SystemMessageMetadata): string {
    switch (type) {
        case 'AGENT_ASSIGNED':
            return `${metadata.agentName} assumiu a conversa`

        case 'TRANSFERRED_TO_QUEUE':
            return `${metadata.agentName} transferiu a conversa para fila ${metadata.queueName}`

        case 'TRANSFERRED_TO_AGENT':
            return `${metadata.agentName} transferiu a conversa para ${metadata.targetAgentName}`

        case 'RETURNED_TO_QUEUE':
            return `${metadata.agentName} devolveu a conversa para fila ${metadata.queueName}`

        case 'TIMEOUT_INACTIVITY':
            return `⏰ Conversa retornou automaticamente por inatividade (${metadata.reason})`

        case 'CONVERSATION_CLOSED':
            return `${metadata.agentName} encerrou a conversa`

        case 'BOT_TO_HUMAN':
            return `🤖 Conversa transferida do bot para atendimento humano`

        case 'PATIENT_DATA_CARD':
            return `📋 Dados coletados pelo bot`

        case 'BOT_INTENT_CONTEXT':
            const ctx = metadata.intentContext
            if (!ctx) return '📋 Contexto da conversa com o bot'
            
            let contextText = '📋 **Contexto da Conversa com o Bot**\n\n'
            
            if (ctx.intent) {
                const intentMap: Record<string, string> = {
                    'AGENDAR': 'Agendamento',
                    'INFORMACAO': 'Informação',
                    'CANCELAR': 'Cancelamento',
                    'REAGENDAR': 'Reagendamento',
                    'ATRASO': 'Atraso',
                    'RECLAMACAO': 'Reclamação',
                    'CONVERSA_LIVRE': 'Conversa Livre'
                }
                contextText += `🎯 **Intenção:** ${intentMap[ctx.intent] || ctx.intent}\n`
            }
            
            if (ctx.sentiment) {
                const sentimentMap: Record<string, string> = {
                    'positive': '😊 Positivo',
                    'neutral': '😐 Neutro',
                    'negative': '😔 Negativo'
                }
                contextText += `💭 **Sentimento:** ${sentimentMap[ctx.sentiment] || ctx.sentiment}\n`
            }
            
            if (ctx.confidence !== undefined) {
                contextText += `📊 **Confiança da IA:** ${Math.round(ctx.confidence * 100)}%\n`
            }
            
            if (ctx.conversationSummary) {
                contextText += `\n📝 **Resumo da Conversa:**\n${ctx.conversationSummary}\n`
            }
            
            if (ctx.entities && Object.keys(ctx.entities).length > 0) {
                contextText += `\n📋 **Dados Coletados:**\n`
                if (ctx.entities.nome) contextText += `• Nome: ${ctx.entities.nome}\n`
                if (ctx.entities.cpf) contextText += `• CPF: ${ctx.entities.cpf}\n`
                if (ctx.entities.email) contextText += `• Email: ${ctx.entities.email}\n`
                if (ctx.entities.nascimento) contextText += `• Data de Nascimento: ${ctx.entities.nascimento}\n`
                if (ctx.entities.convenio) contextText += `• Convênio: ${ctx.entities.convenio}\n`
                if (ctx.entities.numero_convenio) contextText += `• Número do Convênio: ${ctx.entities.numero_convenio}\n`
                if (ctx.entities.procedimento) contextText += `• Procedimento: ${ctx.entities.procedimento}\n`
                if (ctx.entities.clinica) contextText += `• Clínica: ${ctx.entities.clinica}\n`
                if (ctx.entities.data) contextText += `• Data: ${ctx.entities.data}\n`
                if (ctx.entities.horario) contextText += `• Horário: ${ctx.entities.horario}\n`
            }
            
            return contextText

        default:
            return 'Ação do sistema'
    }
}
