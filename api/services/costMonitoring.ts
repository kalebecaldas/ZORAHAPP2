/**
 * Cost Monitoring Service
 * 
 * Monitora custos de uso do GPT em tempo real
 * Fornece métricas e alertas de custo
 */

interface GPTUsage {
  model: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  estimatedCost: number
  timestamp: Date
  service: string
}

interface CostSummary {
  totalCalls: number
  totalTokens: number
  totalCost: number
  costByModel: Record<string, number>
  costByService: Record<string, number>
  avgTokensPerCall: number
  avgCostPerCall: number
}

class CostMonitoringService {
  private usageLog: GPTUsage[] = []
  private enabled: boolean
  
  // Preços por 1M tokens (em USD)
  private prices: Record<string, { input: number; output: number }> = {
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
    'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
    'gpt-4o': { input: 2.50, output: 10.00 },
    'gpt-4-turbo': { input: 10.00, output: 30.00 },
    'gpt-5-nano': { input: 0.05, output: 0.40 },
    'o1-preview': { input: 15.00, output: 60.00 },
    'o4-mini': { input: 1.10, output: 4.40 }
  }

  constructor() {
    this.enabled = true
    console.log(`💰 [Cost Monitor] Inicializado`)
  }

  /**
   * Calcula custo estimado baseado em tokens
   */
  private calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const modelPrices = this.prices[model] || this.prices['gpt-3.5-turbo']
    
    const inputCost = (inputTokens / 1000000) * modelPrices.input
    const outputCost = (outputTokens / 1000000) * modelPrices.output
    
