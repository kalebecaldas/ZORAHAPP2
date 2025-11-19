import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import prisma from '../prisma/client.js'
import { authMiddleware } from '../utils/auth.js'
import { authorize, forbidModifyingMaster } from '../utils/auth.js'

// In development, allow public access for listing users to ease bootstrapping
const usersAuth = process.env.NODE_ENV === 'development'
  ? ((req: Request, res: Response, next: any) => next())
  : authMiddleware

// Conditionally apply authorization: in development, skip role checks for listing
const usersAuthorizeList = process.env.NODE_ENV === 'development'
  ? ((req: Request, res: Response, next: any) => next())
  : authorize(['MASTER','ADMIN'])

const router = Router()

// Get all users (admin only; in development, public)
router.get('/', usersAuth, usersAuthorizeList, async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query
    const skip = (Number(page) - 1) * Number(limit)

    const where = search ? {
      OR: [
        { name: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
      ]
    } : {}

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              conversations: true
            }
          }
        }
      }),
      prisma.user.count({ where })
    ])

    res.json({
      users,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    })
  } catch (error) {
    console.error('Erro ao buscar usuários:', error)
    res.status(500).json({ error: 'Erro interno' })
  }
})

// Get user by ID
router.get('/:id', authMiddleware, authorize(['MASTER','ADMIN']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            conversations: true
          }
        }
      }
    })

    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado' })
      return
    }

    res.json(user)
  } catch (error) {
    console.error('Erro ao buscar usuário:', error)
    res.status(500).json({ error: 'Erro interno' })
  }
})

// Create user: ADMIN can criar ADMIN/SUPERVISOR/ATENDENTE; MASTER pode criar qualquer nível
router.post('/', authMiddleware, authorize(['MASTER','ADMIN']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, name, password, role = 'ATENDENTE' } = req.body

    // Validate required fields
    if (!email || !name || !password) {
      res.status(400).json({ error: 'Email, nome e senha são obrigatórios' })
      return
    }

    // Validate email format
    const emailSchema = z.string().email()
    try {
      emailSchema.parse(email)
    } catch {
      res.status(400).json({ error: 'Email inválido' })
      return
    }

    // Validate password
    if (password.length < 6) {
      res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' })
      return
    }

    // Validate role
    if (!['MASTER','ADMIN','SUPERVISOR','ATENDENTE'].includes(role)) {
      res.status(400).json({ error: 'Função inválida' })
      return
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      res.status(400).json({ error: 'Email já cadastrado' })
      return
    }

    // Hash password
    const bcrypt = await import('bcryptjs')
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: role as any
      }
    })

    res.status(201).json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt
    })
  } catch (error) {
    console.error('Erro ao criar usuário:', error)
    res.status(500).json({ error: 'Erro interno' })
  }
})

// Update user (ADMIN/MASTER); não permite modificar MASTER a menos que ator seja MASTER
router.put('/:id', authMiddleware, authorize(['MASTER','ADMIN']), forbidModifyingMaster(), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { name, role, password } = req.body

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id }
    })

    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado' })
      return
    }

    // Validate role if provided
    if (role && !['MASTER','ADMIN','SUPERVISOR','ATENDENTE'].includes(role)) {
      res.status(400).json({ error: 'Função inválida' })
      return
    }

    // Validate password if provided
    if (password && password.length < 6) {
      res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' })
      return
    }

    // Prepare update data
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (role !== undefined) updateData.role = role
    if (password !== undefined) {
      const bcrypt = await import('bcryptjs')
      updateData.password = await bcrypt.hash(password, 12)
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    })

    res.json(updatedUser)
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error)
    res.status(500).json({ error: 'Erro interno' })
  }
})

// Delete user (ADMIN/MASTER); não permite deletar MASTER a menos que ator seja MASTER
router.delete('/:id', authMiddleware, authorize(['MASTER','ADMIN']), forbidModifyingMaster(), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id }
    })

    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado' })
      return
    }

    // Check if user has active conversations
    const activeConversations = await prisma.conversation.count({
      where: {
        assignedToId: id,
        status: { in: ['BOT_QUEUE', 'PRINCIPAL', 'EM_ATENDIMENTO'] }
      }
    })

    if (activeConversations > 0) {
      res.status(400).json({ error: 'Usuário tem conversas ativas' })
      return
    }

    // Delete user
    await prisma.user.delete({ where: { id } })
    await prisma.auditLog.create({ data: { actorId: req.user!.id, targetUserId: id, action: 'USER_DELETE', details: { email: user.email } } })

    res.json({ message: 'Usuário deletado com sucesso' })
  } catch (error) {
    console.error('Erro ao deletar usuário:', error)
    res.status(500).json({ error: 'Erro interno' })
  }
})

// Get current user profile
router.get('/me/profile', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            conversations: true
          }
        }
      }
    })

    res.json(user)
  } catch (error) {
    console.error('Erro ao buscar perfil:', error)
    res.status(500).json({ error: 'Erro interno' })
  }
})

// Update current user profile
router.put('/me/profile', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, password } = req.body

    // Validate name if provided
    if (name !== undefined && (!name || name.trim().length < 2)) {
      res.status(400).json({ error: 'Nome deve ter pelo menos 2 caracteres' })
      return
    }

    // Validate password if provided
    if (password !== undefined && password.length < 6) {
      res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' })
      return
    }

    // Prepare update data
    const updateData: any = {}
    if (name !== undefined) updateData.name = name.trim()
    if (password !== undefined) {
      const bcrypt = await import('bcryptjs')
      updateData.password = await bcrypt.hash(password, 12)
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    })

    res.json(updatedUser)
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error)
    res.status(500).json({ error: 'Erro interno' })
  }
})

export default router
