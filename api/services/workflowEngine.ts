/**
 * Workflow Engine - Motor de Execução de Workflows
 * 
 * Processa mensagens através de um fluxo visual de nós conectados
 * Integrado com Prisma para persistência em banco de dados
 */

// @ts-nocheck
import prisma from '../prisma/client.js'

export interface WorkflowNode {
    id: string
    type: 'start' | 'condition' | 'action' | 'gpt' | 'end' | 'transfer'
    label: string
    position: { x: number; y: number }
    data: Record<string, any>
    config?: {
        // Para 'condition'
        field?: string
        operator?: 'equals' | 'contains' | 'matches' | 'greaterThan' | 'lessThan'
        value?: string
        
        // Para 'action'
        actionType?: 'reply' | 'collect_data' | 'save_data' | 'call_api'
        message?: string
        
        // Para 'gpt'
        prompt?: string
        model?: string
        maxTokens?: number
        
        // Para 'transfer'
        queue?: string
        transferMessage?: string
    }
}

export interface WorkflowEdge {
    id: string
    source: string
    target: string
    label?: string
    condition?: 'yes' | 'no' | 'default'
}

export interface Workflow {
    id: string
    name: string
    description?: string
    trigger: 'intent' | 'keyword' | 'always'
    triggerValue?: string // ex: "AGENDAR" ou "acupuntura"
    isActive: boolean
    nodes: WorkflowNode[]
    edges: WorkflowEdge[]
    priority: number
}

export interface WorkflowContext {
    message: string
    intent?: string
    entities?: Record<string, any>
    patient?: any
    conversation?: any
    variables: Record<string, any>
}

export interface WorkflowResult {
    success: boolean
    message?: string
    action?: 'continue' | 'transfer' | 'end' | 'collect_data'
    nextNode?: string
    variables?: Record<string, any>
    transferQueue?: string
}

/**
 * Workflow Engine Service
 */
export class WorkflowEngineService {
    private workflows: Workflow[] = []
    
    /**
     * Carrega workflows do banco de dados
     */
    async loadWorkflows(): Promise<void> {
        try {
            const dbWorkflows = await prisma.workflow.findMany({
                where: { type: 'BOT_FLOW' },
                orderBy: { updatedAt: 'desc' }
            })

            if (dbWorkflows.length === 0) {
                console.log('📦 No workflows found in DB, creating defaults...')
                await this.seedDefaultWorkflows()
                return await this.loadWorkflows()
            }

            this.workflows = dbWorkflows.map(w => ({
                ...(w.config as any),
                id: w.id,
                name: w.name,
                description: w.description || undefined,
                isActive: w.isActive
            }))

            console.log(`🔄 Loaded ${this.workflows.length} workflows from database`)
        } catch (error) {
            console.error('❌ Error loading workflows:', error)
            // Fallback para workflows padrão
            this.workflows = this.getDefaultWorkflows()
            console.log(`⚠️ Using ${this.workflows.length} default workflows (fallback)`)
        }
    }
    
    /**
     * Encontra workflow aplicável para a mensagem
     */
    async findMatchingWorkflow(context: WorkflowContext): Promise<Workflow | null> {
        // Ordenar por prioridade
        const sorted = [...this.workflows]
            .filter(w => w.isActive)
            .sort((a, b) => b.priority - a.priority)
        
        for (const workflow of sorted) {
            if (this.shouldTriggerWorkflow(workflow, context)) {
                console.log(`🎯 Workflow matched: ${workflow.name}`)
                return workflow
            }
        }
        
        return null
    }
    
    /**
     * Verifica se workflow deve ser acionado
     */
    private shouldTriggerWorkflow(workflow: Workflow, context: WorkflowContext): boolean {
        switch (workflow.trigger) {
            case 'always':
                return true
                
            case 'intent':
                return context.intent === workflow.triggerValue
                
            case 'keyword':
                const keywords = workflow.triggerValue?.toLowerCase().split(',') || []
                const message = context.message.toLowerCase()
                return keywords.some(kw => message.includes(kw.trim()))
                
            default:
                return false
        }
    }
    
    /**
     * Executa workflow
     */
    async executeWorkflow(workflow: Workflow, context: WorkflowContext): Promise<WorkflowResult> {
        console.log(`▶️ Executing workflow: ${workflow.name}`)
        
        // Encontrar nó inicial
        const startNode = workflow.nodes.find(n => n.type === 'start')
        if (!startNode) {
            return { success: false, message: 'No start node found' }
        }
        
        // Executar a partir do nó inicial
        return await this.executeNode(startNode, workflow, context)
    }
    
