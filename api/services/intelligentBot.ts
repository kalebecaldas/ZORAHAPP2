import OpenAI from 'openai'
import { z } from 'zod'
import { prismaClinicDataService } from './prismaClinicDataService.js'
import { type Procedure, type InsuranceCompany, type ClinicLocation } from '../data/clinicData.js'
import { responseCacheService } from './responseCache.js'
import { simpleFallbacksService } from './simpleFallbacks.js'
import { costMonitoringService } from './costMonitoring.js'
import { workflowEngine } from './workflowEngine.js'

const aiResponseSchema = z.object({
  intent: z.string().optional(),
  sentiment: z.enum(['positive', 'negative', 'neutral']).optional(),
  responseStyle: z.enum(['consultive', 'educational', 'empathetic', 'sales', 'direct']).optional(),
  response: z.string(),
  confidence: z.number().min(0).max(1),
  suggestedAction: z.enum(['continue', 'transfer_human', 'schedule_appointment', 'provide_info', 'collect_data']).optional(),
  context: z.object({
    patientIdentified: z.boolean().optional(),
    procedureMentioned: z.string().optional(),
    insuranceMentioned: z.string().optional(),
    locationMentioned: z.string().optional(),
    schedulingIntent: z.boolean().optional(),
    pricingIntent: z.boolean().optional(),
    informationIntent: z.boolean().optional(),
  }).optional()
})

export type AIResponse = z.infer<typeof aiResponseSchema>

export type AIContext = {
  patient?: {
    id?: string
    name?: string
    phone: string
    insuranceCompany?: string
    preferences?: Record<string, any>
    registrationComplete?: boolean
  }
  history: Array<{
    role: 'user' | 'assistant'
    content: string
    timestamp: string
    intent?: string
    sentiment?: string
  }>
  clinicData: {
    name: string
    address: string
    phone: string
    procedures: Procedure[]
    insuranceCompanies: InsuranceCompany[]
    locations: ClinicLocation[]
  }
  currentIntent?: string
  sentimentTrend?: 'positive' | 'negative' | 'neutral'
  conversationStage?: 'greeting' | 'identification' | 'procedure_selection' | 'scheduling' | 'confirmation' | 'completion'
  workflowContext?: {
    currentNode?: string
    collectedData?: Record<string, any>
    scheduledProcedures?: string[]
    preferredLocation?: string
    preferredDate?: string
    preferredTime?: string
  }
}

export class IntelligentBotService {
  private openai: OpenAI
  private model: string
  private timeout: number
  private context: Map<string, AIContext>

  constructor(apiKey: string, model = 'gpt-4o', timeout = 20000) {
    console.log('🔑 IntelligentBotService constructor - API Key present:', !!apiKey, 'Key length:', apiKey?.length)
    if (!apiKey) {
      console.error('❌ No OpenAI API key provided to IntelligentBotService')
    }
    this.openai = new OpenAI({ apiKey })
    this.model = model
    this.timeout = timeout
    this.context = new Map()
  }

