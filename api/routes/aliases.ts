import { Router, type Request, type Response } from 'express'
import prisma from '../prisma/client.js'
import { authMiddleware } from '../utils/auth.js'
const readAuth = process.env.NODE_ENV === 'development'
  ? ((req: any, _res: any, next: any) => next())
  : authMiddleware

const router = Router()

router.post('/conversation-actions', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  req.url = '/actions'
  const mod = await import('./conversations.js')
  const convRouter = mod.default
  ;(convRouter as any).handle(req, res)
})

router.post('/transfer-conversation', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const { phone, assignTo } = req.body
  if (!phone || !assignTo) {
    res.status(400).json({ error: 'Telefone e usuário de destino são obrigatórios' })
    return
  }
  const conversation = await prisma.conversation.findFirst({ where: { phone } })
  if (!conversation) {
    res.status(404).json({ error: 'Conversa não encontrada' })
    return
  }
  const updated = await prisma.conversation.update({ where: { id: conversation.id }, data: { assignedToId: assignTo, status: 'EM_ATENDIMENTO' } })
  res.json(updated)
})

router.get('/global-queue', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const conversations = await prisma.conversation.findMany({ where: { status: 'PRINCIPAL' }, orderBy: { lastTimestamp: 'desc' } })
  res.json({ conversations })
})

router.get('/workflow/workflows', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const workflows = await prisma.workflow.findMany({ orderBy: { createdAt: 'desc' } })
  res.json({ workflows })
})

export default router
 
// Aliases for clinic routes to support legacy paths used by the frontend
router.get('/clinics', readAuth, async (req: Request, res: Response): Promise<void> => {
  req.url = '/clinics'
  const mod = await import('./clinic.js')
  const clRouter = mod.default
  ;(clRouter as any).handle(req, res)
})

router.post('/clinics', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  req.url = '/clinics'
  const mod = await import('./clinic.js')
  const clRouter = mod.default
  ;(clRouter as any).handle(req, res)
})

router.put('/clinics/:code', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const mod = await import('./clinic.js')
  const clRouter = mod.default
  ;(clRouter as any).handle(req, res)
})

router.delete('/clinics/:code', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const mod = await import('./clinic.js')
  const clRouter = mod.default
  ;(clRouter as any).handle(req, res)
})

router.get('/clinics/:code/procedures/:procedureCode/availability', readAuth, async (req: Request, res: Response): Promise<void> => {
  const mod = await import('./clinic.js')
  const clRouter = mod.default
  ;(clRouter as any).handle(req, res)
})

router.put('/clinics/:code/procedures/:procedureCode/availability', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const mod = await import('./clinic.js')
  const clRouter = mod.default
  ;(clRouter as any).handle(req, res)
})
