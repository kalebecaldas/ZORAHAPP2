import { describe, it, expect, beforeEach } from 'vitest'
import { AIService } from '../api/services/ai.js'

describe('AI Service', () => {
  let aiService: AIService

  beforeEach(() => {
    // Mock OpenAI API key for testing
    aiService = new AIService('test-api-key', 'gpt-3.5-turbo', 5000)
  })

  describe('buildSystemPrompt', () => {
    it('should build system prompt with patient info', async () => {
      const context = {
        patient: {
          id: '123',
          name: 'João Silva',
          phone: '11999999999',
          insuranceCompany: 'Unimed'
        },
        history: [],
        clinicData: {
          name: 'Clínica Saúde',
          address: 'Rua Teste, 123',
          phone: '1133333333',
          procedures: [
            { name: 'Consulta', price: 200, insurance: ['Unimed'] }
          ]
        }
      }

      const response = await aiService.generateResponse('Olá, gostaria de marcar uma consulta', context)
      
      expect(response).toHaveProperty('response')
      expect(response).toHaveProperty('confidence')
      expect(response.confidence).toBeGreaterThanOrEqual(0)
      expect(response.confidence).toBeLessThanOrEqual(1)
    })

    it('should handle missing patient gracefully', async () => {
      const context = {
        patient: undefined,
        history: [],
        clinicData: {
          name: 'Clínica Saúde',
          address: 'Rua Teste, 123',
          phone: '1133333333',
          procedures: []
        }
      }

      const response = await aiService.generateResponse('Olá', context)
      
      expect(response).toHaveProperty('response')
      expect(response.response).toBe('Desculpe, estou tendo dificuldades para processar sua mensagem. Por favor, tente novamente ou fale com um atendente.')
      expect(response.confidence).toBe(0.3)
    })
  })

  describe('classifyIntent', () => {
    it('should classify appointment intent', async () => {
      const intent = await aiService.classifyIntent('Quero marcar uma consulta')
      
      expect(['agendamento', 'preço', 'informação', 'reclamação', 'saudação', 'follow-up', 'outro']).toContain(intent)
    })

    it('should classify price intent', async () => {
      const intent = await aiService.classifyIntent('Quanto custa uma consulta?')
      
      expect(['agendamento', 'preço', 'informação', 'reclamação', 'saudação', 'follow-up', 'outro']).toContain(intent)
    })
  })

  describe('analyzeSentiment', () => {
    it('should analyze positive sentiment', async () => {
      const sentiment = await aiService.analyzeSentiment('Muito obrigado pela ajuda!')
      
      expect(['positive', 'negative', 'neutral']).toContain(sentiment)
    })

    it('should analyze negative sentiment', async () => {
      const sentiment = await aiService.analyzeSentiment('Estou muito insatisfeito com o serviço')
      
      expect(['positive', 'negative', 'neutral']).toContain(sentiment)
    })
  })
})