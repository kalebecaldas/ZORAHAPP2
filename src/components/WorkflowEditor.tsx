import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Plus, Play, Save, Trash2, Edit2, CheckCircle, XCircle } from 'lucide-react'

interface WorkflowNode {
    id: string
    type: 'start' | 'condition' | 'action' | 'gpt' | 'end' | 'transfer'
    label: string
    position: { x: number; y: number }
    config?: any
}

interface WorkflowEdge {
    id: string
    source: string
    target: string
    label?: string
    condition?: 'yes' | 'no' | 'default'
}

interface Workflow {
    id: string
    name: string
    description?: string
    trigger: 'intent' | 'keyword' | 'always'
    triggerValue?: string
    isActive: boolean
    nodes: WorkflowNode[]
    edges: WorkflowEdge[]
    priority: number
}

export default function WorkflowEditor() {
    const [workflows, setWorkflows] = useState<Workflow[]>([])
    const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null)
    const [loading, setLoading] = useState(true)
    const [editingNode, setEditingNode] = useState<WorkflowNode | null>(null)
    const [showNodeModal, setShowNodeModal] = useState(false)
    const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null)
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

    useEffect(() => {
        loadWorkflows()
    }, [])

    const loadWorkflows = async () => {
        try {
            const response = await fetch('/api/workflows', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            })
            const data = await response.json()
            setWorkflows(data)
            if (data.length > 0 && !selectedWorkflow) {
                setSelectedWorkflow(data[0])
            }
        } catch (error) {
            console.error('Error loading workflows:', error)
            toast.error('Erro ao carregar workflows')
        } finally {
            setLoading(false)
        }
    }

    const saveWorkflow = async () => {
        if (!selectedWorkflow) return

        try {
            const method = selectedWorkflow.id.startsWith('new-') ? 'POST' : 'PUT'
            const url = method === 'POST' 
                ? '/api/workflows' 
                : `/api/workflows/${selectedWorkflow.id}`

            await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(selectedWorkflow)
            })

            toast.success('Workflow salvo!')
            loadWorkflows()
        } catch (error) {
            console.error('Error saving workflow:', error)
            toast.error('Erro ao salvar workflow')
        }
    }

    const deleteWorkflow = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este workflow?')) return

        try {
            await fetch(`/api/workflows/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            })

            toast.success('Workflow excluído!')
            loadWorkflows()
            setSelectedWorkflow(null)
        } catch (error) {
            console.error('Error deleting workflow:', error)
            toast.error('Erro ao excluir workflow')
        }
            }

    const testWorkflow = async () => {
        if (!selectedWorkflow) return

        const testMessage = prompt('Digite uma mensagem de teste:')
        if (!testMessage) return

        try {
            const response = await fetch(`/api/workflows/${selectedWorkflow.id}/test`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ message: testMessage })
            })

            const result = await response.json()
            alert(`Resultado:\n\n${JSON.stringify(result, null, 2)}`)
        } catch (error) {
            console.error('Error testing workflow:', error)
            toast.error('Erro ao testar workflow')
        }
    }

    const createNewWorkflow = () => {
        const newWorkflow: Workflow = {
            id: `new-${Date.now()}`,
            name: 'Novo Workflow',
            description: '',
            trigger: 'intent',
            triggerValue: '',
            isActive: true,
            priority: 50,
            nodes: [
                {
                    id: 'start-1',
                    type: 'start',
                    label: 'Início',
                    position: { x: 200, y: 50 }
                },
                {
                    id: 'end-1',
                    type: 'end',
                    label: 'Fim',
                    position: { x: 200, y: 300 }
                }
            ],
            edges: []
        }
        setSelectedWorkflow(newWorkflow)
        setWorkflows([...workflows, newWorkflow])
    }

    const openNodeEditor = (node: WorkflowNode) => {
        setEditingNode({ ...node })
        setShowNodeModal(true)
    }

    const saveNode = () => {
        if (!editingNode || !selectedWorkflow) return

        const updatedNodes = selectedWorkflow.nodes.map(n => 
            n.id === editingNode.id ? editingNode : n
        )

        setSelectedWorkflow({
            ...selectedWorkflow,
            nodes: updatedNodes
        })

        setShowNodeModal(false)
        setEditingNode(null)
        toast.success('Nó atualizado!')
    }

    const addNode = (type: WorkflowNode['type']) => {
        if (!selectedWorkflow) return

        const newNode: WorkflowNode = {
            id: `node-${Date.now()}`,
            type,
            label: `Novo ${type}`,
            position: { x: 200, y: selectedWorkflow.nodes.length * 150 },
            config: {}
        }

        setSelectedWorkflow({
            ...selectedWorkflow,
            nodes: [...selectedWorkflow.nodes, newNode]
        })

        toast.success('Nó adicionado!')
    }

    const deleteNode = (nodeId: string) => {
        if (!selectedWorkflow) return
        if (!confirm('Tem certeza que deseja excluir este nó?')) return

        // Não permitir deletar start e end
        const node = selectedWorkflow.nodes.find(n => n.id === nodeId)
        if (node && (node.type === 'start' || node.type === 'end')) {
            toast.error('Não é possível excluir nós Start ou End')
            return
        }

        setSelectedWorkflow({
            ...selectedWorkflow,
            nodes: selectedWorkflow.nodes.filter(n => n.id !== nodeId),
            edges: selectedWorkflow.edges.filter(e => e.source !== nodeId && e.target !== nodeId)
        })

        toast.success('Nó excluído!')
    }

    // Drag and Drop handlers
    const handleDragStart = (e: React.DragEvent, nodeId: string, index: number) => {
        setDraggedNodeId(nodeId)
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/html', e.currentTarget.innerHTML)
        
        // Visual feedback
        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.style.opacity = '0.4'
        }
    }

    const handleDragEnd = (e: React.DragEvent) => {
        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.style.opacity = '1'
        }
        setDraggedNodeId(null)
        setDragOverIndex(null)
    }

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        setDragOverIndex(index)
    }

    const handleDragLeave = () => {
        setDragOverIndex(null)
    }

    const handleDrop = (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault()
        
        if (!selectedWorkflow || !draggedNodeId) return

        const draggedIndex = selectedWorkflow.nodes.findIndex(n => n.id === draggedNodeId)
        
        // Não permitir mover start (sempre primeiro) e end (sempre último)
        const draggedNode = selectedWorkflow.nodes[draggedIndex]
        if (draggedNode.type === 'start' || draggedNode.type === 'end') {
            toast.error('Não é possível mover nós Start ou End')
            setDragOverIndex(null)
            return
        }

        // Não permitir mover para posição do start (0) ou end (último)
        if (dropIndex === 0 || dropIndex === selectedWorkflow.nodes.length - 1) {
            toast.error('Start deve ser primeiro e End deve ser último')
            setDragOverIndex(null)
            return
        }

        if (draggedIndex === dropIndex) {
            setDragOverIndex(null)
            return
        }

        // Reordenar array
        const newNodes = [...selectedWorkflow.nodes]
        const [removed] = newNodes.splice(draggedIndex, 1)
        newNodes.splice(dropIndex, 0, removed)

        setSelectedWorkflow({
            ...selectedWorkflow,
            nodes: newNodes
        })

        setDragOverIndex(null)
        toast.success('Nó reordenado!')
    }

    const getNodeIcon = (type: string) => {
        switch (type) {
            case 'start': return '▶️'
            case 'condition': return '❓'
            case 'action': return '⚡'
            case 'gpt': return '🤖'
            case 'transfer': return '👤'
            case 'end': return '⏹️'
            default: return '📌'
        }
    }

    const getNodeColor = (type: string) => {
        switch (type) {
            case 'start': return 'bg-green-500'
            case 'condition': return 'bg-yellow-500'
            case 'action': return 'bg-blue-500'
            case 'gpt': return 'bg-purple-500'
            case 'transfer': return 'bg-orange-500'
            case 'end': return 'bg-red-500'
            default: return 'bg-gray-500'
                    }
                }

    const getNodeBadgeColor = (type: string) => {
        switch (type) {
            case 'start': return 'bg-green-100 text-green-700 border-green-300'
            case 'condition': return 'bg-yellow-100 text-yellow-700 border-yellow-300'
            case 'action': return 'bg-blue-100 text-blue-700 border-blue-300'
            case 'gpt': return 'bg-purple-100 text-purple-700 border-purple-300'
            case 'transfer': return 'bg-orange-100 text-orange-700 border-orange-300'
            case 'end': return 'bg-red-100 text-red-700 border-red-300'
            default: return 'bg-gray-100 text-gray-700 border-gray-300'
        }
    }

    const getNodeTypeName = (type: string) => {
        switch (type) {
            case 'start': return 'Start'
            case 'condition': return 'Condition'
            case 'action': return 'Action'
            case 'gpt': return 'GPT'
            case 'transfer': return 'Transfer'
            case 'end': return 'End'
            default: return 'Node'
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Carregando workflows...</p>
                </div>
            </div>
        )
    }

    return (
        <>
        <div className="grid grid-cols-12 gap-6 h-[calc(100vh-200px)]">
            {/* Lista de Workflows - Estilo n8n */}
            <div className="col-span-3 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                <div className="flex items-center justify-between p-4 border-b bg-gray-50">
                    <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">Workflows</h3>
                    <button
                        onClick={createNewWorkflow}
                        className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 shadow-sm hover:shadow transition-all"
                        title="New Workflow"
                    >
                        <Plus className="h-4 w-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {workflows.map((workflow) => (
                        <div
                            key={workflow.id}
                            onClick={() => setSelectedWorkflow(workflow)}
                            className={`group p-3 rounded-lg cursor-pointer transition-all ${
                                selectedWorkflow?.id === workflow.id
                                    ? 'bg-blue-50 border-2 border-blue-500 shadow-sm'
                                    : 'bg-white border border-gray-200 hover:border-gray-300 hover:shadow-sm'
                            }`}
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-semibold text-sm text-gray-900 truncate">
                                            {workflow.name}
                                        </span>
                                        {workflow.isActive ? (
                                            <span className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full" title="Active"></span>
                                        ) : (
                                            <span className="flex-shrink-0 w-2 h-2 bg-gray-300 rounded-full" title="Inactive"></span>
                                        )}
                                    </div>
                                    {workflow.description && (
                                        <p className="text-xs text-gray-600 truncate mb-2">{workflow.description}</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                    workflow.trigger === 'intent' ? 'bg-purple-100 text-purple-700' :
                                    workflow.trigger === 'keyword' ? 'bg-blue-100 text-blue-700' :
                                    'bg-gray-100 text-gray-700'
                                }`}>
                                    {workflow.trigger}
                                </span>
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                    <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                                    {workflow.nodes.length} nodes
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Editor de Workflow - Estilo n8n */}
            {selectedWorkflow && (
                <div className="col-span-9 bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col">
                    {/* Header - Estilo n8n */}
                    <div className="p-4 border-b bg-gradient-to-r from-gray-50 to-white">
                        <div className="flex items-center justify-between">
                            <div className="flex-1 max-w-2xl">
                                <input
                                    type="text"
                                    value={selectedWorkflow.name}
                                    onChange={(e) => setSelectedWorkflow({ ...selectedWorkflow, name: e.target.value })}
                                    className="text-2xl font-bold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-400 rounded px-2 w-full"
                                    placeholder="Workflow Name"
                                />
                                <input
                                    type="text"
                                    value={selectedWorkflow.description || ''}
                                    onChange={(e) => setSelectedWorkflow({ ...selectedWorkflow, description: e.target.value })}
                                    placeholder="Add a description..."
                                    className="text-sm text-gray-600 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-400 rounded px-2 mt-2 w-full"
                                />
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                                <button
                                    onClick={testWorkflow}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:shadow-lg transition-all font-medium"
                                >
                                    <Play className="h-4 w-4" />
                                    Test
                                </button>
                                <button
                                    onClick={saveWorkflow}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all font-medium"
                                >
                                    <Save className="h-4 w-4" />
                                    Save
                                </button>
                                <button
                                    onClick={() => deleteWorkflow(selectedWorkflow.id)}
                                    className="p-2.5 bg-white border border-gray-300 text-red-600 rounded-lg hover:bg-red-50 hover:border-red-300 transition-all"
                                    title="Delete Workflow"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Configurações do Trigger - Estilo n8n */}
                    <div className="p-4 border-b bg-gray-50">
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                                    Trigger Type
                                </label>
                                <select
                                    value={selectedWorkflow.trigger}
                                    onChange={(e) => setSelectedWorkflow({ ...selectedWorkflow, trigger: e.target.value as any })}
                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                >
                                    <option value="intent">Intent</option>
                                    <option value="keyword">Keyword</option>
                                    <option value="always">Always</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                                    Trigger Value
                                </label>
                                <input
                                    type="text"
                                    value={selectedWorkflow.triggerValue || ''}
                                    onChange={(e) => setSelectedWorkflow({ ...selectedWorkflow, triggerValue: e.target.value })}
                                    placeholder="e.g., AGENDAR, acupuntura"
                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                                    Status
                                </label>
                        <button
                                    onClick={() => setSelectedWorkflow({ ...selectedWorkflow, isActive: !selectedWorkflow.isActive })}
                                    className={`w-full px-3 py-2.5 rounded-lg font-semibold transition-all ${
                                        selectedWorkflow.isActive
                                            ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-sm'
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    }`}
                                >
                                    {selectedWorkflow.isActive ? '● Active' : '○ Inactive'}
                        </button>
                            </div>
                    </div>
                </div>

                    {/* Canvas - Estilo n8n */}
                    <div className="flex-1 p-6 overflow-auto bg-gradient-to-br from-gray-50 to-gray-100">
                        {/* Botões para adicionar nós - Estilo n8n */}
                        <div className="mb-6 flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-gray-700 mr-2">Add Node:</span>
                            <button
                                onClick={() => addNode('condition')}
                                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:shadow-md hover:border-yellow-400 transition-all text-sm font-medium flex items-center gap-2"
                        >
                                <span className="text-lg">❓</span>
                                Condition
                            </button>
                            <button
                                onClick={() => addNode('action')}
                                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:shadow-md hover:border-blue-400 transition-all text-sm font-medium flex items-center gap-2"
                            >
                                <span className="text-lg">⚡</span>
                                Action
                            </button>
                            <button
                                onClick={() => addNode('gpt')}
                                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:shadow-md hover:border-purple-400 transition-all text-sm font-medium flex items-center gap-2"
                            >
                                <span className="text-lg">🤖</span>
                                GPT
                            </button>
                            <button
                                onClick={() => addNode('transfer')}
                                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:shadow-md hover:border-orange-400 transition-all text-sm font-medium flex items-center gap-2"
                            >
                                <span className="text-lg">👤</span>
                                Transfer
                                            </button>
                                        </div>

                        {/* Workflow Nodes - Estilo n8n */}
                        <div className="space-y-3 max-w-4xl mx-auto">
                            {selectedWorkflow.nodes.map((node, index) => (
                                <div key={node.id} className="relative">
                                    {/* Node Card */}
                                    <div
                                        draggable={node.type !== 'start' && node.type !== 'end'}
                                        onDragStart={(e) => handleDragStart(e, node.id, index)}
                                        onDragEnd={handleDragEnd}
                                        onDragOver={(e) => handleDragOver(e, index)}
                                        onDragLeave={handleDragLeave}
                                        onDrop={(e) => handleDrop(e, index)}
                                        className={`group relative bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-200 overflow-hidden ${
                                            node.type !== 'start' && node.type !== 'end' 
                                                ? 'cursor-move' 
                                                : 'cursor-pointer'
                                        } ${
                                            dragOverIndex === index && draggedNodeId !== node.id
                                                ? 'ring-2 ring-blue-500 ring-offset-2 scale-[1.02]'
                                                : ''
                                        }`}
                                        onClick={() => openNodeEditor(node)}
                                    >
                                        {/* Colored Left Border */}
                                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${getNodeColor(node.type)}`}></div>

                                        <div className="flex items-center p-4 pl-5">
                                            {/* Drag Handle */}
                                            {node.type !== 'start' && node.type !== 'end' && (
                                                <div className="mr-3 flex flex-col gap-1 opacity-30 group-hover:opacity-60 transition-opacity">
                                                    <div className="flex gap-0.5">
                                                        <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                                                        <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                                                    </div>
                                                    <div className="flex gap-0.5">
                                                        <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                                                        <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                                                    </div>
                                                    <div className="flex gap-0.5">
                                                        <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                                                        <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Icon */}
                                            <div className={`flex-shrink-0 w-12 h-12 rounded-lg ${getNodeColor(node.type)} flex items-center justify-center text-2xl shadow-sm`}>
                                                {getNodeIcon(node.type)}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 ml-4 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className="font-semibold text-gray-900 truncate">{node.label}</h4>
                                                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getNodeBadgeColor(node.type)}`}>
                                                        {getNodeTypeName(node.type)}
                                                    </span>
                                                </div>
                                                {node.config?.message && (
                                                    <p className="text-sm text-gray-600 truncate italic">
                                                        "{node.config.message}"
                                                    </p>
                                                )}
                                                {node.config?.actionType && (
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Type: {node.config.actionType}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-2 ml-4">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        openNodeEditor(node)
                                                    }}
                                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                                {node.type !== 'start' && node.type !== 'end' && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            deleteNode(node.id)
                                                        }}
                                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Connection Line */}
                                    {index < selectedWorkflow.nodes.length - 1 && (
                                        <div className="flex justify-center py-3">
                                            <div className="flex flex-col items-center">
                                                <div className="w-0.5 h-6 bg-gray-300"></div>
                                                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Info - Estilo n8n */}
                    <div className="px-6 py-3 border-t bg-gradient-to-r from-blue-50 to-purple-50">
                        <div className="flex items-center justify-center gap-2 text-sm">
                            <span className="text-blue-600 font-medium">💡 Tip:</span>
                            <span className="text-gray-600">Drag nodes to reorder • Click to edit • Double-click for quick config</span>
                        </div>
                    </div>
                                                </div>
                                            )}
        </div>

        {/* Modal de Edição de Nó - Estilo n8n */}
        {showNodeModal && editingNode && (
            <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                    {/* Header - Estilo n8n */}
                    <div className="p-6 border-b bg-gradient-to-r from-gray-50 to-white">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`w-14 h-14 rounded-xl ${getNodeColor(editingNode.type)} flex items-center justify-center text-3xl shadow-lg`}>
                                    {getNodeIcon(editingNode.type)}
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-gray-900">
                                        {getNodeTypeName(editingNode.type)} Node
                                    </h3>
                                    <p className="text-sm text-gray-500 mt-1">Configure node settings</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowNodeModal(false)}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <XCircle className="h-6 w-6" />
                            </button>
                        </div>
                    </div>

                    {/* Body - Scrollable */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {/* Label */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                                Node Label
                            </label>
                                                    <input
                                                        type="text"
                                value={editingNode.label}
                                onChange={(e) => setEditingNode({ ...editingNode, label: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-medium"
                                placeholder="e.g., Ask for Name"
                                                    />
                            <p className="text-xs text-gray-500 mt-1.5">This name will appear on the workflow canvas</p>
                                                </div>

                        {/* Configurações específicas por tipo - Estilo n8n */}
                        {editingNode.type === 'condition' && (
                                                <>
                                <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                                    <h4 className="text-sm font-semibold text-yellow-800 mb-3">Condition Settings</h4>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                                                Field to Evaluate
                                            </label>
                                                        <input
                                                            type="text"
                                                value={editingNode.config?.field || ''}
                                                onChange={(e) => setEditingNode({
                                                    ...editingNode,
                                                    config: { ...editingNode.config, field: e.target.value }
                                                })}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                                                placeholder="e.g., intent, message, patient.insuranceCompany"
                                                        />
                                                    </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                                                Operator
                                            </label>
                                            <select
                                                value={editingNode.config?.operator || 'equals'}
                                                onChange={(e) => setEditingNode({
                                                    ...editingNode,
                                                    config: { ...editingNode.config, operator: e.target.value }
                                                })}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                                            >
                                                <option value="equals">Equals (=)</option>
                                                <option value="contains">Contains</option>
                                                <option value="matches">Regex Match</option>
                                                <option value="greaterThan">Greater than (&gt;)</option>
                                                <option value="lessThan">Less than (&lt;)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                                                Compare Value
                                            </label>
                                                        <input
                                                            type="text"
                                                value={editingNode.config?.value || ''}
                                                onChange={(e) => setEditingNode({
                                                    ...editingNode,
                                                    config: { ...editingNode.config, value: e.target.value }
                                                })}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                                                placeholder="e.g., AGENDAR, acupuntura"
                                                        />
                                        </div>
                                    </div>
                                                    </div>
                                                </>
                                            )}

                        {editingNode.type === 'action' && (
                            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                                <h4 className="text-sm font-semibold text-blue-800 mb-3">Action Settings</h4>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                                            Action Type
                                        </label>
                                        <select
                                            value={editingNode.config?.actionType || 'reply'}
                                            onChange={(e) => setEditingNode({
                                                ...editingNode,
                                                config: { ...editingNode.config, actionType: e.target.value }
                                            })}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                                        >
                                            <option value="reply">Send Message</option>
                                            <option value="collect_data">Collect Data</option>
                                            <option value="save_data">Save Variable</option>
                                            <option value="call_api">Call API</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                                            Message
                                        </label>
                                                    <textarea
                                            value={editingNode.config?.message || ''}
                                            onChange={(e) => setEditingNode({
                                                ...editingNode,
                                                config: { ...editingNode.config, message: e.target.value }
                                            })}
                                            rows={4}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent font-mono text-sm"
                                            placeholder="e.g., What procedure would you like to schedule?"
                                        />
                                        <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                                            <span>💡</span> Use {'{variable}'} to interpolate variables
                                        </p>
                                    </div>
                                    {editingNode.config?.actionType === 'save_data' && (
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                                                Variable Name
                                            </label>
                                            <input
                                                type="text"
                                                value={editingNode.config?.variable || ''}
                                                onChange={(e) => setEditingNode({
                                                    ...editingNode,
                                                    config: { ...editingNode.config, variable: e.target.value }
                                                })}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent font-mono"
                                                placeholder="e.g., selected_procedure"
                                                    />
                                        </div>
                                    )}
                                </div>
                                                </div>
                                            )}

                        {editingNode.type === 'gpt' && (
                            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                                <h4 className="text-sm font-semibold text-purple-800 mb-3">GPT Settings</h4>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                                            GPT Prompt
                                        </label>
                                        <textarea
                                            value={editingNode.config?.prompt || ''}
                                            onChange={(e) => setEditingNode({
                                                ...editingNode,
                                                config: { ...editingNode.config, prompt: e.target.value }
                                            })}
                                            rows={4}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent font-mono text-sm"
                                            placeholder="e.g., Answer the patient's question about procedures"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                                            Model
                                        </label>
                                                        <select
                                            value={editingNode.config?.model || 'gpt-4o-mini'}
                                            onChange={(e) => setEditingNode({
                                                ...editingNode,
                                                config: { ...editingNode.config, model: e.target.value }
                                            })}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                                                        >
                                            <option value="gpt-4o-mini">gpt-4o-mini (faster & cheaper)</option>
                                            <option value="gpt-4o">gpt-4o (more intelligent)</option>
                                                        </select>
                                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                                            Max Tokens
                                        </label>
                                        <input
                                            type="number"
                                            value={editingNode.config?.maxTokens || 250}
                                            onChange={(e) => setEditingNode({
                                                ...editingNode,
                                                config: { ...editingNode.config, maxTokens: parseInt(e.target.value) }
                                            })}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                                            min={50}
                                            max={1000}
                                        />
                                        <p className="text-xs text-gray-500 mt-1.5">Controls response length and cost</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {editingNode.type === 'transfer' && (
                            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                                <h4 className="text-sm font-semibold text-orange-800 mb-3">Transfer Settings</h4>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                                            Target Queue
                                        </label>
                                                        <input
                                                            type="text"
                                            value={editingNode.config?.queue || ''}
                                            onChange={(e) => setEditingNode({
                                                ...editingNode,
                                                config: { ...editingNode.config, queue: e.target.value }
                                            })}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                                            placeholder="e.g., scheduling, supervisor, default"
                                                        />
                                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                                            Transfer Message
                                        </label>
                                        <textarea
                                            value={editingNode.config?.transferMessage || ''}
                                            onChange={(e) => setEditingNode({
                                                ...editingNode,
                                                config: { ...editingNode.config, transferMessage: e.target.value }
                                            })}
                                            rows={3}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                                            placeholder="e.g., I'll transfer you to an agent..."
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {(editingNode.type === 'start' || editingNode.type === 'end') && (
                            <div className="bg-gray-50 rounded-lg p-8 border border-gray-200 text-center">
                                <div className="text-4xl mb-2">{getNodeIcon(editingNode.type)}</div>
                                <p className="text-gray-600 font-medium">No additional settings needed</p>
                                <p className="text-sm text-gray-500 mt-1">This node works automatically</p>
                            </div>
                        )}
                    </div>

                    {/* Footer - Estilo n8n */}
                    <div className="p-6 border-t bg-gray-50 flex items-center justify-end gap-3">
                        <button
                            onClick={() => setShowNodeModal(false)}
                            className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-white hover:shadow-sm transition-all font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={saveNode}
                            className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all font-medium"
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    )
}
