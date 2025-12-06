import prisma from '../prisma/client.js'
import { intelligentBotService } from './intelligentBot.js'
import { prismaClinicDataService } from './prismaClinicDataService.js'

/**
 * Contexto enriquecido para IA conversacional
 */
export interface EnhancedContext {
    patient: {
        id?: string
        name?: string
        phone: string
        cpf?: string
        email?: string
        birthDate?: Date
        insuranceCompany?: string
        preferences?: Record<string, any>
        registrationComplete: boolean
    }
    history: {
        recent: Array<{
            role: 'user' | 'assistant'
            content: string
            timestamp: Date
        }>
        summary: string
        totalConversations: number
        lastConversationDate?: Date
    }
    appointments: {
        previous: Array<{
            id: string
            procedureName: string
            clinicName: string
            date: Date
            status: string
        }>
        upcoming: Array<{
            id: string
            procedureName: string
            clinicName: string
            date: Date
            status: string
        }>
        cancelled: Array<{
            id: string
            procedureName: string
            clinicName: string
            date: Date
            reason?: string
        }>
        totalAppointments: number
    }
    learningData: {
        commonIntents: string[]
        sentimentTrend: 'positive' | 'negative' | 'neutral'
        preferredProcedures: string[]
        preferredClinic?: string
        averageResponseTime: number
    }
    memories?: {
        nome?: string
        condicoes?: string[]
        preferencias?: Record<string, any>
        fatos_importantes?: string[]
    }
    currentState: {
        selectedClinic?: string
        selectedProcedures: string[]
        selectedDate?: string
        selectedTime?: string
        awaitingInput: boolean
        currentIntent?: string
    }
}

/**
 * Serviço de gerenciamento de contexto conversacional
 */
export class ConversationContextService {
    private contexts: Map<string, EnhancedContext>

    constructor() {
        this.contexts = new Map()
    }

