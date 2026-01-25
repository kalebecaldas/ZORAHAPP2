import { Router, type Request, type Response } from 'express'
import prisma from '../prisma/client.js'
import { authMiddleware, authorize } from '../utils/auth.js'

const router = Router()

// Simple role-permissions storage as AuditLog-backed settings (Json by role)
// For extensibilidade, usamos linha única em AuditLog com action 'ROLE_PERMISSIONS'

const readAuth = process.env.NODE_ENV === 'development'
  ? ((req: Request, res: Response, next: any) => next())
  : authMiddleware

router.get('/', readAuth, async (req: Request, res: Response): Promise<void> => {
  const defaults = {
    MASTER: { users: true, settings: true, workflows: true, patients: true, conversations: true, stats: true, aiConfig: true, test: true },
    ADMIN: { users: true, settings: true, workflows: true, patients: true, conversations: true, stats: true, aiConfig: true, test: true },
    SUPERVISOR: { users: false, settings: false, workflows: false, patients: true, conversations: true, stats: true, aiConfig: false, test: false },
    ATENDENTE: { users: false, settings: false, workflows: false, patients: false, conversations: true, stats: false, aiConfig: false, test: false }
  }
  try {
    const latest = await prisma.auditLog.findFirst({
      where: { action: 'ROLE_PERMISSIONS' },
      orderBy: { createdAt: 'desc' }
    })
    res.json({ permissions: latest?.details || defaults })
  } catch {
    res.json({ permissions: defaults })
  }
})

router.put('/', authMiddleware, authorize(['MASTER','ADMIN']), async (req: Request, res: Response): Promise<void> => {
  const data = req.body
  await prisma.auditLog.create({
    data: { actorId: req.user!.id, action: 'ROLE_PERMISSIONS', details: data }
  })
  res.json({ success: true })
})

export default router
