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
            
            // ✅ CRIAR RESUMO COMPLETO E DESTAQUE PARA O ATENDENTE
            let contextText = '🤖 **RESUMO DO ATENDIMENTO DO BOT**\n'
            contextText += '━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n'
            
            // Intenção principal (DESTACADA)
            if (ctx.intent) {
                const intentMap: Record<string, string> = {
                    'INFORMACAO': '💬 Pedindo informações',
                    'AGENDAR': '📅 **QUER AGENDAR**',
                    'CANCELAR': '❌ Quer cancelar',
                    'REAGENDAR': '🔄 Quer reagendar',
                    'ATRASO': '⏰ Avisa atraso',
                    'RECLAMACAO': '😠 Reclamação',
                    'CONVERSA_LIVRE': '💭 Conversa livre'
                }
                contextText += `🎯 ${intentMap[ctx.intent] || ctx.intent}\n\n`
            }
            
            // ✅ DADOS DO AGENDAMENTO (se for AGENDAR) - SEÇÃO PRINCIPAL
            if (ctx.intent === 'AGENDAR' && ctx.entities && Object.keys(ctx.entities).length > 0) {
                contextText += '📋 **O QUE O PACIENTE QUER AGENDAR:**\n\n'
                
                // Procedimento (DESTAQUE)
                if (ctx.entities.procedimento) {
                    contextText += `🔹 **Procedimento:** ${ctx.entities.procedimento}\n`
                } else {
                    contextText += `🔹 **Procedimento:** Não especificado\n`
                }
                
                // Unidade/Clínica (DESTAQUE)
                if (ctx.entities.clinica) {
                    contextText += `🔹 **Unidade Preferida:** ${ctx.entities.clinica}\n`
                } else {
                    contextText += `🔹 **Unidade:** Não especificou\n`
                }
                
                // Data e Horário
                if (ctx.entities.data) {
                    contextText += `📅 **Data Preferida:** ${ctx.entities.data}\n`
                }
                if (ctx.entities.horario) {
                    contextText += `⏰ **Horário Preferido:** ${ctx.entities.horario}\n`
                }
                
                // Convênio
                if (ctx.entities.convenio && !ctx.entities.convenio.toLowerCase().includes('não') && !ctx.entities.convenio.toLowerCase().includes('nao') && !ctx.entities.convenio.toLowerCase().includes('particular')) {
                    contextText += `\n💳 **Convênio:** ${ctx.entities.convenio}\n`
                    if (ctx.entities.numero_convenio) {
                        contextText += `📇 **Nº Carteirinha:** ${ctx.entities.numero_convenio}\n`
                    }
                } else {
                    contextText += `\n💰 **Atendimento:** Particular\n`
                }
                
                contextText += '\n'
            } else if (ctx.entities && Object.keys(ctx.entities).length > 0) {
                // ✅ OUTROS DADOS MENCIONADOS (não agendamento)
                contextText += '💬 **INFORMAÇÕES MENCIONADAS:**\n\n'
                if (ctx.entities.procedimento) contextText += `• Procedimento: ${ctx.entities.procedimento}\n`
                if (ctx.entities.convenio) contextText += `• Convênio: ${ctx.entities.convenio}\n`
                if (ctx.entities.clinica) contextText += `• Unidade: ${ctx.entities.clinica}\n`
                if (ctx.entities.data) contextText += `• Data: ${ctx.entities.data}\n`
                if (ctx.entities.horario) contextText += `• Horário: ${ctx.entities.horario}\n`
                contextText += '\n'
            }
            
            // Sentimento do paciente
            if (ctx.sentiment) {
                const sentimentMap = {
                    'positive': '😊 Positivo',
                    'neutral': '😐 Neutro',
                    'negative': '😞 Negativo'
                }
                contextText += `**Humor do Paciente:** ${sentimentMap[ctx.sentiment] || ctx.sentiment}\n\n`
            }
            
            // ✅ RESUMO DA CONVERSA (últimas mensagens) - Para contexto rápido
            if (ctx.conversationSummary && ctx.conversationSummary !== 'Sem histórico disponível') {
                contextText += '💭 **ÚLTIMAS MENSAGENS:**\n'
                contextText += ctx.conversationSummary.split('\n').map(line => `  ${line}`).join('\n')
                contextText += '\n'
            }
            
            return contextText

        default:
            return 'Ação do sistema'
    }
}
