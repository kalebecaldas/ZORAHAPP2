import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { api } from '../lib/utils'
import { 
  Webhook, 
  Plus, 
  Trash2, 
  Power, 
  PowerOff, 
  Eye, 
  BarChart3,
  TestTube,
  Copy,
  Check,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react'

interface Webhook {
  id: string
  name: string
  description?: string
  url: string
  token: string
  events: string[]
  isActive: boolean
  createdAt: string
  lastTriggeredAt?: string
  _count?: {
    logs: number
  }
}

interface WebhookLog {
  id: string
  eventType: string
  statusCode?: number
  responseTime?: number
  success: boolean
  error?: string
  createdAt: string
}

interface WebhookStats {
  totalRequests: number
  successful: number
  failed: number
  successRate: string
  avgResponseTime: string
  period: string
}

export default function WebhooksManagement() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedWebhook, setSelectedWebhook] = useState<Webhook | null>(null)
  const [showLogsModal, setShowLogsModal] = useState(false)
  const [showStatsModal, setShowStatsModal] = useState(false)
  const [logs, setLogs] = useState<WebhookLog[]>([])
  const [stats, setStats] = useState<WebhookStats | null>(null)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  useEffect(() => {
    loadWebhooks()
  }, [])

  const loadWebhooks = async () => {
    try {
      setLoading(true)
      const response = await api.get('/api/webhooks')
      setWebhooks(response.data.data || [])
    } catch (error) {
      console.error('Erro ao carregar webhooks:', error)
      toast.error('Erro ao carregar webhooks')
    } finally {
      setLoading(false)
    }
  }

  const loadLogs = async (webhookId: string) => {
    try {
      const response = await api.get(`/api/webhooks/${webhookId}/logs?limit=50`)
      setLogs(response.data.data || [])
    } catch (error) {
      console.error('Erro ao carregar logs:', error)
      toast.error('Erro ao carregar logs')
    }
  }

  const loadStats = async (webhookId: string) => {
    try {
      const response = await api.get(`/api/webhooks/${webhookId}/stats?days=7`)
      setStats(response.data.data)
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
      toast.error('Erro ao carregar estatísticas')
    }
  }

  const testWebhook = async (webhookId: string) => {
    try {
      await api.post(`/api/webhooks/${webhookId}/test`)
      toast.success('Teste enviado! Verifique os logs.')
    } catch (error) {
      console.error('Erro ao testar webhook:', error)
      toast.error('Erro ao testar webhook')
    }
  }

  const toggleWebhook = async (webhookId: string, isActive: boolean) => {
    try {
      if (isActive) {
        await api.post(`/api/webhooks/${webhookId}/deactivate`)
        toast.success('Webhook desativado')
      } else {
        await api.patch(`/api/webhooks/${webhookId}`, { isActive: true })
        toast.success('Webhook ativado')
      }
      loadWebhooks()
    } catch (error) {
      console.error('Erro ao atualizar webhook:', error)
      toast.error('Erro ao atualizar webhook')
    }
  }

  const deleteWebhook = async (webhookId: string) => {
    if (!confirm('Deseja realmente remover este webhook? Esta ação não pode ser desfeita.')) {
      return
    }

    try {
      await api.delete(`/api/webhooks/${webhookId}`)
      toast.success('Webhook removido')
      loadWebhooks()
    } catch (error) {
      console.error('Erro ao remover webhook:', error)
      toast.error('Erro ao remover webhook')
    }
  }

  const copyToClipboard = (text: string, webhookId: string) => {
    navigator.clipboard.writeText(text)
    setCopiedToken(webhookId)
    toast.success('Token copiado!')
    setTimeout(() => setCopiedToken(null), 2000)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('pt-BR')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando webhooks...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Webhook className="w-6 h-6" />
            Webhooks
          </h2>
          <p className="text-gray-600 mt-1">
            Notifique parceiros externos sobre eventos importantes
          </p>
        </div>
        
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Webhook
        </button>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-900">
            <p className="font-semibold mb-1">Como funciona:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Webhooks notificam sistemas externos quando eventos ocorrem</li>
              <li>Cada webhook possui um token único para autenticação</li>
              <li>Retry automático (3x) em caso de falha</li>
              <li><a href="/webhooks-docs" target="_blank" className="underline hover:text-blue-700 flex items-center gap-1">Ver documentação completa <ExternalLink className="w-3 h-3" /></a></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Webhooks List */}
      {webhooks.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Webhook className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum webhook configurado ainda</h3>
          <p className="text-gray-600 mb-4">
            Clique em "Novo Webhook" no canto superior direito para criar o primeiro
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {webhooks.map((webhook) => (
            <div
              key={webhook.id}
              className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{webhook.name}</h3>
                    {webhook.isActive ? (
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Ativo
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full flex items-center gap-1">
                        <XCircle className="w-3 h-3" />
                        Inativo
                      </span>
                    )}
                  </div>
                  
                  {webhook.description && (
                    <p className="text-gray-600 text-sm mb-2">{webhook.description}</p>
                  )}
                  
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <ExternalLink className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">URL:</span>
                      <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">{webhook.url}</code>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">Token:</span>
                      <code className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono">
                        {webhook.token.substring(0, 20)}...
                      </code>
                      <button
                        onClick={() => copyToClipboard(webhook.token, webhook.id)}
                        className="p-1 hover:bg-gray-100 rounded"
                        title="Copiar token"
                      >
                        {copiedToken === webhook.id ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4 text-gray-500" />
                        )}
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">Eventos:</span>
                      {webhook.events.map((event) => (
                        <span key={event} className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs">
                          {event}
                        </span>
                      ))}
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                      <span>Criado: {formatDate(webhook.createdAt)}</span>
                      {webhook.lastTriggeredAt && (
                        <span>Último disparo: {formatDate(webhook.lastTriggeredAt)}</span>
                      )}
                      {webhook._count && (
                        <span>{webhook._count.logs} logs registrados</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => {
                      setSelectedWebhook(webhook)
                      loadStats(webhook.id)
                      setShowStatsModal(true)
                    }}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="Ver estatísticas"
                  >
                    <BarChart3 className="w-5 h-5" />
                  </button>

                  <button
                    onClick={() => {
                      setSelectedWebhook(webhook)
                      loadLogs(webhook.id)
                      setShowLogsModal(true)
                    }}
                    className="p-2 text-purple-600 hover:bg-purple-50 rounded transition-colors"
                    title="Ver logs"
                  >
                    <Eye className="w-5 h-5" />
                  </button>

                  <button
                    onClick={() => testWebhook(webhook.id)}
                    className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors"
                    title="Testar webhook"
                  >
                    <TestTube className="w-5 h-5" />
                  </button>

                  <button
                    onClick={() => toggleWebhook(webhook.id, webhook.isActive)}
                    className={`p-2 rounded transition-colors ${
                      webhook.isActive
                        ? 'text-orange-600 hover:bg-orange-50'
                        : 'text-green-600 hover:bg-green-50'
                    }`}
                    title={webhook.isActive ? 'Desativar' : 'Ativar'}
                  >
                    {webhook.isActive ? (
                      <PowerOff className="w-5 h-5" />
                    ) : (
                      <Power className="w-5 h-5" />
                    )}
                  </button>

                  <button
                    onClick={() => deleteWebhook(webhook.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Remover"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateWebhookModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            loadWebhooks()
            setShowCreateModal(false)
          }}
        />
      )}

      {/* Logs Modal */}
      {showLogsModal && selectedWebhook && (
        <LogsModal
          webhook={selectedWebhook}
          logs={logs}
          onClose={() => {
            setShowLogsModal(false)
            setSelectedWebhook(null)
            setLogs([])
          }}
        />
      )}

      {/* Stats Modal */}
      {showStatsModal && selectedWebhook && stats && (
        <StatsModal
          webhook={selectedWebhook}
          stats={stats}
          onClose={() => {
            setShowStatsModal(false)
            setSelectedWebhook(null)
            setStats(null)
          }}
        />
      )}
    </div>
  )
}

