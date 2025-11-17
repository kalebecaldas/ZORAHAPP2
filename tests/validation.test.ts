import { describe, it, expect } from 'vitest'
import { 
  registerSchema, 
  loginSchema, 
  patientSchema, 
  messageSchema, 
  conversationActionSchema,
  workflowSchema 
} from '../api/utils/validation.js'

describe('Validation Schemas', () => {
  describe('registerSchema', () => {
    it('should validate correct registration data', () => {
      const validData = {
        email: 'test@example.com',
        name: 'John Doe',
        password: 'password123'
      }

      const result = registerSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'invalid-email',
        name: 'John Doe',
        password: 'password123'
      }

      const result = registerSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Email inválido')
      }
    })

    it('should reject short password', () => {
      const invalidData = {
        email: 'test@example.com',
        name: 'John Doe',
        password: '123'
      }

      const result = registerSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Senha deve ter pelo menos 6 caracteres')
      }
    })
  })

  describe('loginSchema', () => {
    it('should validate correct login data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123'
      }

      const result = loginSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject missing password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: ''
      }

      const result = loginSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Senha é obrigatória')
      }
    })
  })

  describe('patientSchema', () => {
    it('should validate correct patient data', () => {
      const validData = {
        phone: '11999999999',
        name: 'John Doe',
        cpf: '12345678901',
        email: 'john@example.com',
        birthDate: '1990-01-01',
        address: '123 Main St',
        emergencyContact: '11888888888',
        insuranceCompany: 'Unimed',
        insuranceNumber: '123456'
      }

      const result = patientSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject invalid phone number', () => {
      const invalidData = {
        phone: '123',
        name: 'John Doe'
      }

      const result = patientSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Telefone deve ter 10 ou 11 dígitos')
      }
    })

    it('should reject invalid email', () => {
      const invalidData = {
        phone: '11999999999',
        name: 'John Doe',
        email: 'invalid-email'
      }

      const result = patientSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Email inválido')
      }
    })
  })

  describe('messageSchema', () => {
    it('should validate correct message data', () => {
      const validData = {
        phone: '11999999999',
        text: 'Hello, this is a test message',
        from: 'user'
      }

      const result = messageSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject empty message', () => {
      const invalidData = {
        phone: '11999999999',
        text: '',
        from: 'user'
      }

      const result = messageSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Mensagem é obrigatória')
      }
    })
  })

  describe('conversationActionSchema', () => {
    it('should validate correct action data', () => {
      const validData = {
        action: 'take',
        phone: '11999999999',
        assignTo: 'user123'
      }

      const result = conversationActionSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject invalid action', () => {
      const invalidData = {
        action: 'invalid-action',
        phone: '11999999999'
      }

      const result = conversationActionSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('workflowSchema', () => {
    it('should validate correct workflow data', () => {
      const validData = {
        name: 'Appointment Workflow',
        description: 'Workflow for appointment scheduling',
        type: 'APPOINTMENT',
        config: {
          nodes: [
            { id: '1', type: 'START', data: {} }
          ],
          edges: []
        }
      }

      const result = workflowSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject missing name', () => {
      const invalidData = {
        description: 'Workflow for appointment scheduling',
        type: 'APPOINTMENT',
        config: {}
      }

      const result = workflowSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Required')
      }
    })

    it('should reject invalid type', () => {
      const invalidData = {
        name: 'Test Workflow',
        type: 'INVALID_TYPE',
        config: {}
      }

      const result = workflowSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })
})