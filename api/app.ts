/**
 * This is a API server
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'

// Import routes
import authRoutes from './routes/auth.js'
import patientsRoutes from './routes/patients.js'
import conversationsRoutes from './routes/conversations.js'
import workflowsRoutes from './routes/workflows.js'
import statsRoutes from './routes/stats.js'
import usersRoutes from './routes/users.js'
import settingsRoutes from './routes/settings.js'
import webhookRoutes from './routes/webhook.js'
import instagramWebhookRoutes from './routes/instagram-webhook.js'
import coverageRoutes from './routes/coverage.js'
import permissionsRoutes from './routes/permissions.js'
import clinicRoutes from './routes/clinic.js'
import messagesRoutes from './routes/messages.js'
import aliasRoutes from './routes/aliases.js'
import testRoutes from './routes/test.js'
import appointmentsRoutes from './routes/appointments.js'
import templatesRoutes from './routes/templates.js'
import aiConfigRoutes from './routes/aiConfig.js'
import quickRepliesRoutes from './routes/quick-replies.js' // ✅ NOVO
import analyticsRoutes from './routes/analytics.js' // ✅ Analytics avançado
import systemSettingsRoutes from './routes/systemSettings.js' // ✅ Configurações do sistema
import botOptimizationRoutes from './routes/botOptimization.js' // ✅ Dashboard de Otimizações
import rulesRoutes from './routes/rules.js' // ✅ Sistema de Regras do Bot
import webhooksRoutes from './routes/webhooks.js' // ✅ Sistema de Webhooks
import docsRoutes from './routes/docs.js' // ✅ Documentação Pública
import webhookN8NRoutes from './routes/webhook-n8n.js' // ✅ Webhook para N8N responder
import { authMiddleware } from './utils/auth.js'
import { workflowEngine } from './services/workflowEngine.js'

// for esm mode
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Paths for static files
const publicPath = path.join(__dirname, '..', 'public')
const clientDistPath = path.join(__dirname, '..', 'dist')

// load env
dotenv.config()

const app: express.Application = express()

/**
 * ✅ IMPORTANTE: Trust proxy para Railway, Heroku, etc.
 * Necessário para express-rate-limit funcionar corretamente com X-Forwarded-For
 * Ver: https://expressjs.com/en/guide/behind-proxies.html
 */
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1) // Trust first proxy (Railway, Heroku, etc.)
}

/**
 * Health check - DEVE ser a primeira rota para garantir que sempre funcione
 * Mesmo se outros middlewares falharem, o health check deve responder
 */
app.get('/api/health', (req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    message: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.version,
    environment: process.env.NODE_ENV || 'development'
  })
})

app.get('/health', (req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    message: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.version,
    environment: process.env.NODE_ENV || 'development'
  })
})

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for development
  crossOriginEmbedderPolicy: false // Disable for development
}))

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:4001',
    'http://localhost:4002',
    'http://localhost:5173',
    'http://localhost:5174',
    'https://n8nserver.iaamazonas.com.br',
    /^https:\/\/.*\.ngrok-free\.app$/,
    /^https:\/\/.*\.ngrok\.io$/,
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'ngrok-skip-browser-warning']
}))

// Logging
app.use(morgan('dev'))

// Rate limiting - Granular configuration for different endpoints
// For authenticated routes (conversations, patients, etc.)
const authenticatedLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10000, // 10000 requests per minute (MUITO alto para debug)
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Muitas requisições. Tente novamente mais tarde.'
  },
  skip: (req) => {
    // ✅ DESABILITAR rate limiting em desenvolvimento completamente
    if (process.env.NODE_ENV === 'development') {
      return true // Pular rate limiting em dev
    }
    return req.path.includes('/test')
  },
  handler: (req, res) => {
    res.status(429).json({ error: 'Muitas requisições. Tente novamente mais tarde.' })
  }
})

// For public routes that don't require much traffic
const publicLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute for auth routes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Muitas requisições. Tente novamente mais tarde.'
  }
})

// For webhook (external WhatsApp API)
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 500, // 500 requests per minute for webhook (scales with message volume)
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Muitas requisições no webhook.'
  }
})

// Body parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

/**
 * API Routes
 */