    return inputCost + outputCost
  }

  /**
   * Registra uso do GPT
   */
  logUsage(params: {
    model: string
    inputTokens: number
    outputTokens: number
    service: string
  }): void {
    if (!this.enabled) return

    const { model, inputTokens, outputTokens, service } = params
    const totalTokens = inputTokens + outputTokens
    const estimatedCost = this.calculateCost(model, inputTokens, outputTokens)

    const usage: GPTUsage = {
      model,
      inputTokens,
      outputTokens,
      totalTokens,
      estimatedCost,
      timestamp: new Date(),
      service
    }

    this.usageLog.push(usage)

    // Log detalhado
    console.log(
      `💰 [Cost] ${service} | Model: ${model} | ` +
      `Tokens: ${totalTokens} (in: ${inputTokens}, out: ${outputTokens}) | ` +
      `Cost: $${estimatedCost.toFixed(6)}`
    )

    // Manter apenas últimas 1000 entradas em memória
    if (this.usageLog.length > 1000) {
      this.usageLog = this.usageLog.slice(-1000)
    }
  }

  /**
   * Obtém resumo de custos
   */
  getSummary(since?: Date): CostSummary {
    const logs = since 
      ? this.usageLog.filter(log => log.timestamp >= since)
      : this.usageLog

    if (logs.length === 0) {
      return {
        totalCalls: 0,
        totalTokens: 0,
        totalCost: 0,
        costByModel: {},
        costByService: {},
        avgTokensPerCall: 0,
        avgCostPerCall: 0
      }
    }

    const summary: CostSummary = {
      totalCalls: logs.length,
      totalTokens: logs.reduce((sum, log) => sum + log.totalTokens, 0),
      totalCost: logs.reduce((sum, log) => sum + log.estimatedCost, 0),
      costByModel: {},
      costByService: {},
      avgTokensPerCall: 0,
      avgCostPerCall: 0
    }

    // Agrupar por modelo
    logs.forEach(log => {
      summary.costByModel[log.model] = (summary.costByModel[log.model] || 0) + log.estimatedCost
    })

    // Agrupar por serviço
    logs.forEach(log => {
      summary.costByService[log.service] = (summary.costByService[log.service] || 0) + log.estimatedCost
    })

    // Calcular médias
    summary.avgTokensPerCall = summary.totalTokens / summary.totalCalls
    summary.avgCostPerCall = summary.totalCost / summary.totalCalls

    return summary
  }

  /**
   * Exibe relatório de custos
   */
  printReport(period: 'hour' | 'day' | 'week' | 'month' | 'all' = 'day'): void {
    let since: Date | undefined

    switch (period) {
      case 'hour':
        since = new Date(Date.now() - 60 * 60 * 1000)
        break
      case 'day':
        since = new Date(Date.now() - 24 * 60 * 60 * 1000)
        break
      case 'week':
        since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        break
    }

    const summary = this.getSummary(since)

    console.log(`\n${'='.repeat(80)}`)
    console.log(`💰 RELATÓRIO DE CUSTOS GPT - ${period.toUpperCase()}`)
    console.log(`${'='.repeat(80)}`)
    console.log(`📊 Total de chamadas: ${summary.totalCalls}`)
    console.log(`🔢 Total de tokens: ${summary.totalTokens.toLocaleString()}`)
    console.log(`💵 Custo total: $${summary.totalCost.toFixed(4)}`)
    console.log(`📈 Média tokens/chamada: ${Math.round(summary.avgTokensPerCall)}`)
    console.log(`💰 Média custo/chamada: $${summary.avgCostPerCall.toFixed(6)}`)

    if (Object.keys(summary.costByModel).length > 0) {
      console.log(`\n📊 Custo por Modelo:`)
      Object.entries(summary.costByModel)
        .sort(([, a], [, b]) => b - a)
        .forEach(([model, cost]) => {
          const percentage = (cost / summary.totalCost * 100).toFixed(1)
          console.log(`   ${model}: $${cost.toFixed(4)} (${percentage}%)`)
        })
    }

    if (Object.keys(summary.costByService).length > 0) {
      console.log(`\n🔧 Custo por Serviço:`)
      Object.entries(summary.costByService)
        .sort(([, a], [, b]) => b - a)
        .forEach(([service, cost]) => {
          const percentage = (cost / summary.totalCost * 100).toFixed(1)
          console.log(`   ${service}: $${cost.toFixed(4)} (${percentage}%)`)
        })
    }

    // Projeção mensal
    const daysInPeriod = period === 'hour' ? 1/24 : 
                         period === 'day' ? 1 : 
                         period === 'week' ? 7 : 
                         period === 'month' ? 30 : 1

    if (daysInPeriod < 30 && summary.totalCalls > 0) {
      const monthlyProjection = (summary.totalCost / daysInPeriod) * 30
      console.log(`\n📅 Projeção mensal: $${monthlyProjection.toFixed(2)}`)
    }

    console.log(`${'='.repeat(80)}\n`)
  }

  /**
   * Limpa histórico
   */
  clearLog(): void {
    const oldSize = this.usageLog.length
    this.usageLog = []
    console.log(`💰 [Cost Monitor] Log limpo (${oldSize} entradas removidas)`)
  }

  /**
   * Obtém log completo
   */
  getLog(): GPTUsage[] {
    return [...this.usageLog]
  }

  /**
   * Gera relatório detalhado
   */
  getDetailedReport() {
    const summary = this.getSummary()
    const dailyCost = summary.totalCost
    const monthlyProjection = dailyCost * 30

    // Contar uso por modelo
    const modelsUsed: Record<string, number> = {}
    this.usageLog.forEach(log => {
      modelsUsed[log.model] = (modelsUsed[log.model] || 0) + 1
    })

    return {
      ...summary,
      monthlyProjection,
      modelsUsed,
      recentCalls: this.usageLog.slice(-10)
    }
  }
}

// Exportar singleton
export const costMonitoringService = new CostMonitoringService()

// Relatório automático a cada hora (se habilitado)
if (process.env.NODE_ENV !== 'test') {
  setInterval(() => {
    const summary = costMonitoringService.getSummary()
    if (summary.totalCalls > 0) {
      console.log(
        `\n💰 [Cost Monitor] Última hora: ` +
        `${summary.totalCalls} chamadas, ` +
        `${summary.totalTokens.toLocaleString()} tokens, ` +
        `$${summary.totalCost.toFixed(4)}\n`
      )
    }
  }, 60 * 60 * 1000) // A cada hora
}
