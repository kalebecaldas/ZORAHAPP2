import OpenAI from 'openai'
import { z } from 'zod'
import { prismaClinicDataService } from './prismaClinicDataService.js'
import { type Procedure, type InsuranceCompany, type ClinicLocation } from '../data/clinicData.js'

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

    // Build context-aware prompt
    const systemPrompt = await this.buildIntelligentSystemPrompt(context, analysis)

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.timeout)
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...context.history.slice(-10).map(h => ({
            role: h.role as 'user' | 'assistant',
            content: h.content
          })),
          { role: 'user', content: message }
        ],
        max_tokens: 800,
        temperature: 0.7,
        // signal for abort timeout
        signal: controller.signal
      } as any)
      clearTimeout(timeoutId)

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
    const baseContext: AIContext = {
      patient: {
        phone,
        ...existingContext?.patient
      },
      history: existingContext?.history || [],
      clinicData: {
        name: 'Clínica de Fisioterapia',
        address: 'Rua Vieiralves, 1230 - Manaus/AM',
        phone: '(92) 3234-5678',
        procedures: await prismaClinicDataService.getProcedures() as any,
        insuranceCompanies: await prismaClinicDataService.getInsuranceCompanies() as any,
        locations: await prismaClinicDataService.getLocations() as any
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
    const analysis = {
      intent: await this.classifyIntent(message),
      sentiment: await this.analyzeSentiment(message),
      schedulingIntent: this.detectSchedulingIntent(lowerMessage),
      pricingIntent: this.detectPricingIntent(lowerMessage),
      informationIntent: this.detectInformationIntent(lowerMessage),
      procedureMentioned: await this.detectProcedureMention(message),
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

    // Get relevant procedures and pricing
    const relevantProcedures = await this.getRelevantProcedures(analysis.procedureMentioned, context.patient?.insuranceCompany)
    const pricingInfo = await this.getPricingInformation(relevantProcedures, context.patient?.insuranceCompany)

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

  private async getRelevantProcedures(procedureMentioned: string | null, insuranceCompany?: string): Promise<string> {
    if (procedureMentioned) {
      const procedure = await prismaClinicDataService.getProcedureById(procedureMentioned)
      if (procedure) {
        const priceInfo = await prismaClinicDataService.calculatePrice(procedureMentioned, insuranceCompany)
        return `${procedure.name}: ${procedure.description}\n` +
          `Preço: R$ ${priceInfo?.patientPays || procedure.basePrice}\n` +
          `Duração: ${procedure.duration} minutos`
      }
    }

    // Return top 5 procedures
    const allProcedures = await prismaClinicDataService.getProcedures()
    const topProcedures = allProcedures.slice(0, 5)

    const proceduresList = await Promise.all(topProcedures.map(async p => {
      const priceInfo = await prismaClinicDataService.calculatePrice(p.id, insuranceCompany)
      return `${p.name}: R$ ${priceInfo?.patientPays || p.basePrice} (${p.duration}min)`
    }))

    return proceduresList.join('\n')
  }

  private async getPricingInformation(procedures: any, insuranceCompany?: string): Promise<string> {
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

    return `💰 PREÇOS ESPECIAIS:\n` +
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