    /**
     * Executa um nó específico
     */
    private async executeNode(
        node: WorkflowNode,
        workflow: Workflow,
        context: WorkflowContext
    ): Promise<WorkflowResult> {
        console.log(`  → Node: ${node.type} (${node.label})`)
        
        switch (node.type) {
            case 'start':
                return await this.executeStartNode(node, workflow, context)
                
            case 'condition':
                return await this.executeConditionNode(node, workflow, context)
                
            case 'action':
                return await this.executeActionNode(node, workflow, context)
                
            case 'gpt':
                return await this.executeGPTNode(node, workflow, context)
                
            case 'transfer':
                return await this.executeTransferNode(node, workflow, context)
                
            case 'end':
                return { success: true, action: 'end' }
                
            default:
                return { success: false, message: 'Unknown node type' }
        }
    }
    
    /**
     * Executa nó de início
     */
    private async executeStartNode(
        node: WorkflowNode,
        workflow: Workflow,
        context: WorkflowContext
    ): Promise<WorkflowResult> {
        // Encontrar próximo nó
        const nextEdge = workflow.edges.find(e => e.source === node.id)
        if (!nextEdge) {
            return { success: false, message: 'No edge from start node' }
        }
        
        const nextNode = workflow.nodes.find(n => n.id === nextEdge.target)
        if (!nextNode) {
            return { success: false, message: 'Next node not found' }
        }
        
        return await this.executeNode(nextNode, workflow, context)
    }
    
    /**
     * Executa nó de condição
     */
    private async executeConditionNode(
        node: WorkflowNode,
        workflow: Workflow,
        context: WorkflowContext
    ): Promise<WorkflowResult> {
        const config = node.config || {}
        const field = config.field || ''
        const operator = config.operator || 'equals'
        const value = config.value || ''
        
        // Avaliar condição
        const fieldValue = this.getFieldValue(field, context)
        const conditionMet = this.evaluateCondition(fieldValue, operator, value)
        
        console.log(`    Condition: ${field} ${operator} ${value} = ${conditionMet}`)
        
        // Encontrar próxima aresta baseada no resultado
        const nextEdge = workflow.edges.find(e => 
            e.source === node.id && 
            e.condition === (conditionMet ? 'yes' : 'no')
        )
        
        if (!nextEdge) {
            return { success: false, message: 'No matching edge for condition result' }
        }
        
        const nextNode = workflow.nodes.find(n => n.id === nextEdge.target)
        if (!nextNode) {
            return { success: false, message: 'Next node not found' }
        }
        
        return await this.executeNode(nextNode, workflow, context)
    }
    
    /**
     * Executa nó de ação
     */
    private async executeActionNode(
        node: WorkflowNode,
        workflow: Workflow,
        context: WorkflowContext
    ): Promise<WorkflowResult> {
        const config = node.config || {}
        const actionType = config.actionType || 'reply'
        
        switch (actionType) {
            case 'reply':
                return {
                    success: true,
                    message: this.interpolate(config.message || '', context),
                    action: 'continue'
                }
                
            case 'collect_data':
                return {
                    success: true,
                    message: config.message,
                    action: 'collect_data'
                }
                
            case 'save_data':
                // Salvar dados no contexto
                if (config.variable && context.message) {
                    context.variables[config.variable] = context.message
                }
                
                // Próximo nó
                const nextEdge = workflow.edges.find(e => e.source === node.id)
                if (nextEdge) {
                    const nextNode = workflow.nodes.find(n => n.id === nextEdge.target)
                    if (nextNode) {
                        return await this.executeNode(nextNode, workflow, context)
                    }
                }
                
                return { success: true, action: 'continue', variables: context.variables }
                
            default:
                return { success: false, message: 'Unknown action type' }
        }
    }
    
    /**
     * Executa nó GPT
     */
    private async executeGPTNode(
        node: WorkflowNode,
        workflow: Workflow,
        context: WorkflowContext
    ): Promise<WorkflowResult> {
        const config = node.config || {}
        
        // TODO: Chamar GPT real
        const gptResponse = `Resposta do GPT para: ${context.message}`
        
        return {
            success: true,
            message: gptResponse,
            action: 'continue'
        }
    }
    
    /**
     * Executa nó de transferência
     */
    private async executeTransferNode(
        node: WorkflowNode,
        workflow: Workflow,
        context: WorkflowContext
    ): Promise<WorkflowResult> {
        const config = node.config || {}
        
        return {
            success: true,
            message: config.transferMessage || 'Transferindo para atendente...',
            action: 'transfer',
            transferQueue: config.queue || 'default'
        }
    }
    
