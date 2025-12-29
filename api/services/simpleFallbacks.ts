/**
 * Simple Fallbacks Service
 * 
 * Detecta perguntas simples e responde sem usar GPT
 * Economia de 10-15% de chamadas desnecessárias
 */

import { prismaClinicDataService } from './prismaClinicDataService.js'

interface FallbackResponse {
  response: string
  intent: string
  confidence: number
}

class SimpleFallbacksService {
  private enabled: boolean
  private stats: { hits: number; total: number }

  constructor() {
    this.enabled = process.env.GPT_ENABLE_CACHE === 'true' // Usa mesma config do cache
    this.stats = { hits: 0, total: 0 }
    console.log(`🎯 [Fallbacks] Inicializado - Enabled: ${this.enabled}`)
  }

  /**
   * Normaliza mensagem para detecção
   */
  private normalize(message: string): string {
    return message
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^\w\s]/g, '') // Remove pontuação
      .replace(/\s+/g, ' ')
  }

  /**
   * Detecta saudações simples
   */
  private detectGreeting(normalized: string): boolean {
    const greetings = [
      'oi', 'ola', 'ola', 'hey', 'hi', 'hello', 'ola', 'e ai', 'eai',
      'bom dia', 'boa tarde', 'boa noite', 'boa madrugada',
      'oi bom dia', 'ola bom dia', 'ola boa tarde', 'ola boa noite',
      'ola tudo bem', 'oi tudo bem', 'tudo bem', 'td bem',
      'oi como vai', 'ola como vai', 'tudo certo', 'beleza'
    ]

    // Saudação sozinha ou com "tudo bem"
    const words = normalized.split(' ')
    if (words.length <= 5) {
      return greetings.some(greeting => normalized.includes(greeting))
    }

    return false
  }

  /**
   * Detecta pergunta sobre localização
   */
  private detectLocationQuestion(normalized: string): boolean {
    const patterns = [
      'onde fica', 'aonde fica', 'fica onde', 'onde e',
      'qual o endereco', 'qual endereco', 'qual e o endereco',
      'como chegar', 'como eu chego', 'como va', 'como ir',
      'manda o endereco', 'me manda o endereco', 'manda endereco',
      'endereco da clinica', 'endereco clinica',
      'localizacao', 'local', 'fica no',
      'onde vou', 'pra onde eu vo'
    ]

    return patterns.some(pattern => normalized.includes(pattern))
  }

  /**
   * Detecta pergunta sobre horário
   */
  private detectHoursQuestion(normalized: string): boolean {
    const patterns = [
      'que horas', 'que hora', 'qual horario', 'quais horarios',
      'horario de atendimento', 'horario de funcionamento',
      'horario', 'horarios',
      'que hora abre', 'que horas abre', 'abre que hora',
      'que hora fecha', 'que horas fecha', 'fecha que hora',
      'ate que horas', 'ate quantas horas', 'vai ate',
      'funciona ate', 'atende ate', 'trabalha ate',
      'fica aberto', 'ta aberto', 'esta aberto',
      'domingo abre', 'sabado abre', 'feriado abre'
    ]

    return patterns.some(pattern => normalized.includes(pattern))
  }

  /**
   * Detecta se a mensagem é uma pergunta sobre se atendemos algum procedimento
   */
  private isProcedureInquiry(normalized: string): boolean {
    const inquiryPatterns = [
      'atendem', 'atende', 'fazem', 'faz', 'tem ',
      'oferece', 'oferecem', 'trabalham com', 'trabalha com',
      'realizam', 'realiza', 'disponibiliza', 'disponibilizam',
      'presta', 'prestam', 'consulta de', 'sessao de',
      'tratamento de', 'terapia'
    ]
    
    return inquiryPatterns.some(pattern => normalized.includes(pattern))
  }

  /**
   * Tenta extrair o nome do procedimento da mensagem
   */
  private extractProcedureName(message: string): string | null {
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
   * Detecta menção a procedimentos que NÃO atendemos
   * Inclui lista hardcoded + detecção dinâmica
   */
  private async detectUnavailableProcedure(normalized: string, originalMessage: string): Promise<string | null> {
    // 1. Lista hardcoded de procedimentos conhecidos que NÃO atendemos
    const unavailableProcedures: Record<string, string[]> = {
      'Terapia Ocupacional': ['terapia ocupacional', 'to ', 't.o', 'terapeuta ocupacional'],
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
        if (normalized.includes(variant)) {
          return procedureName
        }
      }
    }

    // 2. Detecção dinâmica: verificar se é pergunta sobre procedimento
    if (!this.isProcedureInquiry(normalized)) {
      return null // Não é uma pergunta sobre procedimento
    }

    // 3. Verificar se o procedimento mencionado existe no banco de dados
    try {
      const procedures = await prismaClinicDataService.getProcedures()
      const procedureNames = procedures.map(p => p.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
      
      // Verificar se algum procedimento do banco está na mensagem
      const foundInDatabase = procedureNames.some(procName => {
        return normalized.includes(procName) || procName.includes(normalized.split(' ')[0])
      })

      // Se é pergunta sobre procedimento E não encontrou no banco, então não atendemos
      if (!foundInDatabase) {
        // Extrair o possível nome do procedimento da mensagem
        const extractedProcedure = this.extractProcedureName(originalMessage)
        return extractedProcedure || 'esse procedimento'
      }
    } catch (error) {
      console.error('Erro ao verificar procedimentos:', error)
    }

    return null
  }

  /**
   * Detecta pergunta sobre convênios (genérica)
   */
  private async detectInsuranceQuestion(normalized: string, originalMessage: string): Promise<boolean> {
    const hasInsuranceWord = normalized.includes('convenio') || 
                             normalized.includes('plano') ||
                             normalized.includes('aceita') ||
                             normalized.includes('atende')

    const isGeneral = normalized.includes('quais') ||
                     normalized.includes('que') ||
                     normalized.includes('aceita') ||
                     normalized.includes('atende') ||
                     normalized.includes('tem')

    // ✅ Se mencionar procedimento não atendido, NÃO é pergunta sobre convênio
    const unavailable = await this.detectUnavailableProcedure(normalized, originalMessage)
    if (unavailable) {
      return false
    }

    // Pergunta genérica sobre convênios (não específica de um convênio)
    const specificInsurances = ['bradesco', 'sulamerica', 'unimed', 'amil', 'porto', 'notredame', 'hapvida']
    const hasSpecific = specificInsurances.some(ins => normalized.includes(ins))

    return hasInsuranceWord && isGeneral && !hasSpecific
  }

  /**
   * Detecta agradecimento / despedida
   */
  private detectThanksOrGoodbye(normalized: string): boolean {
    const patterns = [
      'obrigado', 'obrigada', 'obg', 'vlw', 'valeu',
      'ate logo', 'ate mais', 'tchau', 'falou',
      'muito obrigado', 'muito obrigada', 'agradeco',
      'ok obrigado', 'tudo bem obrigado'
    ]

    const words = normalized.split(' ')
    if (words.length <= 4) {
      return patterns.some(pattern => normalized.includes(pattern))
    }

    return false
  }

  /**
   * Detecta pergunta sobre telefone
   */
  private detectPhoneQuestion(normalized: string): boolean {
    const patterns = [
      'qual telefone', 'qual o telefone', 'telefone',
      'numero pra ligar', 'numero de contato', 'contato',
      'qual o numero', 'qual numero', 'como falar',
      'whatsapp', 'zap', 'telegram'
    ]

    return patterns.some(pattern => normalized.includes(pattern))
  }

  /**
   * Gera resposta para saudação
   */
  private async generateGreetingResponse(): Promise<FallbackResponse> {
    return {
      response: `Olá! Seja bem-vindo(a) às Clínicas IAAM! 😊\n\n` +
                `Como posso ajudá-lo(a) hoje?\n\n` +
                `Posso informar sobre:\n` +
                `• Procedimentos e valores 💰\n` +
                `• Convênios aceitos 🏥\n` +
                `• Localização e horários 📍\n` +
                `• Agendamento de consultas 📅`,
      intent: 'greeting',
      confidence: 0.98
    }
  }

  /**
   * Gera resposta para localização
   */
  private async generateLocationResponse(clinicCode?: string): Promise<FallbackResponse> {
    try {
      const clinic = clinicCode || 'vieiralves'
      const location = await prismaClinicDataService.getClinicByName(clinic)

      if (location) {
        return {
          response: `📍 **${location.displayName}**\n\n` +
                   `**Endereço:** ${location.address}\n` +
                   `**Telefone:** ${location.phone}\n\n` +
                   `Gostaria de agendar uma avaliação ou consulta? Posso te ajudar! 😊`,
          intent: 'location',
          confidence: 0.95
        }
      }
    } catch (error) {
      console.error('Erro ao buscar localização:', error)
    }

    return {
      response: `📍 **Localização**\n\n` +
               `Quer saber como chegar? Posso te ajudar com isso!`,
      intent: 'location',
      confidence: 0.8
    }
  }

  /**
   * Gera resposta para horário
   */
  private async generateHoursResponse(clinicCode?: string): Promise<FallbackResponse> {
    try {
      const clinic = clinicCode || 'vieiralves'
      const location = await prismaClinicDataService.getClinicByName(clinic)

      if (location && location.openingHours) {
        const hours = location.openingHours as any
        return {
          response: `🕐 **Horário de Atendimento**\n\n` +
                   `**Segunda a Sexta:** ${hours.weekdays || '7h às 19h'}\n` +
                   `**Sábado:** ${hours.saturday || '7h às 12h'}\n` +
                   `**Domingo:** ${hours.sunday || 'Fechado'}\n\n` +
                   `Gostaria de agendar uma consulta?`,
          intent: 'hours',
          confidence: 0.95
        }
      }
    } catch (error) {
      console.error('Erro ao buscar horários:', error)
    }

    return {
      response: `🕐 **Horário de Atendimento**\n\n` +
               `Quer saber nossos horários? Posso te informar agora mesmo!`,
      intent: 'hours',
      confidence: 0.8
    }
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
   * Gera resposta para procedimentos não atendidos
   */
  private async generateUnavailableProcedureResponse(procedureName: string): Promise<FallbackResponse> {
    try {
      const procedures = await prismaClinicDataService.getProcedures()
      
      // ✅ Filtrar procedimentos principais (sem avaliações separadas)
      const mainProcedures = this.filterProceduresForDisplay(procedures)
      
      const suggested = mainProcedures
        .filter(p => p.name.toLowerCase().includes('fisio') || 
                     p.name.toLowerCase().includes('pilates') ||
                     p.name.toLowerCase().includes('rpg') ||
                     p.name.toLowerCase().includes('acupuntura'))
        .slice(0, 5)
        .map(p => `• ${p.name}`)
        .join('\n')

      return {
        response: `Entendo seu interesse em ${procedureName}! 😊\n\n` +
                 `Infelizmente, não atendemos ${procedureName} na nossa clínica. ` +
                 `Somos especializados em **Fisioterapia e tratamentos relacionados**.\n\n` +
                 `📋 **Procedimentos que oferecemos:**\n${suggested}\n\n` +
                 `Algum desses procedimentos te interessa? Posso te dar mais informações! 💙`,
        intent: 'unavailable_procedure',
        confidence: 0.95
      }
    } catch (error) {
      console.error('Erro ao buscar procedimentos:', error)
      return {
        response: `Entendo seu interesse em ${procedureName}! 😊\n\n` +
                 `Infelizmente, não atendemos ${procedureName}. ` +
                 `Somos especializados em Fisioterapia e tratamentos relacionados.\n\n` +
                 `Posso te ajudar com informações sobre nossos serviços? 💙`,
        intent: 'unavailable_procedure',
        confidence: 0.8
      }
    }
  }

  /**
   * Gera resposta para convênios (genérica)
   */
  private async generateInsuranceResponse(): Promise<FallbackResponse> {
    try {
      const insurances = await prismaClinicDataService.getInsuranceCompanies()
      const list = insurances.slice(0, 10).map(i => `• ${i.displayName}`).join('\n')

      return {
        response: `🏥 **Convênios Aceitos:**\n\n${list}\n\nE outros.\n\n` +
                 `Qual convênio você tem?`,
        intent: 'insurance',
        confidence: 0.9
      }
    } catch (error) {
      console.error('Erro ao buscar convênios:', error)
    }

    return {
      response: `🏥 **Convênios**\n\n` +
               `Aceitamos diversos convênios. Entre em contato para mais informações.`,
      intent: 'insurance',
      confidence: 0.7
    }
  }

  /**
   * Gera resposta para agradecimento/despedida
   */
  private async generateThanksResponse(): Promise<FallbackResponse> {
    return {
      response: `De nada! 😊\n\n` +
               `Sempre que precisar, estou à disposição.\n\n` +
               `Se quiser agendar uma consulta ou avaliação, é só me avisar! Cuide-se! 💚`,
      intent: 'thanks',
      confidence: 0.95
    }
  }

  /**
   * Gera resposta para telefone
   */
  private async generatePhoneResponse(clinicCode?: string): Promise<FallbackResponse> {
    try {
      const clinic = clinicCode || 'vieiralves'
      const location = await prismaClinicDataService.getClinicByName(clinic)

      if (location) {
        return {
          response: `📞 **${location.displayName}**\n\n` +
                   `**Telefone:** ${location.phone}\n\n` +
                   `Se preferir, posso te ajudar a agendar uma consulta ou avaliação por aqui mesmo! 😊`,
          intent: 'phone',
          confidence: 0.95
        }
      }
    } catch (error) {
      console.error('Erro ao buscar telefone:', error)
    }

    return {
      response: `📞 **Contato**\n\n` +
               `Entre em contato conosco para mais informações!`,
      intent: 'phone',
      confidence: 0.8
    }
  }

  /**
   * Tenta gerar resposta sem usar GPT
   */
  async tryFallback(message: string, clinicCode?: string): Promise<FallbackResponse | null> {
    if (!this.enabled) {
      return null
    }

    this.stats.total++
    const normalized = this.normalize(message)

    // ✅ Procedimento não atendido (prioridade máxima) - agora async
    const unavailableProcedure = await this.detectUnavailableProcedure(normalized, message)
    if (unavailableProcedure) {
      this.stats.hits++
      console.log(`🎯 [Fallbacks] ✅ PROCEDIMENTO NÃO ATENDIDO detectado: ${unavailableProcedure}`)
      return await this.generateUnavailableProcedureResponse(unavailableProcedure)
    }

    // Saudações
    if (this.detectGreeting(normalized)) {
      this.stats.hits++
      console.log(`🎯 [Fallbacks] ✅ GREETING detectado`)
      return await this.generateGreetingResponse()
    }

    // Localização
    if (this.detectLocationQuestion(normalized)) {
      this.stats.hits++
      console.log(`🎯 [Fallbacks] ✅ LOCATION detectado`)
      return await this.generateLocationResponse(clinicCode)
    }

    // Horários
    if (this.detectHoursQuestion(normalized)) {
      this.stats.hits++
      console.log(`🎯 [Fallbacks] ✅ HOURS detectado`)
      return await this.generateHoursResponse(clinicCode)
    }

    // Convênios (genéricos) - agora async
    if (await this.detectInsuranceQuestion(normalized, message)) {
      this.stats.hits++
      console.log(`🎯 [Fallbacks] ✅ INSURANCE detectado`)
      return await this.generateInsuranceResponse()
    }

    // Agradecimento/Despedida
    if (this.detectThanksOrGoodbye(normalized)) {
      this.stats.hits++
      console.log(`🎯 [Fallbacks] ✅ THANKS/GOODBYE detectado`)
      return await this.generateThanksResponse()
    }

    // Telefone
    if (this.detectPhoneQuestion(normalized)) {
      this.stats.hits++
      console.log(`🎯 [Fallbacks] ✅ PHONE detectado`)
      return await this.generatePhoneResponse(clinicCode)
    }

    return null
  }

  /**
   * Retorna estatísticas
   */
  getStats() {
    const hitRate = this.stats.total > 0 ? (this.stats.hits / this.stats.total) * 100 : 0
    
    return {
      hits: this.stats.hits,
      total: this.stats.total,
      hitRate: Math.round(hitRate * 100) / 100,
      enabled: this.enabled
    }
  }
}

// Exportar singleton
export const simpleFallbacksService = new SimpleFallbacksService()
