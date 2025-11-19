import React, { useCallback, useMemo, useRef, useState } from 'react'
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
import { Save, X, ZoomIn, ZoomOut, LayoutGrid } from 'lucide-react'

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
    const [edges, setEdges, onEdgesChange] = useEdgesState(edgesToReactFlow(workflow.nodes))
    const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null)
    const [selectedNode, setSelectedNode] = useState<Node | null>(null)

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

    const handleSave = () => {
        const updatedWorkflow = reactFlowToWorkflow(nodes, edges, workflow)
        onSave(updatedWorkflow)
        toast.success('Workflow salvo com sucesso!')
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
                            <div className="font-bold text-gray-900 text-lg">Workflow Editor</div>
                            <div className="text-xs text-gray-500 flex items-center space-x-2">
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">BETA</span>
                                <span>{workflow.name}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3">
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

                    <div className="flex-1 h-full relative" ref={reactFlowWrapper}>
                        <ReactFlow
                            nodes={nodes}
                            edges={edges}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            onConnect={onConnect}
                            onInit={setReactFlowInstance}
                            onDrop={onDrop}
                            onDragOver={onDragOver}
                            onNodeClick={onNodeClick}
                            onPaneClick={onPaneClick}
                            nodeTypes={nodeTypes}
                            fitView
                            attributionPosition="bottom-right"
                            snapToGrid={true}
                            snapGrid={[15, 15]}
                            defaultEdgeOptions={{ type: 'smoothstep', animated: false, style: { strokeWidth: 2, stroke: '#b1b1b7' } }}
                        >
                            <Background color="#f1f5f9" gap={20} size={1} variant={BackgroundVariant.Dots} />
                            <Controls showInteractive={false} className="bg-white shadow-md border border-gray-200 rounded-lg p-1" />
                            <MiniMap
                                nodeStrokeColor="#e2e8f0"
                                nodeColor="#f8fafc"
                                maskColor="rgba(241, 245, 249, 0.7)"
                                className="bg-white shadow-md border border-gray-200 rounded-lg overflow-hidden"
                            />

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
                                                        value={selectedNode.data.text as string || ''}
                                                        onChange={(e) => updateNodeData('text', e.target.value)}
                                                        className="w-full text-sm border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none min-h-[100px]"
                                                        placeholder="Digite a mensagem..."
                                                    />
                                                </div>
                                            )}

                                            {selectedNode.data.type === 'CONDITION' && (
                                                <div className="space-y-1">
                                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Condição</label>
                                                    <input
                                                        type="text"
                                                        value={selectedNode.data.condition as string || ''}
                                                        onChange={(e) => updateNodeData('condition', e.target.value)}
                                                        className="w-full text-sm border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                                        placeholder="ex: continue|end"
                                                    />
                                                    <p className="text-xs text-gray-500">Use | para separar múltiplas saídas.</p>
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
                                                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Prompt</label>
                                                        <input
                                                            type="text"
                                                            value={selectedNode.data.prompt as string || ''}
                                                            onChange={(e) => updateNodeData('prompt', e.target.value)}
                                                            className="w-full text-sm border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                                        />
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
