import { type Request, type Response, type NextFunction } from 'express'

/**
 * Middleware de autenticação via API key do bot (N8N).
 * Valida o header x-bot-key contra N8N_BOT_API_KEY.
 * Usado em endpoints internos chamados pelo workflow n8n.
 */
export function botKeyMiddleware(req: Request, res: Response, next: NextFunction): void {
  const botKey = process.env.N8N_BOT_API_KEY
  if (!botKey) {
    res.status(503).json({ error: 'N8N_BOT_API_KEY não configurada no servidor' })
    return
  }
  const provided = req.headers['x-bot-key']
  if (!provided || provided !== botKey) {
    res.status(401).json({ error: 'Não autorizado' })
    return
  }
  next()
}
