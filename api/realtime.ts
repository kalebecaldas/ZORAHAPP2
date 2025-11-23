import { Server } from 'socket.io'
import type { Server as HTTPServer } from 'http'

export type Realtime = {
  io: Server
}

let realtime: Realtime | null = null

export function initRealtime(server: HTTPServer): Realtime {
  const io = new Server(server, {
    path: '/socket.io',
    cors: {
      origin: [
        'http://localhost:4001',
        'http://localhost:4002',
        'http://localhost:5173',
        'http://localhost:5174',
        'https://zorahapp2-production.up.railway.app',
      ],
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  })

  io.on('connection', (socket) => {
    console.log('Cliente conectado:', socket.id)

    socket.on('join_conversation', (conversationId: string) => {
      socket.join(`conv:${conversationId}`)
      console.log(`Cliente ${socket.id} entrou na conversa ${conversationId}`)
    })

    socket.on('leave_conversation', (conversationId: string) => {
      socket.leave(`conv:${conversationId}`)
      console.log(`Cliente ${socket.id} saiu da conversa ${conversationId}`)
    })

    socket.on('send_message_realtime', (data: { phone: string; text: string }) => {
      // Broadcast to conversation room
      io.to(`conv:${data.phone}`).emit('message_sent_realtime', {
        phone: data.phone,
        text: data.text,
        timestamp: new Date().toISOString(),
        socketId: socket.id
      })
    })

    socket.on('typing', (data: { phone: string; isTyping: boolean }) => {
      socket.to(`conv:${data.phone}`).emit('user_typing', {
        phone: data.phone,
        isTyping: data.isTyping,
        socketId: socket.id
      })
    })

    socket.on('heartbeat', () => {
      socket.emit('connection_status', { 
        ok: true, 
        ts: Date.now(),
        socketId: socket.id 
      })
    })

    socket.on('disconnect', (reason) => {
      console.log('Cliente desconectado:', socket.id, 'Razão:', reason)
    })
  })

  realtime = { io }
  return realtime
}

export function getRealtime(): Realtime {
  if (!realtime) throw new Error('Realtime not initialized')
  return realtime
}

// Helper function to emit events
export function emitToConversation(conversationId: string, event: string, data: any) {
  const { io } = getRealtime()
  io.to(`conv:${conversationId}`).emit(event, data)
}

export function emitToAll(event: string, data: any) {
  const { io } = getRealtime()
  io.emit(event, data)
}

export function emitToUser(userId: string, event: string, data: any) {
  const { io } = getRealtime()
  // This would require mapping user IDs to socket IDs
  // For now, we'll broadcast to all
  io.emit(event, { ...data, userId })
}
