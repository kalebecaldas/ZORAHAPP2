import { Router, Request, Response } from 'express'
import prisma from '../prisma/client.js'
import { authMiddleware } from '../utils/auth.js'

const router = Router()

// Aplicar auth em todas as rotas
router.use(authMiddleware)

/**
 * GET /api/settings/system
 * Busca configurações do sistema
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
    try {
        let settings = await prisma.systemSettings.findFirst()

        // Se não existir, criar com valores padrão
        if (!settings) {
            settings = await prisma.systemSettings.create({
                data: {
                    inactivityTimeoutMinutes: 20,
                    closingMessage: 'Obrigado pelo contato! Estamos à disposição. 😊',
                    autoAssignEnabled: true,
                    maxConversationsPerAgent: 5
                }
            })
        }

        res.json(settings)
    } catch (error) {
        console.error('Error fetching system settings:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

/**
 * PUT /api/settings/system
 * Atualiza configurações do sistema
 */
router.put('/', async (req: Request, res: Response): Promise<void> => {
    try {
        const {
            inactivityTimeoutMinutes,
            closingMessage,
            autoAssignEnabled,
            maxConversationsPerAgent
        } = req.body

        // Validações
        if (inactivityTimeoutMinutes !== undefined) {
            if (inactivityTimeoutMinutes < 1 || inactivityTimeoutMinutes > 60) {
                res.status(400).json({ error: 'Timeout deve estar entre 1 e 60 minutos' })
                return
            }
        }

        if (maxConversationsPerAgent !== undefined) {
            if (maxConversationsPerAgent < 1 || maxConversationsPerAgent > 50) {
                res.status(400).json({ error: 'Máximo de conversas deve estar entre 1 e 50' })
                return
            }
        }

        // Buscar configuração existente
        let settings = await prisma.systemSettings.findFirst()

        if (settings) {
            // Atualizar existente
            settings = await prisma.systemSettings.update({
                where: { id: settings.id },
                data: {
                    ...(inactivityTimeoutMinutes !== undefined && { inactivityTimeoutMinutes }),
                    ...(closingMessage !== undefined && { closingMessage }),
                    ...(autoAssignEnabled !== undefined && { autoAssignEnabled }),
                    ...(maxConversationsPerAgent !== undefined && { maxConversationsPerAgent })
                }
            })
        } else {
            // Criar novo
            settings = await prisma.systemSettings.create({
                data: {
                    inactivityTimeoutMinutes: inactivityTimeoutMinutes || 20,
                    closingMessage: closingMessage || 'Obrigado pelo contato! Estamos à disposição. 😊',
                    autoAssignEnabled: autoAssignEnabled !== undefined ? autoAssignEnabled : true,
                    maxConversationsPerAgent: maxConversationsPerAgent || 5
                }
            })
        }

        res.json(settings)
    } catch (error) {
        console.error('Error updating system settings:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

export default router
