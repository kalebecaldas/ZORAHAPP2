import { Router, type Request, type Response } from 'express'
import { authMiddleware } from '../utils/auth.js'
import { botKeyMiddleware } from '../utils/botAuth.js'

const router = Router()

const CLINICA_AGIL_BASE = 'https://app2.clinicaagil.com.br/api/integration'

const API_METHODS = {
  patient_data:             'Ch4tB0tW4tsS4v3QRc0d3',
  get_patient_appointments: 'Ch4tB0tW4tsa4g4lyT9',
} as const

function getApiKey(): string | undefined {
  return process.env.CLINICA_AGIL_API_KEY
}

async function proxyToClinicaAgil(
  method: keyof typeof API_METHODS,
  formFields: Record<string, string>,
  timeoutMs = 10_000,
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const apiKey = getApiKey()
  if (!apiKey) throw new Error('CLINICA_AGIL_API_KEY não configurada')

  const formData = new FormData()
  for (const [key, value] of Object.entries(formFields)) {
    formData.append(key, value)
  }

  const response = await fetch(`${CLINICA_AGIL_BASE}/${method}`, {
    method: 'POST',
    headers: {
      'X-API-KEY':    apiKey,
      'X-API-METHOD': API_METHODS[method],
      'accept':       'application/json',
    },
    body: formData,
    signal: AbortSignal.timeout(timeoutMs),
  })

  const data = await response.json()
  return { ok: response.ok, status: response.status, data }
}

/**
 * POST /api/clinica-agil/patient
 * Proxy seguro para uso do dashboard ZoraH (usuário autenticado com JWT).
 * A API key nunca é exposta ao frontend.
 * Body: { phone: string }
 */
router.post('/patient', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const apiKey = getApiKey()
    if (!apiKey) {
      res.status(503).json({ error: 'CLINICA_AGIL_API_KEY não configurada' })
      return
    }

    const { phone } = req.body
    if (!phone) {
      res.status(400).json({ error: 'phone é obrigatório' })
      return
    }

    const { ok, status, data } = await proxyToClinicaAgil(
      'patient_data',
      { numero_paciente: String(phone).replace(/\D/g, '') },
    )

    if (!ok) {
      res.status(502).json({ error: 'Erro na API da Clínica Ágil', status })
      return
    }

    res.json(data)
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      res.status(504).json({ error: 'Timeout na API da Clínica Ágil' })
      return
    }
    console.error('Erro no proxy Clínica Ágil /patient:', error)
    res.status(500).json({ error: 'Erro interno' })
  }
})

/**
 * POST /api/clinica-agil/patient-bot
 * Proxy para uso do n8n (autenticado com x-bot-key).
 * Mesma função que /patient, mas acessível pelo workflow sem JWT de usuário.
 * Body: { phone: string }
 */
router.post('/patient-bot', botKeyMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const apiKey = getApiKey()
    if (!apiKey) {
      res.status(503).json({ error: 'CLINICA_AGIL_API_KEY não configurada' })
      return
    }

    const { phone } = req.body
    if (!phone) {
      res.status(400).json({ error: 'phone é obrigatório' })
      return
    }

    const { ok, status, data } = await proxyToClinicaAgil(
      'patient_data',
      { numero_paciente: String(phone).replace(/\D/g, '') },
    )

    if (!ok) {
      res.status(502).json({ error: 'Erro na API da Clínica Ágil', status })
      return
    }

    res.json(data)
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      res.status(504).json({ error: 'Timeout na API da Clínica Ágil' })
      return
    }
    console.error('Erro no proxy Clínica Ágil /patient-bot:', error)
    res.status(500).json({ error: 'Erro interno' })
  }
})

/**
 * POST /api/clinica-agil/appointments
 * Retorna os próximos 30 dias de agendamentos do paciente.
 * Autenticado com x-bot-key (para uso do n8n no intent CONFIRMAR_CONSULTA).
 * Body: { clinicaAgilId: string }
 */
router.post('/appointments', botKeyMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const apiKey = getApiKey()
    if (!apiKey) {
      res.status(503).json({ error: 'CLINICA_AGIL_API_KEY não configurada' })
      return
    }

    const { clinicaAgilId } = req.body
    if (!clinicaAgilId) {
      res.status(400).json({ error: 'clinicaAgilId é obrigatório' })
      return
    }

    const { ok, status, data } = await proxyToClinicaAgil(
      'get_patient_appointments',
      { paciente_id: String(clinicaAgilId) },
    )

    if (!ok) {
      res.status(502).json({ error: 'Erro na API da Clínica Ágil', status })
      return
    }

    res.json(data)
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      res.status(504).json({ error: 'Timeout na API da Clínica Ágil' })
      return
    }
    console.error('Erro no proxy Clínica Ágil /appointments:', error)
    res.status(500).json({ error: 'Erro interno' })
  }
})

export default router