    /**
     * Obtém valor de um campo do contexto
     */
    private getFieldValue(field: string, context: WorkflowContext): any {
        const parts = field.split('.')
        let value: any = context
        
        for (const part of parts) {
            if (value && typeof value === 'object') {
                value = value[part]
            } else {
                return undefined
            }
        }
        
        return value
    }
    
    /**
     * Avalia condição
     */
    private evaluateCondition(fieldValue: any, operator: string, compareValue: string): boolean {
        const field = String(fieldValue || '').toLowerCase()
        const value = String(compareValue || '').toLowerCase()
        
        switch (operator) {
            case 'equals':
                return field === value
                
            case 'contains':
                return field.includes(value)
                
            case 'matches':
                try {
                    const regex = new RegExp(value, 'i')
                    return regex.test(field)
                } catch {
                    return false
                }
                
            case 'greaterThan':
                return parseFloat(field) > parseFloat(value)
                
            case 'lessThan':
                return parseFloat(field) < parseFloat(value)
                
            default:
                return false
        }
    }
    
    /**
     * Interpola variáveis na mensagem
     */
    private interpolate(message: string, context: WorkflowContext): string {
        return message.replace(/\{(\w+)\}/g, (match, key) => {
            return context.variables[key] || match
        })
    }
    
    /**
     * Workflows padrão do sistema
     */
    private getDefaultWorkflows(): Workflow[] {
        return [
            {
                id: 'workflow-informacoes',
                name: 'Informações Gerais',
                description: 'Responde perguntas sobre procedimentos, preços, horários',
                trigger: 'intent',
                triggerValue: 'INFORMACAO',
                isActive: true,
                priority: 50,
                nodes: [
                    {
                        id: 'start-1',
                        type: 'start',
                        label: 'Início',
                        position: { x: 100, y: 100 },
                        data: {}
                    },
                    {
                        id: 'gpt-1',
                        type: 'gpt',
                        label: 'Processar com GPT',
                        position: { x: 100, y: 200 },
                        data: {},
                        config: {
                            prompt: 'Responda a pergunta do paciente sobre a clínica',
                            model: 'gpt-4o-mini',
                            maxTokens: 250
                        }
                    },
                    {
                        id: 'end-1',
                        type: 'end',
                        label: 'Fim',
                        position: { x: 100, y: 300 },
                        data: {}
                    }
                ],
                edges: [
                    { id: 'e1-2', source: 'start-1', target: 'gpt-1' },
                    { id: 'e2-3', source: 'gpt-1', target: 'end-1' }
                ]
            },
            {
                id: 'workflow-agendamento',
                name: 'Agendamento',
                description: 'Fluxo de agendamento de consultas',
                trigger: 'intent',
                triggerValue: 'AGENDAR',
                isActive: true,
                priority: 100,
                nodes: [
                    {
                        id: 'start-2',
                        type: 'start',
                        label: 'Início',
                        position: { x: 100, y: 100 },
                        data: {}
                    },
                    {
                        id: 'action-1',
                        type: 'action',
                        label: 'Perguntar Procedimento',
                        position: { x: 100, y: 200 },
                        data: {},
                        config: {
                            actionType: 'collect_data',
                            message: 'Qual procedimento você deseja agendar?'
                        }
                    },
                    {
                        id: 'action-2',
                        type: 'action',
                        label: 'Perguntar Data',
                        position: { x: 100, y: 300 },
                        data: {},
                        config: {
                            actionType: 'collect_data',
                            message: 'Qual data você prefere?'
                        }
                    },
                    {
                        id: 'transfer-1',
                        type: 'transfer',
                        label: 'Transferir para Atendente',
                        position: { x: 100, y: 400 },
                        data: {},
                        config: {
                            queue: 'agendamento',
                            transferMessage: 'Vou transferir você para um atendente confirmar o agendamento!'
                        }
                    }
                ],
                edges: [
                    { id: 'e1-2', source: 'start-2', target: 'action-1' },
                    { id: 'e2-3', source: 'action-1', target: 'action-2' },
                    { id: 'e3-4', source: 'action-2', target: 'transfer-1' }
                ]
            },
            {
                id: 'workflow-reclamacao',
                name: 'Reclamações',
                description: 'Transfere reclamações para atendente humano',
                trigger: 'intent',
                triggerValue: 'RECLAMACAO',
                isActive: true,
                priority: 150,
                nodes: [
                    {
                        id: 'start-3',
                        type: 'start',
                        label: 'Início',
                        position: { x: 100, y: 100 },
                        data: {}
                    },
                    {
                        id: 'action-3',
                        type: 'action',
                        label: 'Mensagem de Empatia',
                        position: { x: 100, y: 200 },
                        data: {},
                        config: {
                            actionType: 'reply',
                            message: 'Lamento muito pelo ocorrido. Vou te conectar com um supervisor imediatamente.'
                        }
                    },
                    {
                        id: 'transfer-2',
                        type: 'transfer',
                        label: 'Transferir para Supervisor',
                        position: { x: 100, y: 300 },
                        data: {},
                        config: {
                            queue: 'supervisor',
                            transferMessage: 'Transferindo para supervisor...'
                        }
                    }
                ],
                edges: [
                    { id: 'e1-2', source: 'start-3', target: 'action-3' },
                    { id: 'e2-3', source: 'action-3', target: 'transfer-2' }
                ]
            }
        ]
    }
    
