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

            // 5. Gerar resposta com GPT-4o (JSON mode) - COM RETRY para rate limits
            console.log(`🔑 Usando modelo: ${this.model}`)
            console.log(`🔑 API Key configurada: ${this.openai.apiKey ? 'SIM (oculta)' : 'NÃO'}`)
            console.log(`📤 Enviando requisição para OpenAI...`)
            
            // ✅ Retry logic para rate limits (429)
            let completion
            let retries = 0
            const maxRetries = 3
            const baseDelay = 2000 // 2 segundos
            
            while (retries <= maxRetries) {
                try {
                    completion = await this.openai.chat.completions.create({
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
                    break // Sucesso, sair do loop
                } catch (error: any) {
                    // Se for rate limit (429) e ainda temos tentativas, fazer retry
                    if (error.status === 429 && retries < maxRetries) {
                        const delay = baseDelay * Math.pow(2, retries) // Backoff exponencial: 2s, 4s, 8s
                        console.log(`⏳ Rate limit detectado (429). Aguardando ${delay}ms antes de tentar novamente... (tentativa ${retries + 1}/${maxRetries})`)
                        await new Promise(resolve => setTimeout(resolve, delay))
                        retries++
                        continue
                    }
                    // Se não for rate limit ou esgotamos tentativas, lançar erro
                    throw error
                }
            }

            console.log(`📥 Resposta recebida da OpenAI`)
            const responseText = completion.choices[0]?.message?.content || '{}'
            console.log(`📝 Resposta bruta (primeiros 200 caracteres): ${responseText.substring(0, 200)}`)
            
            const response = JSON.parse(responseText)
            console.log(`✅ JSON parseado com sucesso`)

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
            console.error('❌ Erro detalhado:', error instanceof Error ? error.message : String(error))
            console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'N/A')
            
            // Verificar tipo específico de erro
            if (error && typeof error === 'object' && 'status' in error) {
                const status = (error as any).status
                const code = (error as any).code
                
                if (status === 429 || code === 'insufficient_quota' || code === 'rate_limit_exceeded') {
                    console.error('❌ ERRO DE RATE LIMIT/QUOTA:')
                    console.error('   → Status: 429')
                    console.error('   → Código:', code)
                    console.error('   → Possíveis causas:')
                    console.error('      1. Limite de requisições por minuto/hora atingido')
                    console.error('      2. Quota do projeto/organização esgotada')
                    console.error('      3. Chave da API não associada ao projeto com créditos')
                    console.error('   → Soluções:')
                    console.error('      • Aguarde alguns minutos e tente novamente')
                    console.error('      • Verifique billing: https://platform.openai.com/settings/organization/billing')
                    console.error('      • Use modelo mais barato (gpt-3.5-turbo) temporariamente')
                } else if (status === 401) {
                    console.error('❌ ERRO DE AUTENTICAÇÃO: Chave da API OpenAI inválida ou não configurada')
                    console.error('❌ Verifique a variável de ambiente OPENAI_API_KEY')
                } else if (status === 404) {
                    console.error('❌ ERRO DE MODELO: Modelo GPT não encontrado ou indisponível')
                    console.error(`   → Modelo tentado: ${this.model}`)
                    console.error('   → Tente usar: gpt-3.5-turbo ou gpt-4-turbo')
                }
            } else if (error instanceof Error) {
                if (error.message?.includes('API key') || error.message?.includes('authentication') || error.message?.includes('401')) {
                    console.error('❌ ERRO DE AUTENTICAÇÃO: Chave da API OpenAI inválida ou não configurada')
                    console.error('❌ Verifique a variável de ambiente OPENAI_API_KEY')
                }
                if (error.message?.includes('rate limit') || error.message?.includes('429')) {
                    console.error('❌ ERRO DE RATE LIMIT: Limite de requisições atingido')
                }
                if (error.message?.includes('model') || error.message?.includes('404')) {
                    console.error('❌ ERRO DE MODELO: Modelo GPT não encontrado ou indisponível')
                }
            }

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
