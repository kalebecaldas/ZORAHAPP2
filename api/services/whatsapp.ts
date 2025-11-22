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
      // OTIMIZAÇÃO: Timeout reduzido e sem validação desnecessária antes de enviar
      const { data } = await axios.post(
        `${this.baseUrl}/${this.phoneNumberId}/messages`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 5000, // 5 segundos de timeout (padrão do axios é muito alto)
          // Não validar resposta antes de retornar - apenas enviar
        },
      )

      // Validação rápida apenas do essencial
      if (data?.messages?.[0]?.id) {
        return { messaging_product: data.messaging_product || 'whatsapp', contacts: data.contacts || [], messages: data.messages }
      }
      
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

  /**
   * Send media message (image, document, audio, video)
   */
  async sendMediaMessage(
    to: string,
    mediaType: 'image' | 'document' | 'audio' | 'video',
    mediaId?: string,
    mediaLink?: string,
    caption?: string,
    filename?: string,
    isVoice?: boolean
  ): Promise<MetaResponse> {
    if (!mediaId && !mediaLink) {
      throw new Error('Você deve fornecer mediaId ou mediaLink')
    }

    const payload: any = {
      messaging_product: 'whatsapp',
      to,
      type: mediaType,
      [mediaType]: {}
    }

    // Use media ID or link
    if (mediaId) {
      payload[mediaType].id = mediaId
    } else if (mediaLink) {
      payload[mediaType].link = mediaLink
    }

    // Add caption if provided (for image, video, document)
    if (caption && ['image', 'video', 'document'].includes(mediaType)) {
      payload[mediaType].caption = caption
    }

    // Add filename for documents
    if (filename && mediaType === 'document') {
      payload[mediaType].filename = filename
    }

    // Voice flag for audio messages
    if (mediaType === 'audio' && isVoice) {
      payload.audio.voice = true
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
          timeout: 30000, // 30 seconds for media
        },
      )

      console.log(`✅ Mídia ${mediaType} enviada com sucesso para ${to}`)
      return metaResponseSchema.parse(data)
    } catch (error: any) {
      console.error(`Erro ao enviar ${mediaType} WhatsApp:`, error.response?.data || error.message)
      throw new Error(`Falha ao enviar ${mediaType}`)
    }
  }

  /**
   * Upload media to WhatsApp servers
   * Returns media ID that can be used to send messages
   */
  async uploadMedia(filePath: string, mimeType: string): Promise<string> {
    const FormData = (await import('form-data')).default
    const fs = (await import('fs')).default
    
    const form = new FormData()
    form.append('file', fs.createReadStream(filePath))
    form.append('messaging_product', 'whatsapp')
    form.append('type', mimeType)

    try {
      const { data } = await axios.post(
        `${this.baseUrl}/${this.phoneNumberId}/media`,
        form,
        {
          headers: {
            ...form.getHeaders(),
            Authorization: `Bearer ${this.accessToken}`,
          },
          timeout: 60000, // 60 seconds for upload
        },
      )

      console.log('✅ Mídia enviada ao WhatsApp:', data.id)
      return data.id
    } catch (error: any) {
      console.error('Erro ao fazer upload de mídia:', error.response?.data || error.message)
      throw new Error('Falha no upload de mídia')
    }
  }

  /**
   * Get media URL from WhatsApp
   */
  async getMediaUrl(mediaId: string): Promise<string> {
    try {
      console.log(`🔍 Buscando URL da mídia: ${mediaId}`)
      const { data } = await axios.get(
        `${this.baseUrl}/${mediaId}`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        },
      )

      console.log(`✅ URL da mídia obtida: ${data.url}`)
      return data.url
    } catch (error: any) {
      console.error('❌ Erro ao buscar URL da mídia:', error.response?.data || error.message)
      console.error('Media ID:', mediaId)
      console.error('Token presente:', !!this.accessToken)
      throw new Error('Falha ao buscar URL da mídia')
    }
  }

  /**
   * Download media from WhatsApp
   */
  async downloadMedia(mediaUrl: string): Promise<Buffer> {
    try {
      console.log(`📥 Baixando mídia de: ${mediaUrl}`)
      const { data } = await axios.get(mediaUrl, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
        responseType: 'arraybuffer',
        timeout: 60000,
      })

      const size = Buffer.byteLength(data)
      console.log(`✅ Mídia baixada: ${size} bytes`)
      return Buffer.from(data)
    } catch (error: any) {
      console.error('❌ Erro ao baixar mídia:', error.response?.data || error.message)
      console.error('URL:', mediaUrl)
      console.error('Status:', error.response?.status)
      throw new Error('Falha ao baixar mídia')
    }
  }
}
