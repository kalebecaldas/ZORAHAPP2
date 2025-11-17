import axios from 'axios'
import { z } from 'zod'

const metaResponseSchema = z.object({
  messaging_product: z.string(),
  contacts: z.array(z.object({ input: z.string(), wa_id: z.string() })),
  messages: z.array(z.object({ id: z.string() })),
})

export type MetaResponse = z.infer<typeof metaResponseSchema>

export class WhatsAppService {
  private accessToken: string
  private phoneNumberId: string
  private baseUrl = 'https://graph.facebook.com/v18.0'

  constructor(accessToken: string, phoneNumberId: string) {
    this.accessToken = accessToken
    this.phoneNumberId = phoneNumberId
  }

  async sendTextMessage(to: string, text: string): Promise<MetaResponse> {
    const payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    }

    try {
      const { data } = await axios.post(
        `${this.baseUrl}/${this.phoneNumberId}/messages`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      )

      return metaResponseSchema.parse(data)
    } catch (error: any) {
      console.error('Erro ao enviar mensagem WhatsApp:', error.response?.data || error.message)
      throw new Error('Falha ao enviar mensagem')
    }
  }

  async sendTemplateMessage(to: string, templateName: string, languageCode = 'pt_BR', components?: any[]): Promise<MetaResponse> {
    const payload: any = {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
      },
    }

    if (components) {
      payload.template.components = components
    }

    try {
      const { data } = await axios.post(
        `${this.baseUrl}/${this.phoneNumberId}/messages`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      )

      return metaResponseSchema.parse(data)
    } catch (error: any) {
      console.error('Erro ao enviar template WhatsApp:', error.response?.data || error.message)
      throw new Error('Falha ao enviar template')
    }
  }

  async sendInteractiveMessage(to: string, interactive: any): Promise<MetaResponse> {
    const payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive,
    }

    try {
      const { data } = await axios.post(
        `${this.baseUrl}/${this.phoneNumberId}/messages`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      )

      return metaResponseSchema.parse(data)
    } catch (error: any) {
      console.error('Erro ao enviar mensagem interativa:', error.response?.data || error.message)
      throw new Error('Falha ao enviar mensagem interativa')
    }
  }
}