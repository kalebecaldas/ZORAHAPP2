import { Router, type Request, type Response } from 'express'
import { processIncomingMessage } from '../routes/conversations.js'
import { InstagramService } from '../services/instagram.js'
import prisma from '../prisma/client.js'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import axios from 'axios'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const instagramService = new InstagramService(
  process.env.INSTAGRAM_ACCESS_TOKEN || '',
  process.env.INSTAGRAM_APP_ID || ''
)

const router = Router()

// Instagram webhook verification (GET)
router.get('/', (req: Request, res: Response) => {
  const verifyToken = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN
  const mode = req.query['hub.mode']
  const token = req.query['hub.verify_token']
  const challenge = req.query['hub.challenge']
  
  console.log('🔍 Instagram webhook verification:', { mode, token, challenge })
  
  if (mode === 'subscribe' && token === verifyToken) {
    console.log('✅ Instagram webhook verificado com sucesso')
    return res.status(200).send(challenge)
  }
  
  console.log('❌ Instagram webhook verification falhou')
  res.status(403).send('Forbidden')
})

// Process incoming Instagram messages (POST)
router.post('/', async (req: Request, res: Response) => {
  // Respond immediately to avoid timeout
  res.status(200).json({ received: true })

  try {
    console.log('📥 Instagram webhook recebido:', JSON.stringify(req.body, null, 2))
    
    const entry = req.body?.entry?.[0]
    if (!entry) {
      console.log('⚠️ Nenhuma entrada encontrada no webhook Instagram')
      return
    }

    // Instagram messaging events
    const messaging = entry?.messaging?.[0]
    if (!messaging) {
      console.log('⚠️ Nenhuma mensagem encontrada no webhook Instagram')
      return
    }

    const senderId = messaging.sender?.id
    const recipientId = messaging.recipient?.id
    const timestamp = messaging.timestamp

    if (!senderId) {
      console.log('⚠️ ID do remetente não encontrado')
      return
    }

    // Use Instagram user ID as "phone" identifier (for compatibility with existing system)
    const instagramUserId = senderId

    let text = ''
    let messageType = 'TEXT'
    let mediaUrl: string | null = null
    let metadata: any = {
      instagramMessageId: messaging.message?.mid,
      instagramUserId: senderId,
      platform: 'instagram'
    }

    // Handle different message types
    if (messaging.message) {
      const message = messaging.message

      // Text message
      if (message.text) {
        text = message.text
        messageType = 'TEXT'
        console.log(`💬 Mensagem de texto Instagram recebida de ${senderId}: ${text}`)
      }
      // Image message
      else if (message.attachments && message.attachments.length > 0) {
        const attachment = message.attachments[0]
        
        if (attachment.type === 'image') {
          messageType = 'IMAGE'
          text = message.text || 'Imagem recebida'
          
          try {
            // Download and save image
            const imageUrl = attachment.payload?.url
            if (imageUrl) {
              console.log(`📷 Baixando imagem Instagram: ${imageUrl}`)
              
              const response = await axios.get(imageUrl, {
                responseType: 'arraybuffer',
                timeout: 30000,
                headers: {
                  'Authorization': `Bearer ${process.env.INSTAGRAM_ACCESS_TOKEN || ''}`
                }
              })
              
              const uploadsDir = path.join(__dirname, '../../uploads')
              await fs.mkdir(uploadsDir, { recursive: true })
              
              const filename = `instagram-${Date.now()}-${messaging.message.mid || 'image'}.jpg`
              const filepath = path.join(uploadsDir, filename)
              await fs.writeFile(filepath, Buffer.from(response.data))
              
              mediaUrl = `/api/conversations/files/${filename}`
              metadata = {
                ...metadata,
                imageUrl,
                filename
              }
              console.log(`✅ Imagem Instagram salva: ${filename}`)
            }
          } catch (error) {
            console.error('❌ Erro ao baixar imagem Instagram:', error)
            text = '[IMAGE] Erro ao baixar imagem'
          }
        }
        // Video message
        else if (attachment.type === 'video') {
          messageType = 'VIDEO'
          text = 'Vídeo recebido'
          
          try {
            const videoUrl = attachment.payload?.url
            if (videoUrl) {
              console.log(`🎥 Baixando vídeo Instagram: ${videoUrl}`)
              
              const response = await axios.get(videoUrl, {
                responseType: 'arraybuffer',
                timeout: 60000,
                headers: {
                  'Authorization': `Bearer ${process.env.INSTAGRAM_ACCESS_TOKEN || ''}`
                }
              })
              
              const uploadsDir = path.join(__dirname, '../../uploads')
              await fs.mkdir(uploadsDir, { recursive: true })
              
              const filename = `instagram-${Date.now()}-${messaging.message.mid || 'video'}.mp4`
              const filepath = path.join(uploadsDir, filename)
              await fs.writeFile(filepath, Buffer.from(response.data))
              
              mediaUrl = `/api/conversations/files/${filename}`
              metadata = {
                ...metadata,
                videoUrl,
                filename
              }
              console.log(`✅ Vídeo Instagram salvo: ${filename}`)
            }
          } catch (error) {
            console.error('❌ Erro ao baixar vídeo Instagram:', error)
            text = '[VIDEO] Erro ao baixar vídeo'
          }
        }
      }
      // Audio message
      else if (message.attachments?.[0]?.type === 'audio') {
        messageType = 'AUDIO'
        text = 'Áudio recebido'
        // Instagram doesn't support audio messages directly, but handle if it comes
      }
    }
    // Postback (button clicks)
    else if (messaging.postback) {
      text = messaging.postback.title || messaging.postback.payload || 'Postback recebido'
      messageType = 'TEXT'
      metadata = {
        ...metadata,
        postback: messaging.postback.payload,
        title: messaging.postback.title
      }
      console.log(`🔘 Postback Instagram recebido de ${senderId}: ${text}`)
    }
    // Quick reply
    else if (messaging.message?.quick_reply) {
      text = messaging.message.quick_reply.payload || messaging.message.text || 'Quick reply recebido'
      messageType = 'TEXT'
      metadata = {
        ...metadata,
        quickReply: messaging.message.quick_reply.payload
      }
      console.log(`⚡ Quick reply Instagram recebido de ${senderId}: ${text}`)
    }
    else {
      console.log('⚠️ Tipo de mensagem Instagram não suportado:', messaging)
      return
    }

    if (!text) {
      console.log('⚠️ Nenhum texto extraído da mensagem Instagram')
      return
    }

    // Check for duplicate messages based on instagramMessageId
    if (metadata.instagramMessageId) {
      const existingMessage = await prisma.message.findFirst({
        where: {
          metadata: {
            path: ['instagramMessageId'],
            equals: metadata.instagramMessageId,
          },
          createdAt: {
            gte: new Date(Date.now() - 5 * 60 * 1000), // Check in the last 5 minutes
          },
        },
      })

      if (existingMessage) {
        console.warn(`⚠️ Mensagem Instagram duplicada detectada e ignorada (ID: ${metadata.instagramMessageId})`)
        return
      }
    }

    // Process message using the same function as WhatsApp
    // Use Instagram user ID as "phone" for compatibility
    await processIncomingMessage(
      instagramUserId,
      text,
      metadata.instagramMessageId || `instagram-${Date.now()}`,
      messageType,
      mediaUrl,
      metadata
    )

    console.log(`✅ Mensagem Instagram processada: ${senderId} -> ${text.substring(0, 50)}...`)
  } catch (error) {
    console.error('❌ Erro ao processar webhook Instagram:', error)
  }
})

export default router

