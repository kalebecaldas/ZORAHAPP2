import { Router, Request, Response } from 'express'
import { aiConfigurationService } from '../services/aiConfigurationService.js'
import prisma from '../prisma/client.js'

const router = Router()

// Middleware de autenticação (reutilizar do sistema)
const auth = (req: Request, res: Response, next: any) => {
    // TODO: Implementar autenticação real
    next()
}

// ============================================
// CONFIGURAÇÃO DA IA
// ============================================

/**
 * GET /api/ai-config
 * Busca a configuração ativa da IA
 */
router.get('/', auth, async (req: Request, res: Response): Promise<void> => {
    try {
        const config = await aiConfigurationService.getActiveConfiguration()
        res.json(config)
    } catch (error) {
        console.error('Erro ao buscar configuração:', error)
        res.status(500).json({ error: 'Erro ao buscar configuração' })
    }
})

/**
 * PUT /api/ai-config/:id
 * Atualiza a configuração da IA
 */
router.put('/:id', auth, async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params
        const data = req.body

        const config = await aiConfigurationService.updateConfiguration(id, data)
        res.json(config)
    } catch (error) {
        console.error('Erro ao atualizar configuração:', error)
        res.status(500).json({ error: 'Erro ao atualizar configuração' })
    }
})

// ============================================
// EXEMPLOS DE CONVERSAS
// ============================================

/**
 * GET /api/ai-config/examples
 * Lista todos os exemplos de conversas
 */
router.get('/examples', auth, async (req: Request, res: Response): Promise<void> => {
    try {
        const { category } = req.query

        const config = await aiConfigurationService.getActiveConfiguration()

        let examples = config.examples

        if (category) {
            examples = examples.filter(ex => ex.category === category)
        }

        res.json(examples)
    } catch (error) {
        console.error('Erro ao buscar exemplos:', error)
        res.status(500).json({ error: 'Erro ao buscar exemplos' })
    }
})

/**
 * POST /api/ai-config/examples
 * Adiciona um novo exemplo de conversa
 */
router.post('/examples', auth, async (req: Request, res: Response): Promise<void> => {
    try {
        const config = await aiConfigurationService.getActiveConfiguration()
        const example = await aiConfigurationService.addExample(config.id, req.body)
        res.json(example)
    } catch (error) {
        console.error('Erro ao adicionar exemplo:', error)
        res.status(500).json({ error: 'Erro ao adicionar exemplo' })
    }
})

/**
 * PUT /api/ai-config/examples/:id
 * Atualiza um exemplo de conversa
 */
router.put('/examples/:id', auth, async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params
        const example = await prisma.aIExample.update({
            where: { id },
            data: req.body
        })
        res.json(example)
    } catch (error) {
        console.error('Erro ao atualizar exemplo:', error)
        res.status(500).json({ error: 'Erro ao atualizar exemplo' })
    }
})

/**
 * DELETE /api/ai-config/examples/:id
 * Remove um exemplo de conversa
 */
router.delete('/examples/:id', auth, async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params
        await prisma.aIExample.delete({ where: { id } })
        res.json({ success: true })
    } catch (error) {
        console.error('Erro ao remover exemplo:', error)
        res.status(500).json({ error: 'Erro ao remover exemplo' })
    }
})

// ============================================
// REGRAS DE TRANSFERÊNCIA
// ============================================

/**
 * GET /api/ai-config/transfer-rules
 * Lista todas as regras de transferência
 */
router.get('/transfer-rules', auth, async (req: Request, res: Response): Promise<void> => {
    try {
        const config = await aiConfigurationService.getActiveConfiguration()
        res.json(config.transferRules)
    } catch (error) {
        console.error('Erro ao buscar regras:', error)
        res.status(500).json({ error: 'Erro ao buscar regras' })
    }
})

/**
 * POST /api/ai-config/transfer-rules
 * Adiciona uma nova regra de transferência
 */
router.post('/transfer-rules', auth, async (req: Request, res: Response): Promise<void> => {
    try {
        const config = await aiConfigurationService.getActiveConfiguration()
        const rule = await aiConfigurationService.addTransferRule(config.id, req.body)
        res.json(rule)
    } catch (error) {
        console.error('Erro ao adicionar regra:', error)
        res.status(500).json({ error: 'Erro ao adicionar regra' })
    }
})

/**
 * PUT /api/ai-config/transfer-rules/:id
 * Atualiza uma regra de transferência
 */
router.put('/transfer-rules/:id', auth, async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params
        const rule = await prisma.transferRule.update({
            where: { id },
            data: req.body
        })
        res.json(rule)
    } catch (error) {
        console.error('Erro ao atualizar regra:', error)
        res.status(500).json({ error: 'Erro ao atualizar regra' })
    }
})

/**
 * DELETE /api/ai-config/transfer-rules/:id
 * Remove uma regra de transferência
 */
router.delete('/transfer-rules/:id', auth, async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params
        await prisma.transferRule.delete({ where: { id } })
        res.json({ success: true })
    } catch (error) {
        console.error('Erro ao remover regra:', error)
        res.status(500).json({ error: 'Erro ao remover regra' })
    }
})

/**
 * POST /api/ai-config/test
 * Testa a IA com uma mensagem
 */
router.post('/test', auth, async (req: Request, res: Response): Promise<void> => {
    try {
        const { message, conversationId, phone } = req.body

        const { conversationalAI } = await import('../services/conversationalAI.js')
        const ai = conversationalAI.getInstance()

        const response = await ai.generateResponse(message, conversationId || 'test', phone || '5500000000000')

        res.json(response)
    } catch (error) {
        console.error('Erro ao testar IA:', error)
        res.status(500).json({ error: 'Erro ao testar IA' })
    }
})

export default router
