import { Router, Request, Response } from 'express'
import { ruleEngineService } from '../services/ruleEngineService.js'
import prisma from '../prisma/client.js'

const router = Router()

// Middleware de autenticação (reutilizar do sistema)
const auth = (req: Request, res: Response, next: any) => {
    // TODO: Implementar autenticação real
    next()
}

// ============================================
// REGRAS DE PROCEDIMENTOS
// ============================================

/**
 * GET /api/rules/procedures
 * Lista todas as regras de procedimentos
 */
router.get('/procedures', auth, async (req: Request, res: Response): Promise<void> => {
    try {
        const rules = await ruleEngineService.getAllProcedureRules()
        
        // Buscar informações dos procedimentos para enriquecer a resposta
        const procedures = await prisma.procedure.findMany({
            where: {
                code: { in: rules.map(r => r.procedureCode) }
            },
            select: {
                code: true,
                name: true,
                description: true
            }
        })
        
        // Combinar regras com informações dos procedimentos
        const enrichedRules = rules.map(rule => {
            const procedure = procedures.find(p => p.code === rule.procedureCode)
            return {
                ...rule,
                procedureName: procedure?.name,
                procedureDescription: procedure?.description
            }
        })
        
        res.json(enrichedRules)
    } catch (error) {
        console.error('Erro ao buscar regras de procedimentos:', error)
        res.status(500).json({ error: 'Erro ao buscar regras de procedimentos' })
    }
})

/**
 * GET /api/rules/procedures/:code
 * Busca regra de um procedimento específico
 */
router.get('/procedures/:code', auth, async (req: Request, res: Response): Promise<void> => {
    try {
        const { code } = req.params
        const rule = await ruleEngineService.getProcedureRule(code)
        
        if (!rule) {
            res.status(404).json({ error: 'Regra não encontrada' })
            return
        }
        
        // Buscar informações do procedimento
        const procedure = await prisma.procedure.findUnique({
            where: { code },
            select: {
                code: true,
                name: true,
                description: true,
                basePrice: true
            }
        })
        
        res.json({
            ...rule,
            procedure
        })
    } catch (error) {
        console.error('Erro ao buscar regra de procedimento:', error)
        res.status(500).json({ error: 'Erro ao buscar regra de procedimento' })
    }
})

/**
 * PUT /api/rules/procedures/:code
 * Atualiza regra de um procedimento
 */
router.put('/procedures/:code', auth, async (req: Request, res: Response): Promise<void> => {
    try {
        const { code } = req.params
        const data = req.body
        
        // Verificar se a regra existe
        const existingRule = await prisma.procedureRule.findUnique({
            where: { procedureCode: code }
        })
        
        if (!existingRule) {
            res.status(404).json({ error: 'Regra não encontrada' })
            return
        }
        
        // Atualizar regra
        const updatedRule = await prisma.procedureRule.update({
            where: { procedureCode: code },
            data: {
                requiresEvaluation: data.requiresEvaluation,
                evaluationPrice: data.evaluationPrice,
                evaluationIncludesFirstSession: data.evaluationIncludesFirstSession,
                evaluationInPackage: data.evaluationInPackage,
                minimumPackageSessions: data.minimumPackageSessions,
                highlightPackages: data.highlightPackages,
                showEvaluationFirst: data.showEvaluationFirst,
                customMessage: data.customMessage,
                specialConditions: data.specialConditions,
                isActive: data.isActive
            }
        })
        
        res.json(updatedRule)
    } catch (error) {
        console.error('Erro ao atualizar regra de procedimento:', error)
        res.status(500).json({ error: 'Erro ao atualizar regra de procedimento' })
    }
})

// ============================================
// REGRAS DE CONVÊNIOS
// ============================================

/**
 * GET /api/rules/insurances
 * Lista todas as regras de convênios
 */