    /**
     * Adiciona workflow no banco
     */
    async addWorkflow(workflow: Workflow): Promise<Workflow> {
        try {
            const created = await prisma.workflow.create({
                data: {
                    name: workflow.name,
                    description: workflow.description,
                    type: 'BOT_FLOW',
                    isActive: workflow.isActive,
                    config: {
                        trigger: workflow.trigger,
                        triggerValue: workflow.triggerValue,
                        priority: workflow.priority,
                        nodes: workflow.nodes,
                        edges: workflow.edges
                    }
                }
            })

            const newWorkflow = {
                ...(created.config as any),
                id: created.id,
                name: created.name,
                description: created.description || undefined,
                isActive: created.isActive
            }

            this.workflows.push(newWorkflow)
            console.log(`✅ Workflow created: ${workflow.name}`)
            return newWorkflow
        } catch (error) {
            console.error('❌ Error creating workflow:', error)
            throw error
        }
    }
    
    /**
     * Atualiza workflow no banco
     */
    async updateWorkflow(id: string, updates: Partial<Workflow>): Promise<Workflow | null> {
        try {
            const existing = await prisma.workflow.findUnique({ where: { id } })
            if (!existing) return null

            const currentConfig = existing.config as any

            const updated = await prisma.workflow.update({
                where: { id },
                data: {
                    name: updates.name ?? existing.name,
                    description: updates.description ?? existing.description,
                    isActive: updates.isActive ?? existing.isActive,
                    config: {
                        trigger: updates.trigger ?? currentConfig.trigger,
                        triggerValue: updates.triggerValue ?? currentConfig.triggerValue,
                        priority: updates.priority ?? currentConfig.priority,
                        nodes: updates.nodes ?? currentConfig.nodes,
                        edges: updates.edges ?? currentConfig.edges
                    }
                }
            })

            const updatedWorkflow = {
                ...(updated.config as any),
                id: updated.id,
                name: updated.name,
                description: updated.description || undefined,
                isActive: updated.isActive
            }

            const index = this.workflows.findIndex(w => w.id === id)
            if (index >= 0) {
                this.workflows[index] = updatedWorkflow
            }

            console.log(`✅ Workflow updated: ${updatedWorkflow.name}`)
            return updatedWorkflow
        } catch (error) {
            console.error('❌ Error updating workflow:', error)
            throw error
        }
    }
    
    /**
     * Remove workflow do banco
     */
    async deleteWorkflow(id: string): Promise<void> {
        try {
            await prisma.workflow.delete({ where: { id } })
            this.workflows = this.workflows.filter(w => w.id !== id)
            console.log(`✅ Workflow deleted: ${id}`)
        } catch (error) {
            console.error('❌ Error deleting workflow:', error)
            throw error
        }
    }
    
    /**
     * Lista workflows
     */
    async listWorkflows(): Promise<Workflow[]> {
        return this.workflows
    }

    /**
     * Cria workflows padrão no banco
     */
    private async seedDefaultWorkflows(): Promise<void> {
        const defaults = this.getDefaultWorkflows()

        for (const workflow of defaults) {
            try {
                await prisma.workflow.create({
                    data: {
                        name: workflow.name,
                        description: workflow.description,
                        type: 'BOT_FLOW',
                        isActive: workflow.isActive,
                        config: {
                            trigger: workflow.trigger,
                            triggerValue: workflow.triggerValue,
                            priority: workflow.priority,
                            nodes: workflow.nodes,
                            edges: workflow.edges
                        }
                    }
                })
                console.log(`✅ Seeded workflow: ${workflow.name}`)
            } catch (error) {
                console.error(`❌ Error seeding workflow ${workflow.name}:`, error)
            }
        }
    }
}

// Exportar singleton
export const workflowEngine = new WorkflowEngineService()
