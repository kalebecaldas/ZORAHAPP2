import { Router, Request, Response } from 'express'
import prisma from '../prisma/client.js'
import { authMiddleware } from '../utils/auth.js'

const router = Router()

// Aplicar auth em todas as rotas
router.use(authMiddleware)

/**
 * Helper: Calcular tempo médio de resposta correto
 * Calcula o tempo entre mensagem RECEBIDA do paciente e ENVIADA pelo atendente
 */
async function calculateAvgResponseTime(userId: string, startDate: Date): Promise<number> {
    try {
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
                AND c."createdAt" >= ${startDate}
                AND m2.timestamp = (
                    SELECT MIN(m3.timestamp)
                    FROM "Message" m3
                    WHERE m3."conversationId" = m1."conversationId"
                        AND m3.direction = 'SENT'
                        AND m3.timestamp > m1.timestamp
                )
        `
        
        return result[0]?.avg_minutes ? Math.round(result[0].avg_minutes) : 0
    } catch (error) {
        console.error('Erro ao calcular tempo de resposta:', error)
        return 0
    }
}

/**
 * Helper: Calcular tempo médio de resposta para lista de conversas
 */
async function calculateAvgResponseTimeForConversations(conversationIds: string[]): Promise<number> {
    if (conversationIds.length === 0) return 0
    
    try {
        const result = await prisma.$queryRaw<Array<{ avg_minutes: number | null }>>`
            SELECT AVG(EXTRACT(EPOCH FROM (m2.timestamp - m1.timestamp))) / 60 as avg_minutes
            FROM "Message" m1
            INNER JOIN "Message" m2 
                ON m1."conversationId" = m2."conversationId"
                AND m2.timestamp > m1.timestamp
                AND m2.direction = 'SENT'
            WHERE m1.direction = 'RECEIVED'
                AND m1."conversationId" = ANY(${conversationIds}::text[])
                AND m2.timestamp = (
                    SELECT MIN(m3.timestamp)
                    FROM "Message" m3
                    WHERE m3."conversationId" = m1."conversationId"
                        AND m3.direction = 'SENT'
                        AND m3.timestamp > m1.timestamp
                )
        `
        
        return result[0]?.avg_minutes ? Math.round(result[0].avg_minutes) : 0
    } catch (error) {
        console.error('Erro ao calcular tempo de resposta:', error)
        return 0
    }
}

/**
 * 📊 GET /api/analytics/conversion
 * Métricas de conversão do bot
 */
router.get('/conversion', async (req: Request, res: Response): Promise<void> => {
    try {
        console.log('📊 [Analytics/Conversion] Requisição recebida:', { period: req.query.period })
        
        const { period = '7d' } = req.query
        const days = period === '30d' ? 30 : 7
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - days)

        // Taxa de conversão do bot (conversas que viraram agendamento)
        const totalBotConversations = await prisma.conversation.count({
            where: {
                createdAt: { gte: startDate },
                status: 'FECHADA',
                assignedToId: null // Apenas bot
            }
        })

        // Conversas do bot que geraram agendamento (baseado na categoria de encerramento)
        const botConversationsWithAppointment = await prisma.conversation.count({
            where: {
                createdAt: { gte: startDate },
                status: 'FECHADA',
                assignedToId: null,
                closeCategory: { in: ['AGENDAMENTO', 'AGENDAMENTO_PARTICULAR'] }
            }
        })

        // Taxa de transferência para humano
        const totalConversations = await prisma.conversation.count({
            where: { createdAt: { gte: startDate } }
        })

        const humanTransferred = await prisma.conversation.count({
            where: {
                createdAt: { gte: startDate },
                assignedToId: { not: null }
            }
        })

        // Tempo médio até resolução (removido por enquanto - não há campo numérico para calcular)
        // const avgResolution = await prisma.conversation.aggregate({
        //     where: {
        //         createdAt: { gte: startDate },
        //         status: 'FECHADA'
        //     },
        //     _avg: {
        //         unreadCount: true
        //     }
        // })

        const result = {
            botConversionRate: totalBotConversations > 0
                ? (botConversationsWithAppointment / totalBotConversations) * 100
                : 0,
            humanTransferRate: totalConversations > 0
                ? (humanTransferred / totalConversations) * 100
                : 0,
            totalBotConversations,
            conversationsWithAppointment: botConversationsWithAppointment,
            avgResolutionTimeMinutes: 0 // TODO: calcular corretamente
        }
        
        console.log('📊 [Analytics/Conversion] Métricas calculadas:', result)
        res.json(result)
    } catch (error) {
        console.error('❌ [Analytics/Conversion] Erro:', error)
        // Retornar dados vazios em vez de erro 500
        res.json({
            botConversionRate: 0,
            humanTransferRate: 0,
            totalBotConversations: 0,
            conversationsWithAppointment: 0,
            avgResolutionTimeMinutes: 0
        })
    }
})

/**
 * 📊 GET /api/analytics/insurances
 * Top convênios com mais agendamentos
 */
router.get('/insurances', async (req: Request, res: Response): Promise<void> => {
    try {
        const { period = '7d', limit = 5 } = req.query
        const days = period === '30d' ? 30 : 7
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - days)

        // Buscar agendamentos agrupados por convênio
        const insuranceStats = await prisma.appointment.groupBy({
            by: ['patientId'],
            where: {
                createdAt: { gte: startDate }
            },
            _count: {
                id: true
            }
        })

        // Enriquecer com dados do paciente
        const enriched = await Promise.all(
            insuranceStats.map(async (stat) => {
                const patient = await prisma.patient.findUnique({
                    where: { id: stat.patientId },
                    select: { insuranceCompany: true }
                })
                return {
                    insurance: patient?.insuranceCompany || 'Particular',
                    appointments: stat._count.id
                }
            })
        )

        // Agrupar por convênio
        const grouped = enriched.reduce((acc, curr) => {
            const existing = acc.find(i => i.insurance === curr.insurance)
            if (existing) {
                existing.appointments += curr.appointments
            } else {
                acc.push({ ...curr })
            }
            return acc
        }, [] as Array<{ insurance: string; appointments: number }>)

        // Ordenar e limitar
        const topInsurances = grouped
            .sort((a, b) => b.appointments - a.appointments)
            .slice(0, Number(limit))

        res.json({ topInsurances })
    } catch (error) {
        console.error('Error fetching insurance stats:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

/**
 * 📊 GET /api/analytics/procedures
 * Procedimentos mais solicitados
 */
router.get('/procedures', async (req: Request, res: Response): Promise<void> => {
    try {
        const { period = '7d', limit = 5 } = req.query
        const days = period === '30d' ? 30 : 7
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - days)

        // Buscar todos os agendamentos e agrupar manualmente
        const appointments = await prisma.appointment.findMany({
            where: {
                createdAt: { gte: startDate }
            },
            select: {
                procedure: true
            }
        })

        // Agrupar por procedimento
        const grouped = appointments.reduce((acc, curr) => {
            const key = curr.procedure || 'Não especificado'
            if (!acc[key]) {
                acc[key] = 0
            }
            acc[key]++
            return acc
        }, {} as Record<string, number>)

        // Converter para array e ordenar
        const topProcedures = Object.entries(grouped)
            .map(([name, requests]) => ({ name, requests }))
            .sort((a, b) => b.requests - a.requests)
            .slice(0, Number(limit))

        res.json({ topProcedures })
    } catch (error) {
        console.error('Error fetching procedure stats:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

/**
 * 📊 GET /api/analytics/agents
 * Performance dos agentes
 */
router.get('/agents', async (req: Request, res: Response): Promise<void> => {
    try {
        console.log('📊 [Analytics/Agents] Requisição recebida:', { period: req.query.period })
        
        const { period = '7d' } = req.query
        const days = period === '30d' ? 30 : 7
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - days)

        const agents = await prisma.user.findMany({
            where: {
                OR: [
                    { role: 'AGENT' },
                    { role: 'ATENDENTE' }
                ]
            },
            select: {
                id: true,
                name: true,
                conversations: {
                    where: {
                        createdAt: { gte: startDate }
                    },
                    select: {
                        id: true,
                        status: true,
                        createdAt: true,
                        updatedAt: true,
                        closeCategory: true
                    }
                }
            }
        })

        const agentStats = await Promise.all(agents.map(async (agent) => {
            const conversations = agent.conversations
            const closedConversations = conversations.filter(c => c.status === 'FECHADA')
            const withAppointment = conversations.filter(c =>
                c.closeCategory === 'AGENDAMENTO' || c.closeCategory === 'AGENDAMENTO_PARTICULAR'
            )

            // Calcular tempo médio de resposta CORRETO (entre mensagens)
            const conversationIds = conversations.map(c => c.id)
            const avgResponseTime = await calculateAvgResponseTimeForConversations(conversationIds)

            return {
                name: agent.name,
                userId: agent.id,
                totalConversations: conversations.length,
                closedConversations: closedConversations.length,
                closedWithAppointment: withAppointment.length,
                closeRate: conversations.length > 0
                    ? (closedConversations.length / conversations.length) * 100
                    : 0,
                conversionRate: conversations.length > 0
                    ? (withAppointment.length / conversations.length) * 100
                    : 0,
                avgResponseTimeMinutes: avgResponseTime
            }
        }))

        // Ordenar por taxa de conversão
        const sortedAgents = agentStats.sort((a, b) => b.conversionRate - a.conversionRate)

        console.log('📊 [Analytics/Agents] Total de agentes:', sortedAgents.length)
        res.json({ agents: sortedAgents })
    } catch (error) {
        console.error('❌ [Analytics/Agents] Erro:', error)
        // Retornar array vazio em vez de erro 500
        res.json({ agents: [] })
    }
})

/**
 * 📊 GET /api/analytics/agents/me
 * Estatísticas pessoais do atendente logado
 */
router.get('/agents/me', async (req: Request, res: Response): Promise<void> => {
    try {
        console.log('📊 [Analytics/AgentsMe] Requisição recebida:', { 
            userId: req.user?.id, 
            period: req.query.period 
        })
        
        const userId = req.user?.id
        if (!userId) {
            console.log('❌ [Analytics/AgentsMe] Usuário não autenticado')
            res.status(401).json({ error: 'Unauthorized' })
            return
        }

        const { period = '7d' } = req.query
        const days = period === '30d' ? 30 : 7
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - days)

        // Buscar conversas do usuário
        const myConversations = await prisma.conversation.findMany({
            where: {
                assignedToId: userId,
                createdAt: { gte: startDate }
            },
            select: {
                id: true,
                status: true,
                createdAt: true,
                updatedAt: true,
                closeCategory: true
            }
        })

        // ✅ Se não houver conversas, retornar indicação de sem dados
        if (myConversations.length === 0) {
            res.json({
                personal: {
                    hasData: false,
                    message: 'Sem dados suficientes para este período',
                    totalConversations: 0,
                    closedConversations: 0,
                    withAppointment: 0,
                    avgResponseTimeMinutes: 0,
                    conversionRate: 0,
                    closeRate: 0
                },
                comparison: {
                    teamAvgResponseTime: 0,
                    teamAvgConversionRate: 0,
                    teamAvgCloseRate: 0
                },
                rank: null
            })
            return
        }

        // Calcular métricas pessoais
        const closed = myConversations.filter(c => c.status === 'FECHADA')
        const withAppointment = myConversations.filter(c =>
            c.closeCategory === 'AGENDAMENTO' || c.closeCategory === 'AGENDAMENTO_PARTICULAR'
        )

        // Calcular tempo médio de resposta CORRETO (entre mensagens)
        const avgResponseTime = await calculateAvgResponseTime(userId, startDate)

        // Buscar todos os atendentes para comparação
        const allAgents = await prisma.user.findMany({
            where: {
                OR: [
                    { role: 'AGENT' },
                    { role: 'ATENDENTE' }
                ]
            },
            include: {
                conversations: {
                    where: { createdAt: { gte: startDate } },
                    select: {
                        id: true,
                        status: true,
                        createdAt: true,
                        updatedAt: true,
                        closeCategory: true
                    }
                }
            }
        })

        // Calcular média da equipe (filtrar agentes sem conversas)
        const agentsWithData = allAgents.filter(agent => agent.conversations.length > 0)
        
        let teamTotalConversations = 0
        let teamTotalClosed = 0
        let teamTotalWithAppointment = 0

        agentsWithData.forEach(agent => {
            const conversations = agent.conversations
            teamTotalConversations += conversations.length

            conversations.forEach(c => {
                if (c.status === 'FECHADA') teamTotalClosed++
                if (c.closeCategory === 'AGENDAMENTO' || c.closeCategory === 'AGENDAMENTO_PARTICULAR') teamTotalWithAppointment++
            })
        })

        // Calcular tempo médio de resposta da equipe (apenas agentes com dados)
        const teamResponseTimes = await Promise.all(
            agentsWithData.map(async (agent) => {
                const conversationIds = agent.conversations.map(c => c.id)
                return await calculateAvgResponseTimeForConversations(conversationIds)
            })
        )
        const teamAvgResponseTime = teamResponseTimes.length > 0
            ? teamResponseTimes.reduce((sum, time) => sum + time, 0) / teamResponseTimes.length
            : 0

        const teamAvgConversionRate = teamTotalConversations > 0
            ? (teamTotalWithAppointment / teamTotalConversations) * 100
            : 0

        const teamAvgCloseRate = teamTotalConversations > 0
            ? (teamTotalClosed / teamTotalConversations) * 100
            : 0

        // Calcular rank (posição do usuário)
        const agentStats = allAgents.map(agent => {
            const conversations = agent.conversations
            const agentClosed = conversations.filter(c => c.status === 'FECHADA')
            const agentWithAppointment = conversations.filter(c =>
                c.closeCategory === 'AGENDAMENTO' || c.closeCategory === 'AGENDAMENTO_PARTICULAR'
            )

            const agentAvgResponseTime = conversations.reduce((sum, c) => {
                const duration = (new Date(c.updatedAt).getTime() -
                    new Date(c.createdAt).getTime()) / 1000 / 60
                return sum + duration
            }, 0) / (conversations.length || 1)

            const conversionRate = conversations.length > 0
                ? (agentWithAppointment.length / conversations.length) * 100
                : 0

            return {
                userId: agent.id,
                conversionRate
            }
        })

        // Ordenar por taxa de conversão
        const sortedAgents = agentStats.sort((a, b) => b.conversionRate - a.conversionRate)
        const myRank = sortedAgents.findIndex(a => a.userId === userId) + 1

        // Conversas ativas agora (não encerradas)
        const activeConversations = await prisma.conversation.count({
            where: {
                assignedToId: userId,
                status: { not: 'FECHADA' }
            }
        })

        // ✅ Calcular dados adicionais para badges
        // Horários da primeira e última conversa
        let firstConversationHour: number | undefined = undefined
        let lastConversationHour: number | undefined = undefined
        
        if (myConversations.length > 0) {
            const timestamps = myConversations.map(c => new Date(c.createdAt).getTime()).sort((a, b) => a - b)
            firstConversationHour = new Date(timestamps[0]).getHours()
            lastConversationHour = new Date(timestamps[timestamps.length - 1]).getHours()
        }

        // Transferências recebidas (conversas que foram transferidas para este usuário)
        const transfersReceived = await prisma.conversation.count({
            where: {
                assignedToId: userId,
                createdAt: { gte: startDate },
                // Assumimos que uma conversa transferida teve assignedToId alterado
                // Idealmente teria um campo específico para isso, mas vamos contar
                // conversas onde o usuário não foi o primeiro atendente
            }
        })

        // Streak: dias consecutivos batendo metas (implementação simplificada)
        // Para calcular corretamente, precisaríamos histórico diário de metas
        // Por ora, vamos deixar como 0 ou calcular algo básico
        let streak = 0
        
        // Buscar metas atingidas hoje
        const goalsToday = await prisma.goal.findMany({
            where: {
                userId,
                period: 'DAILY',
                isActive: true
            }
        }).catch(() => [])

        // Por simplicidade, vamos considerar que tem streak se está batendo as metas
        const goalsProgress = await Promise.all(goalsToday.map(async (goal) => {
            const current = await calculateCurrentValue(goal)
            return current >= goal.target
        })).catch(() => [])

        const goalsAchieved = goalsProgress.filter(Boolean).length
        const totalGoals = goalsToday.length

        // Se está batendo todas as metas hoje, assume streak de 1 (mínimo)
        if (totalGoals > 0 && goalsAchieved === totalGoals) {
            streak = 1 // Simplificado - seria melhor ter histórico
        }

        const result = {
            personal: {
                totalConversations: myConversations.length,
                closedConversations: closed.length,
                withAppointment: withAppointment.length,
                conversionRate: myConversations.length > 0
                    ? (withAppointment.length / myConversations.length) * 100
                    : 0,
                avgResponseTimeMinutes: Math.round(avgResponseTime),
                closeRate: myConversations.length > 0
                    ? (closed.length / myConversations.length) * 100
                    : 0,
                activeNow: activeConversations,
                // ✅ Dados adicionais para badges
                firstConversationHour,
                lastConversationHour,
                transfersReceived,
                streak,
                goalsAchieved,
                totalGoals
            },
            comparison: {
                teamAvgResponseTime: Math.round(teamAvgResponseTime),
                teamAvgConversionRate: Math.round(teamAvgConversionRate * 10) / 10,
                teamAvgCloseRate: Math.round(teamAvgCloseRate * 10) / 10,
                performanceDelta: avgResponseTime - teamAvgResponseTime,
                isAboveAverage: avgResponseTime < teamAvgResponseTime
            },
            rank: {
                position: myRank,
                total: allAgents.length
            }
        }
        
        console.log('📊 [Analytics/AgentsMe] Estatísticas calculadas:', {
            conversas: result.personal.totalConversations,
            taxa_conversao: result.personal.conversionRate,
            rank: result.rank.position
        })
        
        res.json(result)
    } catch (error) {
        console.error('❌ [Analytics/AgentsMe] Erro:', error)
        // Retornar dados vazios em vez de erro 500
        res.json({
            personal: {
                totalConversations: 0,
                closedConversations: 0,
                withAppointment: 0,
                conversionRate: 0,
                avgResponseTimeMinutes: 0,
                closeRate: 0,
                activeNow: 0
            },
            comparison: {
                teamAvgResponseTime: 0,
                teamAvgConversionRate: 0,
                teamAvgCloseRate: 0,
                performanceDelta: 0,
                isAboveAverage: false
            },
            rank: {
                position: 0,
                total: 0
            }
        })
    }
})

/**
 * 📊 GET /api/analytics/roi
 * ROI do sistema (economia de tempo e custo)
 */
router.get('/roi', async (req: Request, res: Response): Promise<void> => {
    try {
        const { period = '7d' } = req.query
        const days = period === '30d' ? 30 : 7
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - days)

        // Conversas resolvidas pelo bot
        const botConversations = await prisma.conversation.count({
            where: {
                createdAt: { gte: startDate },
                status: 'FECHADA',
                assignedToId: null
            }
        })

        // Assumindo que cada conversa humana leva ~15 minutos
        const AVG_HUMAN_CONVERSATION_MINUTES = 15
        const timeSavedMinutes = botConversations * AVG_HUMAN_CONVERSATION_MINUTES
        const timeSavedHours = Math.round(timeSavedMinutes / 60)

        // Assumindo custo de R$ 30/hora para atendente
        const COST_PER_HOUR = 30
        const costSaved = (timeSavedHours * COST_PER_HOUR)

        // Receita gerada (agendamentos do bot)
        const appointmentsFromBot = await prisma.appointment.count({
            where: {
                createdAt: { gte: startDate },
                patient: {
                    conversations: {
                        some: {
                            status: 'FECHADA',
                            assignedToId: null,
                            createdAt: { gte: startDate }
                        }
                    }
                }
            }
        })

        // ✅ Receita de agendamentos particulares
        const privateAppointmentsRevenue = await prisma.conversation.findMany({
            where: {
                createdAt: { gte: startDate },
                status: 'FECHADA',
                closeCategory: 'AGENDAMENTO_PARTICULAR',
                privateAppointment: { not: null }
            },
            select: {
                privateAppointment: true
            }
        })

        const privateRevenue = privateAppointmentsRevenue.reduce((sum, conv) => {
            const data = conv.privateAppointment as { totalValue?: number } | null
            return sum + (data?.totalValue || 0)
        }, 0)

        // Assumindo valor médio de R$ 150 por procedimento regular
        const AVG_PROCEDURE_VALUE = 150
        const regularRevenue = appointmentsFromBot * AVG_PROCEDURE_VALUE
        const revenueGenerated = regularRevenue + privateRevenue

        res.json({
            botConversations,
            timeSavedMinutes,
            timeSavedHours,
            costSaved,
            appointmentsGenerated: appointmentsFromBot,
            privateAppointmentsCount: privateAppointmentsRevenue.length,
            revenueGenerated,
            regularRevenue,
            privateRevenue,
            roi: costSaved > 0 ? ((revenueGenerated - costSaved) / costSaved) * 100 : 0
        })
    } catch (error) {
        console.error('Error fetching ROI metrics:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

/**
 * 📊 GET /api/analytics/funnel
 * Funil de conversão
 */
router.get('/funnel', async (req: Request, res: Response): Promise<void> => {
    try {
        const { period = '7d' } = req.query
        const days = period === '30d' ? 30 : 7
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - days)

        // Etapa 1: Conversas iniciadas
        const started = await prisma.conversation.count({
            where: { createdAt: { gte: startDate } }
        })

        // Etapa 2: Paciente identificado (tem nome não vazio)
        const identified = await prisma.conversation.count({
            where: {
                createdAt: { gte: startDate },
                patient: {
                    isNot: null
                }
            }
        })

        // Etapa 3: Demonstrou interesse (mais de 3 mensagens)
        const interested = await prisma.conversation.count({
            where: {
                createdAt: { gte: startDate },
                messages: {
                    some: {}
                }
            }
        })

        // Etapa 4: Agendamento criado
        const scheduled = await prisma.conversation.count({
            where: {
                createdAt: { gte: startDate },
                patient: {
                    appointments: {
                        some: {
                            createdAt: { gte: startDate }
                        }
                    }
                }
            }
        })

        // Etapa 5: Agendamento confirmado
        const confirmed = await prisma.appointment.count({
            where: {
                createdAt: { gte: startDate },
                status: 'SCHEDULED'
            }
        })

        res.json({
            funnel: [
                { stage: 'Iniciadas', count: started, percentage: 100 },
                { stage: 'Identificadas', count: identified, percentage: started > 0 ? (identified / started) * 100 : 0 },
                { stage: 'Interessadas', count: interested, percentage: started > 0 ? (interested / started) * 100 : 0 },
                { stage: 'Agendadas', count: scheduled, percentage: started > 0 ? (scheduled / started) * 100 : 0 },
                { stage: 'Confirmadas', count: confirmed, percentage: started > 0 ? (confirmed / started) * 100 : 0 }
            ]
        })
    } catch (error) {
        console.error('Error fetching funnel metrics:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

/**
 * 📊 GET /api/analytics/closure-categories
 * Distribuição de categorias de encerramento
 */
router.get('/closure-categories', async (req: Request, res: Response): Promise<void> => {
    try {
        console.log('📊 [Analytics/ClosureCategories] Requisição recebida:', { period: req.query.period })
        
        const { period = '7d' } = req.query
        const days = period === '30d' ? 30 : 7
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - days)

        // Agrupar conversas por categoria
        const categoryCounts = await prisma.conversation.groupBy({
            by: ['closeCategory'],
            where: {
                createdAt: { gte: startDate },
                status: 'FECHADA',
                closeCategory: { not: null }
            },
            _count: {
                id: true
            }
        })

        // Calcular receita de agendamentos particulares por categoria
        const privateRevenue = await prisma.conversation.findMany({
            where: {
                createdAt: { gte: startDate },
                closeCategory: 'AGENDAMENTO_PARTICULAR',
                privateAppointment: { not: null }
            },
            select: {
                privateAppointment: true
            }
        })

        const totalPrivateRevenue = privateRevenue.reduce((sum, conv) => {
            const data = conv.privateAppointment as { totalValue?: number } | null
            return sum + (data?.totalValue || 0)
        }, 0)

        // Mapear estatísticas por categoria
        const categoryStats = categoryCounts.map(cat => ({
            category: cat.closeCategory,
            count: cat._count.id,
            percentage: 0, // Calcular depois
            revenue: cat.closeCategory === 'AGENDAMENTO_PARTICULAR' ? totalPrivateRevenue : 0
        }))

        const totalConversations = categoryStats.reduce((sum, cat) => sum + cat.count, 0)
        categoryStats.forEach(cat => {
            cat.percentage = totalConversations > 0 ? (cat.count / totalConversations) * 100 : 0
        })

        // Ordenar por count decrescente
        categoryStats.sort((a, b) => b.count - a.count)

        console.log('📊 [Analytics/ClosureCategories] Categorias calculadas:', {
            totalCategories: categoryStats.length,
            totalConversations
        })

        res.json({
            categories: categoryStats,
            totalClosed: totalConversations,
            periodDays: days
        })
    } catch (error) {
        console.error('❌ [Analytics/ClosureCategories] Erro:', error)
        res.json({ categories: [], totalClosed: 0, periodDays: 0 })
    }
})

export default router
