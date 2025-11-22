import { Router, type Request, type Response } from 'express'
import prisma from '../prisma/client.js'
import { authMiddleware } from '../utils/auth.js'
import { getRealtime } from '../realtime.js'

const router = Router()

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const { page = 1, limit = 50 } = req.query
  const skip = (Number(page) - 1) * Number(limit)
  const [messages, total] = await Promise.all([
    prisma.message.findMany({
      skip,
      take: Number(limit),
      orderBy: { timestamp: 'desc' }
    }),
    prisma.message.count()
  ])
  res.json({ messages, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } })
})

router.get('/:phone', async (req: Request, res: Response): Promise<void> => {
  const { phone } = req.params
  const { limit = 100 } = req.query
  const messages = await prisma.message.findMany({
    where: { phoneNumber: phone },
    orderBy: { timestamp: 'asc' },
    take: Number(limit)
  })
  res.json({ phone, messages })
})

router.delete('/:phone', async (req: Request, res: Response): Promise<void> => {
  const { phone } = req.params
  await prisma.message.deleteMany({ where: { phoneNumber: phone } })
  res.json({ success: true })
})

// Delete single message by ID
router.delete('/id/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const msg = await prisma.message.findUnique({ where: { id } })
    if (!msg) {
      res.status(404).json({ error: 'Mensagem não encontrada' })
      return
    }

    const conv = await prisma.conversation.findUnique({ where: { id: msg.conversationId } })
    await prisma.message.delete({ where: { id } })

    const last = await prisma.message.findFirst({ where: { conversationId: msg.conversationId }, orderBy: { timestamp: 'desc' } })
    await prisma.conversation.update({ where: { id: msg.conversationId }, data: { lastMessage: last?.messageText || null, lastTimestamp: last?.timestamp || null } })

    const realtime = getRealtime()
    const payload = { id, conversationId: msg.conversationId }
    if (conv?.phone) {
      realtime.io.to(`conv:${conv.phone}`).emit('message_deleted', payload)
    }
    realtime.io.to(`conv:${msg.conversationId}`).emit('message_deleted', payload)

    res.json({ success: true })
  } catch (error) {
    console.error('Erro ao deletar mensagem:', error)
    res.status(500).json({ error: 'Erro ao deletar mensagem' })
  }
})

export default router
