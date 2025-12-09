import { conversationalAI, type ConversationalResponse } from './conversationalAI.js'
import { conversationContextService } from './conversationContext.js'

/**
 * Decisão de roteamento
 */
export interface RouteDecision {
    type: 'AI_CONVERSATION' | 'TRANSFER_TO_HUMAN' // Removido: START_WORKFLOW (workflows desativados)
    response: string
    queue?: string
    reason?: string
    workflowType?: string // Mantido para compatibilidade futura
    initialData?: Record<string, any>
    awaitingInput?: boolean
    expectedData?: Record<string, any>
    // ✅ NOVO: Contexto da IA para mensagem interna
    aiContext?: {
        intent?: string
        sentiment?: string
        confidence?: number
        entities?: Record<string, any>
    }
}

/**
 * Serviço de Roteamento Inteligente
 * 
 * Decide automaticamente a melhor ação baseado na resposta da IA:
 * - IA Conversacional: Para informações, perguntas, conversas livres
 * - Workflow: Para agendamento, cadastro, processos estruturados
 * - Transferência Humana: Para atraso, cancelamento, reclamação, urgência
 */
export class IntelligentRouter {
    /**
     * Roteia mensagem para a ação apropriada
     */
    async route(
        message: string,
        conversationId: string,
        phone: string
    ): Promise<RouteDecision> {
        console.log(`🔀 Roteando mensagem: "${message}"`)

        try {
            // ✅ NOVO: Verificar se paciente já existe ANTES de processar
            const { findPatientByPhone } = await import('../../src/services/patientDataService.js')
            const existingPatient = await findPatientByPhone(phone)
            
            if (existingPatient) {
                console.log(`✅ Paciente já cadastrado encontrado: ${existingPatient.name} (${existingPatient.id})`)
                console.log(`📋 Dados do paciente:`, {
                    name: existingPatient.name,
                    cpf: existingPatient.cpf ? '***.***.***-**' : 'não informado',
                    email: existingPatient.email || 'não informado',
                    insurance: existingPatient.insuranceCompany || 'Particular'
                })
            } else {
                console.log(`❌ Paciente não encontrado para telefone: ${phone}`)
            }

            // 1. Gerar resposta da IA conversacional
            const ai = conversationalAI.getInstance()
            console.log(`🔍 [DEBUG] Iniciando geração de resposta para: "${message.substring(0, 50)}..."`)
            const aiResponse = await ai.generateResponse(message, conversationId, phone)

            console.log(`📊 [DEBUG] Resposta completa da IA:`, {
                message: aiResponse.message?.substring(0, 100) + '...',
                intent: aiResponse.intent,
                action: aiResponse.action,
                confidence: aiResponse.confidence,
                entities: aiResponse.entities
            })
            console.log(`🎯 [DEBUG] ACTION recebido: "${aiResponse.action}"`)
            console.log(`🎯 [DEBUG] INTENT recebido: "${aiResponse.intent}"`)

            // 2. Decidir rota baseado na ação sugerida pela IA
            // ✅ Passar informação do paciente existente para evitar pedir dados desnecessários
            const decision = this.makeRoutingDecision(aiResponse, conversationId, existingPatient)

            // ✅ Adicionar contexto da IA ao decision
            decision.aiContext = {
                intent: aiResponse.intent,
                sentiment: aiResponse.sentiment,
                confidence: aiResponse.confidence,
                entities: aiResponse.entities
            }

            console.log(`✅ Rota decidida: ${decision.type}`)

            return decision

        } catch (error) {
            console.error('❌ Erro ao rotear mensagem:', error)

            // Fallback: transferir para humano em caso de erro
            return {
                type: 'TRANSFER_TO_HUMAN',
                response: 'Desculpe, estou com dificuldades técnicas. Vou transferir você para um atendente humano.',
                queue: 'HUMAN_QUEUE',
                reason: 'Erro técnico no sistema'
            }
        }
    }

