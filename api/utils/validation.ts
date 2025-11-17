import { z } from 'zod'

export const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
})

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
})

export const patientSchema = z.object({
  phone: z.string().regex(/^\d{10,11}$/, 'Telefone deve ter 10 ou 11 dígitos'),
  name: z.string().min(2, 'Nome é obrigatório'),
  cpf: z.string().optional(),
  email: z.string().email('Email inválido').optional(),
  birthDate: z.string().optional(),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
  insuranceCompany: z.string().optional(),
  insuranceNumber: z.string().optional(),
})

export const messageSchema = z.object({
  phone: z.string().regex(/^\d{10,11}$/, 'Telefone inválido'),
  text: z.string().min(1, 'Mensagem é obrigatória'),
  from: z.enum(['user', 'agent', 'bot']).optional(),
})

export const conversationActionSchema = z.object({
  action: z.enum(['take', 'transfer', 'close', 'return']),
  phone: z.string().regex(/^\d{10,11}$/, 'Telefone inválido'),
  assignTo: z.string().optional(),
})

export const workflowSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  type: z.enum(['APPOINTMENT', 'REGISTRATION', 'CONSULTATION', 'SUPPORT']),
  config: z.object({}).passthrough(),
})