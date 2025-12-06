import NodeCache from 'node-cache'

/**
 * Cache Service para mensagens recentes
 * TTL: 60 segundos
 */
class MessageCacheService {
    private cache: NodeCache

    constructor() {
        this.cache = new NodeCache({ stdTTL: 60 }) // 1 minuto
    }

    /**
     * Busca mensagens do cache ou executa fetcher
     */
    async getOrSet<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
        const cached = this.cache.get<T>(key)
        if (cached) {
            console.log(`✅ Cache HIT: ${key}`)
            return cached
        }

        console.log(`❌ Cache MISS: ${key}`)
        const data = await fetcher()
        this.cache.set(key, data)
        return data
    }

    /**
     * Invalida cache de uma conversa específica
     */
    invalidate(conversationId: string) {
        const key = `messages:${conversationId}`
        this.cache.del(key)
        console.log(`🗑️ Cache invalidado: ${key}`)
    }

    /**
     * Limpa todo o cache
     */
    clear() {
        this.cache.flushAll()
        console.log(`🗑️ Cache completo limpo`)
    }

    /**
     * Obtém estatísticas do cache
     */
    getStats() {
        return this.cache.getStats()
    }
}

export const messageCacheService = new MessageCacheService()
