import { Router, type Request, type Response } from 'express'
import prisma from '../prisma/client.js'

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

export default router