// Create Webhook Modal
function CreateWebhookModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    url: '',
    events: ['first_message']
  })
  const [creating, setCreating] = useState(false)
  const [createdWebhook, setCreatedWebhook] = useState<Webhook | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setCreating(true)
      const response = await api.post('/api/webhooks', formData)
      setCreatedWebhook(response.data.data)
      toast.success('Webhook criado com sucesso!')
    } catch (error: any) {
      console.error('Erro ao criar webhook:', error)
      toast.error(error.response?.data?.error || 'Erro ao criar webhook')
    } finally {
      setCreating(false)
    }
  }

  if (createdWebhook) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-2xl w-full p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">🎉 Webhook Criado com Sucesso!</h3>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-yellow-900 font-semibold mb-2">
              ⚠️ IMPORTANTE: Guarde o token com segurança! Ele não poderá ser recuperado depois.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Token de Autenticação:</label>
              <div className="flex gap-2">
                <code className="flex-1 bg-gray-100 px-3 py-2 rounded font-mono text-sm break-all">
                  {createdWebhook.token}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(createdWebhook.token)
                    toast.success('Token copiado!')
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL do Webhook:</label>
              <code className="block bg-gray-100 px-3 py-2 rounded text-sm">{createdWebhook.url}</code>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Header de Autenticação:</label>
              <code className="block bg-gray-100 px-3 py-2 rounded text-sm">X-Webhook-Token: {createdWebhook.token}</code>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={onSuccess}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Continuar
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Criar Novo Webhook</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: Google Ads Partner"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Webhook para rastreamento de conversões..."
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL do Endpoint *</label>
            <input
              type="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="https://seu-parceiro.com/api/webhook"
              required
            />
            <p className="text-xs text-gray-500 mt-1">URL completa que receberá as notificações</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Eventos</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'first_message', label: '📨 Primeira mensagem' },
                { value: 'message_received', label: '💬 Mensagem recebida' },
                { value: 'conversation_started', label: '🆕 Conversa iniciada' },
                { value: 'agent_joined', label: '👤 Atendente assumiu' },
                { value: 'conversation_closed', label: '❌ Conversa encerrada' },
                { value: 'patient_registered', label: '📋 Paciente cadastrado' },
                { value: 'appointment_created', label: '📅 Agendamento criado' },
                { value: 'bot_transferred', label: '🤖 Bot transferiu' },
                { value: 'message_sent', label: '📤 Mensagem enviada' }
              ].map(event => (
                <label key={event.value} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={formData.events.includes(event.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({ ...formData, events: [...formData.events, event.value] })
                      } else {
                        setFormData({ ...formData, events: formData.events.filter(ev => ev !== event.value) })
                      }
                    }}
                    className="rounded"
                  />
                  <span>{event.label}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">Selecione quais eventos você deseja receber</p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              disabled={creating}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              disabled={creating}
            >
              {creating ? 'Criando...' : 'Criar Webhook'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Logs Modal
function LogsModal({ webhook, logs, onClose }: { webhook: Webhook; logs: WebhookLog[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b">
          <h3 className="text-xl font-bold text-gray-900">Logs - {webhook.name}</h3>
          <p className="text-gray-600 text-sm mt-1">Últimas 50 tentativas de envio</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {logs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Nenhum log registrado ainda</p>
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className={`p-4 rounded-lg border ${
                    log.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {log.success ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                      <span className="font-medium text-gray-900">{log.eventType}</span>
                      {log.statusCode && (
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          log.statusCode >= 200 && log.statusCode < 300
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {log.statusCode}
                        </span>
                      )}
                      {log.responseTime && (
                        <span className="text-xs text-gray-500">{log.responseTime}ms</span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(log.createdAt).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  
                  {log.error && (
                    <p className="text-sm text-red-700 mt-2">{log.error}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

// Stats Modal
function StatsModal({ webhook, stats, onClose }: { webhook: Webhook; stats: WebhookStats; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Estatísticas - {webhook.name}</h3>
        <p className="text-gray-600 text-sm mb-6">{stats.period}</p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-600 font-medium">Total de Requisições</p>
            <p className="text-3xl font-bold text-blue-900 mt-1">{stats.totalRequests}</p>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-green-600 font-medium">Taxa de Sucesso</p>
            <p className="text-3xl font-bold text-green-900 mt-1">{stats.successRate}</p>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg">
            <p className="text-sm text-purple-600 font-medium">Bem-sucedidas</p>
            <p className="text-3xl font-bold text-purple-900 mt-1">{stats.successful}</p>
          </div>

          <div className="bg-red-50 p-4 rounded-lg">
            <p className="text-sm text-red-600 font-medium">Falhas</p>
            <p className="text-3xl font-bold text-red-900 mt-1">{stats.failed}</p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg col-span-2">
            <p className="text-sm text-gray-600 font-medium">Tempo Médio de Resposta</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{stats.avgResponseTime}</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          Fechar
        </button>
      </div>
    </div>
  )
}
