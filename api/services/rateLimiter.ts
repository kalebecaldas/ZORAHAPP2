/**
 * Rate Limiter Service
 * 
 * Limita chamadas GPT por usuário para evitar spam e reduzir custos
 * Economia adicional: 10-20%
 */

interface RateLimitEntry {
  count: number
  firstCall: number
  lastCall: number
}

class RateLimiterService {
  private limits: Map<string, RateLimitEntry>
  private enabled: boolean
  private maxCallsPerUser: number
  private windowSeconds: number
  private blockedRequests: number

  constructor() {
    this.limits = new Map()
    this.enabled = process.env.GPT_RATE_LIMIT_ENABLED === 'true'
    this.maxCallsPerUser = parseInt(process.env.GPT_RATE_LIMIT_PER_USER || '1')
    this.windowSeconds = parseInt(process.env.GPT_RATE_LIMIT_WINDOW || '30')
    this.blockedRequests = 0

    console.log(`⏱️ [Rate Limiter] Inicializado - Enabled: ${this.enabled}, Max: ${this.maxCallsPerUser} call(s) per ${this.windowSeconds}s`)

    // Cleanup a cada minuto
    if (this.enabled) {
      setInterval(() => this.cleanup(), 60000)
    }
  }

  canMakeCall(userId: string): boolean {
    if (!this.enabled) return true

    const now = Date.now()
    const entry = this.limits.get(userId)

    if (!entry) {
      this.limits.set(userId, { count: 1, firstCall: now, lastCall: now })
      return true
    }

    const timeSinceFirst = now - entry.firstCall

    if (timeSinceFirst > this.windowSeconds * 1000) {
      this.limits.set(userId, { count: 1, firstCall: now, lastCall: now })
      return true
    }

    if (entry.count >= this.maxCallsPerUser) {
      const remainingTime = Math.ceil((this.windowSeconds * 1000 - timeSinceFirst) / 1000)
      this.blockedRequests++
      console.log(`⏱️ [Rate Limiter] ⛔ User ${userId} bloqueado - Aguarde ${remainingTime}s`)
      return false
    }

    entry.count++
    entry.lastCall = now
    return true
  }

  getTimeUntilNextCall(userId: string): number {
    if (!this.enabled) return 0
    const entry = this.limits.get(userId)
    if (!entry) return 0
    const now = Date.now()
    const timeSinceFirst = now - entry.firstCall
    if (timeSinceFirst > this.windowSeconds * 1000) return 0
    if (entry.count >= this.maxCallsPerUser) {
      return Math.ceil((this.windowSeconds * 1000 - timeSinceFirst) / 1000)
    }
    return 0
  }

  getRateLimitMessage(userId: string): string {
    const seconds = this.getTimeUntilNextCall(userId)
    if (seconds === 0) return ''
    return `Por favor, aguarde ${seconds} segundo${seconds > 1 ? 's' : ''} para fazer uma nova pergunta. ⏱️`
  }

  private cleanup(): void {
    const now = Date.now()
    const maxAge = this.windowSeconds * 1000 * 2
    let removed = 0
    for (const [userId, entry] of this.limits.entries()) {
      if (now - entry.lastCall > maxAge) {
        this.limits.delete(userId)
        removed++
      }
    }
    if (removed > 0) {
      console.log(`⏱️ [Rate Limiter] 🧹 Cleanup - ${removed} entradas removidas`)
    }
  }

  getStats() {
    return {
      enabled: this.enabled,
      activeUsers: this.limits.size,
      maxCallsPerUser: this.maxCallsPerUser,
      windowSeconds: this.windowSeconds,
      blockedRequests: this.blockedRequests
    }
  }
}

export const rateLimiterService = new RateLimiterService()
