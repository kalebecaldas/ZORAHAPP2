import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import prisma from '../prisma/client.js'
import { generateToken, hashPassword, comparePassword } from '../utils/auth.js'
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

export default router
