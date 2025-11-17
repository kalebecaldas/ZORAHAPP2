import OpenAI from 'openai'
import { z } from 'zod'

const aiResponseSchema = z.object({
  intent: z.string().optional(),
  sentiment: z.enum(['positive', 'negative', 'neutral']).optional(),
  responseStyle: z.enum(['consultive', 'educational', 'empathetic', 'sales', 'direct']).optional(),
  response: z.string(),
  confidence: z.number().min(0).max(1),
})

export type AIResponse = z.infer<typeof aiResponseSchema>

export type AIContext = {
  patient?: {
    id?: string
    name?: string
    phone: string
    insuranceCompany?: string
    preferences?: Record<string, any>
  }
  history: Array<{
    role: 'user' | 'assistant'
    content: string
    timestamp: string
  }>
  clinicData: {
    name: string
    address: string
    phone: string
    procedures?: Array<{
      name: string
      price: number
      insurance: string[]
    }>
    locations?: Array<{
      name: string
      address: string
      phone: string
      procedures: {
        particular: Array<{
          name: string
          price: number
          requiresEvaluation?: boolean
          isEvaluation?: boolean
        }>
        packages?: Array<{
          name: string
          price: number
          includesEvaluation?: boolean
        }>
      }
    }>
    insurancePlans?: Record<string, string[]>
    businessHours?: {
      weekdays: string
      saturday: string
      sunday: string
    }
  }
  currentIntent?: string
  sentimentTrend?: 'positive' | 'negative' | 'neutral'
}

export class AIService {
  private openai: OpenAI
  private model: string
  private timeout: number

  constructor(apiKey: string, model = 'gpt-3.5-turbo', timeout = 20000) {
    this.openai = new OpenAI({ apiKey })
    this.model = model
    this.timeout = timeout
  }

  async generateResponse(message: string, context: AIContext): Promise<AIResponse> {
    try {
      // Validate context before processing
      if (!context || !context.clinicData) {
        throw new Error('Invalid context: missing clinicData')
      }
      
      const systemPrompt = this.buildSystemPrompt(context)
      
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }, {
        timeout: this.timeout,
      })

      const response = completion.choices[0]?.message?.content || ''
      
      // Parse response for structured data
      const parsedResponse = this.parseAIResponse(response)
      
