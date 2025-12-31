import axios, { AxiosError } from 'axios'
import { intelligentBotService } from './intelligentBot.js'

/**
 * Serviço para integração com N8N Bot Intelligence
 * Envia mensagens para processamento no N8N e gerencia fallback
 */
export class N8NBotService {
  private n8nWebhookUrl: string
  private timeout: number
  private fallbackEnabled: boolean
  private retries: number

  constructor() {
    this.n8nWebhookUrl = process.env.N8N_WEBHOOK_URL || ''
    this.timeout = parseInt(process.env.N8N_TIMEOUT || '30000')
    this.fallbackEnabled = process.env.N8N_FALLBACK_ENABLED !== 'false'
    this.retries = parseInt(process.env.N8N_RETRIES || '2')
  }

  /**
   * Verifica se N8N está configurado
   */
  isEnabled(): boolean {
    return !!this.n8nWebhookUrl
  }

  /**
   * Envia mensagem para processamento no N8N
   */
  async processMessage(data: {
    message: string
    phone: string
    conversationId: string
    patient?: any
    context?: any
  }): Promise<{
    success: boolean
    message: string
    intent?: string
    entities?: any
    source: 'n8n' | 'fallback'
    error?: string
  }> {
    // Se N8N não estiver configurado, usa fallback
    if (!this.isEnabled()) {
      console.log('⚠️ N8N não configurado, usando fallback')
      return this.useFallback(data)
    }

    let lastError: Error | null = null

    // Tenta com retries
    for (let attempt = 1; attempt <= this.retries; attempt++) {
      try {
        console.log(`🔄 Enviando para N8N (tentativa ${attempt}/${this.retries})...`)

        const response = await axios.post(
          this.n8nWebhookUrl,
          {
            message: data.message,
            phone: data.phone,
            conversationId: data.conversationId,
            patient: data.patient || {},
            context: data.context || {}
          },
          {
            timeout: this.timeout,
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'ZorahApp-System',
              'X-Request-ID': data.conversationId
            }
          }
        )

        console.log('✅ Resposta do N8N recebida')

        return {
          success: true,
          message: response.data.message || 'Processado',
          intent: response.data.intent,
          entities: response.data.entities,
          source: 'n8n'
        }
      } catch (error) {
        lastError = error as Error
        console.error(`❌ Erro N8N (tentativa ${attempt}):`, this.getErrorMessage(error))

        // Se não for a última tentativa, aguarda antes de retry
        if (attempt < this.retries) {
          await this.sleep(1000 * attempt) // Backoff exponencial
        }
      }
    }

    // Todas as tentativas falharam
    console.error('❌ Todas as tentativas N8N falharam')

    // Se fallback está habilitado, usa sistema antigo
    if (this.fallbackEnabled) {
      console.log('🔄 Usando fallback (sistema antigo)')
      return this.useFallback(data, lastError)
    }

    // Retorna erro
    return {
      success: false,
      message: 'Desculpe, estou com dificuldades técnicas. Um atendente vai te ajudar em breve.',
      source: 'fallback',
      error: this.getErrorMessage(lastError)
    }
  }

  /**
   * Usa sistema antigo como fallback
   */
  private async useFallback(
    data: {
      message: string
      phone: string
      conversationId: string
      patient?: any
      context?: any
    },
    error?: Error | null
  ): Promise<any> {
    try {
      const response = await intelligentBotService.processMessage(
        data.message,
        data.phone,
        data.conversationId,
        data.context
      )

      return {
        ...response,
        source: 'fallback',
        fallbackReason: error ? this.getErrorMessage(error) : 'N8N não configurado'
      }
    } catch (fallbackError) {
      console.error('❌ Fallback também falhou:', fallbackError)

      return {
        success: false,
        message: 'Desculpe, ocorreu um erro. Por favor, tente novamente.',
        source: 'fallback',
        error: this.getErrorMessage(fallbackError)
      }
    }
  }

  /**
   * Extrai mensagem de erro
   */
  private getErrorMessage(error: any): string {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError
      if (axiosError.code === 'ECONNREFUSED') {
        return 'N8N não está acessível'
      }
      if (axiosError.code === 'ETIMEDOUT') {
        return 'Timeout ao conectar com N8N'
      }
      if (axiosError.response) {
        return `N8N retornou erro ${axiosError.response.status}`
      }
      return axiosError.message
    }

    if (error instanceof Error) {
      return error.message
    }

    return 'Erro desconhecido'
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Testa conexão com N8N
   */
  async testConnection(): Promise<{
    success: boolean
    latency?: number
    error?: string
  }> {
    if (!this.isEnabled()) {
      return {
        success: false,
        error: 'N8N_WEBHOOK_URL não configurada'
      }
    }

    const startTime = Date.now()

    try {
      await axios.post(
        this.n8nWebhookUrl,
        {
          message: 'test',
          phone: '5500000000000',
          conversationId: 'test-connection',
          patient: {},
          context: {}
        },
        {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      const latency = Date.now() - startTime

      return {
        success: true,
        latency
      }
    } catch (error) {
      return {
        success: false,
        error: this.getErrorMessage(error)
      }
    }
  }

  /**
   * Obtém estatísticas do serviço
   */
  getStats() {
    return {
      enabled: this.isEnabled(),
      webhookUrl: this.n8nWebhookUrl ? '***configured***' : 'not set',
      timeout: this.timeout,
      retries: this.retries,
      fallbackEnabled: this.fallbackEnabled
    }
  }
}

export const n8nBotService = new N8NBotService()
