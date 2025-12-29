import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { api } from '../lib/utils'
import { RefreshCw, DollarSign, TrendingDown, MessageSquare, Zap, ChevronUp, Activity, Settings2, Webhook } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts'
import RulesManagement from '../components/RulesManagement'
import WebhooksManagement from '../components/WebhooksManagement'

export default function AIConfigPage() {
    const [activeTab, setActiveTab] = useState<'costs' | 'rules' | 'webhooks'>('costs')
    const [optimizationStats, setOptimizationStats] = useState<any>(null)
    const [refreshing, setRefreshing] = useState(false)

    useEffect(() => {
        loadOptimizationStats()
        
        // Auto-refresh stats a cada 30s
        const interval = setInterval(loadOptimizationStats, 30000)
        return () => clearInterval(interval)
    }, [])

    const loadOptimizationStats = async (showToast = false) => {
        try {
            setRefreshing(true)
            const response = await api.get('/api/bot-optimization/stats')
            setOptimizationStats(response.data)
            
            if (showToast) {
                toast.success('Estatísticas atualizadas!')
            }
        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error)
        } finally {
            setRefreshing(false)
        }
    }

    const toggleService = async (service: string, enabled: boolean) => {
        try {
            await api.post(`/api/bot-optimization/${service}/toggle`, { enabled })
            toast.success(`${service} ${enabled ? 'ativado' : 'desativado'}`)
            loadOptimizationStats()
        } catch (error) {
            toast.error('Erro ao atualizar serviço')
        }
    }

    const resetStats = async () => {
        if (!confirm('Deseja resetar todas as estatísticas de otimização?')) return
        
        try {
            await api.post('/api/bot-optimization/reset-stats')
            toast.success('Estatísticas resetadas!')
            loadOptimizationStats()
        } catch (error) {
            toast.error('Erro ao resetar estatísticas')
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">⚙️ Configuração da IA</h1>
                        <p className="text-gray-600 mt-2">
                            Gerencie custos, otimizações e regras de resposta da assistente virtual Zorah
                        </p>
                    </div>
                    
                    {/* Tabs do Header */}
                    <div className="mt-6 border-b border-gray-200">
                        <nav className="flex -mb-px space-x-8">
                            <button
                                onClick={() => setActiveTab('costs')}
                                className={`pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                                    activeTab === 'costs'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                <DollarSign className="w-4 h-4" />
                                Custos & Economia
                            </button>
                            
                            <button
                                onClick={() => setActiveTab('rules')}
                                className={`pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                                    activeTab === 'rules'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                <Settings2 className="w-4 h-4" />
                                Regras & Templates
                            </button>
                            
                            <button
                                onClick={() => setActiveTab('webhooks')}
                                className={`pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                                    activeTab === 'webhooks'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                <Webhook className="w-4 h-4" />
                                Webhooks
                            </button>
                        </nav>
                    </div>
                </div>

                {/* Content */}
                <div className="bg-white rounded-lg shadow-sm">
                    <div className="p-6">
                        {activeTab === 'costs' && optimizationStats ? (
                            <OptimizationTab 
                                stats={optimizationStats}
                                refreshing={refreshing}
                                onRefresh={() => loadOptimizationStats(true)}
                                onToggle={toggleService}
                                onReset={resetStats}
                            />
                        ) : activeTab === 'costs' && !optimizationStats ? (
                            <div className="flex items-center justify-center p-8">
                                <div className="text-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                                    <p className="text-gray-600">Carregando estatísticas...</p>
                                </div>
                            </div>
                        ) : activeTab === 'rules' ? (
                            <RulesManagement />
                        ) : (
                            <WebhooksManagement />
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

// Componente da aba de Otimizações
interface OptimizationTabProps {
    stats: any
    refreshing: boolean
    onRefresh: () => void
    onToggle: (service: string, enabled: boolean) => void
    onReset: () => void
}

function OptimizationTab({ stats, refreshing, onRefresh, onToggle, onReset }: OptimizationTabProps) {
    const [expandedNode, setExpandedNode] = useState<string | null>(null)
    
    // Safety check: if stats is null/undefined, show loading state
    if (!stats) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Carregando estatísticas...</p>
                </div>
            </div>
        )
    }
    
    const COLORS = ['#3B82F6', '#10B981']

    const pieData = [
        { name: 'Cache', value: stats.responseCache?.savings ?? 0 },
        { name: 'Fallbacks', value: stats.simpleFallbacks?.savings ?? 0 }
    ]

    return (
        <div className="space-y-6">
            {/* Header com Título e Ações */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Fluxo de Processamento da IA</h2>
                    <p className="text-sm text-gray-600 mt-1">Configure cada etapa do processamento e monitore a economia</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={onRefresh}
                        disabled={refreshing}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Atualizar
                    </button>
                    <button
                        onClick={onReset}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                        Resetar Stats
                    </button>
                </div>
            </div>

            {/* Dashboard de Economia Resumido */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
                    <DollarSign className="h-8 w-8 mb-2" />
                    <p className="text-sm opacity-90">Economia Total</p>
                    <p className="text-3xl font-bold mt-1">${(stats.overall?.totalSavings ?? 0).toFixed(4)}</p>
                    <p className="text-xs mt-2 opacity-75">{stats.overall?.economyPercentage ?? 0}% mais eficiente</p>
                </div>

                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
                    <TrendingDown className="h-8 w-8 mb-2" />
                    <p className="text-sm opacity-90">Custo Mensal</p>
                    <p className="text-3xl font-bold mt-1">${(stats.overall?.projectedMonthlyCost ?? 0).toFixed(2)}</p>
                    <p className="text-xs mt-2 opacity-75">Meta: ${stats.overall?.targetMonthlyCost ?? 15}/mês</p>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
                    <MessageSquare className="h-8 w-8 mb-2" />
                    <p className="text-sm opacity-90">Conversas</p>
                    <p className="text-3xl font-bold mt-1">{stats.overall?.conversationsToday ?? 0}</p>
                    <p className="text-xs mt-2 opacity-75">Custo médio: ${(stats.costMonitoring?.avgCostPerCall ?? 0).toFixed(4)}</p>
                </div>

                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 text-white">
                    <Zap className="h-8 w-8 mb-2" />
                    <p className="text-sm opacity-90">Chamadas GPT</p>
                    <p className="text-3xl font-bold mt-1">{stats.costMonitoring?.totalCalls ?? 0}</p>
                    <p className="text-xs mt-2 opacity-75">Custo: ${(stats.costMonitoring?.totalCost ?? 0).toFixed(4)}</p>
                </div>
            </div>

            {/* Fluxo Visual com Configurações */}
            <div className="bg-white rounded-lg border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-600" />
                    Fluxo de Processamento
                </h3>
                
                <div className="space-y-4">
                    {/* Nó: Entrada */}
                    <FlowNode
                        id="input"
                        title="📥 Entrada"
                        description="Mensagem do usuário recebida"
                        status="always"
                        expanded={false}
                        onToggle={() => {}}
                    />

                    {/* Nó: Fallbacks */}
                    <FlowNode
                        id="fallbacks"
                        title="⚡ Respostas Rápidas"
                        description="Respostas pré-definidas sem GPT"
                        status={stats.simpleFallbacks?.enabled ? 'active' : 'inactive'}
                        enabled={stats.simpleFallbacks?.enabled}
                        stats={{
                            hits: stats.simpleFallbacks?.hits ?? 0,
                            hitRate: stats.simpleFallbacks?.hitRate ?? 0,
                            savings: stats.simpleFallbacks?.savings ?? 0
                        }}
                        expanded={expandedNode === 'fallbacks'}
                        onToggle={(enabled) => onToggle('simpleFallbacks', enabled)}
                        onExpand={() => setExpandedNode(expandedNode === 'fallbacks' ? null : 'fallbacks')}
                        config={
                            <div className="space-y-3 text-sm">
                                <div>
                                    <label className="font-medium text-gray-700">Tipos de Resposta:</label>
                                    <p className="text-gray-600">Saudações, Localização, Horários, Convênios básicos</p>
                                </div>
                            </div>
                        }
                    />

                    {/* Nó: Cache */}
                    <FlowNode
                        id="cache"
                        title="💾 Cache de Respostas"
                        description="Respostas armazenadas em memória"
                        status={stats.responseCache?.enabled ? 'active' : 'inactive'}
                        enabled={stats.responseCache?.enabled}
                        stats={{
                            hits: stats.responseCache?.hits ?? 0,
                            hitRate: stats.responseCache?.hitRate ?? 0,
                            savings: stats.responseCache?.savings ?? 0
                        }}
                        expanded={expandedNode === 'cache'}
                        onToggle={(enabled) => onToggle('responseCache', enabled)}
                        onExpand={() => setExpandedNode(expandedNode === 'cache' ? null : 'cache')}
                        config={
                            <div className="space-y-3 text-sm">
                                <div>
                                    <label className="font-medium text-gray-700">TTL (Time to Live):</label>
                                    <p className="text-gray-600">3600 segundos (1 hora)</p>
                                </div>
                                <div>
                                    <label className="font-medium text-gray-700">Itens em Cache:</label>
                                    <p className="text-gray-600">{stats.responseCache?.cacheSize ?? 0} entradas</p>
                                </div>
                            </div>
                        }
                    />

                    {/* Nó: GPT */}
                    <FlowNode
                        id="gpt"
                        title="🤖 GPT (OpenAI)"
                        description="Processamento com IA quando necessário"
                        status="always"
                        stats={{
                            hits: stats.costMonitoring?.totalCalls ?? 0,
                            hitRate: 100,
                            savings: -(stats.costMonitoring?.totalCost ?? 0)
                        }}
                        expanded={expandedNode === 'gpt'}
                        onExpand={() => setExpandedNode(expandedNode === 'gpt' ? null : 'gpt')}
                        config={
                            <div className="space-y-3 text-sm">
                                <div>
                                    <label className="font-medium text-gray-700">Modelo:</label>
                                    <p className="text-gray-600">gpt-4o-mini</p>
                                </div>
                                <div>
                                    <label className="font-medium text-gray-700">Max Tokens:</label>
                                    <p className="text-gray-600">200-250</p>
                                </div>
                                <div>
                                    <label className="font-medium text-gray-700">Custo por Chamada:</label>
                                    <p className="text-gray-600">${(stats.costMonitoring?.avgCostPerCall ?? 0).toFixed(4)}</p>
                                </div>
                            </div>
                        }
                    />

                    {/* Nó: Saída */}
                    <FlowNode
                        id="output"
                        title="📤 Resposta"
                        description="Mensagem enviada ao usuário"
                        status="always"
                        expanded={false}
                        onToggle={() => {}}
                    />
                </div>
            </div>

            {/* Resumo de Economia com Gráfico */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg border p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribuição de Economia</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <RechartsTooltip formatter={(value: any) => `$${value.toFixed(4)}`} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-lg border p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumo de Performance</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                            <span className="text-sm font-medium text-gray-700">Economia Total Hoje</span>
                            <span className="text-lg font-bold text-green-600">${(stats.overall?.totalSavings ?? 0).toFixed(4)}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                            <span className="text-sm font-medium text-gray-700">Custo do Dia</span>
                            <span className="text-lg font-bold text-blue-600">${(stats.costMonitoring?.totalCost ?? 0).toFixed(4)}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                            <span className="text-sm font-medium text-gray-700">Conversas Processadas</span>
                            <span className="text-lg font-bold text-purple-600">{stats.overall?.conversationsToday ?? 0}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                            <span className="text-sm font-medium text-gray-700">Projeção Mensal</span>
                            <span className="text-lg font-bold text-orange-600">${(stats.overall?.projectedMonthlyCost ?? 0).toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Barra de Progresso da Meta */}
            <div className="bg-white rounded-lg border p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Meta de Economia Mensal</h3>
                    <span className="text-sm text-gray-600">
                        ${(stats.overall?.projectedMonthlyCost ?? 0).toFixed(2)} / ${stats.overall?.targetMonthlyCost ?? 15}
                    </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                    <div
                        className={`h-4 rounded-full transition-all ${
                            stats.overall.projectedMonthlyCost <= stats.overall.targetMonthlyCost
                                ? 'bg-green-500'
                                : 'bg-orange-500'
                        }`}
                        style={{
                            width: `${Math.min(((stats.overall?.projectedMonthlyCost ?? 0) / (stats.overall?.targetMonthlyCost ?? 15)) * 100, 100)}%`
                        }}
                    />
                </div>
                <p className="text-sm text-gray-600 mt-2">
                    {(stats.overall?.projectedMonthlyCost ?? 0) <= (stats.overall?.targetMonthlyCost ?? 15)
                        ? '✅ Dentro da meta!'
                        : '⚠️ Acima da meta'}
                </p>
            </div>
        </div>
    )
}

// Componente FlowNode - Representa cada etapa do fluxo
interface FlowNodeProps {
    id: string
    title: string
    description: string
    status: 'active' | 'inactive' | 'always'
    enabled?: boolean
    stats?: {
        hits: number
        hitRate: number
        savings: number
    }
    expanded: boolean
    onToggle?: (enabled: boolean) => void
    onExpand?: () => void
    config?: React.ReactNode
}

function FlowNode({ id, title, description, status, enabled, stats, expanded, onToggle, onExpand, config }: FlowNodeProps) {
    const isConfigurable = onToggle !== undefined
    const hasStats = stats !== undefined
    
    // Cores baseadas no status
    const statusColors = {
        active: 'border-green-500 bg-green-50',
        inactive: 'border-gray-300 bg-gray-50',
        always: 'border-blue-500 bg-blue-50'
    }
    
    const statusIcons = {
        active: '✅',
        inactive: '⚪',
        always: '🔵'
    }

    return (
        <div className="relative">
            {/* Linha conectora */}
            {id !== 'input' && (
                <div className="absolute left-1/2 -top-4 w-0.5 h-4 bg-gray-300 transform -translate-x-1/2"></div>
            )}
            
            <div className={`border-2 rounded-lg overflow-hidden transition-all ${statusColors[status]}`}>
                {/* Header do Nó */}
                <div className="p-4 bg-white">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-lg">{statusIcons[status]}</span>
                                <h4 className="font-semibold text-gray-900">{title}</h4>
                            </div>
                            <p className="text-sm text-gray-600">{description}</p>
                        </div>
                        
                        <div className="flex items-center gap-2 ml-4">
                            {/* Toggle ON/OFF */}
                            {isConfigurable && (
                                <button
                                    onClick={() => onToggle(!enabled)}
                                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                        enabled
                                            ? 'bg-green-500 text-white hover:bg-green-600'
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    }`}
                                >
                                    {enabled ? 'ON' : 'OFF'}
                                </button>
                            )}
                            
                            {/* Botão Configurar */}
                            {config && (
                                <button
                                    onClick={onExpand}
                                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                                    title="Configurar"
                                >
                                    {expanded ? (
                                        <ChevronUp className="h-5 w-5 text-gray-600" />
                                    ) : (
                                        <Settings2 className="h-5 w-5 text-gray-600" />
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                    
                    {/* Estatísticas Inline */}
                    {hasStats && (
                        <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                            <div className="bg-gray-50 rounded p-2">
                                <div className="text-xs text-gray-600">Hits</div>
                                <div className="text-lg font-bold text-gray-900">{stats.hits}</div>
                            </div>
                            <div className="bg-gray-50 rounded p-2">
                                <div className="text-xs text-gray-600">Taxa</div>
                                <div className="text-lg font-bold text-gray-900">{stats.hitRate.toFixed(1)}%</div>
                            </div>
                            <div className="bg-green-50 rounded p-2">
                                <div className="text-xs text-gray-600">Economia</div>
                                <div className="text-lg font-bold text-green-600">
                                    {stats.savings >= 0 ? '+' : ''}{stats.savings < 0 ? stats.savings.toFixed(4) : `$${stats.savings.toFixed(4)}`}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Configurações Expandidas */}
                {expanded && config && (
                    <div className="p-4 bg-gray-50 border-t">
                        <div className="flex items-center gap-2 mb-3">
                            <Settings2 className="h-4 w-4 text-gray-600" />
                            <h5 className="font-medium text-gray-900">Configurações</h5>
                        </div>
                        {config}
                    </div>
                )}
            </div>
            
            {/* Linha conectora para baixo */}
            {id !== 'output' && (
                <div className="absolute left-1/2 -bottom-4 w-0.5 h-4 bg-gray-300 transform -translate-x-1/2"></div>
            )}
        </div>
    )
}