  async processMessage(
    message: string,
    phone: string,
    conversationId: string,
    existingContext?: Partial<AIContext>
  ): Promise<AIResponse> {
    // 1. Try workflows first (prioridade máxima)
    try {
      const workflowContext = {
        message,
        intent: existingContext?.currentIntent,
        entities: {},
        patient: existingContext?.patient,
        conversation: { id: conversationId, phone },
        variables: existingContext?.workflowContext?.collectedData || {}
      }
      
      const matchingWorkflow = await workflowEngine.findMatchingWorkflow(workflowContext)
      if (matchingWorkflow) {
        console.log(`🔄 [Workflow] Executando workflow: ${matchingWorkflow.name}`)
        const workflowResult = await workflowEngine.executeWorkflow(matchingWorkflow, workflowContext)
        
        if (workflowResult.success && workflowResult.message) {
          return {
            response: workflowResult.message,
            confidence: 0.95,
            suggestedAction: workflowResult.action === 'transfer' ? 'transfer_human' : 'continue',
            context: {
              patientIdentified: !!existingContext?.patient?.id,
              schedulingIntent: workflowResult.action === 'collect_data',
              pricingIntent: false,
              informationIntent: true
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ [Workflow] Erro ao executar workflow:', error)
      // Continua para os fallbacks se workflow falhar
    }
    
    // 2. Try simple fallbacks (economia de 10-15%)
    const fallbackResponse = await simpleFallbacksService.tryFallback(message, existingContext?.workflowContext?.preferredLocation)
    if (fallbackResponse) {
      console.log(`🎯 [Fallbacks] Resposta gerada sem GPT!`)
      return {
        response: fallbackResponse.response,
        confidence: fallbackResponse.confidence,
        suggestedAction: 'continue',
        context: {
          patientIdentified: false,
          schedulingIntent: false,
          pricingIntent: false,
          informationIntent: true
        }
      }
    }

    // Check cache (economia de 30-40%)
    const cachedResponse = await responseCacheService.get(message, existingContext?.workflowContext?.preferredLocation)
    if (cachedResponse) {
      console.log(`💾 [Cache] Resposta encontrada no cache, economizando chamada GPT!`)
      return {
        response: cachedResponse,
        confidence: 0.95,
        suggestedAction: 'continue',
        context: {
          patientIdentified: false,
          schedulingIntent: false,
          pricingIntent: false,
          informationIntent: true
        }
      }
    }

    // Get or create context for this conversation
    let context = this.context.get(conversationId)
    if (!context) {
      context = await this.buildInitialContext(phone, existingContext)
      this.context.set(conversationId, context)
    }

    // Update conversation history
    context.history.push({
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    })

    // Analyze message intent and extract entities
    const analysis = await this.analyzeMessage(message, context)

    // ✅ Se detectou procedimento não atendido, responder direto (sem chamar GPT)
    if (analysis.unavailableProcedure) {
      console.log(`⚠️ Procedimento não atendido detectado: ${analysis.unavailableProcedure}`)
      return await this.handleUnavailableProcedure(analysis.unavailableProcedure, context)
    }

    // Build context-aware prompt
    const systemPrompt = await this.buildIntelligentSystemPrompt(context, analysis)

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.timeout)
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...context.history.slice(-8).map(h => ({
            role: h.role as 'user' | 'assistant',
            content: h.content
          })),
          { role: 'user', content: message }
        ],
        max_tokens: parseInt(process.env.GPT_MAX_TOKENS_CONVERSATION || '400'), // Reduzido de 800 para 400 (economia de 50%)
        temperature: 0.7,
        // signal for abort timeout
        signal: controller.signal
      } as any)
      clearTimeout(timeoutId)

      // Monitorar custos
      const usage = completion.usage
      if (usage) {
        costMonitoringService.logUsage({
          model: this.model,
          inputTokens: usage.prompt_tokens || 0,
          outputTokens: usage.completion_tokens || 0,
          service: 'IntelligentBot'
        })
      }

      const response = completion.choices[0]?.message?.content || ''

      // Parse response for structured data
      const parsedResponse = this.parseIntelligentAIResponse(response, analysis)

      // Update context with new information
      this.applyAnalysisToContext(context, analysis, parsedResponse)

      // Add assistant response to history
      context.history.push({
        role: 'assistant',
        content: parsedResponse.response,
        timestamp: new Date().toISOString(),
        intent: parsedResponse.intent,
        sentiment: parsedResponse.sentiment
      })

      return aiResponseSchema.parse({
        ...parsedResponse,
        confidence: 0.85,
      })
    } catch (error) {
      console.error('Erro ao gerar resposta IA inteligente:', error)

      // Fallback response based on context
      const fallbackResponse = this.generateFallbackResponse(context, analysis)

      return {
        response: fallbackResponse,
        confidence: 0.4,
        suggestedAction: 'transfer_human',
        context: {
          patientIdentified: !!context.patient?.name,
          procedureMentioned: analysis.procedureMentioned,
          insuranceMentioned: analysis.insuranceMentioned,
          locationMentioned: analysis.locationMentioned,
          schedulingIntent: analysis.schedulingIntent,
          pricingIntent: analysis.pricingIntent,
          informationIntent: analysis.informationIntent
        }
      }
    }
  }

  private async buildInitialContext(
    phone: string,
    existingContext?: Partial<AIContext>
  ): Promise<AIContext> {
    // Buscar dados das clínicas do banco
    const locations = await prismaClinicDataService.getLocations() as any
    const mainLocation = locations[0] || {
      name: 'Clínica IAAM',
      address: 'Endereço não cadastrado',
      phone: 'Telefone não cadastrado'
    }

    const baseContext: AIContext = {
      patient: {
        phone,
        ...existingContext?.patient
      },
      history: existingContext?.history || [],
      clinicData: {
        name: mainLocation.name || 'Clínica IAAM',
        address: mainLocation.address || 'Endereço não cadastrado',
        phone: mainLocation.phone || 'Telefone não cadastrado',
        procedures: this.filterProceduresForDisplay(await prismaClinicDataService.getProcedures()) as any,
        insuranceCompanies: await prismaClinicDataService.getInsuranceCompanies() as any,
        locations: locations
      },
      currentIntent: existingContext?.currentIntent,
      sentimentTrend: existingContext?.sentimentTrend,
      conversationStage: existingContext?.conversationStage || 'greeting',
      workflowContext: existingContext?.workflowContext || {
        collectedData: {},
        scheduledProcedures: []
      }
    }

    return baseContext
  }

  private async analyzeMessage(message: string, context: AIContext): Promise<any> {
    const lowerMessage = message.toLowerCase()

    // Extract entities and intents
    const iaam = await this.interpretIntentIAAM(message)
    
    // ✅ Detectar procedimentos não atendidos (async agora)
    const unavailableProcedure = await this.detectUnavailableProcedure(message)
    
    const analysis = {
      intent: await this.classifyIntent(message),
      sentiment: await this.analyzeSentiment(message),
      schedulingIntent: this.detectSchedulingIntent(lowerMessage),
      pricingIntent: this.detectPricingIntent(lowerMessage),
      informationIntent: this.detectInformationIntent(lowerMessage),
      procedureMentioned: await this.detectProcedureMention(message),
      unavailableProcedure, // ✅ Detectar procedimentos não atendidos (dinâmico)
      insuranceMentioned: await this.detectInsuranceMention(message),
      locationMentioned: await this.detectLocationMention(message),
      greetingDetected: this.detectGreeting(lowerMessage),
      complaintDetected: this.detectComplaint(lowerMessage),
      urgencyDetected: this.detectUrgency(lowerMessage),
      iaamIntent: iaam.intencao,
      interpretedText: iaam.textoInterpretado
    }

    return analysis
  }

  private async buildIntelligentSystemPrompt(context: AIContext, analysis: any): Promise<string> {
    const patientInfo = context.patient?.name
      ? `Paciente: ${context.patient.name} (${context.patient.phone})`
      : `Novo paciente: ${context.patient?.phone}`

    const insuranceInfo = context.patient?.insuranceCompany
      ? `Convênio: ${context.patient.insuranceCompany}`
      : 'Convênio: não informado'

    // Get relevant procedures and pricing (passar locationMentioned para usar valores corretos)
    const relevantProcedures = await this.getRelevantProcedures(analysis.procedureMentioned, context.patient?.insuranceCompany, analysis.locationMentioned)
    const pricingInfo = await this.getPricingInformation(relevantProcedures, context.patient?.insuranceCompany, analysis.locationMentioned)

    // Get location information
    const locationInfo = await this.getLocationInformation(analysis.locationMentioned)

    // Determine conversation stage and appropriate response
    const stageGuidance = this.getStageGuidance(context.conversationStage, analysis)

    return `Você é um assistente virtual inteligente da Clínica de Fisioterapia. Seja cordial, profissional e extremamente útil.

${patientInfo}
${insuranceInfo}

🏥 INFORMAÇÕES DA CLÍNICA:
Nome: ${context.clinicData.name}
Endereço: ${context.clinicData.address}
Telefone: ${context.clinicData.phone}

💰 PROCEDIMENTOS E VALORES:
${relevantProcedures}

${pricingInfo}

📍 LOCAIS DE ATENDIMENTO:
${locationInfo}

🎯 ANÁLISE DA MENSAGEM:
- Intenção: ${analysis.iaamIntent || analysis.intent}
- Sentimento: ${analysis.sentiment}
- Detectou agendamento: ${analysis.schedulingIntent}
- Detectou preços: ${analysis.pricingIntent}
- Detectou informações: ${analysis.informationIntent}
- Procedimento mencionado: ${analysis.procedureMentioned || 'nenhum'}
- Convênio mencionado: ${analysis.insuranceMentioned || 'nenhum'}
- Local mencionado: ${analysis.locationMentioned || 'nenhum'}

${stageGuidance}

⚠️ REGRAS CRÍTICAS:
1. SEMPRE verifique o convênio do paciente antes de informar preços
2. Para procedimentos como fisioterapia pélvica e acupuntura, é necessária avaliação primeiro
3. Se o paciente quiser apenas uma sessão, cobre a avaliação. Se pagar pacote de 10 sessões, dê desconto na avaliação
4. SEMPRE ofereça agendamento após esclarecer dúvidas
5. Se não souber responder ou detectar urgência/reclamação, transfira para atendente humano IMEDIATAMENTE
6. Para agendamentos, sempre confirme: procedimento, local, data e horário
7. Se detectar insatisfação ou confusão, ofereça falar com humano

🤖 INSTRUÇÕES DE RESPOSTA:
- Seja objetivo mas completo
- Use linguagem clara e acessível
- Antecipe próximas perguntas
- Ofereça opções quando apropriado
- Mostre empatia e compreensão
- Seja proativo em ajudar

RESPOSTA DEVE INCLUIR:
INTENÇÃO: [intenção detectada]
SENTIMENTO: [sentimento detectado]
AÇÃO: [continue|transfer_human|schedule_appointment|provide_info|collect_data]

Contexto atual: ${context.conversationStage}`
  }

  private async getRelevantProcedures(procedureMentioned: string | null, insuranceCompany?: string, locationCode?: string): Promise<string> {
    // ✅ Se está perguntando sobre valores, verificar se tem unidade
    // Se não tiver, retornar instrução para perguntar
    const needsPricing = true // Sempre mostra preços em getRelevantProcedures
    
    if (needsPricing && !locationCode) {
      const allProcs = await prismaClinicDataService.getProcedures()
      const mainProcs = this.filterProceduresForDisplay(allProcs)
      
      return `⚠️ ATENÇÃO: Valores variam por unidade. Você DEVE perguntar a unidade primeiro antes de informar valores.
      
Procedimentos gerais disponíveis (valores não informados - pergunte unidade primeiro):
${mainProcs.slice(0, 5).map(p => `- ${p.name}: ${p.description}`).join('\n')}`
    }
    
    if (procedureMentioned) {
      const procedure = await prismaClinicDataService.getProcedureById(procedureMentioned)
      if (procedure) {
        const priceInfo = await prismaClinicDataService.calculatePrice(procedureMentioned, insuranceCompany, locationCode)
        return `${procedure.name} (unidade: ${locationCode || 'não especificada'}): ${procedure.description}\n` +
          `Preço: R$ ${priceInfo?.patientPays || procedure.basePrice}\n` +
          `Duração: ${procedure.duration} minutos`
      }
    }

    // Return top 5 procedures with prices from specific location
    const allProcedures = await prismaClinicDataService.getProcedures()
    const mainProcedures = this.filterProceduresForDisplay(allProcedures)
    const topProcedures = mainProcedures.slice(0, 5)

    const proceduresList = await Promise.all(topProcedures.map(async p => {
      const priceInfo = await prismaClinicDataService.calculatePrice(p.id, insuranceCompany, locationCode)
      return `${p.name}: R$ ${priceInfo?.patientPays || p.basePrice} (${p.duration}min)`
    }))

    return proceduresList.join('\n')
  }

  private async getPricingInformation(procedures: any, insuranceCompany?: string, locationCode?: string): Promise<string> {
    // ✅ Verificar se tem unidade quando é necessário informar valores
    if (!locationCode) {
      return `⚠️ ATENÇÃO: Não informe valores específicos ainda. Pergunte a unidade primeiro.`
    }
    
    if (insuranceCompany) {
      const insurances = await prismaClinicDataService.getInsuranceCompanies()
      const insurance = insurances.find(i => i.id === insuranceCompany)
      if (insurance) {
        return `💳 INFORMAÇÕES DO CONVÊNIO ${insurance.displayName}:\n` +
          `Cobertura: ${insurance.coveragePercentage}%\n` +
          `Coparticipação: R$ ${insurance.copayment}\n` +
          `Pré-autorização: ${insurance.requiresPreAuthorization ? 'Sim' : 'Não'}`
      }
    }

    return `💰 PREÇOS ESPECIAIS (unidade: ${locationCode}):\n` +
      `• Pacote de 10 sessões: 10% de desconto + avaliação grátis\n` +
      `• Pacote de 5 sessões: 5% de desconto\n` +
      `• Primeira avaliação: R$ 100 (necessária para alguns procedimentos)`
  }

  private async getLocationInformation(locationMentioned: string | null): Promise<string> {
    const locations = await prismaClinicDataService.getLocations()

    if (locationMentioned) {
      const location = locations.find(l => l.id === locationMentioned)
      if (location) {
        const hours = Object.entries(location.openingHours).map(([day, hours]) => `${day}: ${hours}`).join(', ')
        const mapLine = location.mapUrl ? `\n🗺️ Como chegar: ${location.mapUrl}` : ''
        return `${location.name}:\n` +
          `📍 ${location.address}, ${location.neighborhood}\n` +
          `📞 ${location.phone}\n` +
          `🕐 ${hours}${mapLine}`
      }
    }

    return locations.map(location => {
      const mapLine = location.mapUrl ? `\n🗺️ Como chegar: ${location.mapUrl}` : ''
      return `${location.name}:\n` +
        `📍 ${location.address}, ${location.neighborhood}\n` +
        `📞 ${location.phone}${mapLine}`
    }).join('\n\n')
  }

  private getStageGuidance(stage: string, analysis: any): string {
    switch (stage) {
      case 'greeting':
        return `🎯 ESTÁGIO: Saudação\n` +
          `Objetivo: Identificar paciente e entender necessidade\n` +
          `Próximos passos: Coletar telefone, identificar procedimento de interesse`

      case 'identification':
        return `🎯 ESTÁGIO: Identificação\n` +
          `Objetivo: Confirmar identidade do paciente\n` +
          `Próximos passos: Verificar cadastro, oferecer procedimentos baseados no convênio`

      case 'procedure_selection':
        return `🎯 ESTÁGIO: Seleção de Procedimento\n` +
          `Objetivo: Ajuda paciente a escolher procedimento adequado\n` +
          `Próximos passos: Fornecer informações sobre procedimentos, preços, agendar`

      case 'scheduling':
        return `🎯 ESTÁGIO: Agendamento\n` +
          `Objetivo: Marcar consulta\n` +
          `Próximos passos: Confirmar local, data, horário, procedimento`

      default:
        return `🎯 ESTÁGIO: Geral\n` +
          `Objetivo: Ajudar paciente com sua necessidade\n` +
          `Ação: Fornecer informação relevante ou oferecer agendamento`
    }
  }

  private async classifyIntent(message: string): Promise<string> {
    const intents = [
      'agendamento',
      'preço',
      'informação',
      'reclamação',
      'saudação',
      'follow-up',
      'urgência',
      'cancelamento',
      'confirmação',
      'outro'
    ]

    try {
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `Você é um classificador de intenções para clínica de fisioterapia. 
                     Classifique a mensagem em uma dessas categorias: ${intents.join(', ')}.
                     Considere contexto de saúde, fisioterapia, agendamentos.
                     Responda apenas com a categoria.`,
          },
          { role: 'user', content: message },
        ],
        max_tokens: 10,
        temperature: 0.1,
      })

      const response = completion.choices[0]?.message?.content?.trim().toLowerCase() || 'outro'
      return intents.includes(response) ? response : 'outro'
    } catch (error) {
      console.error('Erro ao classificar intenção:', error)
      return 'outro'
    }
  }

  private async interpretIntentIAAM(message: string): Promise<{ intencao: 'LOCALIZACAO' | 'CONVENIOS' | 'CONVENIO_PROCEDIMENTOS' | 'VALOR_PARTICULAR' | 'INFO_PROCEDIMENTO' | 'FAQ' | 'AGENDAR' | 'REAGENDAR' | 'CANCELAR', textoInterpretado: string }> {
    const intents = ['LOCALIZACAO','CONVENIOS','CONVENIO_PROCEDIMENTOS','VALOR_PARTICULAR','INFO_PROCEDIMENTO','FAQ','AGENDAR','REAGENDAR','CANCELAR'] as const
    const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    const fixTypos = (s: string) => {
      let t = s
      t = t.replace(/\b(gendar|ajendar|agnda|aje\s*nda)\b/gi, 'agendar')
      t = t.replace(/\b(reagnda|remaracr|reagendar|remarcar)\b/gi, 'reagendar')
      t = t.replace(/\b(desmacar|desmaracr|desmarcar)\b/gi, 'cancelar')
      t = t.replace(/\b(ond\s*f\s*ica|ond\s*fica|onde\s*f\s*ica)\b/gi, 'onde fica')
      t = t.replace(/\b(valro|valr)\b/gi, 'valor')
      t = t.replace(/\bacupuntra\b/gi, 'acupuntura')
      return t
    }
    const clean = (s: string) => fixTypos(s).replace(/\s+/g, ' ').trim()
    const msg = clean(message)
    const nmsg = normalize(msg)
    const hasAny = (arr: string[]) => arr.some(k => nmsg.includes(normalize(k)))
    const trg = {
      LOCALIZACAO: ['onde fica','local','endereco','como chegar','perto de','localizacao','qual o endereco','manda a localizacao','mapa'],
      CONVENIOS: ['convenio','plano','aceita meu plano','aceita','atende'],
      CONVENIO_PROCEDIMENTOS: ['cobre','cobertura','procedimentos do convenio','plano cobre','cobre acupuntura'],
      VALOR_PARTICULAR: ['valor','preco','quanto custa','particular','pacote','preco do procedimento'],
      INFO_PROCEDIMENTO: ['o que e','pra que serve','beneficio','explica','quero saber mais','descricao','o que faz'],
      AGENDAR: ['agendar','marcar','agenda ai','quero horario','quero agendar hoje','marcar consulta','agnd','aje dar'],
      REAGENDAR: ['remarcar','reagendar','mudar horario','trocar horario','reagnda','mudar consulta'],
      CANCELAR: ['cancelar','desmarcar','cancela ai','remover agendamento','nao quero mais']
    }
    const pick = (): typeof intents[number] => {
      if (hasAny(trg.CANCELAR)) return 'CANCELAR'
      if (hasAny(trg.REAGENDAR)) return 'REAGENDAR'
      if (hasAny(trg.AGENDAR)) return 'AGENDAR'
      if (hasAny(trg.LOCALIZACAO)) return 'LOCALIZACAO'
      if (hasAny(trg.CONVENIO_PROCEDIMENTOS)) return 'CONVENIO_PROCEDIMENTOS'
      if (hasAny(trg.CONVENIOS)) return 'CONVENIOS'
      if (hasAny(trg.VALOR_PARTICULAR)) return 'VALOR_PARTICULAR'
      if (hasAny(trg.INFO_PROCEDIMENTO)) return 'INFO_PROCEDIMENTO'
      return 'FAQ'
    }
    try {
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `Você é o interpretador oficial de intenções do Assistente Virtual das Clínicas IAAM.
Seu trabalho é identificar com precisão a intenção do paciente, mesmo com erros, gírias, abreviações ou palavras incompletas.
Considere que o paciente já escolheu uma unidade que possui endereço, convênios, procedimentos cobertos, valores particulares, pacotes e descrição/benefícios.
Retorne sempre apenas JSON com as chaves: {"intencao","textoInterpretado"}. Os valores de "intencao" devem ser exatamente um destes: LOCALIZACAO, CONVENIOS, CONVENIO_PROCEDIMENTOS, VALOR_PARTICULAR, INFO_PROCEDIMENTO, FAQ, AGENDAR, REAGENDAR, CANCELAR.
Corrija mentalmente o texto antes de interpretar.`
          },
          { role: 'user', content: msg }
        ],
        max_tokens: 60,
        temperature: 0,
      }, { timeout: this.timeout })
      const raw = completion.choices[0]?.message?.content?.trim() || ''
      let parsed: any = {}
      try { parsed = JSON.parse(raw) } catch { parsed = {} }
      const intent = typeof parsed.intencao === 'string' && intents.includes(parsed.intencao as any) ? parsed.intencao as any : pick()
      const texto = typeof parsed.textoInterpretado === 'string' && parsed.textoInterpretado.trim() ? clean(parsed.textoInterpretado) : msg
      return { intencao: intent, textoInterpretado: texto }
    } catch {
      const intent = pick()
      return { intencao: intent, textoInterpretado: msg }
    }
  }

  private async analyzeSentiment(message: string): Promise<'positive' | 'negative' | 'neutral'> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'Analise o sentimento da mensagem no contexto de atendimento médico. Responda apenas com: positive, negative ou neutral',
          },
          { role: 'user', content: message },
        ],
        max_tokens: 10,
        temperature: 0.1,
      })

      const response = completion.choices[0]?.message?.content?.trim().toLowerCase() || 'neutral'

      if (['positive', 'negative', 'neutral'].includes(response)) {
        return response as any
      }

      return 'neutral'
    } catch (error) {
      console.error('Erro ao analisar sentimento:', error)
      return 'neutral'
    }
  }

  private detectSchedulingIntent(message: string): boolean {
    const schedulingKeywords = [
      'agendar', 'marcar', 'horário', 'hora', 'consulta', 'sessão',
      'quando', 'data', 'dia', 'semana', 'disponível', 'vaga'
    ]
    return schedulingKeywords.some(keyword => message.includes(keyword))
  }

  private detectPricingIntent(message: string): boolean {
    const pricingKeywords = [
      'preço', 'valor', 'custa', 'quanto', 'dinheiro', 'pagamento',
      'pacote', 'desconto', 'promoção', 'parcelar', 'convênio'
    ]
    return pricingKeywords.some(keyword => message.includes(keyword))
  }

  private detectInformationIntent(message: string): boolean {
    const infoKeywords = [
      'informação', 'informações', 'sabe', 'como', 'onde', 'qual',
      'procedimento', 'tratamento', 'terapia', 'fisioterapia'
    ]
    return infoKeywords.some(keyword => message.includes(keyword))
  }

  private async detectProcedureMention(message: string): Promise<string | null> {
    const procedures = await prismaClinicDataService.getProcedures()
    const lowerMessage = message.toLowerCase()

    for (const procedure of procedures) {
      if (lowerMessage.includes(procedure.name.toLowerCase()) ||
        procedure.name.toLowerCase().includes(lowerMessage)) {
        return procedure.id
      }
    }

    return null
  }

  /**
   * Detecta se a mensagem é uma pergunta sobre se atendemos algum procedimento
   */
  private isProcedureInquiry(message: string): boolean {
    const lowerMessage = message.toLowerCase()
    
    const inquiryPatterns = [
      'atendem', 'atende', 'fazem', 'faz', 'tem ',
      'oferece', 'oferecem', 'trabalham com', 'trabalha com',
      'realizam', 'realiza', 'disponibiliza', 'disponibilizam',
      'presta', 'prestam', 'consulta de', 'sessao de',
      'tratamento de', 'terapia'
    ]
    
    return inquiryPatterns.some(pattern => lowerMessage.includes(pattern))
  }

  /**
   * Detecta menção a procedimentos que NÃO atendemos
   * Inclui lista hardcoded + detecção dinâmica
   */
  private async detectUnavailableProcedure(message: string): Promise<string | null> {
    const lowerMessage = message.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove acentos

    // 1. Lista hardcoded de procedimentos conhecidos que NÃO atendemos
    const unavailableProcedures: Record<string, string[]> = {
      'Terapia Ocupacional': ['terapia ocupacional', 'to ', 't.o', 't.o.', 'terapeuta ocupacional'],
      'Psicologia': ['psicologo', 'psicologa', 'psicologia', 'psicoterapeuta', 'psicoterapia'],
      'Nutrição': ['nutricao', 'nutricionista', 'nutri'],
      'Fonoaudiologia': ['fonoaudiologo', 'fonoaudiologa', 'fonoaudiologia', 'fono'],
      'Quiropraxia': ['quiropraxia', 'quiroprata'],
      'Medicina': ['medico', 'consulta medica', 'ortopedista', 'neurologista', 'clinico geral'],
      'Odontologia': ['dentista', 'odontologia', 'odontologo'],
      'Massoterapia': ['massagem terapeutica', 'massoterapia', 'massoterapeuta'],
      'Estética': ['estetica', 'esteticista', 'procedimento estetico', 'botox', 'preenchimento']
    }

    // Verificar lista hardcoded primeiro
    for (const [procedureName, variants] of Object.entries(unavailableProcedures)) {
      for (const variant of variants) {
        const normalizedVariant = variant.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        if (lowerMessage.includes(normalizedVariant)) {
          return procedureName
        }
      }
    }

    // 2. Detecção dinâmica: verificar se é pergunta sobre procedimento
    if (!this.isProcedureInquiry(message)) {
      return null // Não é uma pergunta sobre procedimento
    }

    // 3. Verificar se o procedimento mencionado existe no banco de dados
    const procedures = await prismaClinicDataService.getProcedures()
    const procedureNames = procedures.map(p => p.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
    
    // Verificar se algum procedimento do banco está na mensagem
    const foundInDatabase = procedureNames.some(procName => {
      return lowerMessage.includes(procName) || procName.includes(lowerMessage.split(' ')[0])
    })

    // Se é pergunta sobre procedimento E não encontrou no banco, então não atendemos
    if (!foundInDatabase) {
      // Extrair o possível nome do procedimento da mensagem
      const extractedProcedure = this.extractProcedureName(message)
      return extractedProcedure || 'esse procedimento'
    }

    return null
  }

  /**
   * Tenta extrair o nome do procedimento da mensagem
   */
  private extractProcedureName(message: string): string | null {
    const lowerMessage = message.toLowerCase()
    
    // Padrões para extrair procedimento: "atendem X?", "fazem X?", etc.
    const patterns = [
      /atendem?\s+(.+?)[\?\.!]?$/i,
      /fazem?\s+(.+?)[\?\.!]?$/i,
      /tem\s+(.+?)[\?\.!]?$/i,
      /oferecem?\s+(.+?)[\?\.!]?$/i,
      /trabalham?\s+com\s+(.+?)[\?\.!]?$/i,
      /realizam?\s+(.+?)[\?\.!]?$/i
    ]
    
    for (const pattern of patterns) {
      const match = message.match(pattern)
      if (match && match[1]) {
        return match[1].trim()
      }
    }
    
    return null
  }

  /**
   * Filtra procedimentos para exibição, removendo avaliações que são parte de outros procedimentos
   */
  private filterProceduresForDisplay(procedures: any[]): any[] {
    return procedures.filter(p => {
      // ✅ Validação de segurança: verificar se procedimento e nome existem
      if (!p || !p.name || typeof p.name !== 'string') {
        console.warn('⚠️ Procedimento inválido encontrado:', p)
        return false
      }
      
      const name = p.name.toLowerCase()
      
      // ✅ Remover procedimentos que começam com "avaliação" 
      // pois são parte de outros procedimentos
      if (name.startsWith('avaliacao') || name.startsWith('avaliação')) {
        return false
      }
      
      return true
    })
  }

  /**
   * Responde quando um procedimento não atendido é mencionado
   */
  private async handleUnavailableProcedure(procedureName: string, context: AIContext): Promise<AIResponse> {
    // Buscar procedimentos relacionados que atendemos
    const allProcedures = await prismaClinicDataService.getProcedures()
    
    // ✅ Filtrar procedimentos principais (sem avaliações separadas)
    const mainProcedures = this.filterProceduresForDisplay(allProcedures)
    
    const suggestedProcedures = mainProcedures
      .filter(p => p.name.toLowerCase().includes('fisio') || 
                   p.name.toLowerCase().includes('pilates') ||
                   p.name.toLowerCase().includes('rpg') ||
                   p.name.toLowerCase().includes('acupuntura'))
      .slice(0, 5)
      .map(p => `• ${p.name}`)
      .join('\n')

    const response = `Entendo seu interesse em ${procedureName}! 😊

Infelizmente, não atendemos ${procedureName} na nossa clínica. Somos especializados em **Fisioterapia e tratamentos relacionados**.

📋 **Procedimentos que oferecemos:**
${suggestedProcedures}

Algum desses procedimentos te interessa? Posso te dar mais informações! 💙`

    return aiResponseSchema.parse({
      response,
      confidence: 0.95,
      intent: 'INFORMACAO',
      sentiment: 'neutral',
      suggestedAction: 'continue',
      context: {
        patientIdentified: !!context.patient?.name,
        procedureMentioned: null,
        insuranceMentioned: null,
        locationMentioned: null,
        schedulingIntent: false,
        pricingIntent: false,
        informationIntent: true
      }
    })
  }

  private async detectInsuranceMention(message: string): Promise<string | null> {
    const insuranceCompanies = await prismaClinicDataService.getInsuranceCompanies()
    const lowerMessage = message.toLowerCase()

    for (const insurance of insuranceCompanies) {
      if (lowerMessage.includes(insurance.name.toLowerCase()) ||
        lowerMessage.includes(insurance.displayName.toLowerCase())) {
        return insurance.id
      }
    }

    return null
  }

  private async detectLocationMention(message: string): Promise<string | null> {
    const locations = await prismaClinicDataService.getLocations()
    const lowerMessage = message.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove acentos

    // Mapeamento de sinônimos por unidade
    const synonyms: Record<string, string[]> = {
      'vieiralves': ['vieiralves', 'vieira alves', 'vieira', 'vieralves', 'viera', 'rua rio ica'],
      'sao_jose': ['sao jose', 'sao josé', 'são jose', 'são josé', 'sj', 'av sao jose', 'avenida sao jose']
    }

    // Verificar sinônimos primeiro
    for (const [locationKey, variants] of Object.entries(synonyms)) {
      for (const variant of variants) {
        const normalizedVariant = variant.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        if (lowerMessage.includes(normalizedVariant)) {
          // Encontrar a location pelo código ou nome
          const location = locations.find(l => 
            l.id.toLowerCase() === locationKey ||
            l.name.toLowerCase().includes(locationKey.replace('_', ' ')) ||
            l.neighborhood.toLowerCase().includes(locationKey.replace('_', ' '))
          )
          if (location) {
            return location.id
          }
        }
      }
    }

    // Fallback para detecção padrão
    for (const location of locations) {
      if (lowerMessage.includes(location.name.toLowerCase()) ||
        lowerMessage.includes(location.neighborhood.toLowerCase())) {
        return location.id
      }
    }

    return null
  }

  private detectGreeting(message: string): boolean {
    const greetingKeywords = ['olá', 'ola', 'oi', 'bom dia', 'boa tarde', 'boa noite']
    return greetingKeywords.some(keyword => message.includes(keyword))
  }

  private detectComplaint(message: string): boolean {
    const complaintKeywords = [
      'ruim', 'péssimo', 'horrível', 'terrível', 'insatisfeito', 'reclamação',
      'problema', 'erro', 'errado', 'demora', 'demorado', 'atraso'
    ]
    return complaintKeywords.some(keyword => message.includes(keyword))
  }

  private detectUrgency(message: string): boolean {
    const urgencyKeywords = [
      'urgente', 'emergência', 'emergencia', 'socorro', 'ajuda', 'grave',
      'piorando', 'piorou', 'muito mal', 'insuportável', 'insuportavel'
    ]
    return urgencyKeywords.some(keyword => message.includes(keyword))
  }

  private parseIntelligentAIResponse(response: string, analysis: any): Partial<AIResponse> {
    const intentMatch = response.match(/INTENÇÃO:\s*(.+)/i)
    const sentimentMatch = response.match(/SENTIMENTO:\s*(positive|negative|neutral)/i)
    const actionMatch = response.match(/AÇÃO:\s*(.+)/i)

    // Remove tags from response
    const cleanResponse = response
      .replace(/INTENÇÃO:.*\n?/gi, '')
      .replace(/SENTIMENTO:.*\n?/gi, '')
      .replace(/AÇÃO:.*\n?/gi, '')
      .trim()

    return {
      intent: intentMatch?.[1]?.trim() || analysis.iaamIntent || analysis.intent,
      sentiment: sentimentMatch?.[1] as any || analysis.sentiment,
      response: cleanResponse,
      suggestedAction: this.parseSuggestedAction(actionMatch?.[1]?.trim() || 'continue'),
      context: {
        patientIdentified: false,
        procedureMentioned: analysis.procedureMentioned,
        insuranceMentioned: analysis.insuranceMentioned,
        locationMentioned: analysis.locationMentioned,
        schedulingIntent: analysis.schedulingIntent,
        pricingIntent: analysis.pricingIntent,
        informationIntent: analysis.informationIntent
      }
    }
  }

  private parseSuggestedAction(action: string): 'continue' | 'transfer_human' | 'schedule_appointment' | 'provide_info' | 'collect_data' {
    const actionMap: Record<string, any> = {
      'transfer_human': 'transfer_human',
      'transferir': 'transfer_human',
      'agendar': 'schedule_appointment',
      'schedule': 'schedule_appointment',
      'informação': 'provide_info',
      'info': 'provide_info',
      'coletar': 'collect_data',
      'collect': 'collect_data'
    }

    return actionMap[action.toLowerCase()] || 'continue'
  }

  private applyAnalysisToContext(context: AIContext, analysis: any, response: Partial<AIResponse>): void {
    // Update patient information if detected
    if (analysis.insuranceMentioned && context.patient) {
      context.patient.insuranceCompany = analysis.insuranceMentioned
    }

    // Update conversation stage based on analysis and response
    if (response.suggestedAction === 'schedule_appointment') {
      context.conversationStage = 'scheduling'
    } else if (analysis.schedulingIntent && context.conversationStage === 'greeting') {
      context.conversationStage = 'procedure_selection'
    } else if (analysis.pricingIntent || analysis.informationIntent) {
      context.conversationStage = 'procedure_selection'
    }

    // Update intent and sentiment trends
    if (response.intent) {
      context.currentIntent = response.intent
    }
    if (response.sentiment) {
      context.sentimentTrend = response.sentiment
    }
  }

  private generateFallbackResponse(context: AIContext, analysis: any): string {
    if (analysis.urgencyDetected || analysis.complaintDetected) {
      return '⚠️ Entendo sua preocupação. Vou transferir você para um atendente humano. Por favor, aguarde.'
    }

    if (analysis.schedulingIntent) {
      return '🗓️ Vamos agendar sua consulta. Qual procedimento você gostaria de realizar?'
    }

    if (analysis.pricingIntent) {
      return '💰 Posso te ajudar com valores. Qual procedimento você tem interesse?'
    }

    if (analysis.informationIntent) {
      return 'ℹ️ Posso fornecer informações sobre nossos procedimentos. O que você gostaria de saber?'
    }

    return 'Desculpe, estou com dificuldades para processar sua mensagem. Deseja falar com um atendente humano?'
  }

  async sendMessage(params: { conversationId?: string; message: string; phone?: string; context?: Partial<AIContext> }): Promise<AIResponse> {
    const { conversationId, message, phone } = params
    if (conversationId && phone) {
      return await this.processMessage(message, phone, conversationId, params.context)
    }
    return {
      response: message,
      confidence: 1,
      suggestedAction: 'continue',
      context: {
        patientIdentified: false,
        schedulingIntent: false,
        pricingIntent: false,
        informationIntent: false
      }
    }
  }

  async generateResponse(params: { message: string; conversationId?: string; context?: Partial<AIContext> }): Promise<{ message: string; ai: AIResponse }> {
    const { message, conversationId, context } = params
    try {
      if (conversationId && context?.patient?.phone) {
        const ai = await this.processMessage(message, context.patient.phone, conversationId, context)
        return { message: ai.response, ai }
      }
      return { message, ai: { response: message, confidence: 1, suggestedAction: 'continue' } as any }
    } catch (e) {
      return { message, ai: { response: message, confidence: 0.4, suggestedAction: 'continue' } as any }
    }
  }

  // Public methods for context management
  getContext(conversationId: string): AIContext | undefined {
    return this.context.get(conversationId)
  }

  updateContext(conversationId: string, updates: Partial<AIContext>): void {
    const context = this.context.get(conversationId)
    if (context) {
      Object.assign(context, updates)
    }
  }

  clearContext(conversationId: string): void {
    this.context.delete(conversationId)
  }

  getAllContexts(): Map<string, AIContext> {
    return new Map(this.context)
  }
}

// Export singleton instance with lazy initialization
let instance: IntelligentBotService | null = null

export const intelligentBotService = {
  getInstance(): IntelligentBotService {
    if (!instance) {
      console.log('🤖 Creating IntelligentBotService instance...')
      console.log('📋 Environment - API Key present:', !!process.env.OPENAI_API_KEY)
      console.log('📋 Environment - API Key length:', process.env.OPENAI_API_KEY?.length)
      instance = new IntelligentBotService(
        process.env.OPENAI_API_KEY || '',
        process.env.OPENAI_MODEL || 'gpt-4o',
        Number(process.env.OPENAI_TIMEOUT) || 20000
      )
    }
    return instance
  }
}
