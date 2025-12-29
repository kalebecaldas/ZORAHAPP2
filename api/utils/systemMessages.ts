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
            
            // ✅ CRIAR RESUMO FORMATADO COM QUEBRAS DE LINHA CLARAS
            const lines: string[] = []
            
            lines.push('🤖 **RESUMO DO ATENDIMENTO DO BOT**')
            lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━')
            lines.push('') // Linha vazia
            
            // Intenção principal
            if (ctx.intent) {
                const intentMap: Record<string, string> = {
                    'INFORMACAO': '💬 Pedindo informações',
                    'AGENDAR': '📅 QUER AGENDAR',
                    'CANCELAR': '❌ Quer cancelar',
                    'REAGENDAR': '🔄 Quer reagendar',
                    'ATRASO': '⏰ Avisa atraso',
                    'RECLAMACAO': '😠 Reclamação',
                    'CONVERSA_LIVRE': '💭 Conversa livre'
                }
                lines.push(`🎯 ${intentMap[ctx.intent] || ctx.intent}`)
                lines.push('') // Linha vazia
            }
            
            // DADOS DO AGENDAMENTO
            if (ctx.intent === 'AGENDAR' && ctx.entities && Object.keys(ctx.entities).length > 0) {
                lines.push('📋 **O QUE O PACIENTE QUER:**')
                lines.push('') // Linha vazia
                
                if (ctx.entities.procedimento) {
                    lines.push(`• Procedimento: ${ctx.entities.procedimento}`)
                }
                if (ctx.entities.clinica) {
                    lines.push(`• Unidade: ${ctx.entities.clinica}`)
                }
                if (ctx.entities.data) {
                    lines.push(`• Data: ${ctx.entities.data}`)
                }
                if (ctx.entities.horario) {
                    lines.push(`• Horário: ${ctx.entities.horario}`)
                }
                
                lines.push('') // Linha vazia
                
                // Convênio
                if (ctx.entities.convenio && !ctx.entities.convenio.toLowerCase().includes('não') && !ctx.entities.convenio.toLowerCase().includes('nao') && !ctx.entities.convenio.toLowerCase().includes('particular')) {
                    lines.push(`💳 Convênio: ${ctx.entities.convenio}`)
                    if (ctx.entities.numero_convenio) {
                        lines.push(`📇 Nº Carteirinha: ${ctx.entities.numero_convenio}`)
                    }
                } else {
                    lines.push('💰 Atendimento: Particular')
                }
                
                lines.push('') // Linha vazia
            } else if (ctx.entities && Object.keys(ctx.entities).length > 0) {
                lines.push('💬 **INFORMAÇÕES MENCIONADAS:**')
                lines.push('') // Linha vazia
                
                if (ctx.entities.procedimento) lines.push(`• Procedimento: ${ctx.entities.procedimento}`)
                if (ctx.entities.convenio) lines.push(`• Convênio: ${ctx.entities.convenio}`)
                if (ctx.entities.clinica) lines.push(`• Unidade: ${ctx.entities.clinica}`)
                if (ctx.entities.data) lines.push(`• Data: ${ctx.entities.data}`)
                if (ctx.entities.horario) lines.push(`• Horário: ${ctx.entities.horario}`)
                
                lines.push('') // Linha vazia
            }
            
            // Sentimento
            if (ctx.sentiment) {
                const sentimentMap = {
                    'positive': '😊 Positivo',
                    'neutral': '😐 Neutro',
                    'negative': '😞 Negativo'
                }
                lines.push(`**Humor:** ${sentimentMap[ctx.sentiment] || ctx.sentiment}`)
                lines.push('') // Linha vazia
            }
            
            // RESUMO DA CONVERSA
            if (ctx.conversationSummary && ctx.conversationSummary !== 'Sem histórico disponível') {
                lines.push('💭 **ÚLTIMAS MENSAGENS:**')
                ctx.conversationSummary.split('\n').forEach(line => {
                    if (line.trim()) lines.push(`  ${line}`)
                })
            }
            
            return lines.join('\n')

        default:
            return 'Ação do sistema'
    }
}
