import { Router, type Request, type Response } from 'express'
import { authMiddleware } from '../utils/auth.js'

const router = Router()

const CLINICA_AGIL_URL = 'https://app2.clinicaagil.com.br/api/integration/patient_data'
const CLINICA_AGIL_METHOD = 'Ch4tB0tW4tsS4v3QRc0d3'

/**
 * POST /api/clinica-agil/patient
 * Proxy seguro para a API da Clínica Ágil.
 * Requer authMiddleware — a API key nunca é exposta ao frontend.
 * Body: { phone: string }
 */
router.post('/patient', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const apiKey = process.env.CLINICA_AGIL_API_KEY
    if (!apiKey) {
      res.status(503).json({ error: 'CLINICA_AGIL_API_KEY não configurada' })
      return
    }

    const { phone } = req.body
    if (!phone) {
      res.status(400).json({ error: 'phone é obrigatório' })
      return
    }

    const formData = new FormData()
    formData.append('numero_paciente', String(phone).replace(/\D/g, ''))

    const response = await fetch(CLINICA_AGIL_URL, {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'X-API-METHOD': CLINICA_AGIL_METHOD,
        'accept': 'application/json',
      },
      body: formData,
      signal: AbortSignal.timeout(10_000),
    })

    if (!response.ok) {
      res.status(502).json({ error: 'Erro na API da Clínica Ágil', status: response.status })
      return
    }

    const data = await response.json()
    res.json(data)
  } catch (error: any) {
    if (error.name === 'TimeoutError') {
      res.status(504).json({ error: 'Timeout na API da Clínica Ágil' })
      return
    }
    console.error('Erro no proxy Clínica Ágil:', error)
    res.status(500).json({ error: 'Erro interno' })
  }
})

export default router
