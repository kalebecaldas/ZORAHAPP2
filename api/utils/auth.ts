import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import type { Request, Response, NextFunction } from 'express'
import prisma from '../prisma/client.js'

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        email: string
        name: string
        role: 'MASTER' | 'ADMIN' | 'SUPERVISOR' | 'ATENDENTE'
      }
    }
  }
}

const JWT_SECRET = process.env.AUTH_JWT_SECRET || 'fallback-secret'

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string }
  } catch {
    return null
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' })
  }

  const decoded = verifyToken(token)
  if (!decoded) {
    return res.status(401).json({ error: 'Token inválido' })
  }

  const user = await prisma.user.findUnique({ where: { id: decoded.userId } })
  if (!user) {
    return res.status(401).json({ error: 'Usuário não encontrado' })
  }

  req.user = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as any
  }
  next()
}

export function requireRole(role: 'ADMIN' | 'AGENT') {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Não autenticado' })
    if (req.user.role !== role) return res.status(403).json({ error: 'Permissão insuficiente' })
    next()
  }
}

type Role = 'MASTER' | 'ADMIN' | 'SUPERVISOR' | 'ATENDENTE'

export function authorize(allowed: Role[] = ['MASTER', 'ADMIN']): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Não autenticado' })
    const role = req.user.role as Role
    if (!allowed.includes(role)) return res.status(403).json({ error: 'Permissão insuficiente' })
    next()
  }
}

export function forbidModifyingMaster() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const targetId = req.params.id
      if (!targetId) return next()
      const target = await prisma.user.findUnique({ where: { id: targetId } })
      if (String(target?.role) === 'MASTER' && String(req.user?.role) !== 'MASTER') {
        return res.status(403).json({ error: 'Não permitido modificar usuário MASTER' })
      }
      next()
    } catch (e) {
      next(e)
    }
  }
}