    /**
     * Toma decisão de roteamento baseado na resposta da IA
     */
    private makeRoutingDecision(
        aiResponse: ConversationalResponse,
        conversationId: string,
        existingPatient?: { id: string; name: string; phone: string; cpf?: string | null; email?: string | null; insuranceCompany?: string | null } | null
    ): RouteDecision {
        // ✅ NOVO: Se paciente já existe e IA quer coletar dados, pular coleta e transferir direto
        if (aiResponse.action === 'collect_data' && existingPatient) {
            console.log(`✅ Paciente já cadastrado (${existingPatient.name}) - Pulando coleta de dados e transferindo direto`)
            
            // Usar dados existentes do paciente
            const patientEntities = {
                nome: existingPatient.name,
                cpf: existingPatient.cpf || '',
                email: existingPatient.email || '',
                convenio: existingPatient.insuranceCompany || 'Particular',
                ...aiResponse.entities // Manter outras entidades coletadas (procedimento, data, etc)
            }
            
            // Buscar procedimentos cobertos pelo convênio
            let procedimentosCobertos = ''
            if (existingPatient.insuranceCompany && existingPatient.insuranceCompany !== 'Particular') {
                try {
                    const { prismaClinicDataService } = await import('./prismaClinicDataService.js')
                    const prisma = (await import('../prisma/client.js')).default
                    
                    // Normalizar código do convênio (buscar pelo nome ou código)
                    let insuranceCode = existingPatient.insuranceCompany.toUpperCase()
                    const insurance = await prisma.insuranceCompany.findFirst({
                        where: {
                            OR: [
                                { code: insuranceCode },
                                { name: { contains: existingPatient.insuranceCompany, mode: 'insensitive' } },
                                { displayName: { contains: existingPatient.insuranceCompany, mode: 'insensitive' } }
                            ]
                        }
                    })
                    
                    if (insurance) {
                        insuranceCode = insurance.code
                        // Buscar procedimentos de qualquer clínica (ou Vieiralves como padrão)
                        const procedures = await prismaClinicDataService.getProceduresByClinicAndInsurance('vieiralves', insuranceCode)
                        if (procedures && procedures.length > 0) {
                            const procedureNames = procedures.map((p: any) => p.name || p.procedure?.name || p.procedureName).filter(Boolean)
                            if (procedureNames.length > 0) {
                                procedimentosCobertos = `\n\nCom seu convênio ${insurance.displayName || existingPatient.insuranceCompany}, você tem cobertura para: ${procedureNames.join(', ')}.\n\n`
                            }
                        }
                    }
                } catch (error) {
                    console.warn('⚠️ Erro ao buscar procedimentos do convênio:', error)
                }
            }
            
            // Transferir direto com dados do paciente já existente
            return {
                type: 'TRANSFER_TO_HUMAN',
                response: `Olá ${existingPatient.name}! 👋 Encontrei seu cadastro.${procedimentosCobertos}Em breve um atendente vai te atender para finalizar o agendamento. 😊`,
                queue: this.getQueueForIntent(aiResponse.intent),
                reason: this.getTransferReason(aiResponse.intent),
                initialData: patientEntities
            }
        }

        // ✅ PRIORIDADE 1: Verificar ACTION primeiro (mais específico)
        console.log(`🔍 [DEBUG makeRoutingDecision] ACTION recebido: "${aiResponse.action}"`)
        console.log(`🔍 [DEBUG makeRoutingDecision] INTENT recebido: "${aiResponse.intent}"`)
        console.log(`🔍 [DEBUG makeRoutingDecision] Paciente existe? ${existingPatient ? `SIM (${existingPatient.name})` : 'NÃO'}`)
        console.log(`🔍 [DEBUG makeRoutingDecision] Entities recebidas:`, JSON.stringify(aiResponse.entities, null, 2))
        
        switch (aiResponse.action) {
            case 'collect_data':
                // ✅ Bot está coletando dados - NÃO transferir ainda!
                console.log(`📋 [DEBUG] ACTION = collect_data → Coletando dados para ${aiResponse.intent}`)
                console.log(`📋 [DEBUG] Retornando resposta do bot para continuar coleta`)
                return this.routeToAIWithDataCollection(aiResponse, conversationId)

            case 'transfer_human':
                // ✅ Bot terminou coleta - AGORA SIM transferir
                console.log(`🎯 [DEBUG] ACTION = transfer_human → Transferindo ${aiResponse.intent} para humano`)
                return this.routeToHuman(aiResponse)

            case 'start_workflow': // ✅ Tratar como IA ao invés de workflow
            case 'continue':
            default:
                console.log(`💬 [DEBUG] ACTION = ${aiResponse.action} → Continuando conversa com bot`)
                return this.routeToAI(aiResponse)
        }
    }

    /**
     * Rota para humano com mensagem contextualizada
     */
    private routeToHumanWithContext(aiResponse: ConversationalResponse): RouteDecision {
        const intent = aiResponse.intent
        const entities = aiResponse.entities

        // Construir mensagem contextualizada
        let contextMessage = ''

        switch (intent) {
            case 'AGENDAR':
                contextMessage = this.buildSchedulingMessage(entities)
                break
            case 'CANCELAR':
                contextMessage = 'Em breve um de nossos atendentes irá atender sua solicitação de cancelamento. Aguarde!'
                break
            case 'REAGENDAR':
                contextMessage = 'Em breve um de nossos atendentes irá atender sua solicitação de reagendamento. Aguarde!'
                break
            default:
                contextMessage = 'Em breve um de nossos atendentes irá te atender. Aguarde!'
        }

        return {
            type: 'TRANSFER_TO_HUMAN',
            response: `${aiResponse.message}\n\n${contextMessage}`,
            queue: 'AGUARDANDO',
            reason: this.getTransferReason(intent),
            initialData: entities
        }
    }

    /**
     * Constrói mensagem contextualizada para agendamento
     */
    private buildSchedulingMessage(entities: any): string {
        const parts = ['Em breve um de nossos atendentes irá atender sua solicitação']

        if (entities.procedimento) {
            parts.push(`de agendamento de ${entities.procedimento}`)
        } else {
            parts.push('de agendamento')
        }

        if (entities.clinica) {
            parts.push(`na unidade ${entities.clinica}`)
        }

        if (entities.data) {
            parts.push(`para ${entities.data}`)
        }

        parts.push('Aguarde!')

        return parts.join(' ') + '.'
    }

