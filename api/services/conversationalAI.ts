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
        nome?: string
        cpf?: string
        email?: string
        nascimento?: string
        numero_convenio?: string
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
            console.log(`📋 [DEBUG] Resposta JSON completa:`, JSON.stringify(response, null, 2))

            console.log(`✅ Resposta gerada:`, {
                intent: response.intent,
                action: response.action,
                confidence: response.confidence,
                entities: response.entities
            })
            
            // ✅ VALIDAÇÃO CRÍTICA: Verificar se ACTION está correto
            const validActions = ['continue', 'collect_data', 'transfer_human']
            if (!validActions.includes(response.action)) {
                console.warn(`⚠️ [DEBUG] ACTION inválido recebido: "${response.action}". Corrigindo para "continue"`)
                response.action = 'continue'
            }
            
            // ✅ VALIDAÇÃO CRÍTICA: Se INTENT é AGENDAR, ACTION DEVE ser collect_data ou transfer_human
            if (response.intent === 'AGENDAR') {
                if (response.action === 'continue') {
                    console.warn(`⚠️ [DEBUG] ⚠️⚠️⚠️ INTENT=AGENDAR mas ACTION=continue. CORRIGINDO para collect_data`)
                    console.warn(`⚠️ [DEBUG] A IA não seguiu a regra de fazer cadastro primeiro!`)
                    response.action = 'collect_data'
                }
                console.log(`✅ [DEBUG] INTENT=AGENDAR → ACTION=${response.action} (correto)`)
            }
            
            // ✅ VALIDAÇÃO ADICIONAL: Se mensagem contém palavras de agendamento mas INTENT não é AGENDAR
            const agendamentoKeywords = ['agendar', 'marcar', 'fazer marcação', 'preciso agendar', 'quero agendar', 'quero marcar']
            const messageLower = message.toLowerCase()
            const hasAgendamentoKeyword = agendamentoKeywords.some(keyword => messageLower.includes(keyword))
            
            if (hasAgendamentoKeyword && response.intent !== 'AGENDAR') {
                console.warn(`⚠️ [DEBUG] ⚠️⚠️⚠️ Mensagem contém "${agendamentoKeywords.find(k => messageLower.includes(k))}" mas INTENT=${response.intent}`)
                console.warn(`⚠️ [DEBUG] CORRIGINDO: INTENT → AGENDAR, ACTION → collect_data`)
                response.intent = 'AGENDAR'
                response.action = 'collect_data'
            }
            
            // ✅ VALIDAÇÃO CRÍTICA: Verificar se TODOS os dados de cadastro foram coletados
            // Buscar dados do histórico da conversa também (a IA pode não ter acumulado nas entities)
            if (response.intent === 'AGENDAR' && response.action === 'collect_data') {
                const entities = response.entities || {}
                
                // Extrair dados do histórico da conversa (analisar mensagens em ordem)
                const userMessagesList = historyMessages
                    .filter(m => m.role === 'user')
                    .map(m => m.content.trim())
                
                const botMessagesList = historyMessages
                    .filter(m => m.role === 'assistant')
                    .map(m => m.content.toLowerCase())
                
                // Analisar mensagens em ordem para identificar quando cada dado foi informado
                let extractedNome = entities.nome
                let extractedCpf = entities.cpf
                let extractedEmail = entities.email
                let extractedNascimento = entities.nascimento
                let extractedConvenio = entities.convenio
                let extractedNumeroConvenio = entities.numero_convenio
                
                // Percorrer mensagens do usuário em ordem reversa (mais recentes primeiro)
                for (let i = userMessagesList.length - 1; i >= 0; i--) {
                    const userMsg = userMessagesList[i]
                    const userMsgLower = userMsg.toLowerCase()
                    
                    // Verificar contexto: qual foi a última pergunta do bot antes desta mensagem?
                    const botMsgIndex = Math.min(i, botMessagesList.length - 1)
                    const lastBotMsg = botMsgIndex >= 0 ? botMessagesList[botMsgIndex] : ''
                    
                    // Extrair NOME (se não encontrado ainda)
                    if (!extractedNome || extractedNome.trim().length === 0) {
                        // Padrões: "meu nome é X", "sou X", "me chamo X"
                        const nomePattern1 = userMsg.match(/(?:meu nome é|sou|me chamo|eu sou)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i)
                        if (nomePattern1) {
                            extractedNome = nomePattern1[1]
                        }
                        // Se bot perguntou sobre nome e resposta parece nome (2-4 palavras, primeira maiúscula)
                        else if (lastBotMsg.includes('nome') && userMsg.split(' ').length >= 2 && userMsg.split(' ').length <= 4 && /^[A-Z]/.test(userMsg)) {
                            extractedNome = userMsg
                        }
                        // Última tentativa: se parece nome próprio (sem números, 2-4 palavras)
                        else if (userMsg.split(' ').length >= 2 && userMsg.split(' ').length <= 4 && /^[A-Z][a-z]+/.test(userMsg) && !/\d/.test(userMsg) && !userMsg.includes('@')) {
                            extractedNome = userMsg
                        }
                    }
                    
                    // Extrair CPF (11 dígitos)
                    if (!extractedCpf || extractedCpf.trim().length === 0) {
                        const cpfPattern = userMsg.match(/(\d{11})/)
                        if (cpfPattern) {
                            // Se bot perguntou sobre CPF OU se é apenas números (provavelmente CPF)
                            if (lastBotMsg.includes('cpf') || lastBotMsg.includes('documento') || (userMsg.match(/^\d+$/) && userMsg.length === 11)) {
                                extractedCpf = cpfPattern[1]
                            }
                        }
                    }
                    
                    // Extrair EMAIL
                    if (!extractedEmail || extractedEmail.trim().length === 0) {
                        const emailPattern = userMsg.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)
                        if (emailPattern) {
                            // Se bot perguntou sobre email OU se contém @ (provavelmente email)
                            if (lastBotMsg.includes('email') || lastBotMsg.includes('e-mail') || userMsg.includes('@')) {
                                extractedEmail = emailPattern[1]
                            }
                        }
                    }
                    
                    // Extrair DATA DE NASCIMENTO (dd/mm/aaaa)
                    if (!extractedNascimento || extractedNascimento.trim().length === 0) {
                        const nascimentoPattern = userMsg.match(/(\d{1,2}\/\d{1,2}\/\d{4})/)
                        if (nascimentoPattern) {
                            // Se bot perguntou sobre nascimento OU se parece data (dd/mm/aaaa)
                            if (lastBotMsg.includes('nascimento') || lastBotMsg.includes('data de nascimento') || lastBotMsg.includes('nasceu') || nascimentoPattern[0].match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
                                extractedNascimento = nascimentoPattern[1]
                            }
                        }
                    }
                    
                    // Extrair CONVÊNIO
                    if (!extractedConvenio || extractedConvenio.trim().length === 0) {
                        const conveniosAceitos = ['BRADESCO', 'SULAMÉRICA', 'MEDISERVICE', 'SAÚDE CAIXA', 'PETROBRAS', 'GEAP', 'PRO SOCIAL', 'POSTAL SAÚDE', 'CONAB']
                        for (const conv of conveniosAceitos) {
                            if (userMsg.toUpperCase().includes(conv)) {
                                extractedConvenio = conv
                                break
                            }
                        }
                        // Se mencionou "não tenho", "particular", etc
                        if (!extractedConvenio && (userMsgLower.includes('não tenho') || userMsgLower.includes('nao tenho') || userMsgLower.includes('particular') || userMsgLower.includes('não tenho convênio') || userMsgLower.includes('sim, tenho'))) {
                            // Se disse "sim, tenho" mas não mencionou convênio específico, procurar na próxima mensagem
                            if (userMsgLower.includes('sim, tenho')) {
                                // Não definir ainda, aguardar próxima mensagem
                            } else {
                                extractedConvenio = 'Particular'
                            }
                        }
                    }
                    
                    // Extrair NÚMERO DA CARTEIRINHA
                    if (!extractedNumeroConvenio || extractedNumeroConvenio.trim().length === 0) {
                        // Procurar número após mencionar convênio ou carteirinha
                        const carteirinhaPattern = userMsg.match(/(?:carteirinha|número|numero).*?(\d{4,})/i)
                        if (carteirinhaPattern) {
                            extractedNumeroConvenio = carteirinhaPattern[1]
                        }
                        // Ou número simples se já mencionou convênio e bot perguntou sobre carteirinha
                        else if (extractedConvenio && extractedConvenio !== 'Particular' && (lastBotMsg.includes('carteirinha') || lastBotMsg.includes('número') || lastBotMsg.includes('numero'))) {
                            const numeroPattern = userMsg.match(/(\d{4,})/)
                            if (numeroPattern) extractedNumeroConvenio = numeroPattern[1]
                        }
                        // Ou se é apenas números e bot perguntou sobre carteirinha
                        else if (userMsg.match(/^\d+$/) && (lastBotMsg.includes('carteirinha') || lastBotMsg.includes('número') || lastBotMsg.includes('numero'))) {
                            extractedNumeroConvenio = userMsg
                        }
                    }
                }
                
                console.log(`🔍 [DEBUG] Dados extraídos do histórico:`, {
                    nome: extractedNome || 'não encontrado',
                    cpf: extractedCpf ? '***' + extractedCpf.slice(-4) : 'não encontrado',
                    email: extractedEmail || 'não encontrado',
                    nascimento: extractedNascimento || 'não encontrado',
                    convenio: extractedConvenio || 'não encontrado',
                    numero_convenio: extractedNumeroConvenio || 'não encontrado'
                })
                
                // Atualizar entities com dados extraídos (garantir que entities existe)
                if (!response.entities) {
                    response.entities = {}
                }
                
                if (extractedNome) {
                    response.entities.nome = extractedNome
                    console.log(`✅ [DEBUG] Nome atualizado nas entities: ${extractedNome}`)
                }
                if (extractedCpf) {
                    response.entities.cpf = extractedCpf
                    console.log(`✅ [DEBUG] CPF atualizado nas entities: ***${extractedCpf.slice(-4)}`)
                }
                if (extractedEmail) {
                    response.entities.email = extractedEmail
                    console.log(`✅ [DEBUG] Email atualizado nas entities: ${extractedEmail}`)
                }
                if (extractedNascimento) {
                    response.entities.nascimento = extractedNascimento
                    console.log(`✅ [DEBUG] Nascimento atualizado nas entities: ${extractedNascimento}`)
                }
                if (extractedConvenio) {
                    response.entities.convenio = extractedConvenio
                    console.log(`✅ [DEBUG] Convênio atualizado nas entities: ${extractedConvenio}`)
                }
                if (extractedNumeroConvenio) {
                    response.entities.numero_convenio = extractedNumeroConvenio
                    console.log(`✅ [DEBUG] Número convênio atualizado nas entities: ${extractedNumeroConvenio}`)
                }
                
                console.log(`📋 [DEBUG] Entities FINAL após extração:`, JSON.stringify(response.entities, null, 2))
                
                // Verificar se todos os dados foram coletados
                const hasNome = (response.entities.nome && response.entities.nome.trim().length > 0) || false
                const hasCpf = (response.entities.cpf && response.entities.cpf.trim().length > 0) || false
                const hasEmail = (response.entities.email && response.entities.email.trim().length > 0) || false
                const hasNascimento = (response.entities.nascimento && response.entities.nascimento.trim().length > 0) || false
                
                // Verificar se tem convênio OU se respondeu que não tem
                const hasConvenio = response.entities.convenio && response.entities.convenio.trim().length > 0
                const hasNumeroConvenio = response.entities.numero_convenio && response.entities.numero_convenio.trim().length > 0
                const convenioCompleto = !hasConvenio || (hasConvenio && (response.entities.convenio.toLowerCase().includes('não') || response.entities.convenio.toLowerCase().includes('nao') || response.entities.convenio.toLowerCase().includes('particular') || hasNumeroConvenio))
                
                const todosDadosColetados = hasNome && hasCpf && hasEmail && hasNascimento && convenioCompleto
                
                if (todosDadosColetados) {
                    console.log(`✅ [DEBUG] ✅✅✅ TODOS OS DADOS COLETADOS! Mudando ACTION para transfer_human`)
                    console.log(`📋 [DEBUG] Dados coletados:`, {
                        nome: hasNome ? '✅' : '❌',
                        cpf: hasCpf ? '✅' : '❌',
                        email: hasEmail ? '✅' : '❌',
                        nascimento: hasNascimento ? '✅' : '❌',
                        convenio: convenioCompleto ? '✅' : '❌'
                    })
                    response.action = 'transfer_human'
                    
                    // Garantir que a mensagem final seja enviada
                    if (!response.message || !response.message.includes('Cadastro completo')) {
                        const nome = response.entities.nome || 'Paciente'
                        const temConvenio = hasConvenio && response.entities.convenio && !response.entities.convenio.toLowerCase().includes('não') && !response.entities.convenio.toLowerCase().includes('nao') && !response.entities.convenio.toLowerCase().includes('particular')
                        
                        response.message = `Cadastro completo, ${nome}! ✅\n\n`
                        
                        // Buscar procedimentos reais cobertos pelo convênio
                        if (temConvenio && response.entities.convenio) {
                            try {
                                const { prismaClinicDataService } = await import('./prismaClinicDataService.js')
                                const prisma = (await import('../prisma/client.js')).default
                                
                                // Normalizar código do convênio (buscar pelo nome ou código)
                                let insuranceCode = response.entities.convenio.toUpperCase()
                                const insurance = await prisma.insuranceCompany.findFirst({
                                    where: {
                                        OR: [
                                            { code: insuranceCode },
                                            { name: { contains: response.entities.convenio, mode: 'insensitive' } },
                                            { displayName: { contains: response.entities.convenio, mode: 'insensitive' } }
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
                                            response.message += `Com seu convênio ${insurance.displayName || response.entities.convenio}, você tem cobertura para: ${procedureNames.join(', ')}.\n\n`
                                        } else {
                                            response.message += `Com seu convênio ${insurance.displayName || response.entities.convenio}, você tem cobertura para vários procedimentos.\n\n`
                                        }
                                    } else {
                                        // Fallback se não encontrar procedimentos específicos
                                        response.message += `Com seu convênio ${insurance.displayName || response.entities.convenio}, você tem cobertura para: Fisioterapia, Acupuntura, RPG, Pilates e Ortopedista.\n\n`
                                    }
                                } else {
                                    // Fallback se não encontrar convênio
                                    response.message += `Com seu convênio ${response.entities.convenio}, você tem cobertura para: Fisioterapia, Acupuntura, RPG, Pilates e Ortopedista.\n\n`
                                }
                            } catch (error) {
                                console.warn('⚠️ Erro ao buscar procedimentos do convênio:', error)
                                // Fallback se houver erro
                                response.message += `Com seu convênio ${response.entities.convenio}, você tem cobertura para: Fisioterapia, Acupuntura, RPG, Pilates e Ortopedista.\n\n`
                            }
                        } else {
                            response.message += `Temos várias opções de procedimentos e pacotes com desconto!\n\n`
                        }
                        response.message += `Em breve um atendente vai te atender para finalizar o agendamento. 😊`
                    }
                    
                    console.log(`📋 [DEBUG] Entities ANTES de retornar (transfer_human):`, JSON.stringify(response.entities, null, 2))
                } else {
                    console.log(`📋 [DEBUG] Ainda faltam dados. Continuando coleta...`)
                    console.log(`📋 [DEBUG] Status:`, {
                        nome: hasNome ? '✅' : '❌',
                        cpf: hasCpf ? '✅' : '❌',
                        email: hasEmail ? '✅' : '❌',
                        nascimento: hasNascimento ? '✅' : '❌',
                        convenio: convenioCompleto ? '✅' : '❌'
                    })
                }
            }
            
            console.log(`🎯 [DEBUG] ACTION final após validação: "${response.action}"`)
            console.log(`🎯 [DEBUG] INTENT final após validação: "${response.intent}"`)
            console.log(`📋 [DEBUG] ENTITIES FINAL retornadas:`, JSON.stringify(response.entities || {}, null, 2))

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
