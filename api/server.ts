import { createServer } from 'http'
import app from './app.js'
import { initRealtime } from './realtime.js'

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

const httpServer = createServer(app as any)

// Inicializar realtime com tratamento de erro
try {
initRealtime(httpServer)
  console.log('✅ Socket.IO inicializado')
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

httpServer.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`)
  console.log(`📱 WhatsApp Webhook: http://localhost:${PORT}/webhook`)
  console.log(`🔌 Socket.IO: ws://localhost:${PORT}/socket.io`)
  console.log(`💚 Health Check: http://localhost:${PORT}/api/health`)
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`)
})

/**
 * close server
 */
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM recebido')
  httpServer.close(() => {
    console.log('✅ Servidor fechado')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('🛑 SIGINT recebido')
  httpServer.close(() => {
    console.log('✅ Servidor fechado')
    process.exit(0)
  })
})

export default app