    /**
     * Rota para transferência humana
     */
    private routeToHuman(aiResponse: ConversationalResponse): RouteDecision {
        const reason = this.getTransferReason(aiResponse.intent);
        const queue = this.getQueueForIntent(aiResponse.intent);

        console.log(`🔍 DEBUG routeToHuman: aiResponse.entities =`, aiResponse.entities);
        console.log(`🔍 DEBUG routeToHuman: entities keys =`, aiResponse.entities ? Object.keys(aiResponse.entities) : 'undefined');

        return {
            type: 'TRANSFER_TO_HUMAN',
            response: aiResponse.message,
            queue,
            reason,
            initialData: aiResponse.entities // ✅ ADICIONAR entities para salvar dados!
        };
    }


    // ⚠️ REMOVIDO: routeToWorkflow() - Workflows foram desabilitados

    /**
     * Rota para IA com coleta de dados
     */
    private routeToAIWithDataCollection(
        aiResponse: ConversationalResponse,
        conversationId: string
    ): RouteDecision {
        // Atualizar contexto com dados coletados
        if (Object.keys(aiResponse.entities).length > 0) {
            conversationContextService.updateContext(conversationId, {
                currentState: {
                    selectedClinic: aiResponse.entities.clinica,
                    selectedProcedures: aiResponse.entities.procedimento
                        ? [aiResponse.entities.procedimento]
                        : [],
                    selectedDate: aiResponse.entities.data,
                    selectedTime: aiResponse.entities.horario,
                    awaitingInput: true,
                    currentIntent: aiResponse.intent
                }
            })
        }

        return {
            type: 'AI_CONVERSATION',
            response: aiResponse.message,
            awaitingInput: true,
            expectedData: aiResponse.entities
        }
    }

    /**
     * Rota para IA conversacional (continuar conversa)
     */
    private routeToAI(aiResponse: ConversationalResponse): RouteDecision {
        return {
            type: 'AI_CONVERSATION',
            response: aiResponse.message,
            awaitingInput: false
        }
    }

    /**
     * Determina razão da transferência baseado na intenção
     */
    private getTransferReason(intent: string): string {
        const reasons: Record<string, string> = {
            'ATRASO': 'Paciente informou atraso',
            'CANCELAR': 'Paciente quer cancelar agendamento',
            'REAGENDAR': 'Paciente quer reagendar',
            'RECLAMACAO': 'Paciente está reclamando',
            'CONVERSA_LIVRE': 'Solicitação do paciente'
        }
        return reasons[intent] || 'Solicitação de atendimento humano'
    }

    /**
     * Determina fila apropriada baseado na intenção
     */
    private getQueueForIntent(intent: string): string {
        const queues: Record<string, string> = {
            'ATRASO': 'AGUARDANDO',
            'CANCELAR': 'AGUARDANDO',
            'REAGENDAR': 'AGUARDANDO',
            'RECLAMACAO': 'PRIORITY_QUEUE',
            'CONVERSA_LIVRE': 'HUMAN_QUEUE'
        }
        return queues[intent] || 'HUMAN_QUEUE'
    }

    /**
     * Determina tipo de workflow baseado na intenção
     */
    private getWorkflowType(intent: string): string {
        const workflows: Record<string, string> = {
            'AGENDAR': 'AGENDAMENTO',
            'REAGENDAR': 'REAGENDAMENTO',
            'INFORMACAO': 'INFORMACAO_GERAL'
        }
        return workflows[intent] || 'GERAL'
    }

    /**
     * Extrai dados iniciais para o workflow
     */
    private extractInitialData(aiResponse: ConversationalResponse): Record<string, any> {
        const data: Record<string, any> = {}

        if (aiResponse.entities.procedimento) {
            data.procedimento = aiResponse.entities.procedimento
        }
        if (aiResponse.entities.convenio) {
            data.convenio = aiResponse.entities.convenio
        }
        if (aiResponse.entities.clinica) {
            data.clinica = aiResponse.entities.clinica
        }
        if (aiResponse.entities.data) {
            data.data = aiResponse.entities.data
        }
        if (aiResponse.entities.horario) {
            data.horario = aiResponse.entities.horario
        }

        return data
    }

    /**
     * Verifica se deve transferir para humano baseado em confiança
     */
    shouldTransferByConfidence(confidence: number): boolean {
        return confidence < 0.6
    }

    /**
     * Verifica se deve iniciar workflow baseado em intenção
     */
    shouldStartWorkflow(intent: string): boolean {
        const workflowIntents = ['AGENDAR', 'REAGENDAR']
        return workflowIntents.includes(intent)
    }

    /**
     * Verifica se deve transferir para humano baseado em intenção
     */
    shouldTransferToHuman(intent: string): boolean {
        const transferIntents = ['ATRASO', 'CANCELAR', 'RECLAMACAO']
        return transferIntents.includes(intent)
    }
}

// Exportar singleton
export const intelligentRouter = new IntelligentRouter()