    /**
     * Constrói contexto enriquecido para uma conversa
     */
    async buildContext(conversationId: string, phone: string): Promise<EnhancedContext> {
        // ⚠️ CACHE REMOVIDO: Sempre buscar dados frescos para garantir histórico atualizado
        // O problema era que as mensagens do bot eram salvas DEPOIS de buscar contexto
        // Causando histórico incompleto

        console.log(`🔍 Construindo contexto FRESH para conversa ${conversationId}...`)

        // 1. Buscar paciente do banco + MEMÓRIAS
        const patient = await prisma.patient.findUnique({
            where: { phone },
            include: {
                appointments: {
                    orderBy: { createdAt: 'desc' },
                    take: 10
                }
            }
        })

        // 1.5 Extrair memórias de longo prazo
        const memories = patient?.preferences ? (patient.preferences as any).memories : null

        // 2. Buscar histórico de conversas (últimas 5, EXCLUINDO a atual)
        const previousConversations = await prisma.conversation.findMany({
            where: {
                phone,
                id: { not: conversationId } // ✅ EXCLUIR conversa atual
            },
            include: {
                messages: {
                    take: 20,
                    orderBy: { createdAt: 'desc' }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 5
        })

        // Buscar mensagens da conversa ATUAL também
        const currentConversationMessages = await prisma.message.findMany({
            where: { conversationId },
            orderBy: { createdAt: 'asc' }, // Ordem cronológica correta
            take: 50
        })

        // 3. Buscar agendamentos
        const allAppointments = patient?.appointments || []
        const now = new Date()

        const previousAppointments = allAppointments.filter(
            a => a.status === 'COMPLETED' || (a.date && new Date(a.date) < now)
        )
        const upcomingAppointments = allAppointments.filter(
            a => a.status === 'SCHEDULED' && a.date && new Date(a.date) >= now
        )
        const cancelledAppointments = allAppointments.filter(
            a => a.status === 'CANCELLED'
        )

        // 4. Buscar dados de aprendizado da IA
        const learningData = await prisma.aILearningData.findMany({
            where: { phone },
            orderBy: { createdAt: 'desc' },
            take: 20
        })

        // 5. Construir histórico recente
        // Pega mensagens da conversa atual + mensagens da última conversa anterior (para contexto)
        const lastConvMessages = previousConversations[0]?.messages.reverse() || []

        console.log(`📊 DEBUG HISTÓRICO:`)
        console.log(`  - Mensagens da conversa anterior: ${lastConvMessages.length}`)
        console.log(`  - Mensagens da conversa atual: ${currentConversationMessages.length}`)

        // Combinar: Conversa anterior (se houver) + Conversa atual
        const allRecentMessages = [
            ...lastConvMessages,
            ...currentConversationMessages
        ]

        console.log(`  - Total de mensagens combinadas: ${allRecentMessages.length}`)
        console.log(`  - Primeiras 3 mensagens:`)
        allRecentMessages.slice(0, 3).forEach((msg, i) => {
            console.log(`    ${i + 1}. [${msg.from}]: "${msg.messageText.substring(0, 50)}..."`)
        })

        const recent = allRecentMessages
            .map(m => ({
                role: (m.from === 'BOT' || m.from === 'AGENT' || m.from === 'SYSTEM') ? 'assistant' : 'user',
                content: m.messageText,
                timestamp: m.createdAt
            })) as any[] // Type assertion para evitar erro de tipo

        // 6. Gerar resumo
        const summary = await this.summarizeHistory(previousConversations)

        // 7. Extrair insights dos dados de aprendizado
        const commonIntents = this.extractCommonIntents(learningData)
        const sentimentTrend = this.calculateSentimentTrend(learningData)
        const preferredProcedures = this.extractPreferredProcedures(learningData)
        const preferredClinic = this.extractPreferredClinic(allAppointments)
        const averageResponseTime = this.calculateAverageResponseTime(learningData)

        // 8. Construir contexto enriquecido
        const context: EnhancedContext = {
            patient: {
                id: patient?.id,
                name: patient?.name,
                phone,
                cpf: patient?.cpf,
                email: patient?.email,
                birthDate: patient?.birthDate,
                insuranceCompany: patient?.insuranceCompany,
                preferences: (patient?.preferences as any) || {},
                registrationComplete: !!(patient?.name && patient?.cpf)
            },
            history: {
                recent,
                summary,
                totalConversations: previousConversations.length, // Agora conta apenas as anteriores!
                lastConversationDate: previousConversations[0]?.createdAt
            },
            appointments: {
                previous: previousAppointments.map((a: any) => ({
                    id: a.id,
                    procedureName: a.procedure || 'Não especificado', // Corrigido procedureName -> procedure
                    clinicName: 'Não especificado', // Campo clinicName não existe no modelo Appointment
                    date: a.date || a.createdAt,
                    status: a.status
                })),
                upcoming: upcomingAppointments.map((a: any) => ({
                    id: a.id,
                    procedureName: a.procedure || 'Não especificado',
                    clinicName: 'Não especificado',
                    date: a.date || a.createdAt,
                    status: a.status
                })),
                cancelled: cancelledAppointments.map((a: any) => ({
                    id: a.id,
                    procedureName: a.procedure || 'Não especificado',
                    clinicName: 'Não especificado',
                    date: a.date || a.createdAt,
                    reason: a.notes || undefined
                })),
                totalAppointments: allAppointments.length
            },
            learningData: {
                commonIntents,
                sentimentTrend,
                preferredProcedures,
                preferredClinic,
                averageResponseTime
            },
            memories: memories || undefined, // ✅ Memórias de longo prazo
            currentState: {
                selectedProcedures: [],
                awaitingInput: false
            }
        }

        // ⚠️ NÃO CACHEAR: Sempre buscar dados frescos

        console.log(`✅ Contexto construído para ${phone}:`)
        console.log(`   • Paciente: ${context.patient.name || 'Novo'}`)
        console.log(`   • Conversas anteriores: ${context.history.totalConversations}`)
        console.log(`   • Agendamentos: ${context.appointments.totalAppointments}`)
        console.log(`   • Sentimento: ${context.learningData.sentimentTrend}`)

        return context
    }

    /**
     * Gera resumo do histórico de conversas usando GPT
     */
    private async summarizeHistory(conversations: any[]): Promise<string> {
        if (conversations.length === 0) {
            return 'Primeiro contato do paciente'
        }

        // Extrair informações relevantes
        const totalMessages = conversations.reduce((sum, c) => sum + c.messages.length, 0)
        const topics: string[] = []

        // Analisar mensagens para identificar tópicos
        for (const conv of conversations) {
            for (const msg of conv.messages) {
                if (msg.from === 'PATIENT') {
                    const text = msg.messageText.toLowerCase()

                    // Detectar tópicos comuns
                    if (text.includes('agendar') || text.includes('marcar')) {
                        topics.push('agendamento')
                    }
                    if (text.includes('valor') || text.includes('preço') || text.includes('quanto')) {
                        topics.push('valores')
                    }
                    if (text.includes('convênio') || text.includes('plano')) {
                        topics.push('convênios')
                    }
                    if (text.includes('cancelar') || text.includes('desmarcar')) {
                        topics.push('cancelamento')
                    }
                }
            }
        }

        const uniqueTopics = [...new Set(topics)]
        const topicsText = uniqueTopics.length > 0
            ? `Tópicos anteriores: ${uniqueTopics.join(', ')}`
            : 'Conversas gerais'

        return `${conversations.length} conversa(s) anterior(es) com ${totalMessages} mensagens. ${topicsText}.`
    }

    /**
     * Extrai intenções mais comuns dos dados de aprendizado
     */
    private extractCommonIntents(learningData: any[]): string[] {
        const intentCounts: Record<string, number> = {}

        for (const data of learningData) {
            const intent = data.intent
            if (intent) {
                intentCounts[intent] = (intentCounts[intent] || 0) + 1
            }
        }

        // Ordenar por frequência e pegar top 3
        return Object.entries(intentCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([intent]) => intent)
    }

    /**
     * Calcula tendência de sentimento
     */
    private calculateSentimentTrend(learningData: any[]): 'positive' | 'negative' | 'neutral' {
        if (learningData.length === 0) return 'neutral'

        const sentiments = learningData
            .filter(d => d.sentiment)
            .map(d => d.sentiment)

        const positive = sentiments.filter(s => s === 'positive').length
        const negative = sentiments.filter(s => s === 'negative').length
        const neutral = sentiments.filter(s => s === 'neutral').length

        if (positive > negative && positive > neutral) return 'positive'
        if (negative > positive && negative > neutral) return 'negative'
        return 'neutral'
    }

    /**
     * Extrai procedimentos preferidos
     */
    private extractPreferredProcedures(learningData: any[]): string[] {
        const procedureCounts: Record<string, number> = {}

        for (const data of learningData) {
            const context = data.context as any
            if (context?.procedureMentioned) {
                const proc = context.procedureMentioned
                procedureCounts[proc] = (procedureCounts[proc] || 0) + 1
            }
        }

        return Object.entries(procedureCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([proc]) => proc)
    }

    /**
     * Extrai clínica preferida baseado em agendamentos
     */
    private extractPreferredClinic(appointments: any[]): string | undefined {
        if (appointments.length === 0) return undefined

        const clinicCounts: Record<string, number> = {}

        for (const apt of appointments) {
            const clinic = apt.clinicName
            if (clinic) {
                clinicCounts[clinic] = (clinicCounts[clinic] || 0) + 1
            }
        }

        const sorted = Object.entries(clinicCounts).sort((a, b) => b[1] - a[1])
        return sorted[0]?.[0]
    }

    /**
     * Calcula tempo médio de resposta (em segundos)
     */
    private calculateAverageResponseTime(learningData: any[]): number {
        if (learningData.length === 0) return 0

        const times = learningData
            .filter(d => d.responseTime)
            .map(d => d.responseTime)

        if (times.length === 0) return 0

        const sum = times.reduce((a, b) => a + b, 0)
        return Math.round(sum / times.length)
    }

    /**
     * Atualiza contexto com novos dados
     */
    updateContext(conversationId: string, updates: Partial<EnhancedContext>): void {
        const context = this.contexts.get(conversationId)
        if (context) {
            Object.assign(context, updates)
            this.contexts.set(conversationId, context)
        }
    }

    /**
     * Obtém contexto existente
     */
    getContext(conversationId: string): EnhancedContext | undefined {
        return this.contexts.get(conversationId)
    }

    /**
     * Limpa contexto (libera memória)
     */
    clearContext(conversationId: string): void {
        this.contexts.delete(conversationId)
    }

    /**
     * Limpa contextos antigos (mais de 1 hora)
     */
    clearOldContexts(): void {
        // Implementar lógica de limpeza baseada em timestamp
        // Por enquanto, manter todos em memória
    }
}

// Exportar singleton
export const conversationContextService = new ConversationContextService()
