import prisma from '../prisma/client.js'
import crypto from 'crypto'

/**
 * Serviço de Webhooks para notificar sistemas externos
 * 
 * Permite que parceiros (Google Ads, CRMs, etc) recebam notificações
 * em tempo real sobre eventos importantes (primeira mensagem, agendamento, etc)
 */
export class WebhookService {
  
  /**
   * Gera token único e seguro para webhook
   */
  static generateToken(): string {
    return `whk_${crypto.randomBytes(32).toString('hex')}`
  }
  
  /**
   * Cria novo webhook subscription
   */
  static async createSubscription(data: {
    name: string
    description?: string
    url: string
    events?: string[]
    metadata?: any
  }) {
    const token = this.generateToken()
    
    console.log(`📝 Criando webhook: ${data.name} -> ${data.url}`)
    
    return await prisma.webhookSubscription.create({
      data: {
        name: data.name,
        description: data.description,
        url: data.url,
        token,
        events: data.events || ['first_message'],
        isActive: true,
        metadata: data.metadata || {}
      }
    })
  }
  
  /**
   * Envia webhook para todos os subscriptions ativos de um evento
   */
  static async trigger(eventType: string, payload: any) {
    // Buscar todos os webhooks ativos para este tipo de evento
    const subscriptions = await prisma.webhookSubscription.findMany({
      where: {
        isActive: true,
        events: {
          has: eventType
        }
      }
    })
    
    if (subscriptions.length === 0) {
      console.log(`📤 Nenhum webhook ativo para evento "${eventType}"`)
      return
    }
    
    console.log(`📤 Enviando webhook "${eventType}" para ${subscriptions.length} subscription(s)`)
    
    // Enviar para cada subscription (em paralelo)
    const promises = subscriptions.map(sub => 
      this.sendWebhook(sub, eventType, payload)
    )
    
    await Promise.allSettled(promises)
  }
  
  /**
   * Envia webhook individual com retry automático
   */
  private static async sendWebhook(
    subscription: any,
    eventType: string,
    payload: any,
    retryCount = 0
  ): Promise<void> {
    const startTime = Date.now()
    let statusCode: number | null = null
    let error: string | null = null
    let success = false
    
    try {
      console.log(`📡 Enviando para ${subscription.name}: ${subscription.url}`)
      
      const response = await fetch(subscription.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Token': subscription.token,
          'X-Event-Type': eventType,
          'X-Webhook-ID': subscription.id,
          'User-Agent': 'ZorahApp-Webhook/1.0'
        },
        body: JSON.stringify({
          event: eventType,
          timestamp: new Date().toISOString(),
          data: payload
        }),
        signal: AbortSignal.timeout(10000) // 10s timeout
      })
      
      statusCode = response.status
      success = response.ok
      
