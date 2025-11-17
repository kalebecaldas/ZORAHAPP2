import { createServer } from 'http'
import app from './app.js'
import { initRealtime } from './realtime.js'

/**
 * start server with port
 */
const PORT = process.env.PORT || 3001

const httpServer = createServer(app as any)
initRealtime(httpServer)

httpServer.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`)
  console.log(`📱 WhatsApp Webhook: http://localhost:${PORT}/webhook`)
  console.log(`🔌 Socket.IO: ws://localhost:${PORT}/socket.io`)
  console.log(`💚 Health Check: http://localhost:${PORT}/api/health`)
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