app.use('/api/auth', publicLimiter, authRoutes)
app.use('/api/patients', authenticatedLimiter, patientsRoutes)
app.use('/api/conversations', authenticatedLimiter, conversationsRoutes)
app.use('/api/workflows', authenticatedLimiter, workflowsRoutes)
app.use('/api/stats', authenticatedLimiter, statsRoutes)
app.use('/api/users', authenticatedLimiter, usersRoutes)
app.use('/api/settings', authenticatedLimiter, settingsRoutes)
app.use('/api/appointments', authenticatedLimiter, appointmentsRoutes)
app.use('/api/test', testRoutes) // Test routes without rate limiting
app.use('/api/cobertura', authenticatedLimiter, coverageRoutes)
app.use('/api/permissions', authenticatedLimiter, permissionsRoutes)
// Rota pública para N8N buscar dados da clínica (sem autenticação)
app.get('/api/clinic/data', async (req: Request, res: Response) => {
  try {
    const { prismaClinicDataService } = await import('./services/prismaClinicDataService.js')
    const procedures = await prismaClinicDataService.getProcedures()
    const insuranceCompanies = await prismaClinicDataService.getInsuranceCompanies()
    const locations = await prismaClinicDataService.getLocations()

    const formattedData = {
      procedures: procedures.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        basePrice: p.basePrice,
        duration: p.duration,
        categories: p.categories || [],
        packages: (p as any).packages || [] // Incluir pacotes quando disponíveis
      })),
      insuranceCompanies: insuranceCompanies.map(i => ({
        id: i.id,
        name: i.name,
        code: (i as any).code || i.id
      })),
      units: locations.map(l => ({
        id: l.id,
        name: l.name,
        code: (l as any).code || l.id
      }))
    }

    res.json(formattedData)
  } catch (error) {
    console.error('Erro ao buscar dados da clínica:', error)
    res.status(500).json({ error: 'Erro ao buscar dados da clínica' })
  }
})

// Rota pública para buscar dados da clínica Vieiralves (sem autenticação)
app.get('/api/clinic/data/vieiralves', async (req: Request, res: Response) => {
  try {
    const { prismaClinicDataService } = await import('./services/prismaClinicDataService.js')
    const prisma = (await import('./prisma/client.js')).default
    const clinicCode = 'VIEIRALVES'

    // Buscar informações da unidade diretamente pelo código
    const clinic = await prisma.clinic.findUnique({
      where: { code: clinicCode },
      select: { id: true, code: true, name: true, displayName: true }
    })

    if (!clinic) {
      return res.status(404).json({ error: 'Unidade Vieiralves não encontrada' })
    }

    // Buscar procedimentos e convênios específicos desta unidade
    const procedures = await prismaClinicDataService.getProceduresByClinic(clinicCode)
    const insuranceCompanies = await prismaClinicDataService.getInsurancesByClinic(clinicCode)

    const units = [{
      id: clinic.code,
      name: clinic.displayName || clinic.name,
      code: clinic.code
    }]

    const formattedData = {
      procedures: procedures.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        basePrice: (p as any).price || (p as any).basePrice,
        duration: p.duration,
        categories: [], // Pode ser preenchido se necessário
        packages: (p as any).packages || [] // Incluir pacotes quando disponíveis
      })),
      insuranceCompanies: insuranceCompanies.map(i => ({
        id: i.id,
        name: i.name,
        code: i.id
      })),
      units: units
    }

    res.json(formattedData)
  } catch (error) {
    console.error('Erro ao buscar dados da clínica Vieiralves:', error)
    res.status(500).json({ error: 'Erro ao buscar dados da clínica Vieiralves' })
  }
})

