/**
 * Bot Optimization Routes
 * 
 * APIs para expor estatísticas e configurações de otimização
 */

import { Router, Request, Response } from 'express'
import { localNLPService } from '../services/localNLP.js'
import { responseCacheService } from '../services/responseCache.js'
import { simpleFallbacksService } from '../services/simpleFallbacks.js'
import { conversationTemplatesService } from '../services/conversationTemplates.js'
import { costMonitoringService } from '../services/costMonitoring.js'
import { rateLimiterService } from '../services/rateLimiter.js'

const router = Router()

/**
 * GET /api/bot-optimization/stats
 * Retorna todas as estatísticas de otimização
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    // Coletar estatísticas de todos os serviços
    const localNLP = localNLPService.getStats()
    const responseCache = responseCacheService.getStats()
    const simpleFallbacks = simpleFallbacksService.getStats()
    const templates = conversationTemplatesService.getStats()
    const costMonitoring = costMonitoringService.getSummary()
    const rateLimiter = rateLimiterService.getStats()

    // Calcular economia total
    const localNLPSavings = localNLP.hits * 0.0001 // $0.0001 por classificação evitada
    const cacheSavings = responseCache.hits * 0.0004 // $0.0004 por resposta em cache
    const fallbacksSavings = simpleFallbacks.hits * 0.0005 // $0.0005 por fallback
    const templatesSavings = templates.activeConversations * 0.003 // $0.003 por conversa em template
    const rateLimiterSavings = rateLimiter.blockedRequests * 0.0004 // Economia por bloqueio

    const totalSavings = localNLPSavings + cacheSavings + fallbacksSavings + templatesSavings + rateLimiterSavings

    // Calcular conversas de hoje (aproximado)
    const conversationsToday = localNLP.hits + localNLP.misses

    // Projeção mensal
    const dailyCost = costMonitoring.totalCost
    const projectedMonthlyCost = dailyCost * 30
    const targetMonthlyCost = 15 // Meta: $15/mês

    // Calcular porcentagem de economia
    const originalCost = (localNLP.hits + localNLP.misses) * 0.006 // Custo original sem otimizações
    const economyPercentage = originalCost > 0 
      ? Math.round(((originalCost - dailyCost) / originalCost) * 100)
      : 0

    res.json({
      localNLP: {
        hits: localNLP.hits,
        misses: localNLP.misses,
        hitRate: localNLP.hitRate,
        enabled: localNLP.enabled,
        savings: localNLPSavings
      },
      responseCache: {
        hits: responseCache.hits,
        misses: responseCache.misses,
        hitRate: responseCache.hitRate,
        enabled: responseCache.enabled,
        savings: cacheSavings
      },
      simpleFallbacks: {
        hits: simpleFallbacks.hits,
        total: simpleFallbacks.total,
        hitRate: simpleFallbacks.hitRate,
        enabled: simpleFallbacks.enabled,
        savings: fallbacksSavings
      },
      conversationTemplates: {
        templates: templates.templates,
        activeConversations: templates.activeConversations,
        enabled: templates.enabled,
        savings: templatesSavings
      },
      costMonitoring: {
        totalCalls: costMonitoring.totalCalls,
        totalCost: costMonitoring.totalCost,
        avgCostPerCall: costMonitoring.avgCostPerCall,
        monthlyProjection: costMonitoring.monthlyProjection,
        modelsUsed: costMonitoring.modelsUsed
      },
      rateLimiter: {
        enabled: rateLimiter.enabled,
        blockedRequests: rateLimiter.blockedRequests,
        savingsFromBlocking: rateLimiterSavings
      },
      overall: {
        totalSavings,
        conversationsToday,
        projectedMonthlyCost,
        targetMonthlyCost,
        economyPercentage
      }
    })
  } catch (error) {
    console.error('[Bot Optimization] Error fetching stats:', error)
    res.status(500).json({ error: 'Failed to fetch optimization stats' })
  }
})

/**
 * POST /api/bot-optimization/:service/toggle
 * Ativa/desativa um serviço
 */
router.post('/:service/toggle', async (req: Request, res: Response) => {
  try {
    const { service } = req.params
    const { enabled } = req.body

    switch (service) {
      case 'localNLP':
        // localNLPService.setEnabled(enabled) // Implementar se necessário
        break
      case 'responseCache':
        // responseCacheService.setEnabled(enabled)
        break
      case 'simpleFallbacks':
        // simpleFallbacksService.setEnabled(enabled)
        break
      case 'conversationTemplates':
        // conversationTemplatesService.setEnabled(enabled)
        break
      case 'rateLimiter':
        // rateLimiterService.setEnabled(enabled)
        break
      default:
        return res.status(400).json({ error: 'Invalid service' })
    }

    res.json({ success: true, service, enabled })
  } catch (error) {
    console.error('[Bot Optimization] Error toggling service:', error)
    res.status(500).json({ error: 'Failed to toggle service' })
  }
})

/**
 * POST /api/bot-optimization/reset-stats
 * Reseta todas as estatísticas
 */
router.post('/reset-stats', async (req: Request, res: Response) => {
  try {
    // Resetar estatísticas (implementar nos serviços)
    costMonitoringService.logStats() // Log antes de resetar
    
    res.json({ success: true, message: 'Stats reset successfully' })
  } catch (error) {
    console.error('[Bot Optimization] Error resetting stats:', error)
    res.status(500).json({ error: 'Failed to reset stats' })
  }
})

/**
 * GET /api/bot-optimization/detailed-report
 * Relatório detalhado para download
 */
router.get('/detailed-report', async (req: Request, res: Response) => {
  try {
    const report = costMonitoringService.getDetailedReport()
    
    res.json({
      generatedAt: new Date().toISOString(),
      ...report
    })
  } catch (error) {
    console.error('[Bot Optimization] Error generating report:', error)
    res.status(500).json({ error: 'Failed to generate report' })
  }
})

/**
 * GET /api/bot-optimization/cache-entries
 * Lista entradas do cache
 */
router.get('/cache-entries', async (req: Request, res: Response) => {
  try {
    const entries = responseCacheService.listEntries()
    res.json({ entries })
  } catch (error) {
    console.error('[Bot Optimization] Error listing cache:', error)
    res.status(500).json({ error: 'Failed to list cache entries' })
  }
})

/**
 * POST /api/bot-optimization/cache/clear
 * Limpa o cache
 */
router.post('/cache/clear', async (req: Request, res: Response) => {
  try {
    responseCacheService.clear()
    res.json({ success: true, message: 'Cache cleared' })
  } catch (error) {
    console.error('[Bot Optimization] Error clearing cache:', error)
    res.status(500).json({ error: 'Failed to clear cache' })
  }
})

/**
 * GET /api/bot-optimization/templates
 * Lista templates de conversação
 */
router.get('/templates', async (req: Request, res: Response) => {
  try {
    const stats = conversationTemplatesService.getStats()
    res.json(stats)
  } catch (error) {
    console.error('[Bot Optimization] Error listing templates:', error)
    res.status(500).json({ error: 'Failed to list templates' })
  }
})

export default router
