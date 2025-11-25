import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { 
    Play, 
    Pause, 
    Edit, 
    Trash2, 
    Plus, 
    Copy, 
    Calendar,
    Activity,
    CheckCircle2,
    XCircle,
    Clock,
    Search,
    Filter,
    MoreVertical,
    Workflow as WorkflowIcon,
    RefreshCw
} from 'lucide-react'
import { api } from '../lib/utils'

interface Workflow {
    id: string
    name: string
    description?: string
    type: string
    isActive: boolean
    createdAt?: string
    updatedAt?: string
    config?: any
    _count?: {
        executions?: number
    }
}

export const Workflows: React.FC = () => {
    const navigate = useNavigate()
    const [workflows, setWorkflows] = useState<Workflow[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
    const [syncing, setSyncing] = useState(false)

    useEffect(() => {
        loadWorkflows()
    }, [])

    const loadWorkflows = async () => {
        try {
            setLoading(true)
            const response = await api.get('/api/workflows')
            setWorkflows(response.data?.workflows || [])
        } catch (error) {
            console.error('Error loading workflows:', error)
            toast.error('Erro ao carregar workflows')
        } finally {
            setLoading(false)
        }
    }

    const handleSyncLocal = async () => {
        try {
            setSyncing(true)
            const response = await api.post('/api/workflows/sync/local', { file: 'workflow_completo_definitivo.json' })
            const name = response.data?.name || 'Workflow'
            const stats = response.data?.stats || {}
            toast.success(`${name} sincronizado (${stats.nodes || 0} nós, ${stats.edges || 0} conexões)`)
            loadWorkflows()
        } catch (error: any) {
            toast.error(`Erro ao sincronizar workflow: ${error.response?.data?.error || error.message}`)
        } finally {
            setSyncing(false)
        }
    }

    const handleToggleActive = async (workflow: Workflow) => {
        try {
            // Usar endpoint toggle se disponível, senão usar PUT
            try {
                await api.patch(`/api/workflows/${workflow.id}/toggle`)
            } catch {
                // Fallback para PUT se toggle não existir
                await api.put(`/api/workflows/${workflow.id}`, {
                    ...workflow,
                    isActive: !workflow.isActive
                })
            }
            toast.success(`Workflow "${workflow.name}" ${!workflow.isActive ? 'ativado' : 'desativado'} com sucesso!`)
            loadWorkflows()
        } catch (error: any) {
            console.error('Erro ao atualizar status:', error)
            toast.error(`Erro ao ${!workflow.isActive ? 'ativar' : 'desativar'} workflow: ${error.response?.data?.error || error.message}`)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este workflow?')) return

        try {
            await api.delete(`/api/workflows/${id}`)
            toast.success('Workflow excluído')
            loadWorkflows()
        } catch (error) {
            toast.error('Erro ao excluir workflow')
        }
    }

    const handleDuplicate = async (workflow: Workflow) => {
        try {
            const response = await api.post('/api/workflows', {
                name: `${workflow.name} (Cópia)`,
                description: workflow.description,
                type: workflow.type,
                config: workflow.config,
                isActive: false
            })
            toast.success('Workflow duplicado')
            loadWorkflows()
        } catch (error) {
            toast.error('Erro ao duplicar workflow')
        }
    }

    const handleCreateNew = () => {
        navigate('/workflows/editor/new')
    }

    const handleEdit = (id: string) => {
        navigate(`/workflows/editor/${id}`)
    }

    const filteredWorkflows = workflows
        .filter(wf => {
            const matchesSearch = wf.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                wf.description?.toLowerCase().includes(searchTerm.toLowerCase())
            const matchesFilter = filterStatus === 'all' ||
                (filterStatus === 'active' && wf.isActive) ||
                (filterStatus === 'inactive' && !wf.isActive)
            return matchesSearch && matchesFilter
        })
        // Ordenar: ativos primeiro, depois por data de atualização
        .sort((a, b) => {
            if (a.isActive !== b.isActive) {
                return a.isActive ? -1 : 1 // Ativos primeiro
            }
            const aDate = new Date(a.updatedAt || a.createdAt || 0).getTime()
            const bDate = new Date(b.updatedAt || b.createdAt || 0).getTime()
            return bDate - aDate // Mais recentes primeiro
        })

    const stats = {
        total: workflows.length,
        active: workflows.filter(wf => wf.isActive).length,
        inactive: workflows.filter(wf => !wf.isActive).length
    }

    if (loading) {
        return (
            <div className="flex-1 bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        )
    }

    return (
        <div className="flex-1 bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20">
            <div className="max-w-7xl mx-auto p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                                <WorkflowIcon className="h-7 w-7 text-white" />
                            </div>
                            Workflows
                        </h1>
                        <p className="text-gray-600 mt-1">Gerencie seus fluxos de automação</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleSyncLocal}
                            disabled={syncing}
                            className={`px-5 py-3 ${syncing ? 'bg-gray-300 cursor-not-allowed' : 'bg-white'} border border-gray-200 hover:bg-gray-50 text-gray-800 rounded-xl shadow-sm hover:shadow transition-all duration-200 flex items-center gap-2 font-medium`}
                            title="Sincronizar workflow com arquivo local"
                        >
                            <RefreshCw className={`h-5 w-5 ${syncing ? 'animate-spin' : ''}`} />
                            Sincronizar Workflow
                        </button>
                        <button
                            onClick={handleCreateNew}
                            className="px-5 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 font-medium"
                        >
                            <Plus className="h-5 w-5" />
                            Novo Workflow
                        </button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total</p>
                                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
                            </div>
                            <div className="p-3 bg-blue-50 rounded-lg">
                                <Activity className="h-6 w-6 text-blue-600" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Ativos</p>
                                <p className="text-3xl font-bold text-green-600 mt-1">{stats.active}</p>
                            </div>
                            <div className="p-3 bg-green-50 rounded-lg">
                                <CheckCircle2 className="h-6 w-6 text-green-600" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Inativos</p>
                                <p className="text-3xl font-bold text-gray-400 mt-1">{stats.inactive}</p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg">
                                <XCircle className="h-6 w-6 text-gray-400" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters and Search */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar workflows..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setFilterStatus('all')}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                    filterStatus === 'all'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                Todos
                            </button>
                            <button
                                onClick={() => setFilterStatus('active')}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                    filterStatus === 'active'
                                        ? 'bg-green-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                Ativos
                            </button>
                            <button
                                onClick={() => setFilterStatus('inactive')}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                    filterStatus === 'inactive'
                                        ? 'bg-gray-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                Inativos
                            </button>
                        </div>
                    </div>
                </div>

                {/* Workflows Grid */}
                {filteredWorkflows.length === 0 ? (
                    <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center">
                        <div className="p-4 bg-gray-50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                            <WorkflowIcon className="h-8 w-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum workflow encontrado</h3>
                        <p className="text-gray-600 mb-6">
                            {searchTerm ? 'Tente ajustar sua busca' : 'Comece criando seu primeiro workflow'}
                        </p>
                        {!searchTerm && (
                            <button
                                onClick={handleCreateNew}
                                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium inline-flex items-center gap-2 transition-colors"
                            >
                                <Plus className="h-5 w-5" />
                                Criar Workflow
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredWorkflows.map((workflow) => (
                            <div
                                key={workflow.id}
                                className={`bg-white rounded-xl shadow-sm border transition-all duration-200 overflow-hidden group ${
                                    workflow.isActive 
                                        ? 'border-green-300 hover:shadow-xl ring-2 ring-green-100' 
                                        : 'border-gray-100 hover:shadow-lg'
                                }`}
                            >
                                <div className="p-6">
                                    {/* Header */}
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className={`font-semibold text-lg line-clamp-1 ${
                                                    workflow.isActive ? 'text-green-700' : 'text-gray-900'
                                                }`}>
                                                    {workflow.name}
                                                </h3>
                                                {workflow.isActive ? (
                                                    <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full flex items-center gap-1.5 border border-green-200">
                                                        <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                                                        ATIVO
                                                    </span>
                                                ) : (
                                                    <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full border border-gray-200">
                                                        Inativo
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-600 line-clamp-2">
                                                {workflow.description || 'Sem descrição'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Metadata */}
                                    <div className="space-y-2 mb-4">
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <Clock className="h-3.5 w-3.5" />
                                            <span>
                                                {workflow.updatedAt
                                                    ? `Atualizado ${new Date(workflow.updatedAt).toLocaleDateString('pt-BR')}`
                                                    : 'Sem atualizações'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <Activity className="h-3.5 w-3.5" />
                                            <span>
                                                {workflow.config?.nodes?.length || 0} nós
                                            </span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2 pt-4 border-t border-gray-100">
                                        <button
                                            onClick={() => handleEdit(workflow.id)}
                                            className="flex-1 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors flex items-center justify-center gap-2 font-medium text-sm"
                                        >
                                            <Edit className="h-4 w-4" />
                                            Editar
                                        </button>
                                        <button
                                            onClick={() => handleToggleActive(workflow)}
                                            className={`px-3 py-2 rounded-lg transition-all flex items-center justify-center gap-2 font-medium text-sm ${
                                                workflow.isActive
                                                    ? 'bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 hover:border-orange-300'
                                                    : 'bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 hover:border-green-300'
                                            }`}
                                            title={workflow.isActive ? 'Desativar workflow' : 'Ativar workflow'}
                                        >
                                            {workflow.isActive ? (
                                                <>
                                                    <Pause className="h-4 w-4" />
                                                    <span className="hidden sm:inline">Pausar</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Play className="h-4 w-4" />
                                                    <span className="hidden sm:inline">Ativar</span>
                                                </>
                                            )}
                                        </button>
                                        <div className="relative group/menu">
                                            <button className="px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg transition-colors">
                                                <MoreVertical className="h-4 w-4" />
                                            </button>
                                            <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[160px] opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-10">
                                                <button
                                                    onClick={() => handleDuplicate(workflow)}
                                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                                >
                                                    <Copy className="h-4 w-4" />
                                                    Duplicar
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(workflow.id)}
                                                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                    Excluir
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
