import axios from 'axios'
import { z } from 'zod'

const instagramResponseSchema = z.object({
  id: z.string(),
})

export type InstagramResponse = z.infer<typeof instagramResponseSchema>

export class InstagramService {
  private accessToken: string
  private instagramAppId: string
  private baseUrl = 'https://graph.facebook.com/v18.0'

  constructor(accessToken: string, instagramAppId: string) {
    this.accessToken = accessToken
    this.instagramAppId = instagramAppId
  }

  /**
   * Send text message to Instagram user
   */
  async sendTextMessage(recipientId: string, text: string): Promise<InstagramResponse> {
    const payload = {
      recipient: { id: recipientId },
      message: { text },
      messaging_type: 'RESPONSE'
    }

    try {
      const { data } = await axios.post(
        `${this.baseUrl}/${this.instagramAppId}/messages`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        },
      )

      if (data?.message_id) {
        return { id: data.message_id }
      }

      return instagramResponseSchema.parse(data)
    } catch (error: any) {
      console.error('Erro ao enviar mensagem Instagram:', error.response?.data || error.message)
      throw new Error(`Erro ao enviar mensagem: ${error.response?.data?.error?.message || error.message}`)
    }
  }

  /**
   * Send media message (image) to Instagram user
   */
  async sendImageMessage(recipientId: string, imageUrl: string, caption?: string): Promise<InstagramResponse> {
    const payload = {
      recipient: { id: recipientId },
      message: {
        attachment: {
          type: 'image',
          payload: {
            url: imageUrl,
            is_reusable: true
          }
        }
      },
      messaging_type: 'RESPONSE'
    }

    if (caption) {
      payload.message.attachment.payload.caption = caption
    }

    try {
      const { data } = await axios.post(
        `${this.baseUrl}/${this.instagramAppId}/messages`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        },
      )

      if (data?.message_id) {
        return { id: data.message_id }
      }

      return instagramResponseSchema.parse(data)
    } catch (error: any) {
      console.error('Erro ao enviar imagem Instagram:', error.response?.data || error.message)
      throw new Error(`Erro ao enviar imagem: ${error.response?.data?.error?.message || error.message}`)
    }
  }

  /**
   * Get user profile information
   */
  async getUserProfile(userId: string): Promise<any> {
    try {
      const { data } = await axios.get(
        `${this.baseUrl}/${userId}`,
        {
          params: {
            fields: 'id,name,profile_pic',
            access_token: this.accessToken
          },
          timeout: 5000,
        },
      )

      return data
    } catch (error: any) {
      console.error('Erro ao buscar perfil Instagram:', error.response?.data || error.message)
      throw new Error(`Erro ao buscar perfil: ${error.response?.data?.error?.message || error.message}`)
    }
  }

  /**
   * Subscribe to webhooks for Instagram messaging
   */
  async subscribeToWebhook(callbackUrl: string, verifyToken: string): Promise<boolean> {
    try {
      // Instagram uses the same webhook subscription as Facebook Messenger
      const { data } = await axios.post(
        `${this.baseUrl}/${this.instagramAppId}/subscribed_apps`,
        {
          callback_url: callbackUrl,
          verify_token: verifyToken,
          fields: 'messages,messaging_postbacks,messaging_optins,messaging_referrals'
        },
        {
          params: {
            access_token: this.accessToken
          },
          timeout: 10000,
        },
      )

      return data?.success === true
    } catch (error: any) {
      console.error('Erro ao inscrever webhook Instagram:', error.response?.data || error.message)
      throw new Error(`Erro ao inscrever webhook: ${error.response?.data?.error?.message || error.message}`)
    }
  }
}

