/**
 * Response Cache Service
 * 
 * Cache de respostas frequentes para reduzir chamadas ao GPT em 30-40%
 * Economiza custos respondendo perguntas comuns sem usar IA
 */

import { prismaClinicDataService } from './prismaClinicDataService.js'

interface CacheEntry {
  response: string
  timestamp: number
  hits: number
}

interface CacheStats {
  totalHits: number
  totalMisses: number
  hitRate: number
  cacheSize: number
}

class ResponseCacheService {
  private cache: Map<string, CacheEntry>
  private ttl: number // Time to live em segundos
  private enabled: boolean
  private stats: { hits: number; misses: number }

  constructor() {
    this.cache = new Map()
    this.ttl = parseInt(process.env.GPT_CACHE_TTL || '3600') // 1 hora por padrão
    this.enabled = process.env.GPT_ENABLE_CACHE === 'true'
    this.stats = { hits: 0, misses: 0 }

    console.log(`💾 [Cache] Inicializado - Enabled: ${this.enabled}, TTL: ${this.ttl}s`)
  }

  /**
   * Normaliza a mensagem para usar como chave de cache
   */
  private normalizeMessage(message: string): string {
    return message
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^\w\s]/g, '') // Remove pontuação
      .replace(/\s+/g, ' ') // Normaliza espaços
  }

  /**
   * Detecta o tipo de pergunta baseado em padrões
   */
  private detectQuestionType(normalizedMessage: string): string | null {
    const patterns: Record<string, string[]> = {
      location: ['onde fica', 'endereco', 'localizacao', 'como chegar', 'mapa'],
      hours: ['horario', 'que horas', 'abre', 'fecha', 'funciona', 'atende'],
      insurance_general: ['aceita convenio', 'aceita plano', 'quais convenios', 'convenios aceitos'],
      price_general: ['quanto custa', 'qual o valor', 'preco', 'valores'],
      procedures_list: ['quais procedimentos', 'o que oferece', 'tratamentos disponiveis'],
      greeting: ['oi', 'ola', 'bom dia', 'boa tarde', 'boa noite'],
    }

    for (const [type, keywords] of Object.entries(patterns)) {
      if (keywords.some(keyword => normalizedMessage.includes(keyword))) {
        return type
      }
    }

    return null
  }

  /**
   * Gera resposta para perguntas comuns (sem usar GPT)
   */
  private async generateCommonResponse(type: string, clinicCode?: string): Promise<string | null> {
    try {
      const clinic = clinicCode || 'vieiralves'

      switch (type) {
        case 'location': {
          const location = await prismaClinicDataService.getClinicByName(clinic)
          if (location) {
            return `📍 **${location.displayName}**\n\n` +
                   `Endereço: ${location.address}\n` +
                   `Telefone: ${location.phone}\n\n` +
                   `Gostaria de agendar uma avaliação ou consulta? Posso te ajudar! 😊`
          }
          return null
        }

        case 'hours': {
          const location = await prismaClinicDataService.getClinicByName(clinic)
          if (location && location.openingHours) {
            const hours = location.openingHours as any
            return `🕐 **Horário de Atendimento**\n\n` +
                   `Segunda a Sexta: ${hours.weekdays || '7h às 19h'}\n` +
                   `Sábado: ${hours.saturday || '7h às 12h'}\n` +
                   `Domingo: ${hours.sunday || 'Fechado'}\n\n` +
                   `Gostaria de agendar?`
          }
          return null
        }

        case 'insurance_general': {
          const insurances = await prismaClinicDataService.getInsuranceCompanies()
          const list = insurances.slice(0, 8).map(i => `• ${i.displayName}`).join('\n')
          return `🏥 **Convênios Aceitos:**\n\n${list}\n\n` +
                 `E outros. Qual convênio você tem?`
        }

        case 'procedures_list': {
          const procedures = await prismaClinicDataService.getProcedures()
          // ✅ Filtrar procedimentos principais (sem avaliações separadas)
          const mainProcedures = procedures.filter(p => {
            // Validação de segurança
            if (!p || !p.name || typeof p.name !== 'string') return false
            const name = p.name.toLowerCase()
            return !name.startsWith('avaliacao') && !name.startsWith('avaliação')
          })
          const list = mainProcedures.slice(0, 8).map(p => `• ${p.name}`).join('\n')
          return `📋 **Procedimentos Disponíveis:**\n\n${list}\n\n` +
                 `Qual procedimento te interessa?`
        }

        case 'greeting': {
          return `Olá! Seja bem-vindo(a) às Clínicas IAAM! 😊\n\n` +
                 `Como posso ajudá-lo(a) hoje?\n\n` +
                 `Posso informar sobre:\n` +
                 `• Procedimentos e valores\n` +
                 `• Convênios aceitos\n` +
                 `• Localização e horários\n` +
                 `• Agendamento de consultas`
        }

        default:
          return null
      }
    } catch (error) {
      console.error(`💾 [Cache] Erro ao gerar resposta comum:`, error)
      return null
    }
  }

  /**
   * Tenta obter resposta do cache ou gera uma resposta comum
   */
  async get(message: string, clinicCode?: string): Promise<string | null> {
    if (!this.enabled) {
      return null
    }

    const normalized = this.normalizeMessage(message)
    const questionType = this.detectQuestionType(normalized)

    if (!questionType) {
      this.stats.misses++
      return null
    }

    // Verifica cache existente
    const cacheKey = `${questionType}:${clinicCode || 'default'}`
    const cached = this.cache.get(cacheKey)

    if (cached) {
      const age = Date.now() - cached.timestamp
      if (age < this.ttl * 1000) {
        // Cache hit!
        this.stats.hits++
        cached.hits++
        console.log(`💾 [Cache] ✅ HIT - Tipo: ${questionType}, Hits: ${cached.hits}, Idade: ${Math.round(age / 1000)}s`)
        return cached.response
      } else {
        // Cache expirado
        this.cache.delete(cacheKey)
      }
    }

    // Gera nova resposta
    const response = await this.generateCommonResponse(questionType, clinicCode)

    if (response) {
      // Adiciona ao cache
      this.cache.set(cacheKey, {
        response,
        timestamp: Date.now(),
        hits: 1
      })
      this.stats.hits++
      console.log(`💾 [Cache] ✨ NOVO - Tipo: ${questionType}`)
      return response
    }

    this.stats.misses++
    return null
  }

  /**
   * Limpa cache expirado
   */
  cleanup(): void {
    const now = Date.now()
    let removed = 0

    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp
      if (age >= this.ttl * 1000) {
        this.cache.delete(key)
        removed++
      }
    }

    if (removed > 0) {
      console.log(`💾 [Cache] 🧹 Cleanup - Removidos ${removed} itens expirados`)
    }
  }

  /**
   * Limpa todo o cache
   */
  clear(): void {
    const size = this.cache.size
    this.cache.clear()
    console.log(`💾 [Cache] 🗑️ Cache limpo - ${size} itens removidos`)
  }

  /**
   * Retorna estatísticas do cache
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: Math.round(hitRate * 100) / 100,
      cacheSize: this.cache.size,
      enabled: this.enabled,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses
    }
  }

  /**
   * Reseta estatísticas
   */
  resetStats(): void {
    this.stats = { hits: 0, misses: 0 }
    console.log(`💾 [Cache] 📊 Estatísticas resetadas`)
  }

  /**
   * Exibe estatísticas detalhadas
   */
  logStats(): void {
    const stats = this.getStats()
    console.log(`💾 [Cache] 📊 ESTATÍSTICAS:`)
    console.log(`   Total Hits: ${stats.totalHits}`)
    console.log(`   Total Misses: ${stats.totalMisses}`)
    console.log(`   Hit Rate: ${stats.hitRate}%`)
    console.log(`   Cache Size: ${stats.cacheSize} itens`)
    console.log(`   Economia estimada: ${Math.round(stats.totalHits * 0.0002 * 1000) / 1000} USD`)
  }

  /**
   * Lista todas as entradas do cache
   */
  listEntries(): Array<{ key: string; response: string; hits: number; age: number }> {
    const entries: Array<{ key: string; response: string; hits: number; age: number }> = []
    const now = Date.now()

    for (const [key, entry] of this.cache.entries()) {
      entries.push({
        key,
        response: entry.response.substring(0, 100) + '...',
        hits: entry.hits,
        age: Math.round((now - entry.timestamp) / 1000)
      })
    }

    return entries.sort((a, b) => b.hits - a.hits)
  }
}

// Exportar singleton
export const responseCacheService = new ResponseCacheService()

// Cleanup automático a cada 5 minutos
if (process.env.GPT_ENABLE_CACHE === 'true') {
  setInterval(() => {
    responseCacheService.cleanup()
  }, 5 * 60 * 1000)

  // Log de estatísticas a cada 30 minutos
  setInterval(() => {
    responseCacheService.logStats()
  }, 30 * 60 * 1000)
}
