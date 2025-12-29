/**
 * Local NLP Service
 * 
 * Classificação de intenção SEM usar GPT
 * Economia: 30-40% (elimina chamada de classificação)
 */

interface IntentResult {
  intent: string
  confidence: number
  entities: Record<string, string>
}

class LocalNLPService {
  private enabled: boolean
  private stats: { hits: number; misses: number }

  constructor() {
    this.enabled = true
    this.stats = { hits: 0, misses: 0 }
    console.log(`🧠 [Local NLP] Inicializado`)
  }

  /**
   * Normaliza texto para análise
   */
  private normalize(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
  }

  /**
   * Extrai palavras-chave
   */
  private extractKeywords(normalized: string): string[] {
    // Remover stop words comuns
    const stopWords = ['o', 'a', 'de', 'da', 'do', 'em', 'e', 'para', 'por', 'com', 'um', 'uma', 'os', 'as']
    return normalized
      .split(' ')
      .filter(word => word.length > 2 && !stopWords.includes(word))
  }

  /**
   * Detecta entidades (procedimentos, convênios, etc)
   */
  private extractEntities(normalized: string, keywords: string[]): Record<string, string> {
    const entities: Record<string, string> = {}

    // Procedimentos
    const procedures = {
      'acupuntura': ['acupuntura', 'acupuntur', 'agulha'],
      'fisioterapia': ['fisioterapia', 'fisio'],
      'rpg': ['rpg', 'reeducacao postural', 'postura'],
      'pilates': ['pilates', 'pilate']
    }

    for (const [proc, variations] of Object.entries(procedures)) {
      if (variations.some(v => normalized.includes(v))) {
        entities.procedure = proc
        break
      }
    }

    // Convênios
    const insurances = ['bradesco', 'sulamerica', 'unimed', 'amil', 'porto', 'notredame', 'mediservice', 'geap']
    for (const insurance of insurances) {
      if (normalized.includes(insurance)) {
        entities.insurance = insurance
        break
      }
    }

    // Unidades
    if (normalized.includes('vieiralves') || normalized.includes('vieira')) {
      entities.location = 'vieiralves'
    } else if (normalized.includes('sao jose') || normalized.includes('são jose')) {
      entities.location = 'sao-jose'
    }

    return entities
  }

  /**
   * Classifica intenção usando regras
   */
  classifyIntent(message: string): IntentResult | null {
    if (!this.enabled) return null

    const normalized = this.normalize(message)
    const keywords = this.extractKeywords(normalized)
    const entities = this.extractEntities(normalized, keywords)

    // Definir padrões de intenção
    const intentPatterns = {
      greeting: {
        keywords: ['oi', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'ola'],
        weight: 1.0
      },
      price: {
        keywords: ['quanto', 'valor', 'preco', 'custa', 'quanto custa', 'quanto e'],
        weight: 0.9
      },
      location: {
        keywords: ['onde', 'endereco', 'localizacao', 'como chegar', 'fica'],
        weight: 0.9
      },
      hours: {
        keywords: ['horario', 'abre', 'fecha', 'funciona', 'atende', 'que horas'],
        weight: 0.9
      },
      insurance: {
        keywords: ['convenio', 'plano', 'aceita', 'atende convenio', 'tem convenio'],
        weight: 0.8
      },
      appointment: {
        keywords: ['agendar', 'marcar', 'agenda', 'marcacao', 'horario disponivel', 'vaga'],
        weight: 0.9
      },
      procedures: {
        keywords: ['procedimento', 'tratamento', 'oferece', 'tem', 'faz'],
        weight: 0.7
      },
      confirmation: {
        keywords: ['sim', 'isso', 'correto', 'ok', 'beleza', 'pode ser', 'certo'],
        weight: 0.6
      },
      packages: {
        keywords: ['pacote', 'promocao', 'desconto', 'oferta'],
        weight: 0.8
      }
    }

    // Calcular score para cada intenção
    let bestIntent = ''
    let bestScore = 0

    for (const [intent, pattern] of Object.entries(intentPatterns)) {
      let score = 0
      
      for (const keyword of pattern.keywords) {
        if (normalized.includes(keyword)) {
          score += pattern.weight
        }
      }

      if (score > bestScore) {
        bestScore = score
        bestIntent = intent
      }
    }

    // Threshold de confiança
    if (bestScore < 0.5) {
      this.stats.misses++
      return null // Não tem confiança suficiente
    }

    // Ajustar confiança baseado em entidades
    let confidence = Math.min(bestScore / 2, 0.95) // Max 0.95

    // Se tem entidade, aumenta confiança
    if (Object.keys(entities).length > 0) {
      confidence = Math.min(confidence + 0.1, 0.98)
    }

    this.stats.hits++
    
    console.log(`🧠 [Local NLP] ✅ Intent: ${bestIntent}, Confidence: ${confidence.toFixed(2)}, Entities: ${Object.keys(entities).length}`)

    return {
      intent: bestIntent,
      confidence,
      entities
    }
  }

  /**
   * Obtém estatísticas
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: Math.round(hitRate * 100) / 100,
      enabled: this.enabled
    }
  }

  /**
   * Log de estatísticas
   */
  logStats() {
    const stats = this.getStats()
    console.log(`🧠 [Local NLP] 📊 ESTATÍSTICAS:`)
    console.log(`   Classificações: ${stats.hits}`)
    console.log(`   Falhas: ${stats.misses}`)
    console.log(`   Hit Rate: ${stats.hitRate}%`)
    console.log(`   Economia estimada: $${(stats.hits * 0.0001).toFixed(4)}`)
  }
}

// Exportar singleton
export const localNLPService = new LocalNLPService()
