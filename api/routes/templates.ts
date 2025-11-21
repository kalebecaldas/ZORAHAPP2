import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma/client.js';
import { authMiddleware } from '../utils/auth.js';

const router = Router();

// In development, allow public access
const templatesAuth = process.env.NODE_ENV === 'development'
  ? ((req: Request, res: Response, next: any) => next())
  : authMiddleware;

const templateSchema = z.object({
  key: z.string().min(1),
  category: z.enum(['welcome', 'units', 'procedures', 'insurance', 'scheduling', 'validation', 'transfer']),
  title: z.string().min(1),
  description: z.string().optional(),
  content: z.string().min(1),
  variables: z.array(z.object({
    name: z.string(),
    description: z.string(),
    example: z.string()
  })),
  example: z.string().optional(),
  isActive: z.boolean().default(true)
});

// GET /api/templates - List all templates
router.get('/', templatesAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, active } = req.query;
    
    const where: any = {};
    if (category) where.category = category;
    if (active !== undefined) where.isActive = active === 'true';
    
    const templates = await prisma.template.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { title: 'asc' }
      ]
    });
    
    res.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Erro ao buscar templates' });
  }
});

// GET /api/templates/category/:category - Get templates by category
router.get('/category/:category', templatesAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { category } = req.params;
    const templates = await prisma.template.findMany({
      where: {
        category,
        isActive: true
      },
      orderBy: { title: 'asc' }
    });
    
    res.json(templates);
  } catch (error) {
    console.error('Error fetching templates by category:', error);
    res.status(500).json({ error: 'Erro ao buscar templates' });
  }
});

// GET /api/templates/key/:key - Get template by key
router.get('/key/:key', templatesAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { key } = req.params;
    const template = await prisma.template.findUnique({
      where: { key }
    });
    
    if (!template) {
      res.status(404).json({ error: 'Template não encontrado' });
      return;
    }
    
    res.json(template);
  } catch (error) {
    console.error('Error fetching template by key:', error);
    res.status(500).json({ error: 'Erro ao buscar template' });
  }
});

// GET /api/templates/:id - Get template by ID
router.get('/:id', templatesAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const template = await prisma.template.findUnique({
      where: { id }
    });
    
    if (!template) {
      res.status(404).json({ error: 'Template não encontrado' });
      return;
    }
    
    res.json(template);
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ error: 'Erro ao buscar template' });
  }
});

// POST /api/templates - Create template
router.post('/', templatesAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const data = templateSchema.parse(req.body);
    
    // Check if key already exists
    const existing = await prisma.template.findUnique({
      where: { key: data.key }
    });
    
    if (existing) {
      res.status(400).json({ error: 'Já existe um template com esta chave' });
      return;
    }
    
    const template = await prisma.template.create({
      data: {
        key: data.key,
        category: data.category,
        title: data.title,
        description: data.description,
        content: data.content,
        variables: data.variables as any,
        example: data.example,
        isActive: data.isActive ?? true
      }
    });
    
    res.status(201).json(template);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Dados inválidos', details: error.errors });
      return;
    }
    console.error('Error creating template:', error);
    res.status(500).json({ error: 'Erro ao criar template' });
  }
});

// PUT /api/templates/:id - Update template
router.put('/:id', templatesAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const data = z.object({
      key: z.string().min(1).optional(),
      category: z.enum(['welcome', 'units', 'procedures', 'insurance', 'scheduling', 'validation', 'transfer']).optional(),
      title: z.string().min(1).optional(),
      description: z.string().optional(),
      content: z.string().min(1).optional(),
      variables: z.array(z.object({
        name: z.string(),
        description: z.string(),
        example: z.string()
      })).optional(),
      example: z.string().optional(),
      isActive: z.boolean().optional()
    }).parse(req.body);
    
    const existing = await prisma.template.findUnique({
      where: { id }
    });
    
    if (!existing) {
      res.status(404).json({ error: 'Template não encontrado' });
      return;
    }
    
    // If key is being changed, check if new key exists
    if (data.key && data.key !== existing.key) {
      const keyExists = await prisma.template.findUnique({
        where: { key: data.key }
      });
      
      if (keyExists) {
        res.status(400).json({ error: 'Já existe um template com esta chave' });
        return;
      }
    }
    
    const updateData: any = {};
    if (data.key !== undefined) updateData.key = data.key;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.variables !== undefined) updateData.variables = data.variables as any;
    if (data.example !== undefined) updateData.example = data.example;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    
    const template = await prisma.template.update({
      where: { id },
      data: updateData
    });
    
    res.json(template);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Dados inválidos', details: error.errors });
      return;
    }
    console.error('Error updating template:', error);
    res.status(500).json({ error: 'Erro ao atualizar template' });
  }
});

// DELETE /api/templates/:id - Delete template
router.delete('/:id', templatesAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const existing = await prisma.template.findUnique({
      where: { id }
    });
    
    if (!existing) {
      res.status(404).json({ error: 'Template não encontrado' });
      return;
    }
    
    await prisma.template.delete({
      where: { id }
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: 'Erro ao deletar template' });
  }
});

export default router;

