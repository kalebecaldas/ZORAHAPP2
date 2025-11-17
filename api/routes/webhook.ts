import { Router, type Request, type Response } from 'express'
import { processIncomingMessage } from '../routes/conversations.js'

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
  // Respond immediately to avoid timeout
  res.status(200).json({ received: true })

  try {
    const entry = req.body?.entry?.[0]
    const changes = entry?.changes?.[0]
    const value = changes?.value
    const messages = value?.messages
    
    if (!messages || !Array.isArray(messages)) return

    for (const message of messages) {
      const phone = message.from
      const text = message.text?.body || message.button?.text || ''
      const messageId = message.id
      
      if (!phone || !text) continue

      // Process message asynchronously
      processIncomingMessage(phone, text, messageId).catch(error => {
        console.error('Erro ao processar mensagem:', error)
      })
    }
  } catch (error) {
    console.error('Erro no webhook:', error)
  }
})

export default router