router.get('/insurances', auth, async (req: Request, res: Response): Promise<void> => {
    try {
        const rules = await ruleEngineService.getAllInsuranceRules()
        
        // Buscar informações dos convênios para enriquecer a resposta
        const insurances = await prisma.insuranceCompany.findMany({
            where: {
                code: { in: rules.map(r => r.insuranceCode) }
            },
            select: {
                code: true,
                name: true,
                displayName: true,
                discount: true,
                isParticular: true
            }
        })
        
        // Combinar regras com informações dos convênios
        const enrichedRules = rules.map(rule => {
            const insurance = insurances.find(i => i.code === rule.insuranceCode)
            return {
                ...rule,
                insuranceName: insurance?.name,
                insuranceDisplayName: insurance?.displayName,
                insuranceDiscount: insurance?.discount,
                insuranceIsParticular: insurance?.isParticular
            }
        })
        
        res.json(enrichedRules)
    } catch (error) {
        console.error('Erro ao buscar regras de convênios:', error)
        res.status(500).json({ error: 'Erro ao buscar regras de convênios' })
    }
})

/**
 * GET /api/rules/insurances/:code
 * Busca regra de um convênio específico
 */
router.get('/insurances/:code', auth, async (req: Request, res: Response): Promise<void> => {
    try {
        const { code } = req.params
        const rule = await ruleEngineService.getInsuranceRule(code)
        
        if (!rule) {
            res.status(404).json({ error: 'Regra não encontrada' })
            return
        }
        
        // Buscar informações do convênio
        const insurance = await prisma.insuranceCompany.findUnique({
            where: { code },
            select: {
                code: true,
                name: true,
                displayName: true,
                discount: true,
                discountPercentage: true,
                isParticular: true
            }
        })
        
        res.json({
            ...rule,
            insurance
        })
    } catch (error) {
        console.error('Erro ao buscar regra de convênio:', error)
        res.status(500).json({ error: 'Erro ao buscar regra de convênio' })
    }
})

/**
 * PUT /api/rules/insurances/:code
 * Atualiza regra de um convênio
 */
router.put('/insurances/:code', auth, async (req: Request, res: Response): Promise<void> => {
    try {
        const { code } = req.params
        const data = req.body
        
        // Verificar se a regra existe
        const existingRule = await prisma.insuranceRule.findUnique({
            where: { insuranceCode: code }
        })
        
        if (!existingRule) {
            res.status(404).json({ error: 'Regra não encontrada' })
            return
        }
        
        // Atualizar regra
        const updatedRule = await prisma.insuranceRule.update({
            where: { insuranceCode: code },
            data: {
                showCoveredProcedures: data.showCoveredProcedures,
                mentionOtherBenefits: data.mentionOtherBenefits,
                customGreeting: data.customGreeting,
                hideValues: data.hideValues,
                canShowDiscount: data.canShowDiscount,
                specialProcedures: data.specialProcedures,
                isActive: data.isActive
            }
        })
        
        res.json(updatedRule)
    } catch (error) {
        console.error('Erro ao atualizar regra de convênio:', error)
        res.status(500).json({ error: 'Erro ao atualizar regra de convênio' })
    }
})

// ============================================
// TEMPLATES DE RESPOSTA
// ============================================

/**
 * GET /api/rules/templates
 * Lista todos os templates de resposta
 */
router.get('/templates', auth, async (req: Request, res: Response): Promise<void> => {
    try {
        const templates = await ruleEngineService.getAllResponseTemplates()
        res.json(templates)
    } catch (error) {
        console.error('Erro ao buscar templates:', error)
        res.status(500).json({ error: 'Erro ao buscar templates' })
    }
})

/**
 * GET /api/rules/templates/:id
 * Busca um template específico
 */
router.get('/templates/:id', auth, async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params
        const template = await prisma.responseRule.findUnique({
            where: { id }
        })
        
        if (!template) {
            res.status(404).json({ error: 'Template não encontrado' })
            return
        }
        
        res.json(template)
    } catch (error) {
        console.error('Erro ao buscar template:', error)
        res.status(500).json({ error: 'Erro ao buscar template' })
    }
})

/**
 * POST /api/rules/templates
 * Cria um novo template de resposta
 */
router.post('/templates', auth, async (req: Request, res: Response): Promise<void> => {
    try {
        const data = req.body
        
        const template = await prisma.responseRule.create({
            data: {
                intent: data.intent,
                context: data.context,
                targetType: data.targetType,
                targetId: data.targetId,
                template: data.template,
                conditions: data.conditions,
                priority: data.priority || 0,
                rules: data.rules,
                isActive: data.isActive !== undefined ? data.isActive : true,
                description: data.description
            }
        })
        
        res.status(201).json(template)
    } catch (error) {
        console.error('Erro ao criar template:', error)
        res.status(500).json({ error: 'Erro ao criar template' })
    }
})

