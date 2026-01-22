import { Router, type Request, type Response } from 'express'
import { WebhookService } from '../services/webhookService.js'
import { authMiddleware } from '../utils/auth.js'

const router = Router()

// ✅ Todas as rotas protegidas por autenticação (apenas usuários logados podem gerenciar webhooks)
router.use(authMiddleware)

/**
 * GET /api/webhooks
 * Lista todos os webhooks cadastrados
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const webhooks = await WebhookService.list()
    res.json({ 
      success: true, 
      data: webhooks,
      total: webhooks.length
    })
  } catch (error: any) {
    console.error('Erro ao listar webhooks:', error)
    res.status(500).json({ 
      success: false,
      error: 'Erro ao listar webhooks',
      message: error.message 
    })
  }
})

/**
 * GET /api/webhooks/:id
 * Busca webhook específico por ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const webhook = await WebhookService.getById(id)
    
    if (!webhook) {
      return res.status(404).json({ 
        success: false,
        error: 'Webhook não encontrado' 
      })
    }
    
    res.json({ success: true, data: webhook })
  } catch (error: any) {
    console.error('Erro ao buscar webhook:', error)
    res.status(500).json({ 
      success: false,
      error: 'Erro ao buscar webhook',
      message: error.message 
    })
  }
})

/**
 * POST /api/webhooks
 * Cria novo webhook
 * 
 * Body: {
 *   name: string (obrigatório)
 *   description?: string
 *   url: string (obrigatório)
 *   events?: string[] (padrão: ['first_message'])
 *   metadata?: any
 * }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    console.log('📥 Recebendo requisição para criar webhook:', {
      body: req.body,
      hasName: !!req.body.name,
      hasUrl: !!req.body.url,
      events: req.body.events
    })
    
    const { name, description, url, events, metadata } = req.body
    
    // Validações
    if (!name || !url) {
      console.log('❌ Validação falhou: nome ou URL faltando', { name, url })
      return res.status(400).json({ 
        success: false,
        error: 'Nome e URL são obrigatórios' 
      })
    }
    
    // Validar formato da URL
    try {
      new URL(url)
      console.log('✅ URL válida:', url)
    } catch (urlError) {
      console.log('❌ URL inválida:', url, urlError)
      return res.status(400).json({ 
        success: false,
        error: 'URL inválida. Use formato completo: https://exemplo.com/webhook' 
      })
    }
    
    // Validar eventos
    const validEvents = ['first_message', 'appointment_created', 'conversation_closed', 'patient_registered']
    if (events && Array.isArray(events)) {
      const invalidEvents = events.filter((e: string) => !validEvents.includes(e))
      if (invalidEvents.length > 0) {
        return res.status(400).json({ 
          success: false,
          error: `Eventos inválidos: ${invalidEvents.join(', ')}`,
          validEvents
        })
      }
    }
    
    console.log('✅ Validações passaram, criando webhook...')
    const subscription = await WebhookService.createSubscription({
      name,
      description,
      url,
      events,
      metadata
    })
    
    console.log('✅ Webhook criado com sucesso:', subscription.id)
    res.status(201).json({ 
      success: true, 
      data: subscription,
      message: '🎉 Webhook criado com sucesso! Guarde o token com segurança.'
    })
  } catch (error: any) {
    console.error('Erro ao criar webhook:', error)
    res.status(500).json({ 
      success: false,
      error: 'Erro ao criar webhook',
      message: error.message 
    })
  }
})

/**
 * PATCH /api/webhooks/:id
 * Atualiza webhook existente
 * 
 * Body: {
 *   name?: string
 *   description?: string
 *   url?: string
 *   events?: string[]
 *   isActive?: boolean
 *   metadata?: any
 * }
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { name, description, url, events, isActive, metadata } = req.body
    
    // Validar URL se fornecida
    if (url) {
      try {
        new URL(url)
      } catch {
        return res.status(400).json({ 
          success: false,
          error: 'URL inválida' 
        })
      }
    }
    
    const updated = await WebhookService.update(id, {
      name,
      description,
      url,
      events,
      isActive,
      metadata
    })
    
    res.json({ 
      success: true, 
      data: updated,
      message: 'Webhook atualizado com sucesso'
    })
  } catch (error: any) {
    console.error('Erro ao atualizar webhook:', error)
    res.status(500).json({ 
      success: false,
      error: 'Erro ao atualizar webhook',
      message: error.message 
    })
  }
})

/**
 * POST /api/webhooks/:id/deactivate
 * Desativa webhook (soft delete)
 */
