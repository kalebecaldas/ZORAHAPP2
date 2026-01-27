import { Router, Request, Response } from 'express'
import prisma from '../prisma/client.js'
import { authMiddleware, authorize } from '../utils/auth.js'
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'

const router = Router()

// Aplicar auth em todas as rotas
router.use(authMiddleware)

/**
 * Helper: Calcular datas de início e fim com base no período
 */
function getPeriodDates(period: string) {
    const now = new Date()
    
    switch(period) {
        case 'DAILY':
            return {
                startDate: startOfDay(now),
                endDate: endOfDay(now)
            }
        case 'WEEKLY':
            return {
                startDate: startOfWeek(now, { weekStartsOn: 0 }), // Domingo
                endDate: endOfWeek(now, { weekStartsOn: 0 })
            }
        case 'MONTHLY':
            return {
                startDate: startOfMonth(now),
                endDate: endOfMonth(now)
            }
        default:
            return {
                startDate: startOfDay(now),
                endDate: endOfDay(now)
            }
    }
}

/**
 * Helper: Calcular valor atual de uma meta
 */
async function calculateCurrentValue(goal: any) {
    const { userId, type, period } = goal
    const { startDate, endDate } = getPeriodDates(period)
    
    switch(type) {
        case 'CONVERSATIONS': {
            // Número de conversas encerradas
            const count = await prisma.conversation.count({
                where: {
                    assignedToId: userId,
                    status: 'FECHADA',
                    closedAt: { gte: startDate, lte: endDate }
                }
            })
            return count
        }
            
        case 'APPOINTMENTS': {
            // Número de agendamentos realizados
            const count = await prisma.conversation.count({
                where: {
                    assignedToId: userId,
                    closeCategory: { in: ['AGENDAMENTO', 'AGENDAMENTO_PARTICULAR'] },
                    closedAt: { gte: startDate, lte: endDate }
                }
            })
            return count
        }
            
        case 'CONVERSION_RATE': {
            // Taxa de conversão (%)
            const total = await prisma.conversation.count({
                where: { 
                    assignedToId: userId, 
                    status: 'FECHADA',
                    closedAt: { gte: startDate, lte: endDate } 
                }
            })
            const converted = await prisma.conversation.count({
                where: {
                    assignedToId: userId,
                    closeCategory: { in: ['AGENDAMENTO', 'AGENDAMENTO_PARTICULAR'] },
                    closedAt: { gte: startDate, lte: endDate }
                }
            })
            return total > 0 ? (converted / total) * 100 : 0
        }
            
        case 'RESPONSE_TIME': {
            // Tempo médio de resposta (minutos)
            const result = await prisma.$queryRaw<Array<{ avg_minutes: number | null }>>`
                SELECT AVG(EXTRACT(EPOCH FROM (m2.timestamp - m1.timestamp))) / 60 as avg_minutes
                FROM "Message" m1
                INNER JOIN "Message" m2 
                    ON m1."conversationId" = m2."conversationId"
                    AND m2.timestamp > m1.timestamp
                    AND m2.direction = 'SENT'
                INNER JOIN "Conversation" c
                    ON c.id = m1."conversationId"
                WHERE m1.direction = 'RECEIVED'
                    AND c."assignedToId" = ${userId}
                    AND c."closedAt" >= ${startDate}
                    AND c."closedAt" <= ${endDate}
                    AND m2.timestamp = (
                        SELECT MIN(m3.timestamp)
                        FROM "Message" m3
                        WHERE m3."conversationId" = m1."conversationId"
                            AND m3.direction = 'SENT'
                            AND m3.timestamp > m1.timestamp
                    )
            `
            return result[0]?.avg_minutes ? Math.round(result[0].avg_minutes * 10) / 10 : 0
        }
            
        default:
            return 0
    }
}

/**
 * GET /api/goals/users/:userId
 * Buscar metas de um usuário
 */
