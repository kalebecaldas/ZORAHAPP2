import { useState, useEffect } from 'react'
import { toast } from 'sonner'

interface AIConfiguration {
    id: string
    name: string
    description?: string
    systemPrompt: string
    personality: string
    tone: string
    useEmojis: boolean
    offerPackages: boolean
    askInsurance: boolean
    maxResponseLength: number
    temperature: number
    maxTokens: number
    isActive: boolean
    examples: AIExample[]
    transferRules: TransferRule[]
}

interface AIExample {
    id: string
    name: string
    description?: string
    category: string
    userMessage: string
    expectedIntent: string
    expectedAction: string
    botResponse: string
    entities: any
    confidence: number
    priority: number
    isActive: boolean
}

interface TransferRule {
    id: string
    name: string
    description?: string
    keywords: string[]
    intents: string[]
    minConfidence: number
    targetQueue: string
    priority: number
    transferMessage?: string
    isActive: boolean
}

export default function AIConfigPage() {
    const [config, setConfig] = useState<AIConfiguration | null>(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'config' | 'examples' | 'rules'>('config')
    const [testMessage, setTestMessage] = useState('')
    const [testResult, setTestResult] = useState<any>(null)

    useEffect(() => {
        loadConfiguration()
    }, [])

    const loadConfiguration = async () => {
        try {
            const response = await fetch('/api/ai-config', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            })
            const data = await response.json()
            setConfig(data)
        } catch (error) {
            console.error('Erro ao carregar configuração:', error)
            toast.error('Erro ao carregar configuração')
        } finally {
            setLoading(false)
        }
    }

    const saveConfiguration = async () => {
        if (!config) return

        try {
            const response = await fetch(`/api/ai-config/${config.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(config)
            })

            if (response.ok) {
                toast.success('Configuração salva com sucesso!')
            } else {
                toast.error('Erro ao salvar configuração')
            }
        } catch (error) {
            console.error('Erro ao salvar:', error)
            toast.error('Erro ao salvar configuração')
        }
    }

    const testAI = async () => {
        if (!testMessage.trim()) {
            toast.error('Digite uma mensagem para testar')
            return
        }

        try {
            const response = await fetch('/api/ai-config/test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ message: testMessage })
            })

            const result = await response.json()
            setTestResult(result)
            toast.success('Teste concluído!')
        } catch (error) {
            console.error('Erro ao testar:', error)
            toast.error('Erro ao testar IA')
        }
    }

    const toggleExample = async (exampleId: string, isActive: boolean) => {
        try {
            await fetch(`/api/ai-config/examples/${exampleId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ isActive: !isActive })
            })

            loadConfiguration()
            toast.success('Exemplo atualizado!')
        } catch (error) {
            console.error('Erro ao atualizar exemplo:', error)
            toast.error('Erro ao atualizar exemplo')
        }
    }

    const toggleRule = async (ruleId: string, isActive: boolean) => {
        try {
            await fetch(`/api/ai-config/transfer-rules/${ruleId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ isActive: !isActive })
            })

            loadConfiguration()
            toast.success('Regra atualizada!')
        } catch (error) {
            console.error('Erro ao atualizar regra:', error)
            toast.error('Erro ao atualizar regra')
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Carregando configuração...</p>
                </div>
            </div>
        )
    }

    if (!config) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <p className="text-red-600 mb-4">Erro ao carregar configuração</p>
                    <button
                        onClick={loadConfiguration}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                        Tentar Novamente
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">🤖 Configuração da IA</h1>
                            <p className="text-gray-600 mt-2">
                                Configure o comportamento, exemplos e regras da assistente virtual Zorah
                            </p>
                        </div>
                        <button
                            onClick={saveConfiguration}
                            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                        >
                            💾 Salvar Alterações
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-lg shadow-sm mb-6">
                    <div className="border-b border-gray-200">
                        <nav className="flex space-x-8 px-6" aria-label="Tabs">
                            <button
                                onClick={() => setActiveTab('config')}
                                className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'config'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                ⚙️ Configuração Geral
                            </button>
                            <button
                                onClick={() => setActiveTab('examples')}
                                className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'examples'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                📚 Exemplos ({config.examples.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('rules')}
                                className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'rules'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                👤 Regras de Transferência ({config.transferRules.length})
                            </button>
                        </nav>
                    </div>

                    {/* Tab Content */}
                    <div className="p-6">
                        {activeTab === 'config' && (
                            <div className="space-y-6">
                                {/* Personalidade */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Personalidade
                                    </label>
                                    <input
                                        type="text"
                                        value={config.personality}
                                        onChange={(e) => setConfig({ ...config, personality: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Ex: Empática e profissional"
                                    />
                                </div>

                                {/* Tom de Voz */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Tom de Voz
                                    </label>
                                    <input
                                        type="text"
                                        value={config.tone}
                                        onChange={(e) => setConfig({ ...config, tone: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Ex: Conversacional e amigável"
                                    />
                                </div>

                                {/* Opções */}
                                <div className="space-y-3">
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={config.useEmojis}
                                            onChange={(e) => setConfig({ ...config, useEmojis: e.target.checked })}
                                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                        />
                                        <span className="ml-2 text-sm text-gray-700">Usar emojis nas respostas</span>
                                    </label>

                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={config.offerPackages}
                                            onChange={(e) => setConfig({ ...config, offerPackages: e.target.checked })}
                                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                        />
                                        <span className="ml-2 text-sm text-gray-700">Oferecer pacotes e descontos proativamente</span>
                                    </label>

                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={config.askInsurance}
                                            onChange={(e) => setConfig({ ...config, askInsurance: e.target.checked })}
                                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                        />
                                        <span className="ml-2 text-gray-700">Perguntar sobre convênio antes de informar preços</span>
                                    </label>
                                </div>

                                {/* Prompt Base */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Prompt Base
                                    </label>
                                    <textarea
                                        value={config.systemPrompt}
                                        onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })}
                                        rows={10}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                                        placeholder="Prompt base da IA..."
                                    />
                                    <p className="mt-2 text-sm text-gray-500">
                                        Este é o prompt base que a IA usará. Ele será combinado com exemplos e regras.
                                    </p>
                                </div>

                                {/* Teste da IA */}
                                <div className="border-t pt-6">
                                    <h3 className="text-lg font-medium text-gray-900 mb-4">🧪 Testar IA</h3>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={testMessage}
                                            onChange={(e) => setTestMessage(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && testAI()}
                                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            placeholder="Digite uma mensagem para testar..."
                                        />
                                        <button
                                            onClick={testAI}
                                            className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                                        >
                                            Testar
                                        </button>
                                    </div>

                                    {testResult && (
                                        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                                            <p className="font-medium text-gray-900 mb-2">Resposta:</p>
                                            <p className="text-gray-700 mb-3">{testResult.message}</p>
                                            <div className="grid grid-cols-3 gap-2 text-sm">
                                                <div>
                                                    <span className="font-medium">Intent:</span> {testResult.intent}
                                                </div>
                                                <div>
                                                    <span className="font-medium">Action:</span> {testResult.action}
                                                </div>
                                                <div>
                                                    <span className="font-medium">Confidence:</span> {(testResult.confidence * 100).toFixed(0)}%
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'examples' && (
                            <div className="space-y-4">
                                {config.examples.map((example) => (
                                    <div
                                        key={example.id}
                                        className={`border rounded-lg p-4 ${example.isActive ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <h4 className="font-medium text-gray-900">{example.name}</h4>
                                                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                                                        {example.category}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-600 mb-2">{example.description}</p>
                                                <div className="space-y-2 text-sm">
                                                    <div>
                                                        <span className="font-medium">Usuário:</span> "{example.userMessage}"
                                                    </div>
                                                    <div>
                                                        <span className="font-medium">Bot:</span> "{example.botResponse.substring(0, 100)}..."
                                                    </div>
                                                    <div className="flex gap-4">
                                                        <span><strong>Intent:</strong> {example.expectedIntent}</span>
                                                        <span><strong>Action:</strong> {example.expectedAction}</span>
                                                        <span><strong>Confiança:</strong> {(example.confidence * 100).toFixed(0)}%</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => toggleExample(example.id, example.isActive)}
                                                className={`ml-4 px-4 py-2 rounded-lg text-sm font-medium ${example.isActive
                                                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                                                    }`}
                                            >
                                                {example.isActive ? 'Desativar' : 'Ativar'}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeTab === 'rules' && (
                            <div className="space-y-4">
                                {config.transferRules.map((rule) => (
                                    <div
                                        key={rule.id}
                                        className={`border rounded-lg p-4 ${rule.isActive ? 'border-orange-200 bg-orange-50' : 'border-gray-200 bg-gray-50'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <h4 className="font-medium text-gray-900 mb-2">{rule.name}</h4>
                                                <p className="text-sm text-gray-600 mb-3">{rule.description}</p>
                                                <div className="space-y-2 text-sm">
                                                    <div>
                                                        <span className="font-medium">Palavras-chave:</span>{' '}
                                                        {rule.keywords.join(', ')}
                                                    </div>
                                                    <div>
                                                        <span className="font-medium">Fila:</span> {rule.targetQueue}
                                                    </div>
                                                    {rule.transferMessage && (
                                                        <div>
                                                            <span className="font-medium">Mensagem:</span> "{rule.transferMessage}"
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => toggleRule(rule.id, rule.isActive)}
                                                className={`ml-4 px-4 py-2 rounded-lg text-sm font-medium ${rule.isActive
                                                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                                                    }`}
                                            >
                                                {rule.isActive ? 'Desativar' : 'Ativar'}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
