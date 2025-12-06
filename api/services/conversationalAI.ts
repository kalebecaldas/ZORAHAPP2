import OpenAI from 'openai'
import { conversationContextService, type EnhancedContext } from './conversationContext.js'
import { prismaClinicDataService } from './prismaClinicDataService.js'

/**
 * Resposta estruturada da IA conversacional
 */
export interface ConversationalResponse {
    message: string
    intent: 'INFORMACAO' | 'AGENDAR' | 'CANCELAR' | 'REAGENDAR' | 'ATRASO' | 'RECLAMACAO' | 'CONVERSA_LIVRE'
    sentiment: 'positive' | 'neutral' | 'negative'
    action: 'continue' | 'transfer_human' | 'start_workflow' | 'collect_data'
    confidence: number
    entities: {
        procedimento?: string
        convenio?: string
        clinica?: string
        data?: string
        horario?: string
    }
    suggestedNextSteps: string[]
}

/**
 * Serviço de IA Conversacional Pura
 * 
 * Conversa naturalmente como ChatGPT, mas com conhecimento específico da clínica
 */
export class ConversationalAIService {
    private openai: OpenAI
    private model: string
    private timeout: number

    constructor(apiKey: string, model = 'gpt-4o', timeout = 20000) {
        console.log('🤖 ConversationalAIService constructor - API Key present:', !!apiKey)
        if (!apiKey) {
            console.error('❌ No OpenAI API key provided to ConversationalAIService')
        }
        this.openai = new OpenAI({ apiKey })
        this.model = model
        this.timeout = timeout
    }

    /**
     * Gera resposta conversacional natural
     */
    async generateResponse(
        message: string,
        conversationId: string,
        phone: string
    ): Promise<ConversationalResponse> {
        console.log(`🤖 Gerando resposta conversacional para: "${message}"`)

        try {
            // 1. Buscar contexto enriquecido
            const context = await conversationContextService.buildContext(conversationId, phone)

            console.log(`🔍 CONTEXTO COMPLETO:`, {
                totalConversations: context.history.totalConversations,
                recentMessages: context.history.recent.length,
                patientName: context.patient.name,
                isFirstContact: context.history.totalConversations === 0
            })

            // 2. Buscar dados da clínica OU todos os procedimentos
            let clinicData = await this.getClinicData(context.currentState.selectedClinic)

            // Se não há clínica selecionada, buscar TODOS os procedimentos
            if (!clinicData) {
                console.log(`📦 Nenhuma clínica selecionada, buscando TODOS os procedimentos...`)
                const allProcedures = await prismaClinicDataService.getProcedures()
                const allInsurances = await prismaClinicDataService.getInsuranceCompanies()

                clinicData = {
                    name: 'Clínicas IAAM',
                    address: 'Vieiralves e São José',
                    phone: '(92) 3000-0000',
                    procedures: allProcedures.map(p => ({
                        id: p.id,
                        name: p.name,
                        description: p.description,
                        price: p.basePrice, // Mapear basePrice para price
                        hasPackage: p.packages && p.packages.length > 0,
                        packages: p.packages,
                        duration: p.duration,
                        requiresEvaluation: p.requiresEvaluation,
                        importantInfo: '' // Campo não existe em Procedure base
                    })),
                    insurances: allInsurances.map(i => ({
                        id: i.id,
                        name: i.name,
                        displayName: i.displayName,
                        discount: false, // Campo não existe em Insurance base
                        discountPercentage: 0
                    }))
                }

                console.log(`✅ Carregados ${allProcedures.length} procedimentos`)
            }

            // 3. Construir system prompt RICO (agora dinâmico do banco)
            const systemPrompt = await this.buildRichSystemPrompt(context, clinicData)

            // 4. Preparar histórico de mensagens (últimas 20 para manter contexto)
            const historyMessages = context.history.recent.slice(-20).map(h => ({
                role: h.role as 'user' | 'assistant',
                content: h.content
            }))

            console.log(`📜 Histórico de ${historyMessages.length} mensagens incluído no contexto`)
            console.log(`📜 ÚLTIMAS 5 MENSAGENS DO HISTÓRICO:`)
            historyMessages.slice(-5).forEach((msg, i) => {
                console.log(`  ${i + 1}. [${msg.role}]: "${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}"`)
            })
            console.log(`📝 MENSAGEM ATUAL DO USUÁRIO: "${message}"`)

            // 5. Gerar resposta com GPT-4o (JSON mode)
            const completion = await this.openai.chat.completions.create({
                model: this.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...historyMessages,
                    { role: 'user', content: message }
                ],
                temperature: 0.7,
                max_tokens: 1000,
                response_format: { type: 'json_object' }
            })

            const responseText = completion.choices[0]?.message?.content || '{}'
            const response = JSON.parse(responseText)

            console.log(`✅ Resposta gerada:`, {
                intent: response.intent,
                action: response.action,
                confidence: response.confidence,
                entities: response.entities
            })

            // ✅ REMOVIDO: Validações bugadas que impediam o usuário de mudar de assunto
            // O usuário TEM DIREITO de perguntar sobre acupuntura depois de fisioterapia!

            return {
                message: response.message || 'Desculpe, não consegui processar sua mensagem.',
                intent: response.intent || 'CONVERSA_LIVRE',
                sentiment: response.sentiment || 'neutral',
                action: response.action || 'continue',
                confidence: response.confidence || 0.5,
                entities: response.entities || {},
                suggestedNextSteps: response.suggestedNextSteps || []
            }

        } catch (error) {
            console.error('❌ Erro ao gerar resposta conversacional:', error)

            // Fallback response
            return {
                message: 'Desculpe, estou com dificuldades para processar sua mensagem. Posso transferir você para um atendente humano?',
                intent: 'CONVERSA_LIVRE',
                sentiment: 'neutral',
                action: 'transfer_human',
                confidence: 0.3,
                entities: {},
                suggestedNextSteps: ['Falar com atendente humano']
            }
        }
    }

    /**
     * Constrói system prompt rico com contexto e dados da clínica
     * Agora usa configuração dinâmica do banco de dados
     */
    private async buildRichSystemPrompt(context: EnhancedContext, clinicData: any): Promise<string> {
        // Importar dinamicamente para evitar circular dependency
        const { aiConfigurationService } = await import('./aiConfigurationService.js')
        return await aiConfigurationService.buildDynamicPrompt(context, clinicData)
    }

    /**
     * Busca dados da clínica selecionada
     */
    private async getClinicData(clinicCode?: string) {
        if (!clinicCode) {
            return null
        }

        try {
            const clinic = await prismaClinicDataService.getClinicByName(clinicCode)
            if (!clinic) return null

            const procedures = await prismaClinicDataService.getProceduresByClinic(clinicCode)
            const insurances = await prismaClinicDataService.getInsurancesByClinic(clinicCode)

            return {
                name: clinic.displayName,
                address: clinic.address,
                phone: clinic.phone,
                procedures,
                insurances
            }
        } catch (error) {
            console.error('Erro ao buscar dados da clínica:', error)
            return null
        }
    }
}

// Exportar singleton
let instance: ConversationalAIService | null = null

export const conversationalAI = {
    getInstance(): ConversationalAIService {
        if (!instance) {
            console.log('🤖 Creating ConversationalAIService instance...')
            instance = new ConversationalAIService(
                process.env.OPENAI_API_KEY || '',
                process.env.OPENAI_MODEL || 'gpt-4o',
                Number(process.env.OPENAI_TIMEOUT) || 20000
            )
        }
        return instance
    }
}
