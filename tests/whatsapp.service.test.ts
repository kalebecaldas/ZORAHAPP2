import { describe, it, expect, vi } from 'vitest'
import { WhatsAppService } from '../api/services/whatsapp.js'
import axios from 'axios'

// Mock axios
vi.mock('axios')

describe('WhatsApp Service', () => {
  let whatsappService: WhatsAppService
  const mockAxios = vi.mocked(axios)

  beforeEach(() => {
    whatsappService = new WhatsAppService('test-token', 'test-phone-id')
    vi.clearAllMocks()
  })

  describe('sendTextMessage', () => {
    it('should send text message successfully', async () => {
      const mockResponse = {
        data: {
          messaging_product: 'whatsapp',
          contacts: [{ input: '5511999999999', wa_id: '5511999999999' }],
          messages: [{ id: 'test-message-id' }]
        }
      }
      mockAxios.post.mockResolvedValueOnce(mockResponse)

      const result = await whatsappService.sendTextMessage('5511999999999', 'Hello World')

      expect(mockAxios.post).toHaveBeenCalledWith(
        'https://graph.facebook.com/v18.0/test-phone-id/messages',
        {
          messaging_product: 'whatsapp',
          to: '5511999999999',
          type: 'text',
          text: { body: 'Hello World' }
        },
        {
          headers: {
            Authorization: 'Bearer test-token',
            'Content-Type': 'application/json'
          }
        }
      )

      expect(result).toEqual(mockResponse.data)
    })

    it('should handle API errors', async () => {
      const mockError = new Error('API Error')
      mockAxios.post.mockRejectedValueOnce(mockError)

      await expect(whatsappService.sendTextMessage('5511999999999', 'Hello'))
        .rejects.toThrow('Falha ao enviar mensagem')
    })
  })

  describe('sendTemplateMessage', () => {
    it('should send template message successfully', async () => {
      const mockResponse = {
        data: {
          messaging_product: 'whatsapp',
          contacts: [{ input: '5511999999999', wa_id: '5511999999999' }],
          messages: [{ id: 'test-template-id' }]
        }
      }
      mockAxios.post.mockResolvedValueOnce(mockResponse)

      const result = await whatsappService.sendTemplateMessage('5511999999999', 'welcome_template')

      expect(mockAxios.post).toHaveBeenCalledWith(
        'https://graph.facebook.com/v18.0/test-phone-id/messages',
        {
          messaging_product: 'whatsapp',
          to: '5511999999999',
          type: 'template',
          template: {
            name: 'welcome_template',
            language: { code: 'pt_BR' }
          }
        },
        {
          headers: {
            Authorization: 'Bearer test-token',
            'Content-Type': 'application/json'
          }
        }
      )

      expect(result).toEqual(mockResponse.data)
    })
  })

  describe('sendInteractiveMessage', () => {
    it('should send interactive message successfully', async () => {
      const mockResponse = {
        data: {
          messaging_product: 'whatsapp',
          contacts: [{ input: '5511999999999', wa_id: '5511999999999' }],
          messages: [{ id: 'test-interactive-id' }]
        }
      }
      mockAxios.post.mockResolvedValueOnce(mockResponse)

      const interactiveData = {
        type: 'button',
        body: { text: 'Choose an option' },
        action: {
          buttons: [
            { type: 'reply', reply: { id: '1', title: 'Option 1' } },
            { type: 'reply', reply: { id: '2', title: 'Option 2' } }
          ]
        }
      }

      const result = await whatsappService.sendInteractiveMessage('5511999999999', interactiveData)

      expect(mockAxios.post).toHaveBeenCalledWith(
        'https://graph.facebook.com/v18.0/test-phone-id/messages',
        {
          messaging_product: 'whatsapp',
          to: '5511999999999',
          type: 'interactive',
          interactive: interactiveData
        },
        {
          headers: {
            Authorization: 'Bearer test-token',
            'Content-Type': 'application/json'
          }
        }
      )

      expect(result).toEqual(mockResponse.data)
    })
  })
})