/**
 * PUT /api/rules/templates/:id
 * Atualiza um template de resposta
 */
router.put('/templates/:id', auth, async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params
        const data = req.body
        
        // Verificar se o template existe
        const existingTemplate = await prisma.responseRule.findUnique({
            where: { id }
        })
        
        if (!existingTemplate) {
            res.status(404).json({ error: 'Template não encontrado' })
            return
        }
        
        // Atualizar template
        const updatedTemplate = await prisma.responseRule.update({
            where: { id },
            data: {
                intent: data.intent,
                context: data.context,
                targetType: data.targetType,
                targetId: data.targetId,
                template: data.template,
                conditions: data.conditions,
                priority: data.priority,
                rules: data.rules,
                isActive: data.isActive,
                description: data.description
            }
        })
        
        res.json(updatedTemplate)
    } catch (error) {
        console.error('Erro ao atualizar template:', error)
        res.status(500).json({ error: 'Erro ao atualizar template' })
    }
})

/**
 * DELETE /api/rules/templates/:id
 * Deleta um template de resposta
 */
router.delete('/templates/:id', auth, async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params
        
        // Verificar se o template existe
        const existingTemplate = await prisma.responseRule.findUnique({
            where: { id }
        })
        
        if (!existingTemplate) {
            res.status(404).json({ error: 'Template não encontrado' })
            return
        }
        
        // Deletar template
        await prisma.responseRule.delete({
            where: { id }
        })
        
        res.json({ message: 'Template deletado com sucesso' })
    } catch (error) {
        console.error('Erro ao deletar template:', error)
        res.status(500).json({ error: 'Erro ao deletar template' })
    }
})

// ============================================
// PREVIEW E TESTES
// ============================================

/**
 * POST /api/rules/preview/procedure
 * Preview de como um procedimento será formatado
 */
router.post('/preview/procedure', auth, async (req: Request, res: Response): Promise<void> => {
    try {
        const { procedureCode, procedureData } = req.body
        
        if (!procedureCode || !procedureData) {
            res.status(400).json({ error: 'procedureCode e procedureData são obrigatórios' })
            return
        }
        
        const formattedInfo = await ruleEngineService.formatProcedureInfo({
            code: procedureCode,
            ...procedureData
        })
        
        res.json({ formattedInfo })
    } catch (error) {
        console.error('Erro ao gerar preview:', error)
        res.status(500).json({ error: 'Erro ao gerar preview' })
    }
})

/**
 * POST /api/rules/preview/insurance
 * Preview de saudação de convênio
 */
router.post('/preview/insurance', auth, async (req: Request, res: Response): Promise<void> => {
    try {
        const { insuranceCode, insuranceName } = req.body
        
        if (!insuranceCode || !insuranceName) {
            res.status(400).json({ error: 'insuranceCode e insuranceName são obrigatórios' })
            return
        }
        
        const greeting = await ruleEngineService.formatInsuranceGreeting(insuranceCode, insuranceName)
        const shouldShowValues = await ruleEngineService.shouldShowInsuranceValues(insuranceCode)
        const canShowDiscount = await ruleEngineService.canShowDiscount(insuranceCode)
        
        res.json({ 
            greeting,
            shouldShowValues,
            canShowDiscount
        })
    } catch (error) {
        console.error('Erro ao gerar preview:', error)
        res.status(500).json({ error: 'Erro ao gerar preview' })
    }
})

/**
 * POST /api/rules/preview/template
 * Preview de renderização de template
 */
router.post('/preview/template', auth, async (req: Request, res: Response): Promise<void> => {
    try {
        const { template, variables } = req.body
        
        if (!template || !variables) {
            res.status(400).json({ error: 'template e variables são obrigatórios' })
            return
        }
        
        const rendered = ruleEngineService.renderTemplate(template, variables)
        
        res.json({ rendered })
    } catch (error) {
        console.error('Erro ao gerar preview:', error)
        res.status(500).json({ error: 'Erro ao gerar preview' })
    }
})

export default router
