import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import prisma from '../prisma/client.js'
import { generateToken, hashPassword, comparePassword, verifyToken } from '../utils/auth.js'
import { registerSchema, loginSchema } from '../utils/validation.js'

const router = Router()

// Register
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const data = registerSchema.parse(req.body)
    
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email }
    })
    
    if (existingUser) {
      res.status(400).json({ error: 'Email já cadastrado' })
      return
    }

    const hashedPassword = await hashPassword(data.password)
    
    const user = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: hashedPassword,
      }
    })

    const token = generateToken(user.id)
    
    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      token,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Dados inválidos', details: error.errors })
      return
    }
    console.error('Erro no registro:', error)
    res.status(500).json({ error: 'Erro interno' })
  }
})

// Login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const data = loginSchema.parse(req.body)
    
    let user = await prisma.user.findUnique({ where: { email: data.email } })

    // Legacy admin auto-create if not exists
    if (!user && data.email === 'kalebe.caldas@hotmail.com' && data.password === 'mxskqgltne') {
      const hashedPassword = await hashPassword(data.password)
      user = await prisma.user.create({ data: { email: data.email, name: 'Kalebe Caldas', password: hashedPassword, role: 'ADMIN' } })
    }
    
    if (!user) {
      res.status(401).json({ error: 'Credenciais inválidas' })
      return
    }

    const isValidPassword = await comparePassword(data.password, user.password)
    
    if (!isValidPassword) {
      res.status(401).json({ error: 'Credenciais inválidas' })
      return
    }

    // First login promotion to MASTER for legacy admin
    if (user.email === 'kalebe.caldas@hotmail.com' && user.role !== 'MASTER') {
      user = await prisma.user.update({ where: { id: user.id }, data: { role: 'MASTER', isMasterFrozen: true, lastLoginAt: new Date() } })
    } else {
      await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
    }

    const token = generateToken(user.id)
    
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      token,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Dados inválidos', details: error.errors })
      return
    }
    console.error('Erro no login:', error)
    res.status(500).json({ error: 'Erro interno' })
  }
})

// Logout
router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  res.json({ message: 'Logout realizado com sucesso' })
})

// Generate N8N API Token (apenas para MASTER/ADMIN)
router.post('/generate-n8n-token', async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Token não fornecido' })
      return
    }

    const token = authHeader.substring(7)
    
    // Verify token and get user
    const decoded = await verifyToken(token)
    if (!decoded) {
      res.status(401).json({ error: 'Token inválido' })
      return
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } })
    
    if (!user) {
      res.status(401).json({ error: 'Usuário não encontrado' })
      return
    }

    // Only MASTER and ADMIN can generate N8N tokens
    if (!['MASTER', 'ADMIN'].includes(user.role)) {
      res.status(403).json({ error: 'Sem permissão para gerar tokens N8N' })
      return
    }

    // Generate N8N API token (valid for 10 years)
    const n8nToken = generateToken('n8n_integration', '10y')
    
    // Log token generation
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'GENERATE_N8N_TOKEN',
        entityType: 'API_TOKEN',
        entityId: 'n8n_integration',
        details: { generatedBy: user.email, timestamp: new Date().toISOString() }
      }
    })

    res.json({
      token: n8nToken,
      type: 'n8n_integration',
      expiresIn: '10 years',
      usage: 'Use este token no header: Authorization: Bearer {token}'
    })
  } catch (error) {
    console.error('Erro ao gerar token N8N:', error)
    res.status(500).json({ error: 'Erro interno' })
  }
})

export default router
