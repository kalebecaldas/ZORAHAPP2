import axios from 'axios'
import { z } from 'zod'

const instagramResponseSchema = z.object({
  id: z.string(),
})

export type InstagramResponse = z.infer<typeof instagramResponseSchema>

export class InstagramService {
  private accessToken: string
  private pageId: string
  private baseUrl = 'https://graph.instagram.com/v21.0'

  constructor(accessToken: string, pageIdOrAppId: string) {
    this.accessToken = accessToken
    // Instagram uses Page ID (not App ID) for messaging
    // If pageIdOrAppId is actually an App ID, we'll need to get the Page ID from the token
    this.pageId = pageIdOrAppId
  }

  /**
   * Get Page ID from access token (if not provided)
   * Note: Instagram API uses /me/messages, so we don't need Page ID for the endpoint
   */
  private async getPageId(): Promise<string> {
    // Instagram API uses /me/messages, so Page ID is not needed for the endpoint
    // But we keep this method for compatibility
    return this.pageId || 'me'
  }

  /**
   * Send text message to Instagram user
   */
  async sendTextMessage(recipientId: string, text: string): Promise<InstagramResponse> {
    // Debug: verificar token (primeiros e últimos caracteres apenas)
    const tokenPreview = this.accessToken ? `${this.accessToken.substring(0, 10)}...${this.accessToken.substring(this.accessToken.length - 10)}` : 'VAZIO'
    console.log(`📤 [Instagram] Enviando mensagem - Recipient: ${recipientId}, Token preview: ${tokenPreview}`)
    
    // Instagram API requires message and recipient as JSON strings
    const payload = {
      message: JSON.stringify({ text }),
      recipient: JSON.stringify({ id: recipientId })
    }

    const url = `${this.baseUrl}/me/messages`
    console.log(`📤 [Instagram] URL: ${url}`)
    console.log(`📤 [Instagram] Payload:`, JSON.stringify(payload, null, 2))
    
    try {
      const { data } = await axios.post(
        url,
        payload,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        },
      )

      console.log(`✅ [Instagram] Resposta da API:`, JSON.stringify(data, null, 2))

      if (data?.message_id) {
        return { id: data.message_id }
      }

      return instagramResponseSchema.parse(data)
    } catch (error: any) {
      console.error('❌ [Instagram] Erro completo:', {
        url,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      })
      throw new Error(`Erro ao enviar mensagem: ${error.response?.data?.error?.message || error.message}`)
    }
  }

  /**
   * Send media message (image) to Instagram user
   */
  async sendImageMessage(recipientId: string, imageUrl: string, caption?: string): Promise<InstagramResponse> {
    const messageObj: any = {
      attachment: {
        type: 'image',
        payload: {
          url: imageUrl,
          is_reusable: true
        }
      }
    }

    if (caption) {
      messageObj.attachment.payload.caption = caption
    }

    // Instagram API requires message and recipient as JSON strings
    const payload = {
      message: JSON.stringify(messageObj),
      recipient: JSON.stringify({ id: recipientId })
    }

    const url = `${this.baseUrl}/me/messages`

    try {
      const { data } = await axios.post(
        url,
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

