import { Router, Request, Response } from 'express'
import prisma from '../prisma/client.js'
import { authMiddleware } from '../utils/auth.js'

const router = Router()

// ✅ Listar atalhos do usuário
router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user!.id

        const quickReplies = await prisma.quickReply.findMany({
            where: {
                OR: [
                    { userId }, // Atalhos do usuário
                    { isGlobal: true } // Atalhos globais
                ]
            },
            orderBy: { shortcut: 'asc' }
        })

        res.json(quickReplies)
    } catch (error) {
        console.error('Erro ao listar atalhos:', error)
        res.status(500).json({ error: 'Erro ao listar atalhos' })
    }
})

// ✅ Criar novo atalho
router.post('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user!.id
        const { shortcut, text, isGlobal = false } = req.body

        // Validação
        if (!shortcut || !text) {
            res.status(400).json({ error: 'Shortcut e text são obrigatórios' })
            return
        }

        // ✅ Manter shortcut exatamente como usuário digitou (sem transformações)
        const cleanShortcut = shortcut.trim()

        // Verificar se já existe
        const existing = await prisma.quickReply.findUnique({
            where: {
                userId_shortcut: {
                    userId,
                    shortcut: cleanShortcut
                }
            }
        })

        if (existing) {
            res.status(400).json({ error: 'Atalho já existe' })
            return
        }

        // Criar atalho
        const quickReply = await prisma.quickReply.create({
            data: {
                userId,
                shortcut: cleanShortcut,
                text,
                isGlobal: req.user!.role === 'ADMIN' ? isGlobal : false
            }
        })

        res.status(201).json(quickReply)
    } catch (error) {
        console.error('Erro ao criar atalho:', error)
        res.status(500).json({ error: 'Erro ao criar atalho' })
    }
})

// ✅ Atualizar atalho
router.put('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params
        const userId = req.user!.id
        const { text, isGlobal } = req.body

        // Verificar se o atalho pertence ao usuário
        const existing = await prisma.quickReply.findUnique({
            where: { id }
        })

        if (!existing) {
            res.status(404).json({ error: 'Atalho não encontrado' })
            return
        }

        if (existing.userId !== userId && req.user!.role !== 'MASTER' && req.user!.role !== 'ADMIN') {
            res.status(403).json({ error: 'Sem permissão para editar este atalho' })
            return
        }

        // Atualizar
        const updated = await prisma.quickReply.update({
            where: { id },
            data: {
                text,
                isGlobal: req.user!.role === 'MASTER' || req.user!.role === 'ADMIN' ? isGlobal : existing.isGlobal
            }
        })

        res.json(updated)
    } catch (error) {
        console.error('Erro ao atualizar atalho:', error)
        res.status(500).json({ error: 'Erro ao atualizar atalho' })
    }
})

// ✅ Deletar atalho
router.delete('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params
        const userId = req.user!.id

        // Verificar se o atalho pertence ao usuário
        const existing = await prisma.quickReply.findUnique({
            where: { id }
        })

        if (!existing) {
            res.status(404).json({ error: 'Atalho não encontrado' })
            return
        }

        if (existing.userId !== userId && req.user!.role !== 'MASTER' && req.user!.role !== 'ADMIN') {
            res.status(403).json({ error: 'Sem permissão para deletar este atalho' })
            return
        }

        // Deletar
        await prisma.quickReply.delete({
            where: { id }
        })

        res.json({ success: true })
    } catch (error) {
        console.error('Erro ao deletar atalho:', error)
        res.status(500).json({ error: 'Erro ao deletar atalho' })
    }
})

export default router