// Rota pública para buscar dados da clínica São José (sem autenticação)
app.get('/api/clinic/data/sao-jose', async (req: Request, res: Response) => {
  try {
    const { prismaClinicDataService } = await import('./services/prismaClinicDataService.js')
    const prisma = (await import('./prisma/client.js')).default
    const clinicCode = 'SAO_JOSE'

    // Buscar informações da unidade diretamente pelo código
    const clinic = await prisma.clinic.findUnique({
      where: { code: clinicCode },
      select: { id: true, code: true, name: true, displayName: true }
    })

    if (!clinic) {
      return res.status(404).json({ error: 'Unidade São José não encontrada' })
    }

    // Buscar procedimentos e convênios específicos desta unidade
    const procedures = await prismaClinicDataService.getProceduresByClinic(clinicCode)
    const insuranceCompanies = await prismaClinicDataService.getInsurancesByClinic(clinicCode)

    const units = [{
      id: clinic.code,
      name: clinic.displayName || clinic.name,
      code: clinic.code
    }]

    const formattedData = {
      procedures: procedures.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        basePrice: (p as any).price || (p as any).basePrice,
        duration: p.duration,
        categories: [], // Pode ser preenchido se necessário
        packages: (p as any).packages || [] // Incluir pacotes quando disponíveis
      })),
      insuranceCompanies: insuranceCompanies.map(i => ({
        id: i.id,
        name: i.name,
        code: i.id
      })),
      units: units
    }

    res.json(formattedData)
  } catch (error) {
    console.error('Erro ao buscar dados da clínica São José:', error)
    res.status(500).json({ error: 'Erro ao buscar dados da clínica São José' })
  }
})

app.use('/api/clinic', authenticatedLimiter, clinicRoutes)
app.use('/api/messages', authenticatedLimiter, messagesRoutes)
app.use('/api/templates', authenticatedLimiter, templatesRoutes)
app.use('/api/ai-config', authenticatedLimiter, aiConfigRoutes)
app.use('/api/quick-replies', authenticatedLimiter, quickRepliesRoutes) // ✅ NOVO
app.use('/api/analytics', authenticatedLimiter, analyticsRoutes) // ✅ Analytics avançado
app.use('/api/settings/system', authenticatedLimiter, systemSettingsRoutes) // ✅ Configurações do sistema
app.use('/api/bot-optimization', authenticatedLimiter, botOptimizationRoutes) // ✅ Dashboard de Otimizações
app.use('/api/rules', authenticatedLimiter, rulesRoutes) // ✅ Sistema de Regras do Bot
app.use('/api/webhooks', authenticatedLimiter, authMiddleware, webhooksRoutes) // ✅ Sistema de Webhooks para Integrações
app.use('/webhook', webhookN8NRoutes) // ✅ Webhook para N8N responder (público)
app.use('/api', authenticatedLimiter, aliasRoutes)

// Debug auth endpoint
app.use('/api/debug/auth', authenticatedLimiter, authMiddleware, (req: Request, res: Response) => {
  res.json({
    hasUser: !!req.user,
    user: req.user || null,
    headers: req.headers,
    authHeader: req.headers.authorization
  })
})
app.use('/webhook', webhookLimiter, webhookRoutes)
app.use('/webhook/instagram', webhookLimiter, instagramWebhookRoutes)

// ✅ Documentação Pública (sem autenticação)
app.use('/api/docs', docsRoutes)

// Serve static files from public folder (logos, favicon, etc.)
// Must be before dist to prioritize public files
// IMPORTANT: These routes must be registered BEFORE the SPA fallback
app.use('/logos', express.static(path.join(publicPath, 'logos'), {
  maxAge: '1d',
  etag: true,
  lastModified: true
}))
app.use(express.static(publicPath, {
  maxAge: '1d',
  etag: true,
  lastModified: true
}))

// Serve static files from dist folder (frontend build)
app.use(express.static(clientDistPath, {
  maxAge: '1d',
  etag: true,
  lastModified: true
}))

// Fallback to index.html for SPA routing
// IMPORTANT: This must be LAST and must NOT match static file routes
app.get('*', (req: Request, res: Response, next: NextFunction) => {
  // Skip API routes, webhook routes, and static file routes
  if (req.path.startsWith('/api') ||
    req.path.startsWith('/webhook') ||
    req.path.startsWith('/logos/') ||
    req.path.startsWith('/favicon') ||
    req.path.match(/\.(png|jpg|jpeg|gif|svg|ico|css|js|woff|woff2|ttf|eot)$/i)) {
    return next()
  }
  res.sendFile(path.join(clientDistPath, 'index.html'))
})

/**
 * Global error handler
 */
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Erro global:', error)

  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Erro de validação',
      details: error.message
    })
  }

  if (error.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      error: 'Não autorizado'
    })
  }

  res.status(500).json({
    success: false,
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno'
  })
})

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Rota não encontrada',
    path: req.path,
    method: req.method
  })
})

export default app