router.post('/:id/deactivate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    await WebhookService.deactivate(id)
    
    res.json({ 
      success: true, 
      message: 'Webhook desativado com sucesso' 
    })
  } catch (error: any) {
    console.error('Erro ao desativar webhook:', error)
    res.status(500).json({ 
      success: false,
      error: 'Erro ao desativar webhook',
      message: error.message 
    })
  }
})

/**
 * DELETE /api/webhooks/:id
 * Remove webhook permanentemente
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    await WebhookService.delete(id)
    
    res.json({ 
      success: true, 
      message: 'Webhook removido permanentemente' 
    })
  } catch (error: any) {
    console.error('Erro ao remover webhook:', error)
    res.status(500).json({ 
      success: false,
      error: 'Erro ao remover webhook',
      message: error.message 
    })
  }
})

/**
 * GET /api/webhooks/:id/logs
 * Lista logs de um webhook específico
 * 
 * Query params:
 *   limit?: number (padrão: 50)
 *   offset?: number (padrão: 0)
 *   onlyErrors?: boolean (padrão: false)
 */
router.get('/:id/logs', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { limit, offset, onlyErrors } = req.query
    
    const result = await WebhookService.getLogs(id, {
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
      onlyErrors: onlyErrors === 'true'
    })
    
    res.json({ 
      success: true, 
      data: result.logs,
      pagination: {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        hasMore: result.offset + result.limit < result.total
      }
    })
  } catch (error: any) {
    console.error('Erro ao listar logs:', error)
    res.status(500).json({ 
      success: false,
      error: 'Erro ao listar logs',
      message: error.message 
    })
  }
})

/**
 * GET /api/webhooks/:id/stats
 * Estatísticas de um webhook
 * 
 * Query params:
 *   days?: number (padrão: 7)
 */
router.get('/:id/stats', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { days } = req.query
    
    const stats = await WebhookService.getStats(
      id, 
      days ? Number(days) : 7
    )
    
    res.json({ 
      success: true, 
      data: stats
    })
  } catch (error: any) {
    console.error('Erro ao buscar estatísticas:', error)
    res.status(500).json({ 
      success: false,
      error: 'Erro ao buscar estatísticas',
      message: error.message 
    })
  }
})

/**
 * POST /api/webhooks/:id/test
 * Envia payload de teste para o webhook
 */
router.post('/:id/test', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    
    const webhook = await WebhookService.getById(id)
    if (!webhook) {
      return res.status(404).json({ 
        success: false,
        error: 'Webhook não encontrado' 
      })
    }
    
    if (!webhook.isActive) {
      return res.status(400).json({ 
        success: false,
        error: 'Webhook está desativado. Ative-o antes de testar.' 
      })
    }
    
    // Enviar payload de teste
    await WebhookService.trigger('test', {
      message: 'Este é um teste de webhook',
      timestamp: new Date().toISOString(),
      webhookName: webhook.name
    })
    
    res.json({ 
      success: true, 
      message: 'Teste enviado! Verifique os logs para ver o resultado.' 
    })
  } catch (error: any) {
    console.error('Erro ao testar webhook:', error)
    res.status(500).json({ 
      success: false,
      error: 'Erro ao testar webhook',
      message: error.message 
    })
  }
})

/**
 * POST /api/webhooks/logs/:logId/resend
 * Reenvia um webhook baseado em um log anterior
 */
router.post('/logs/:logId/resend', async (req: Request, res: Response) => {
  try {
    const { logId } = req.params
    
    await WebhookService.resend(logId)
    
    res.json({ 
      success: true, 
      message: 'Webhook reenviado com sucesso' 
    })
  } catch (error: any) {
    console.error('Erro ao reenviar webhook:', error)
    res.status(500).json({ 
      success: false,
      error: 'Erro ao reenviar webhook',
      message: error.message 
    })
  }
})

export default router
