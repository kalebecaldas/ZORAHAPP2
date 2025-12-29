import { Router, Request, Response } from 'express'
import { workflowEngine } from '../services/workflowEngine.js'

const router = Router()

/**
 * GET /api/workflows
 * Lista todos os workflows
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const workflows = await workflowEngine.listWorkflows()
        res.json(workflows)
    } catch (error) {
        console.error('Error listing workflows:', error)
        res.status(500).json({ error: 'Failed to list workflows' })
    }
})

/**
 * GET /api/workflows/:id
 * Obtém um workflow específico
 */
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const workflows = await workflowEngine.listWorkflows()
        const workflow = workflows.find(w => w.id === req.params.id)
        
        if (!workflow) {
            return res.status(404).json({ error: 'Workflow not found' })
        }
        
        res.json(workflow)
    } catch (error) {
        console.error('Error getting workflow:', error)
        res.status(500).json({ error: 'Failed to get workflow' })
    }
})

/**
 * POST /api/workflows
 * Cria um novo workflow
 */
router.post('/', async (req: Request, res: Response) => {
    try {
        const workflow = req.body
        
        // Validação básica
        if (!workflow.name || !workflow.trigger) {
            return res.status(400).json({ error: 'Missing required fields: name, trigger' })
        }
        
        // Remover ID se for "new-" (criado pelo frontend)
        if (workflow.id && workflow.id.startsWith('new-')) {
            delete workflow.id
        }
        
        const created = await workflowEngine.addWorkflow(workflow)
        res.status(201).json(created)
    } catch (error) {
        console.error('Error creating workflow:', error)
        res.status(500).json({ error: 'Failed to create workflow' })
    }
})

/**
 * PUT /api/workflows/:id
 * Atualiza um workflow existente
 */
router.put('/:id', async (req: Request, res: Response) => {
    try {
        const updates = req.body
        const updated = await workflowEngine.updateWorkflow(req.params.id, updates)
        
        if (!updated) {
            return res.status(404).json({ error: 'Workflow not found' })
        }
        
        res.json(updated)
    } catch (error) {
        console.error('Error updating workflow:', error)
        res.status(500).json({ error: 'Failed to update workflow' })
    }
})

/**
 * DELETE /api/workflows/:id
 * Remove um workflow
 */
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        await workflowEngine.deleteWorkflow(req.params.id)
        res.status(204).send()
    } catch (error) {
        console.error('Error deleting workflow:', error)
        res.status(500).json({ error: 'Failed to delete workflow' })
    }
})

/**
 * POST /api/workflows/:id/test
 * Testa um workflow com uma mensagem
 */
router.post('/:id/test', async (req: Request, res: Response) => {
    try {
        const { message, intent, entities } = req.body
        
        const workflows = await workflowEngine.listWorkflows()
        const workflow = workflows.find(w => w.id === req.params.id)
        
        if (!workflow) {
            return res.status(404).json({ error: 'Workflow not found' })
        }
        
        const context = {
            message: message || 'Test message',
            intent,
            entities: entities || {},
            variables: {}
        }
        
        const result = await workflowEngine.executeWorkflow(workflow, context)
        res.json(result)
    } catch (error) {
        console.error('Error testing workflow:', error)
        res.status(500).json({ error: 'Failed to test workflow' })
    }
})

/**
 * POST /api/workflows/execute
 * Executa workflow baseado no contexto da mensagem
 */
router.post('/execute', async (req: Request, res: Response) => {
    try {
        const context = req.body
        
        // Encontrar workflow aplicável
        const workflow = await workflowEngine.findMatchingWorkflow(context)
        
        if (!workflow) {
            return res.json({
                success: false,
                message: 'No matching workflow found'
            })
        }
        
        // Executar workflow
        const result = await workflowEngine.executeWorkflow(workflow, context)
        res.json(result)
    } catch (error) {
        console.error('Error executing workflow:', error)
        res.status(500).json({ error: 'Failed to execute workflow' })
    }
})

export default router
