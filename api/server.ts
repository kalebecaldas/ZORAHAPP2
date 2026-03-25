import { createServer } from 'http'
import { initRealtime } from './realtime.js'
import { startInactivityMonitor, stopInactivityMonitor } from './services/inactivityMonitor.js'

/**
 * Mensagens de arranque no stderr: com concurrently/npm pipes, stdout costuma ficar
 * bufferizado e parece "travado" até a carga pesada terminar.
 */
function bootLog(message: string): void {
  process.stderr.write(`${message}\n`)
}

/**
 * start server with port
 */
const PORT = process.env.PORT || 3001

// Tratamento de erros não capturados
process.on('uncaughtException', (error) => {
  console.error('❌ Erro não capturado:', error)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promise rejeitada não tratada:', reason)
  console.error('Promise:', promise)
})

bootLog(
  '⏳ ZoraH API: carregando Express + rotas (conversas carregam na 1ª chamada HTTP — arranque deve ser rápido)...'
)
const [{ default: app }, { workflowEngine }] = await Promise.all([
  import('./app.js'),
  import('./services/workflowEngine.js'),
])
bootLog('✅ Módulos da API carregados (Express + workflow engine).')

const httpServer = createServer(app as any)

// Inicializar realtime com tratamento de erro
try {
  initRealtime(httpServer)
  bootLog('✅ Socket.IO inicializado')
} catch (error) {
  console.error('⚠️ Erro ao inicializar Socket.IO:', error)
  // Continua mesmo se Socket.IO falhar
}

// Tratamento de erros do servidor HTTP
httpServer.on('error', (error: NodeJS.ErrnoException) => {
  if (error.syscall !== 'listen') {
    throw error
  }

  const bind = typeof PORT === 'string' ? `Pipe ${PORT}` : `Port ${PORT}`

  switch (error.code) {
    case 'EACCES':
      console.error(`❌ ${bind} requer privilégios elevados`)
      process.exit(1)
      break
    case 'EADDRINUSE':
      console.error(`❌ ${bind} já está em uso`)
      process.exit(1)
      break
    default:
      throw error
  }
})

httpServer.listen(PORT, async () => {
  bootLog(`🚀 Servidor rodando na porta ${PORT}`)
  bootLog(`📱 WhatsApp Webhook: http://localhost:${PORT}/webhook`)
  bootLog(`🔌 Socket.IO: ws://localhost:${PORT}/socket.io`)
  bootLog(`💚 Health Check: http://localhost:${PORT}/api/health`)
  bootLog(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`)

  // Carregar workflows
  try {
    await workflowEngine.loadWorkflows()
    bootLog('✅ Workflows carregados')
  } catch (error) {
    console.error('⚠️ Erro ao carregar workflows:', error)
  }

  // Iniciar monitor de inatividade
  try {
    await startInactivityMonitor()
  } catch (error) {
    console.error('⚠️ Erro ao iniciar monitor de inatividade:', error)
  }
})

/**
 * close server
 */
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM recebido')
  stopInactivityMonitor()
  httpServer.close(() => {
    console.log('✅ Servidor fechado')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('🛑 SIGINT recebido')
  stopInactivityMonitor()
  httpServer.close(() => {
    console.log('✅ Servidor fechado')
    process.exit(0)
  })
})

export default app
