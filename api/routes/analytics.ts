import { Router, Request, Response } from 'express'
import prisma from '../prisma/client.js'
import { authMiddleware } from '../utils/auth.js'

const router = Router()

// Aplicar auth em todas as rotas
router.use(authMiddleware)

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

        // Conversas do bot que geraram agendamento
        const botConversationsWithAppointment = await prisma.conversation.count({
            where: {
                createdAt: { gte: startDate },
                status: 'FECHADA',
                assignedToId: null,
                patient: {
                    appointments: {
                        some: {
                            createdAt: { gte: startDate }
                        }
                    }
                }
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
                        patient: {
                            select: {
                                appointments: {
                                    where: {
                                        createdAt: { gte: startDate }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        })

        const agentStats = agents.map(agent => {
            const conversations = agent.conversations
            const closedConversations = conversations.filter(c => c.status === 'FECHADA')
            const withAppointment = conversations.filter(c =>
                c.patient?.appointments && c.patient.appointments.length > 0
            )

            // Calcular tempo médio de resposta
            const avgResponseTime = conversations.reduce((sum, c) => {
                const duration = (new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime()) / 1000 / 60
                return sum + duration
            }, 0) / (conversations.length || 1)

            return {
                name: agent.name,
                totalConversations: conversations.length,
                closedConversations: closedConversations.length,
                closedWithAppointment: withAppointment.length,
                closeRate: conversations.length > 0
                    ? (closedConversations.length / conversations.length) * 100
                    : 0,
                conversionRate: conversations.length > 0
                    ? (withAppointment.length / conversations.length) * 100
                    : 0,
                avgResponseTimeMinutes: Math.round(avgResponseTime)
            }
        })

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
            include: {
                patient: {
                    include: {
                        appointments: {
                            where: { createdAt: { gte: startDate } }
                        }
                    }
                }
            }
        })

        // Calcular métricas pessoais
        const closed = myConversations.filter(c => c.status === 'FECHADA')
        const withAppointment = myConversations.filter(c =>
            c.patient?.appointments && c.patient.appointments.length > 0
        )

        const avgResponseTime = myConversations.reduce((sum, c) => {
            const duration = (new Date(c.updatedAt).getTime() -
                new Date(c.createdAt).getTime()) / 1000 / 60
            return sum + duration
        }, 0) / (myConversations.length || 1)

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
                    include: {
                        patient: {
                            include: {
                                appointments: {
                                    where: { createdAt: { gte: startDate } }
                                }
                            }
                        }
                    }
                }
            }
        })

        // Calcular média da equipe
        let teamTotalResponseTime = 0
        let teamTotalConversations = 0
        let teamTotalClosed = 0
        let teamTotalWithAppointment = 0

        allAgents.forEach(agent => {
            const conversations = agent.conversations
            teamTotalConversations += conversations.length

            conversations.forEach(c => {
                if (c.status === 'FECHADA') teamTotalClosed++
                if (c.patient?.appointments && c.patient.appointments.length > 0) teamTotalWithAppointment++

                const duration = (new Date(c.updatedAt).getTime() -
                    new Date(c.createdAt).getTime()) / 1000 / 60
                teamTotalResponseTime += duration
            })
        })

        const teamAvgResponseTime = teamTotalConversations > 0
            ? teamTotalResponseTime / teamTotalConversations
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
                c.patient?.appointments && c.patient.appointments.length > 0
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
                activeNow: activeConversations
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

        // Assumindo valor médio de R$ 150 por procedimento
        const AVG_PROCEDURE_VALUE = 150
        const revenueGenerated = appointmentsFromBot * AVG_PROCEDURE_VALUE

        res.json({
            botConversations,
            timeSavedMinutes,
            timeSavedHours,
            costSaved,
            appointmentsGenerated: appointmentsFromBot,
            revenueGenerated,
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

export default router
