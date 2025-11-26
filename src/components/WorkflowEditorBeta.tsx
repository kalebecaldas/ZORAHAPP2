import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react'
import {
    ReactFlow,
    ReactFlowProvider,
    addEdge,
    useNodesState,
    useEdgesState,
    Controls,
    Background,
    MiniMap,
    Connection,
    Edge,
    Node,
    ReactFlowInstance,
    BackgroundVariant,
    Panel
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { toast } from 'sonner'
import { Save, X, ZoomIn, ZoomOut, LayoutGrid, Play, Pause, CheckCircle2, AlertCircle } from 'lucide-react'
import { io } from 'socket.io-client'
import { api } from '../lib/utils'

import CustomNode from './workflow/CustomNode'
import WorkflowSidebar from './workflow/WorkflowSidebar'
import {
    nodesToReactFlow,
    edgesToReactFlow,
    reactFlowToWorkflow,
    BackendWorkflow,
    NodeType,
    getDefaultPorts,
    getConditionPorts,
    BackendNode
} from '../utils/workflowUtils'

interface WorkflowEditorBetaProps {
    workflow: BackendWorkflow
    onSave: (workflow: BackendWorkflow) => void
    onCancel: () => void
}

const nodeTypes = {
    custom: CustomNode,
}

const WorkflowEditorContent: React.FC<WorkflowEditorBetaProps> = ({ workflow, onSave, onCancel }) => {
    const reactFlowWrapper = useRef<HTMLDivElement>(null)
    const [nodes, setNodes, onNodesChange] = useNodesState(nodesToReactFlow(workflow.nodes))
    const [edges, setEdges, onEdgesChange] = useEdgesState(edgesToReactFlow(workflow.nodes, workflow.edges))
    const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null)
    const [selectedNode, setSelectedNode] = useState<Node | null>(null)
    const [isActive, setIsActive] = useState(workflow.isActive || false)
    const [toggling, setToggling] = useState(false)

    // Atualizar isActive quando workflow mudar
    useEffect(() => {
        setIsActive(workflow.isActive || false)
    }, [workflow.isActive, workflow.id])

    // Sempre que o workflow mudar (ex.: usuário abre outro fluxo), sincronizamos
    // novamente os nodes e edges do React Flow para refletir o backend.
    useEffect(() => {
        console.log('🔄 WorkflowEditorBeta - Sincronizando workflow')
        console.log('   Workflow ID:', workflow.id)
        console.log('   Backend nodes:', workflow.nodes?.length || 0)
        console.log('   Backend edges:', workflow.edges?.length || 0)
        
        const convertedNodes = nodesToReactFlow(workflow.nodes)
        const convertedEdges = edgesToReactFlow(workflow.nodes, workflow.edges)
        
        console.log('   ReactFlow nodes:', convertedNodes.length)
        console.log('   ReactFlow edges:', convertedEdges.length)
        
        // Log detalhado das edges convertidas
        convertedEdges.forEach((edge, idx) => {
            console.log(`   Edge ${idx + 1}: ${edge.source}[${edge.sourceHandle}] → ${edge.target}`)
        })
        
        setNodes(convertedNodes)
        setEdges(convertedEdges)
        
        // Forçar re-renderização após um pequeno delay para garantir que o ReactFlow processe
        setTimeout(() => {
            console.log('✅ Edges aplicadas no estado:', convertedEdges.length)
            // Forçar atualização do ReactFlow se disponível
            if (reactFlowInstance) {
                reactFlowInstance.fitView({ padding: 0.2, duration: 0 })
            }
        }, 100)
    }, [workflow, setNodes, setEdges, reactFlowInstance])

    // Listen to realtime updates and refresh this editor if the same workflow is updated/synced
    useEffect(() => {
        const base = (import.meta as any).env?.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001')
        const socket = io(base, { path: '/socket.io', transports: ['websocket','polling'] })
        const reload = async (wfId: string) => {
            if (!wfId || wfId !== workflow.id) return
            try {
                const resp = await api.get(`/api/workflows/${wfId}`)
                const loaded = resp.data
                const cfg = typeof loaded.config === 'string' ? JSON.parse(loaded.config) : (loaded.config || {})
                const nodes = (cfg.nodes || []).map((n: any) => ({ id: n.id, type: n.type, content: n.data || n.content || {}, position: n.position || { x:0,y:0 }, connections: [] }))
                const backendEdges = cfg.edges || []
                const convertedEdges = backendEdges.map((e: any) => ({ id: e.id || `${e.source}_${e.target}`, source: e.source, target: e.target, data: { port: e.data?.port || e.port || 'main', condition: e.data?.condition || e.condition }, type: e.type || 'smoothstep', animated: e.animated || false }))
                setNodes(nodesToReactFlow(nodes))
                setEdges(edgesToReactFlow(nodes, convertedEdges))
            } catch (e) {
                console.warn('⚠️ Falha ao recarregar workflow atualizado', e)
            }
        }
        socket.on('workflow:updated', (data: any) => reload(String(data?.id || '')))
        socket.on('workflow:synced', (data: any) => reload(String(data?.id || '')))
        return () => { socket.disconnect() }
    }, [workflow.id, setNodes, setEdges])

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge({ ...params, type: 'smoothstep', animated: false }, eds)),
        [setEdges],
    )

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
    }, [])

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault()

            const type = event.dataTransfer.getData('application/reactflow') as NodeType
            if (typeof type === 'undefined' || !type) {
                return
            }

            const position = reactFlowInstance?.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            }) || { x: 0, y: 0 }

            const newNode: Node = {
                id: `node-${Date.now()}`,
                type: 'custom',
                position,
                data: {
                    label: type,
                    type: type,
                    ports: type === 'CONDITION' ? getConditionPorts() : getDefaultPorts(),
                    // Default content initialization
                    text: type === 'MESSAGE' ? 'Nova mensagem' : undefined,
                    condition: type === 'CONDITION' ? 'continue|end' : undefined
                },
            }

            setNodes((nds) => nds.concat(newNode))
        },
        [reactFlowInstance, setNodes],
    )

    const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
        setSelectedNode(node)
    }, [])

    const onPaneClick = useCallback(() => {
        setSelectedNode(null)
    }, [])
    
    const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
        event.stopPropagation()
        if (confirm('Deseja remover esta conexão?')) {
            setEdges((edges) => edges.filter((e) => e.id !== edge.id))
        }
    }, [setEdges])

    const handleSave = () => {
        const updatedWorkflow = reactFlowToWorkflow(nodes, edges, workflow)
        updatedWorkflow.isActive = isActive
        onSave(updatedWorkflow)
        toast.success('Workflow salvo com sucesso!')
    }

    const handleToggleActive = async () => {
        if (!workflow.id) {
            toast.error('Salve o workflow primeiro antes de ativá-lo')
            return
        }
        
        try {
            setToggling(true)
            // Usar endpoint toggle se disponível
            try {
                await api.patch(`/api/workflows/${workflow.id}/toggle`)
            } catch {
                // Fallback para PUT se toggle não existir
                await api.put(`/api/workflows/${workflow.id}`, {
                    ...workflow,
                    isActive: !isActive
                })
            }
            setIsActive(!isActive)
            toast.success(`Workflow ${!isActive ? 'ativado' : 'desativado'} com sucesso!`)
        } catch (error: any) {
            console.error('Erro ao atualizar status:', error)
            toast.error(`Erro ao ${!isActive ? 'ativar' : 'desativar'} workflow: ${error.response?.data?.error || error.message}`)
        } finally {
            setToggling(false)
        }
    }

    const updateNodeData = (key: string, value: any) => {
        if (!selectedNode) return

        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === selectedNode.id) {
                    const newData = { ...node.data, [key]: value }

                    // Special handling for condition ports update
                    if (key === 'condition' && node.data.type === 'CONDITION') {
                        newData.ports = getConditionPorts(value)
                    }

                    return {
                        ...node,
                        data: newData,
                    }
                }
                return node
            })
        )

        // Update selected node reference to reflect changes immediately in UI
        setSelectedNode((prev) => prev ? { ...prev, data: { ...prev.data, [key]: value } } : null)
    }

    return (
        <div className="flex h-screen bg-gray-50">
            <div className="flex flex-col w-full h-full">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b bg-white shadow-sm z-10">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <LayoutGrid className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                            <div className="font-bold text-gray-900 text-lg flex items-center gap-2">
                                Workflow Editor
                                {isActive && (
                                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full flex items-center gap-1.5 border border-green-200">
                                        <div className="h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse"></div>
                                        ATIVO
                                    </span>
                                )}
                            </div>
                            <div className="text-xs text-gray-500 flex items-center space-x-2">
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">BETA</span>
                                <span>{workflow.name}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3">
                        {workflow.id && (
                            <button
                                onClick={handleToggleActive}
                                disabled={toggling}
                                className={`px-4 py-2 rounded-lg shadow-sm flex items-center space-x-2 transition-colors font-medium ${
                                    isActive
                                        ? 'bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200'
                                        : 'bg-green-50 hover:bg-green-100 text-green-700 border border-green-200'
                                } ${toggling ? 'opacity-50 cursor-not-allowed' : ''}`}
                                title={isActive ? 'Desativar workflow' : 'Ativar workflow'}
                            >
                                {isActive ? (
                                    <>
                                        <Pause className="h-4 w-4" />
                                        <span>Desativar</span>
                                    </>
                                ) : (
                                    <>
                                        <Play className="h-4 w-4" />
                                        <span>Ativar</span>
                                    </>
                                )}
                            </button>
                        )}
                        <button
                            onClick={handleSave}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm flex items-center space-x-2 transition-colors font-medium"
                        >
                            <Save className="h-4 w-4" />
                            <span>Salvar Fluxo</span>
                        </button>
                        <button
                            onClick={onCancel}
                            className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg shadow-sm flex items-center space-x-2 transition-colors font-medium"
                        >
                            <X className="h-4 w-4" />
                            <span>Fechar</span>
                        </button>
                    </div>
                </div>

                <div className="flex flex-1 h-full overflow-hidden">
                    <WorkflowSidebar />

                    <div className="flex-1 h-full relative overflow-visible" ref={reactFlowWrapper} style={{ zIndex: 0 }}>
                        <style>{`
                            .react-flow__edge.selected .react-flow__edge-path {
                                stroke: #ef4444 !important;
                                stroke-width: 4px !important;
                            }
                            .react-flow__edge:hover .react-flow__edge-path {
                                stroke: #3b82f6 !important;
                                stroke-width: 4px !important;
                            }
                            .react-flow__edge .react-flow__edge-path {
                                cursor: pointer;
                            }
                        `}</style>
                        <ReactFlow
                            nodes={nodes}
                            edges={edges}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            onConnect={onConnect}
                            onInit={(instance) => {
                                setReactFlowInstance(instance)
                                // Forçar fitView após inicialização
                                setTimeout(() => {
                                    instance.fitView({ padding: 0.2, duration: 0 })
                                }, 100)
                            }}
                            onDrop={onDrop}
                            onDragOver={onDragOver}
                            onNodeClick={onNodeClick}
                            onPaneClick={onPaneClick}
                            onEdgeClick={onEdgeClick}
                            nodeTypes={nodeTypes}
                            deleteKeyCode="Delete" // Permite deletar com tecla Delete
                            fitView
                            fitViewOptions={{ padding: 0.2 }}
                            attributionPosition="bottom-right"
                            snapToGrid={true}
                            snapGrid={[15, 15]}
                            defaultEdgeOptions={{ 
                                type: 'smoothstep',
                                animated: false,
                                style: { 
                                    strokeWidth: 3, 
                                    stroke: '#64748b',
                                    pointerEvents: 'stroke', // Permite clicar nas edges
                                    cursor: 'pointer'
                                },
                                markerEnd: {
                                    type: 'arrowclosed',
                                    color: '#64748b',
                                    width: 20,
                                    height: 20
                                }
                            }}
                            edgesReconnectable={true} // Permite reconectar edges
                            edgesFocusable={true} // Permite focar nas edges
                            selectNodesOnDrag={false} // Não seleciona nós ao arrastar
                            connectionLineStyle={{
                                strokeWidth: 3,
                                stroke: '#3b82f6'
                            }}
                            proOptions={{ hideAttribution: true }}
                            elevateEdgesOnSelect={true}
                            elevateNodesOnSelect={false}
                        >
                            <Background color="#f1f5f9" gap={20} size={1} variant={BackgroundVariant.Dots} />
                            <Controls showInteractive={false} className="bg-white shadow-md border border-gray-200 rounded-lg p-1" />
                            <MiniMap
                                nodeStrokeColor="#e2e8f0"
                                nodeColor="#f8fafc"
                                maskColor="rgba(241, 245, 249, 0.7)"
                                className="bg-white shadow-md border border-gray-200 rounded-lg overflow-hidden"
                            />
                            
                            {/* Help Panel */}
                            <Panel position="bottom-left" className="m-4">
                                <div className="bg-white rounded-lg shadow-md border border-gray-200 p-3 max-w-xs">
                                    <div className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                                        <AlertCircle className="w-4 h-4 text-blue-600" />
                                        Atalhos e Dicas
                                    </div>
                                    <div className="space-y-1.5 text-xs text-gray-600">
                                        <div className="flex items-center gap-2">
                                            <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-[10px] font-mono">Delete</kbd>
                                            <span>Deletar nó/conexão selecionada</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 bg-red-600 rounded"></div>
                                            <span>Botão lixeira no nó</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-0.5 bg-blue-500"></div>
                                            <span>Clique na conexão para deletar</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 bg-gray-300 border-2 border-gray-600 rounded-full"></div>
                                            <span>Arraste das bolinhas para conectar</span>
                                        </div>
                                    </div>
                                </div>
                            </Panel>

                            {/* Properties Panel */}
                            {selectedNode && (
                                <Panel position="top-right" className="m-4">
                                    <div className="w-80 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden flex flex-col max-h-[calc(100vh-120px)]">
                                        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                                            <h3 className="font-semibold text-gray-900">Propriedades</h3>
                                            <button onClick={() => setSelectedNode(null)} className="text-gray-400 hover:text-gray-600">
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>

                                        <div className="p-4 overflow-y-auto space-y-4">
                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">ID do Nó</label>
                                                <div className="text-sm font-mono bg-gray-50 p-2 rounded border border-gray-200 text-gray-600 truncate">
                                                    {selectedNode.id}
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tipo</label>
                                                <div className="text-sm font-medium text-gray-900">
                                                    {(selectedNode.data.type as string).replace('_', ' ')}
                                                </div>
                                            </div>

                                            {/* Dynamic Fields based on Node Type */}
                                            {(selectedNode.data.type === 'MESSAGE' || selectedNode.data.type === 'START') && (
                                                <div className="space-y-1">
                                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Mensagem</label>
                                                    <textarea
                                                        value={(selectedNode.data.message as string) || (selectedNode.data.text as string) || (selectedNode.data.welcomeMessage as string) || ''}
                                                        onChange={(e) => {
                                                            // Atualizar todos os campos possíveis
                                                            const value = e.target.value
                                                            if (selectedNode.data.message !== undefined) updateNodeData('message', value)
                                                            else if (selectedNode.data.welcomeMessage !== undefined) updateNodeData('welcomeMessage', value)
                                                            else updateNodeData('text', value)
                                                        }}
                                                        className="w-full text-sm border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none min-h-[100px]"
                                                        placeholder="Digite a mensagem..."
                                                    />
                                                </div>
                                            )}

                                            {selectedNode.data.type === 'CONDITION' && (
                                                <div className="space-y-3">
                                                    <div className="space-y-1">
                                                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Condição</label>
                                                        <input
                                                            type="text"
                                                            value={selectedNode.data.condition as string || ''}
                                                            onChange={(e) => updateNodeData('condition', e.target.value)}
                                                            className="w-full text-sm border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                                            placeholder="ex: sim|confirmar|ok|correto|yes|está certo"
                                                        />
                                                        <p className="text-xs text-gray-500">Use | para separar múltiplas saídas.</p>
                                                    </div>
                                                    
                                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                                                        <div className="text-xs font-semibold text-blue-900 uppercase tracking-wide flex items-center gap-1">
                                                            <AlertCircle className="w-3.5 h-3.5" />
                                                            Portas de Saída
                                                        </div>
                                                        <div className="space-y-1.5 text-xs">
                                                            {((selectedNode.data.condition as string) || '').split('|').filter(Boolean).map((cond: string, idx: number) => (
                                                                <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded border border-blue-200">
                                                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                                                    <span className="font-mono text-gray-700">{cond.trim()}</span>
                                                                </div>
                                                            ))}
                                                            {((selectedNode.data.condition as string) || '').split('|').length === 0 && (
                                                                <div className="text-gray-500 italic text-center py-2">Nenhuma porta configurada</div>
                                                            )}
                                                        </div>
                                                        <div className="pt-2 border-t border-blue-200 text-xs text-blue-700">
                                                            💡 <strong>Dica:</strong> Cada palavra separada por | cria uma saída diferente. A mensagem do usuário será comparada com essas palavras para decidir qual caminho seguir.
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                                        <div className="text-xs font-semibold text-amber-900 uppercase tracking-wide mb-2">Exemplos de Uso</div>
                                                        <div className="space-y-2 text-xs text-amber-800">
                                                            <div>
                                                                <div className="font-mono bg-white p-1.5 rounded border border-amber-200 mb-1">sim|yes|confirmar|ok</div>
                                                                <div className="text-gray-600">→ Aceita múltiplas formas de confirmação</div>
                                                            </div>
                                                            <div>
                                                                <div className="font-mono bg-white p-1.5 rounded border border-amber-200 mb-1">1|2|3</div>
                                                                <div className="text-gray-600">→ Aceita números como opções</div>
                                                            </div>
                                                            <div>
                                                                <div className="font-mono bg-white p-1.5 rounded border border-amber-200 mb-1">vieiralves|são josé</div>
                                                                <div className="text-gray-600">→ Aceita nomes específicos</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {selectedNode.data.type === 'API_CALL' && (
                                                <>
                                                    <div className="space-y-1">
                                                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Endpoint</label>
                                                        <input
                                                            type="text"
                                                            value={selectedNode.data.endpoint as string || ''}
                                                            onChange={(e) => updateNodeData('endpoint', e.target.value)}
                                                            className="w-full text-sm border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Mensagem de Carregamento</label>
                                                        <input
                                                            type="text"
                                                            value={selectedNode.data.message as string || ''}
                                                            onChange={(e) => updateNodeData('message', e.target.value)}
                                                            className="w-full text-sm border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                                        />
                                                    </div>
                                                </>
                                            )}

                                            {selectedNode.data.type === 'GPT_RESPONSE' && (
                                                <div className="space-y-1">
                                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Prompt do Sistema</label>
                                                    <textarea
                                                        value={selectedNode.data.systemPrompt as string || ''}
                                                        onChange={(e) => updateNodeData('systemPrompt', e.target.value)}
                                                        className="w-full text-sm border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none min-h-[100px]"
                                                    />
                                                </div>
                                            )}

                                            {selectedNode.data.type === 'DATA_COLLECTION' && (
                                                <>
                                                    <div className="space-y-1">
                                                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Campo</label>
                                                        <select
                                                            value={selectedNode.data.field as string || ''}
                                                            onChange={(e) => updateNodeData('field', e.target.value)}
                                                            className="w-full text-sm border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                                        >
                                                            <option value="phone">Telefone</option>
                                                            <option value="name">Nome</option>
                                                            <option value="cpf">CPF</option>
                                                            <option value="email">Email</option>
                                                            <option value="birth_date">Nascimento</option>
                                                            <option value="address">Endereço</option>
                                                            <option value="insurance">Convênio</option>
                                                            <option value="insurance_number">Carteirinha</option>
                                                            <option value="procedure">Procedimento</option>
                                                            <option value="preferred_date">Data</option>
                                                            <option value="preferred_shift">Turno</option>
                                                        </select>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Mensagem/Prompt</label>
                                                        <textarea
                                                            value={(selectedNode.data.prompt as string) || (selectedNode.data.message as string) || ''}
                                                            onChange={(e) => {
                                                                // Salvar em ambos os campos para compatibilidade
                                                                const value = e.target.value;
                                                                updateNodeData('prompt', value);
                                                                updateNodeData('message', value);
                                                            }}
                                                            className="w-full text-sm border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none min-h-[80px]"
                                                            placeholder="Digite a mensagem que será enviada ao usuário pedindo este dado..."
                                                        />
                                                        <p className="text-xs text-gray-500">Esta mensagem será enviada ao usuário quando o bot precisar coletar este campo.</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Mensagem de Erro (Opcional)</label>
                                                        <textarea
                                                            value={(selectedNode.data.errorMessage as string) || ''}
                                                            onChange={(e) => updateNodeData('errorMessage', e.target.value)}
                                                            className="w-full text-sm border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none min-h-[60px]"
                                                            placeholder="Mensagem personalizada de erro (deixe vazio para usar mensagem padrão)..."
                                                        />
                                                        <p className="text-xs text-gray-500">Se preenchido, esta mensagem será usada quando o dado for inválido. Caso contrário, será usada uma mensagem padrão baseada no tipo de campo.</p>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </Panel>
                            )}
                        </ReactFlow>
                    </div>
                </div>
            </div>
        </div>
    )
}

export const WorkflowEditorBeta: React.FC<WorkflowEditorBetaProps> = (props) => {
    return (
        <ReactFlowProvider>
            <WorkflowEditorContent {...props} />
        </ReactFlowProvider>
    )
}
