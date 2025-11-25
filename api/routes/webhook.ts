import { Router, type Request, type Response } from 'express'
import { processIncomingMessage } from '../routes/conversations.js'
import { WhatsAppService } from '../services/whatsapp.js'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const whatsappService = new WhatsAppService(
  process.env.META_ACCESS_TOKEN || '',
  process.env.META_PHONE_NUMBER_ID || ''
)
const router = Router()

// Meta verification
router.get('/', (req: Request, res: Response) => {
  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN
  const mode = req.query['hub.mode']
  const token = req.query['hub.verify_token']
  const challenge = req.query['hub.challenge']
  
  if (mode === 'subscribe' && token === verifyToken) {
    return res.status(200).send(challenge)
  }
  
  res.status(403).send('Forbidden')
})

// Process incoming WhatsApp messages
router.post('/', async (req: Request, res: Response) => {
  // Detectar se é uma chamada de teste (da página de teste)
  const isTestCall = req.body?.entry?.[0]?.id === 'simulated'
  
  // Se for teste, não responder imediatamente - aguardar processamento
  if (!isTestCall) {
    // Respond immediately to avoid timeout
    res.status(200).json({ received: true })
  }

  const testLogs: string[] = []

  try {
    console.log('📥 Webhook recebido:', JSON.stringify(req.body, null, 2))
    
    const entry = req.body?.entry?.[0]
    if (!entry) {
      console.log('⚠️ Nenhuma entrada encontrada no webhook')
      return
    }

    const changes = entry?.changes?.[0]
    if (!changes) {
      console.log('⚠️ Nenhuma mudança encontrada')
      return
    }

    const value = changes?.value
    
    // Handle messages
    const messages = value?.messages
    if (messages && Array.isArray(messages)) {
      for (const message of messages) {
        const phone = message.from
        const messageId = message.id
        const timestamp = message.timestamp
        
        let text = ''
        let messageType = 'TEXT'
        let mediaUrl: string | null = null
        let metadata: any = {}
        
        // Extract text and media from different message types
        if (message.text?.body) {
          text = message.text.body
          messageType = 'TEXT'
        } else if (message.button?.text) {
          text = message.button.text
          messageType = 'TEXT'
        } else if (message.interactive?.button_reply?.title) {
          text = message.interactive.button_reply.title
          messageType = 'TEXT'
        } else if (message.interactive?.list_reply?.title) {
          text = message.interactive.list_reply.title
          messageType = 'TEXT'
        } else if (message.type === 'image') {
          messageType = 'IMAGE'
          text = message.image?.caption || 'Imagem recebida'
          
          // Download and save image
          try {
            const mediaId = message.image?.id
            if (mediaId) {
              console.log(`📷 Baixando imagem: ${mediaId}`)
              const mediaUrlFromMeta = await whatsappService.getMediaUrl(mediaId)
              const mediaBuffer = await whatsappService.downloadMedia(mediaUrlFromMeta)
              
              // Save to uploads directory
              const uploadsDir = path.join(__dirname, '../../uploads')
              await fs.mkdir(uploadsDir, { recursive: true })
              
              const filename = `${Date.now()}-${messageId}.jpg`
              const filepath = path.join(uploadsDir, filename)
              await fs.writeFile(filepath, mediaBuffer)
              
              mediaUrl = `/api/conversations/files/${filename}`
              metadata = {
                mime_type: message.image?.mime_type,
                sha256: message.image?.sha256,
                originalId: mediaId
              }
              console.log(`✅ Imagem salva: ${filename}`)
            }
          } catch (error) {
            console.error('❌ Erro ao baixar imagem:', error)
            text = '[IMAGE] Erro ao baixar imagem'
          }
        } else if (message.type === 'document') {
          messageType = 'DOCUMENT'
          text = message.document?.caption || message.document?.filename || 'Documento recebido'
          
          // Download and save document
          try {
            const mediaId = message.document?.id
            if (mediaId) {
              console.log(`📄 Baixando documento: ${mediaId}`)
              const mediaUrlFromMeta = await whatsappService.getMediaUrl(mediaId)
              const mediaBuffer = await whatsappService.downloadMedia(mediaUrlFromMeta)
              
              // Save to uploads directory
              const uploadsDir = path.join(__dirname, '../../uploads')
              await fs.mkdir(uploadsDir, { recursive: true })
              
              const ext = message.document?.filename?.split('.').pop() || 'pdf'
              const filename = `${Date.now()}-${messageId}.${ext}`
              const filepath = path.join(uploadsDir, filename)
              await fs.writeFile(filepath, mediaBuffer)
              
              mediaUrl = `/api/conversations/files/${filename}`
              metadata = {
                filename: message.document?.filename,
                mime_type: message.document?.mime_type,
                sha256: message.document?.sha256,
                originalId: mediaId
              }
              console.log(`✅ Documento salvo: ${filename}`)
            }
          } catch (error) {
            console.error('❌ Erro ao baixar documento:', error)
            text = '[DOCUMENT] Erro ao baixar documento'
          }
        } else if (message.type === 'audio') {
          messageType = 'AUDIO'
          text = 'Áudio recebido'
          
          // Download and save audio
          try {
            const mediaId = message.audio?.id
            if (mediaId) {
              console.log(`🎤 Baixando áudio: ${mediaId}`)
              const mediaUrlFromMeta = await whatsappService.getMediaUrl(mediaId)
              const mediaBuffer = await whatsappService.downloadMedia(mediaUrlFromMeta)
              
              // Save to uploads directory
              const uploadsDir = path.join(__dirname, '../../uploads')
              await fs.mkdir(uploadsDir, { recursive: true })
              
              const filename = `${Date.now()}-${messageId}.ogg`
              const filepath = path.join(uploadsDir, filename)
              await fs.writeFile(filepath, mediaBuffer)
              
              mediaUrl = `/api/conversations/files/${filename}`
              metadata = {
                mime_type: message.audio?.mime_type,
                sha256: message.audio?.sha256,
                originalId: mediaId
              }
              console.log(`✅ Áudio salvo: ${filename}`)
            }
          } catch (error) {
            console.error('❌ Erro ao baixar áudio:', error)
            text = '[AUDIO] Erro ao baixar áudio'
          }
        } else {
          console.log('⚠️ Tipo de mensagem não suportado:', message.type)
          continue
        }
        
        if (!phone || !text) {
          console.log('⚠️ Mensagem sem telefone ou texto:', { phone, text })
          continue
        }

        console.log(`📨 Processando mensagem de ${phone}: ${text} (${messageType})`)

        if (isTestCall) {
          try {
            const logs = await processIncomingMessage(phone, text, messageId, messageType, mediaUrl, metadata)
            testLogs.push(...logs)
          } catch (error) {
            console.error('❌ Erro ao processar mensagem (teste):', error)
            return res.status(500).json({ received: false, error: (error as Error).message })
          }
        } else {
          // Process message de forma assíncrona
          processIncomingMessage(phone, text, messageId, messageType, mediaUrl, metadata).catch(error => {
            console.error('❌ Erro ao processar mensagem:', error)
          })
        }
      }
    }

    // Handle message status updates
    const statuses = value?.statuses
    if (statuses && Array.isArray(statuses)) {
      for (const status of statuses) {
        console.log(`📊 Status da mensagem ${status.id}: ${status.status}`)
        // You can handle status updates here if needed
      }
    }
  } catch (error) {
    console.error('❌ Erro no webhook:', error)
    if (isTestCall) {
      return res.status(500).json({ received: false, error: (error as Error).message, workflowLogs: testLogs })
    }
  }

  if (isTestCall) {
    return res.status(200).json({ received: true, workflowLogs: testLogs })
  }

  // Para chamadas reais, a resposta já foi enviada no início
  return
})

export default router