router.get('/users/:userId', async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId } = req.params
        
        // Apenas MASTER/ADMIN podem ver metas de outros
        // Atendente pode ver apenas suas próprias
        if (userId !== req.user?.id && !['MASTER', 'ADMIN'].includes(req.user?.role || '')) {
            res.status(403).json({ error: 'Sem permissão para visualizar metas de outro usuário' })
            return
        }
        
        const goals = await prisma.goal.findMany({
            where: { userId, isActive: true },
            orderBy: { type: 'asc' }
        })
        
        res.json(goals)
    } catch (error) {
        console.error('Erro ao buscar metas:', error)
        res.status(500).json({ error: 'Erro ao buscar metas' })
    }
})

/**
 * POST /api/goals
 * Criar ou atualizar meta
 */
router.post('/', authorize(['MASTER', 'ADMIN']), async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId, type, target, period } = req.body
        
        // Validação
        if (!userId || !type || target === undefined || !period) {
            res.status(400).json({ error: 'Dados incompletos: userId, type, target e period são obrigatórios' })
            return
        }
        
        if (!['CONVERSATIONS', 'APPOINTMENTS', 'CONVERSION_RATE', 'RESPONSE_TIME'].includes(type)) {
            res.status(400).json({ error: 'Tipo de meta inválido' })
            return
        }
        
        if (!['DAILY', 'WEEKLY', 'MONTHLY'].includes(period)) {
            res.status(400).json({ error: 'Período inválido' })
            return
        }
        
        if (target < 0) {
            res.status(400).json({ error: 'Meta não pode ser negativa' })
            return
        }
        
        // Upsert: criar se não existe, atualizar se existe
        const goal = await prisma.goal.upsert({
            where: { 
                userId_type_period: { userId, type, period }
            },
            update: { 
                target, 
                isActive: true,
                updatedAt: new Date()
            },
            create: { 
                userId, 
                type, 
                target, 
                period 
            }
        })
        
        res.json(goal)
    } catch (error) {
        console.error('Erro ao criar/atualizar meta:', error)
        res.status(500).json({ error: 'Erro ao salvar meta' })
    }
})

/**
 * PUT /api/goals/:id
 * Atualizar meta existente
 */
router.put('/:id', authorize(['MASTER', 'ADMIN']), async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params
        const { target, isActive } = req.body
        
        const updateData: any = {}
        if (target !== undefined) updateData.target = target
        if (isActive !== undefined) updateData.isActive = isActive
        
        const goal = await prisma.goal.update({
            where: { id },
            data: updateData
        })
        
        res.json(goal)
    } catch (error) {
        console.error('Erro ao atualizar meta:', error)
        res.status(500).json({ error: 'Erro ao atualizar meta' })
    }
})

/**
 * DELETE /api/goals/:id
 * Desativar meta (soft delete)
 */
router.delete('/:id', authorize(['MASTER', 'ADMIN']), async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params
        
        await prisma.goal.update({
            where: { id },
            data: { isActive: false }
        })
        
        res.json({ success: true, message: 'Meta desativada' })
    } catch (error) {
        console.error('Erro ao desativar meta:', error)
        res.status(500).json({ error: 'Erro ao desativar meta' })
    }
})

/**
 * GET /api/goals/users/:userId/progress
 * Buscar progresso das metas de um usuário
 */
router.get('/users/:userId/progress', async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId } = req.params
        const { period = 'DAILY' } = req.query
        
        // Verificar permissão
        if (userId !== req.user?.id && !['MASTER', 'ADMIN'].includes(req.user?.role || '')) {
            res.status(403).json({ error: 'Sem permissão para visualizar progresso de outro usuário' })
            return
        }
        
        // Buscar metas ativas do período especificado
        const goals = await prisma.goal.findMany({
            where: { 
                userId, 
                period: period as string, 
                isActive: true 
            }
        })
        
        // Calcular progresso para cada meta
        const progress = await Promise.all(goals.map(async (goal) => {
            const current = await calculateCurrentValue(goal)
            const percentage = goal.target > 0 ? (current / goal.target) * 100 : 0
            
            return {
                ...goal,
                current,
                percentage: Math.round(percentage * 10) / 10,
                achieved: current >= goal.target
            }
        }))
        
        res.json(progress)
    } catch (error) {
        console.error('Erro ao buscar progresso:', error)
        res.status(500).json({ error: 'Erro ao buscar progresso das metas' })
    }
})

export default router