      return aiResponseSchema.parse({
        ...parsedResponse,
        confidence: 0.8, // Default confidence
      })
    } catch (error) {
      console.error('Erro ao gerar resposta IA:', error)
      
      // Enhanced fallback response based on error type
      let fallbackMessage = 'Desculpe, estou tendo dificuldades para processar sua mensagem. Por favor, tente novamente ou fale com um atendente.'
      
      if (error.message?.includes('Invalid context')) {
        fallbackMessage = 'Desculpe, estou com problemas técnicos. Por favor, fale com um atendente humano.'
      } else if (error.message?.includes('OpenAI')) {
        fallbackMessage = 'Desculpe, estou temporariamente indisponível. Por favor, tente novamente em alguns instantes ou fale com um atendente.'
      }
      
      // Fallback response
      return {
        response: fallbackMessage,
        confidence: 0.3,
      }
    }
  }

  private buildSystemPrompt(context: AIContext): string {
    const patientInfo = context.patient 
      ? `Paciente: ${context.patient.name} (${context.patient.phone})`
      : `Novo paciente: ${context.patient?.phone}`
    
    const insuranceInfo = context.patient?.insuranceCompany 
      ? `Convênio: ${context.patient.insuranceCompany}`
      : 'Convênio: não informado'

    // Get procedures from clinic data - handle both old and new structure
    let procedures: Array<{name: string, price: number, requiresEvaluation?: boolean, isEvaluation?: boolean}> = []
    
    try {
      if (Array.isArray(context.clinicData.procedures)) {
        // Old structure - direct array
        procedures = context.clinicData.procedures
      } else if (context.clinicData.locations && 
                 Array.isArray(context.clinicData.locations) && 
                 context.clinicData.locations.length > 0 &&
                 context.clinicData.locations[0]?.procedures?.particular) {
        // New structure - nested under locations with proper null checks
        procedures = context.clinicData.locations[0].procedures.particular
      } else if (context.clinicData.locations && 
                 Array.isArray(context.clinicData.locations) && 
                 context.clinicData.locations.length > 0 &&
                 context.clinicData.locations[0]?.procedures) {
        // Try to get any available procedures structure
        const locationProcedures = context.clinicData.locations[0].procedures
        if (locationProcedures.particular) {
          procedures = locationProcedures.particular
        } else if (Array.isArray(locationProcedures)) {
          procedures = locationProcedures
        }
      }
    } catch (error) {
      console.error('Error parsing clinic procedures:', error)
      procedures = []
    }

    const proceduresList = procedures && procedures.length > 0 
      ? procedures
          .filter(p => p && p.name && typeof p.price === 'number')
          .map(p => `- ${p.name}: R$ ${p.price.toFixed(2)}${p.requiresEvaluation ? ' (requer avaliação)' : ''}${p.isEvaluation ? ' (avaliação)' : ''}`)
          .join('\n')
      : 'Nenhum procedimento disponível no momento'

    const businessHours = context.clinicData.businessHours 
      ? `Horário de funcionamento:
- Dias úteis: ${context.clinicData.businessHours.weekdays}
- Sábado: ${context.clinicData.businessHours.saturday}
- Domingo: ${context.clinicData.businessHours.sunday}`
      : 'Horário de funcionamento: Consultar'

    return `Você é um assistente virtual inteligente de uma clínica de saúde especializada em fisioterapia pélvica, RPG, acupuntura e pilates. Seja cordial, profissional, empático e objetivo.

${patientInfo}
${insuranceInfo}

Clínica: ${context.clinicData.name}
Endereço: ${context.clinicData.address}
Telefone: ${context.clinicData.phone}

${businessHours}

Procedimentos disponíveis:
${proceduresList}

REGRAS FUNDAMENTAIS:
1. SEMPRE verifique o convênio do paciente antes de informar preços
2. Para fisioterapia pélvica e acupuntura, é OBRIGATÓRIO fazer avaliação primeiro (R$ 250,00)
3. Se o paciente quiser apenas UMA sessão, cobre a avaliação. Se pagar PACOTE de 10 sessões, dê desconto na avaliação
4. SEMPRE ofereça agendamento após esclarecer dúvidas
5. Se não souber responder, PEÇA DESCULPAS e transfira para um atendente humano
6. Para agendamento, peça: nome completo, telefone, convênio e disponibilidade de horário

ETAPAS DO ATENDIMENTO:
1. Saudação e identificação do paciente
2. Entender a necessidade/dor do paciente
3. Explicar os procedimentos indicados
4. Informar valores e formas de pagamento
5. Oferecer agendamento
6. Confirmar dados e finalizar

Analise o sentimento e intenção do paciente e responda de forma apropriada e empática.`
  }

  private parseAIResponse(response: string): Partial<AIResponse> {
    // Simple parsing for intent and sentiment
    const intentMatch = response.match(/INTENÇÃO:\s*(.+)/i)
    const sentimentMatch = response.match(/SENTIMENTO:\s*(positive|negative|neutral)/i)
    const styleMatch = response.match(/ESTILO:\s*(consultive|educational|empathetic|sales|direct)/i)
    
    // Remove tags from response
    const cleanResponse = response
      .replace(/INTENÇÃO:.*\n?/gi, '')
      .replace(/SENTIMENTO:.*\n?/gi, '')
      .replace(/ESTILO:.*\n?/gi, '')
      .trim()

    return {
      intent: intentMatch?.[1]?.trim(),
      sentiment: sentimentMatch?.[1] as any,
      responseStyle: styleMatch?.[1] as any,
      response: cleanResponse,
    }
  }

  async classifyIntent(message: string): Promise<string> {
    const intents = [
      'agendamento',
      'preço',
      'informação',
      'reclamação',
      'saudação',
      'follow-up',
      'cancelamento',
      'remarcação',
      'outro'
    ]

    try {
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `Você é um classificador de intenções para uma clínica de fisioterapia. Classifique a intenção da mensagem em uma dessas categorias: ${intents.join(', ')}. 

DICAS PARA CLASSIFICAÇÃO:
- "agendamento": quando o paciente quer marcar consulta, sessão ou procedimento
- "cancelamento": quando quer cancelar um agendamento existente
- "remarcação": quando quer mudar data/hora de um agendamento
- "preço": quando pergunta sobre valores, custos, formas de pagamento
- "informação": quando pergunta sobre procedimentos, horários, localização
- "reclamação": quando expressa insatisfação ou problema
- "saudação": cumprimentos iniciais como "oi", "olá", "bom dia"
- "follow-up": continuação de conversa anterior
- "outro": não se encaixa nas categorias acima

Responda apenas com a categoria mais provável.`,
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

  async analyzeSentiment(message: string): Promise<'positive' | 'negative' | 'neutral'> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'Analise o sentimento da mensagem e responda apenas com: positive, negative ou neutral',
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
}