      if (!response.ok) {
        const responseText = await response.text().catch(() => 'N/A')
        error = `HTTP ${response.status}: ${response.statusText}. Response: ${responseText.substring(0, 200)}`
        
        // Retry em caso de erro 5xx (máximo 3 tentativas)
        if (statusCode >= 500 && retryCount < 3) {
          console.log(`⚠️ Erro ${statusCode}, tentando novamente (${retryCount + 1}/3)...`)
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)))
          return this.sendWebhook(subscription, eventType, payload, retryCount + 1)
        }
      } else {
        console.log(`✅ Webhook enviado com sucesso para ${subscription.name} (${statusCode})`)
      }
      
    } catch (err: any) {
      error = err.message
      console.error(`❌ Erro ao enviar webhook para ${subscription.name}:`, err)
      
      // Retry em caso de timeout ou erro de rede
      if ((err.name === 'TimeoutError' || err.name === 'AbortError') && retryCount < 3) {
        console.log(`⚠️ Timeout, tentando novamente (${retryCount + 1}/3)...`)
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)))
        return this.sendWebhook(subscription, eventType, payload, retryCount + 1)
      }
    } finally {
      const responseTime = Date.now() - startTime
      
      // Salvar log detalhado
      try {
        await prisma.webhookLog.create({
          data: {
            subscriptionId: subscription.id,
            eventType,
            payload: payload as any,
            statusCode,
            responseTime,
            error,
            success
          }
        })
      } catch (logError) {
        console.error('⚠️ Erro ao salvar log de webhook:', logError)
      }
      
      // Atualizar lastTriggeredAt se sucesso
      if (success) {
        try {
          await prisma.webhookSubscription.update({
            where: { id: subscription.id },
            data: { lastTriggeredAt: new Date() }
          })
        } catch (updateError) {
          console.error('⚠️ Erro ao atualizar lastTriggeredAt:', updateError)
        }
      }
    }
  }
  
  /**
   * Valida token de webhook
   */
  static async validateToken(token: string): Promise<boolean> {
    try {
      const subscription = await prisma.webhookSubscription.findUnique({
        where: { token, isActive: true }
      })
      return !!subscription
    } catch (error) {
      console.error('Erro ao validar token:', error)
      return false
    }
  }
  
  /**
   * Lista todos os webhooks
   */
  static async list() {
    return await prisma.webhookSubscription.findMany({
      include: {
        _count: {
          select: { logs: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
  }
  
  /**
   * Busca um webhook por ID
   */
  static async getById(id: string) {
    return await prisma.webhookSubscription.findUnique({
      where: { id },
      include: {
        _count: {
          select: { logs: true }
        }
      }
    })
  }
  
  /**
   * Atualiza webhook
   */
  static async update(id: string, data: {
    name?: string
    description?: string
    url?: string
    events?: string[]
    isActive?: boolean
    metadata?: any
  }) {
    return await prisma.webhookSubscription.update({
      where: { id },
      data
    })
  }
  
  /**
   * Desativa webhook (soft delete)
   */
  static async deactivate(id: string) {
    return await prisma.webhookSubscription.update({
      where: { id },
      data: { isActive: false }
    })
  }
  
  /**
   * Remove webhook permanentemente
   */
  static async delete(id: string) {
    // Remover logs primeiro (cascade automático pelo schema)
    return await prisma.webhookSubscription.delete({
      where: { id }
    })
  }
  
  /**
   * Lista logs de um webhook específico
   */
  static async getLogs(subscriptionId: string, options?: {
    limit?: number
    offset?: number
    onlyErrors?: boolean
  }) {
    const { limit = 50, offset = 0, onlyErrors = false } = options || {}
    
    const where: any = { subscriptionId }
    if (onlyErrors) {
      where.success = false
    }
    
    const [logs, total] = await Promise.all([
      prisma.webhookLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.webhookLog.count({ where })
    ])
    
    return { logs, total, limit, offset }
  }
  
  /**
   * Estatísticas de um webhook
   */
  static async getStats(subscriptionId: string, days = 7) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    
    const [totalLogs, successfulLogs, failedLogs, avgResponseTime] = await Promise.all([
      // Total de tentativas
      prisma.webhookLog.count({
        where: {
          subscriptionId,
          createdAt: { gte: since }
        }
      }),
      // Sucessos
      prisma.webhookLog.count({
        where: {
          subscriptionId,
          createdAt: { gte: since },
          success: true
        }
      }),
      // Falhas
      prisma.webhookLog.count({
        where: {
          subscriptionId,
          createdAt: { gte: since },
          success: false
        }
      }),
      // Tempo médio de resposta
      prisma.webhookLog.aggregate({
        where: {
          subscriptionId,
          createdAt: { gte: since },
          success: true,
          responseTime: { not: null }
        },
        _avg: {
          responseTime: true
        }
      })
    ])
    
    const successRate = totalLogs > 0 ? (successfulLogs / totalLogs) * 100 : 0
    
    return {
      totalRequests: totalLogs,
      successful: successfulLogs,
      failed: failedLogs,
      successRate: successRate.toFixed(2) + '%',
      avgResponseTime: avgResponseTime._avg.responseTime?.toFixed(0) + 'ms' || 'N/A',
      period: `Últimos ${days} dias`
    }
  }
  
  /**
   * Reenviar webhook (útil para testes ou retry manual)
   */
  static async resend(logId: string) {
    const log = await prisma.webhookLog.findUnique({
      where: { id: logId },
      include: { subscription: true }
    })
    
    if (!log || !log.subscription.isActive) {
      throw new Error('Log ou subscription não encontrado/ativo')
    }
    
    console.log(`🔄 Reenviando webhook: ${log.eventType}`)
    await this.sendWebhook(log.subscription, log.eventType, log.payload)
  }
}

export default WebhookService
