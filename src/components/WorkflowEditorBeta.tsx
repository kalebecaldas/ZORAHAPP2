import React, { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  Play,
  MessageSquare,
  AlertCircle,
  Settings,
  Bot,
  ClipboardList,
  Users,
  Clock,
  CheckCircle,
  Link2,
  Webhook as WebhookIcon,
  Search,
  Save,
  X,
  ZoomIn,
  ZoomOut,
  Grid3X3,
  LayoutGrid
} from 'lucide-react'

type NodeType = 'START' | 'MESSAGE' | 'CONDITION' | 'ACTION' | 'GPT_RESPONSE' | 'DATA_COLLECTION' | 'TRANSFER_HUMAN' | 'DELAY' | 'END' | 'WEBHOOK' | 'API_CALL' | 'COLLECT_INFO'

type Position = { x: number; y: number }
type Port = { id: string; label: string; type: 'input' | 'output'; position: 'top' | 'bottom' }
type WfConnection = { id: string; source: string; sourcePort: string; target: string; targetPort: string; condition?: string }
type EditorEdge = { id: string; source: string; target: string; data: { port: string; condition?: string } }

interface WorkflowNode {
  id: string
  type: NodeType
  content: {
    text?: string
    condition?: string
    action?: string
    options?: string[]
    systemPrompt?: string
    field?: string
    fields?: string[]
    prompt?: string
    delay?: number
    finalMessage?: string
    url?: string
    method?: string
    headers?: Record<string, string>
    body?: unknown
    endpoint?: string
    message?: string
    ports?: Port[]
  }
  position: Position
  ports?: Port[]
  connections?: Array<string | { targetId: string; condition?: string; port?: string }>
}

interface WorkflowEditorBetaProps {
  workflow: {
    id?: string
    name: string
    description: string
    nodes: WorkflowNode[]
    isActive?: boolean
  }
  onSave: (workflow: { name?: string; description?: string; nodes: WorkflowNode[]; edges?: unknown; isActive?: boolean }) => void
  onCancel: () => void
}

const iconMap: Record<NodeType, React.ComponentType<{ className?: string }>> = {
  START: Play,
  MESSAGE: MessageSquare,
  CONDITION: AlertCircle,
  ACTION: Settings,
  GPT_RESPONSE: Bot,
  DATA_COLLECTION: ClipboardList,
  COLLECT_INFO: ClipboardList,
  TRANSFER_HUMAN: Users,
  DELAY: Clock,
  END: CheckCircle,
  WEBHOOK: WebhookIcon,
  API_CALL: Link2
}

const colorMap: Record<NodeType, string> = {
  START: 'bg-green-600',
  MESSAGE: 'bg-blue-600',
  CONDITION: 'bg-yellow-600',
  ACTION: 'bg-purple-600',
  GPT_RESPONSE: 'bg-indigo-600',
  DATA_COLLECTION: 'bg-teal-600',
  COLLECT_INFO: 'bg-teal-700',
  TRANSFER_HUMAN: 'bg-red-600',
  DELAY: 'bg-gray-600',
  END: 'bg-green-700',
  WEBHOOK: 'bg-pink-600',
  API_CALL: 'bg-orange-600'
}

const palette: { type: NodeType; label: string; description: string }[] = [
  { type: 'START', label: 'Início', description: 'Entrada do fluxo' },
  { type: 'MESSAGE', label: 'Mensagem', description: 'Envio de texto' },
  { type: 'CONDITION', label: 'Condição', description: 'Ramificação' },
  { type: 'GPT_RESPONSE', label: 'IA', description: 'Resposta por IA' },
  { type: 'API_CALL', label: 'API', description: 'Consulta interna' },
  { type: 'DATA_COLLECTION', label: 'Coleta', description: 'Um campo' },
  { type: 'COLLECT_INFO', label: 'Coleta múltipla', description: 'Vários campos' },
  { type: 'TRANSFER_HUMAN', label: 'Humano', description: 'Transferência' },
  { type: 'DELAY', label: 'Delay', description: 'Aguardar' },
  { type: 'END', label: 'Fim', description: 'Encerrar' },
  { type: 'WEBHOOK', label: 'Webhook', description: 'Chamar URL' },
  { type: 'ACTION', label: 'Ação', description: 'Executar ação' }
]

const getDefaultPorts = (): Port[] => [
  { id: 'input', label: 'Entrada', type: 'input', position: 'top' },
  { id: 'main', label: 'Saída', type: 'output', position: 'bottom' }
]

const getConditionPorts = (cond?: string): Port[] => {
  const base: Port[] = [{ id: 'input', label: 'Entrada', type: 'input', position: 'top' }]
  const c = (cond || '').toLowerCase()
  if (c === 'clinic_selection') {
    return [...base, { id: 'true', label: 'Verdadeiro', type: 'output', position: 'bottom' }, { id: 'false', label: 'Falso', type: 'output', position: 'bottom' }]
  }
  if (c === 'service_selection') {
    return [...base,
      { id: '1', label: '1', type: 'output', position: 'bottom' },
      { id: '2', label: '2', type: 'output', position: 'bottom' },
      { id: '3', label: '3', type: 'output', position: 'bottom' },
      { id: '4', label: '4', type: 'output', position: 'bottom' },
      { id: '5', label: '5', type: 'output', position: 'bottom' }
    ]
  }
  if (c.includes('|')) {
    const tokens = c.split('|').map(s => s.trim()).filter(Boolean)
    return [...base, ...tokens.map(t => ({ id: t, label: t, type: 'output' as const, position: 'bottom' as const }))]
  }
  return [...base, { id: 'output', label: 'Saída', type: 'output', position: 'bottom' }]
}

const getDefaultContent = (nodeType: NodeType) => {
  switch (nodeType) {
    case 'START':
      return { text: 'Início do fluxo', ports: getDefaultPorts() }
    case 'MESSAGE':
      return { text: 'Mensagem ao usuário', ports: getDefaultPorts() }
    case 'CONDITION':
      return { condition: 'continue|end', ports: getConditionPorts('continue|end') }
    case 'GPT_RESPONSE':
      return { systemPrompt: 'Você é um assistente de agendamentos', ports: getDefaultPorts() }
    case 'API_CALL':
      return { endpoint: 'get_clinic_procedures', message: 'Buscando informações...', ports: getDefaultPorts() }
    case 'DATA_COLLECTION':
      return { field: 'phone', prompt: 'Informe seu telefone', ports: getDefaultPorts() }
    case 'COLLECT_INFO':
      return {
        fields: ['name','cpf','birth_date','phone','email','address','insurance','insurance_number','preferences','procedure_type','preferred_date','preferred_shift'],
        message: 'Coletando informações...',
        ports: getDefaultPorts()
      }
    case 'TRANSFER_HUMAN':
      return { finalMessage: 'Transferindo...', ports: getDefaultPorts() }
    case 'DELAY':
      return { delay: 1, ports: getDefaultPorts() }
    case 'END':
      return { finalMessage: 'Encerrando', ports: getDefaultPorts() }
    case 'WEBHOOK':
      return { url: '', method: 'POST', headers: {}, body: {}, ports: getDefaultPorts() }
    case 'ACTION':
      return { action: 'schedule', ports: getDefaultPorts() }
  }
}

export const WorkflowEditorBeta: React.FC<WorkflowEditorBetaProps> = ({ workflow, onSave, onCancel }) => {
  const [nodes, setNodes] = useState<WorkflowNode[]>(workflow.nodes || [])
  const [connections, setConnections] = useState<WfConnection[]>([])
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null)
  const [showProperties, setShowProperties] = useState(false)
  const [nodeSearch, setNodeSearch] = useState('')
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [draggedNode, setDraggedNode] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [showPalette, setShowPalette] = useState(true)
  const canvasRef = useRef<HTMLDivElement>(null)
  const NODE_WIDTH = 240
  const NODE_HEIGHT = 120

  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const handler = (ev: WheelEvent) => {
      ev.preventDefault()
      const delta = ev.deltaY > 0 ? -0.1 : 0.1
      setZoom(prev => Math.min(2, Math.max(0.4, prev + delta)))
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => {
      el.removeEventListener('wheel', handler)
    }
  }, [])

  useEffect(() => {
    const initialized = (workflow.nodes || []).map(n => ({
      ...n,
      content: {
        ...n.content,
        ports: n.type === 'CONDITION' ? (n.content?.ports || getConditionPorts(n.content?.condition)) : (n.content?.ports || getDefaultPorts())
      }
    }))
    setNodes(initialized);
    const initialConnections = [] as WfConnection[]
    (workflow.nodes || []).forEach((n: WorkflowNode) => {
      const conns: Array<string | { targetId: string; condition?: string; port?: string }> = Array.isArray(n.connections) ? n.connections : []
      conns.forEach((c: string | { targetId: string; condition?: string; port?: string }, idx: number) => {
        const targetId = typeof c === 'string' ? c : c?.targetId
        const condition = typeof c === 'string' ? undefined : c?.condition
        const sourcePort = typeof c === 'string' ? 'main' : (c?.port || 'main')
        if (targetId) {
          initialConnections.push({ id: `conn-${n.id}-${targetId}-${idx}`, source: n.id, sourcePort, target: targetId, targetPort: 'input', condition })
        }
      })
    })
    setConnections(initialConnections)
  }, [workflow.nodes])

  const addNode = (nodeType: NodeType) => {
    const id = `node-${Date.now()}-${Math.floor(Math.random()*1000)}`
    const newNode: WorkflowNode = {
      id,
      type: nodeType,
      content: getDefaultContent(nodeType),
      position: { x: 120 + Math.random()*240, y: 120 + Math.random()*240 }
    }
    setNodes(prev => [...prev, newNode])
  }

  const updateNodeContent = (nodeId: string, content: Partial<WorkflowNode['content']>) => {
    setNodes(nodes.map(n => {
      if (n.id !== nodeId) return n
      const next = { ...n.content, ...content }
      if (n.type === 'CONDITION' && Object.prototype.hasOwnProperty.call(content, 'condition')) {
        const cond = String((content as Partial<WorkflowNode['content']>).condition ?? '')
        next.ports = getConditionPorts(cond)
      }
      return { ...n, content: next }
    }))
  }

  const startPan = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    setIsPanning(true)
    const rect = canvasRef.current?.getBoundingClientRect()
    const left = rect?.left ?? 0
    const top = rect?.top ?? 0
    setDragOffset({ x: e.clientX - left - pan.x, y: e.clientY - top - pan.y })
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPanning) {
      const rect = canvasRef.current?.getBoundingClientRect()
      const left = rect?.left ?? 0
      const top = rect?.top ?? 0
      setPan({ x: e.clientX - left - dragOffset.x, y: e.clientY - top - dragOffset.y })
    }
  }

  const handleMouseUp = () => {
    setIsPanning(false)
    setDraggedNode(null)
  }

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setZoom(prev => Math.min(2, Math.max(0.4, prev + delta)))
  }

  const handleNodeMouseDown = (e: React.MouseEvent<HTMLDivElement>, nodeId: string) => {
    e.stopPropagation()
    const node = nodes.find(n => n.id === nodeId)
    if (!node) return
    const rect = canvasRef.current?.getBoundingClientRect()
    setDraggedNode(nodeId)
    const left = rect?.left ?? 0
    const top = rect?.top ?? 0
    setDragOffset({ x: e.clientX - left - node.position.x, y: e.clientY - top - node.position.y })
  }

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggedNode) return
    const rect = canvasRef.current?.getBoundingClientRect()
    const left = rect?.left ?? 0
    const top = rect?.top ?? 0
    setNodes(prev => prev.map(n => n.id === draggedNode ? { ...n, position: { x: e.clientX - left - dragOffset.x, y: e.clientY - top - dragOffset.y } } : n))
  }

  const [connectionStart, setConnectionStart] = useState<{ nodeId: string; portId: string; portType: 'input' | 'output' } | null>(null)
  

  const startConnection = (nodeId: string, portId: string, portType: 'input' | 'output') => {
    setConnectionStart({ nodeId, portId, portType })
  }

  const completeConnection = (nodeId: string, portId: string) => {
    if (!connectionStart) return
    if (connectionStart.nodeId === nodeId) { setConnectionStart(null); return }
    const sourceNodeId = connectionStart.portType === 'output' ? connectionStart.nodeId : nodeId
    const targetNodeId = connectionStart.portType === 'output' ? nodeId : connectionStart.nodeId
    const sourcePort = connectionStart.portType === 'output' ? connectionStart.portId : portId
    const targetPort = connectionStart.portType === 'output' ? portId : connectionStart.portId
    const newConn: WfConnection = { id: `conn-${sourceNodeId}-${targetNodeId}-${Date.now()}`, source: sourceNodeId, sourcePort, target: targetNodeId, targetPort }
    setConnections(prev => [...prev, newConn])
    setConnectionStart(null)
  }

  const buildEdgesFromConnections = (connectionsSource: WfConnection[], nodesList: WorkflowNode[]) => {
    const edges: EditorEdge[] = []
    nodesList.forEach(n => {
      connectionsSource.filter(c => c.source === n.id).forEach((conn, idx) => {
        const edge: EditorEdge = { id: `e_${n.id}_${conn.target}_${idx}`, source: n.id, target: conn.target, data: { port: conn.sourcePort } }
        if (conn.condition) edge.data.condition = conn.condition
        edges.push(edge)
      })
    })
    return edges
  }

  const saveWorkflow = () => {
    if (nodes.length === 0) { toast.error('Adicione nós'); return }
    const startNode = nodes.find(n => n.type === 'START')
    const endNode = nodes.find(n => n.type === 'END')
    if (!startNode || !endNode) { toast.error('Inclua Início e Fim'); return }

    const continueNode = nodes.find(n => n.type === 'CONDITION' && String(n.content?.condition || '').toLowerCase() === 'continue|end')
    const selectNode = nodes.find(n => n.type === 'CONDITION' && String(n.content?.condition || '').toLowerCase() === '1|2|3|4|5')
    const menuNode = selectNode ? nodes.find(m => m.type === 'MESSAGE' && connections.some(c => c.source === m.id && c.target === selectNode.id)) : undefined

    const nextConnections: WfConnection[] = [...connections]
    const outgoing = (id: string) => nextConnections.filter(c => c.source === id)
    const ensureConn = (sourceId: string, toId?: string, port = 'main') => {
      if (!toId) return
      const exists = nextConnections.some(c => c.source === sourceId && c.target === toId && c.sourcePort === port)
      if (!exists) {
        nextConnections.push({ id: `conn-${sourceId}-${toId}-${Date.now()}`, source: sourceId, sourcePort: port, target: toId, targetPort: 'input' })
      }
    }

    nodes.forEach(n => {
      const hasOut = outgoing(n.id).length > 0
      if (!hasOut) {
        if (n.type === 'API_CALL' && continueNode) ensureConn(n.id, continueNode.id, 'main')
        if ((n.type === 'COLLECT_INFO' || n.type === 'TRANSFER_HUMAN') && endNode) ensureConn(n.id, endNode.id, 'main')
      }
    })
    if (continueNode) {
      if (menuNode) ensureConn(continueNode.id, menuNode.id, 'continue')
      if (endNode) ensureConn(continueNode.id, endNode.id, 'end')
    }

    const nodesWithConns = nodes.map(n => ({
      ...n,
      connections: nextConnections.filter(c => c.source === n.id).map(c => ({ targetId: c.target, condition: c.condition, port: c.sourcePort }))
    }))

    setConnections(nextConnections)

    onSave({
      ...workflow,
      nodes: nodesWithConns,
      edges: buildEdgesFromConnections(nextConnections, nodes)
    })
  }

  const renderPath = (conn: WfConnection) => {
    const src = nodes.find(n => n.id === conn.source)
    const dst = nodes.find(n => n.id === conn.target)
    if (!src || !dst) return null
    const srcPorts: Port[] = (src.content?.ports || getDefaultPorts()).filter((p: Port)=>p.type==='output')
    const srcIdx = srcPorts.findIndex(p => p.id === conn.sourcePort)
    const x1 = src.position.x + (srcIdx >= 0 ? ((srcIdx+1)/(srcPorts.length+1))*NODE_WIDTH : NODE_WIDTH / 2)
    const y1 = src.position.y + NODE_HEIGHT
    const x2 = dst.position.x + NODE_WIDTH / 2
    const y2 = dst.position.y
    const mx = (x1 + x2) / 2
    const d = `M ${x1},${y1} C ${mx},${y1} ${mx},${y2} ${x2},${y2}`
    return <path d={d} stroke="#9CA3AF" strokeWidth={2} fill="none" />
  }

  const paletteItems = useMemo(() => palette.filter(p => p.label.toLowerCase().includes(nodeSearch.toLowerCase())), [nodeSearch])

  return (
    <div className="flex h-screen bg-gray-50 select-none">
      <div className="flex flex-col w-full">
        <div className="flex items-center justify-between p-4 border-b bg-white">
          <div className="flex items-center space-x-2">
            <LayoutGrid className="h-5 w-5 text-blue-600" />
            <div className="font-semibold text-gray-900">Workflow editor Beta</div>
            <input
              value={workflow.name}
              onChange={() => {}}
              className="ml-4 px-2 py-1 border rounded text-sm"
              placeholder="Nome"
              readOnly
            />
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="p-2 rounded hover:bg-gray-100" aria-label="Zoom in"><ZoomIn className="h-4 w-4" /></button>
            <button onClick={() => setZoom(z => Math.max(0.4, z - 0.1))} className="p-2 rounded hover:bg-gray-100" aria-label="Zoom out"><ZoomOut className="h-4 w-4" /></button>
            <button onClick={saveWorkflow} className="px-3 py-2 bg-blue-600 text-white rounded flex items-center space-x-2"><Save className="h-4 w-4" /><span>Salvar</span></button>
            <button onClick={onCancel} className="px-3 py-2 bg-gray-100 text-gray-800 rounded flex items-center space-x-2"><X className="h-4 w-4" /><span>Cancelar</span></button>
          </div>
        </div>

        <div className="flex flex-1 min-h-0">
          <div className={`border-r bg-white w-80 p-3 ${showPalette ? 'block' : 'hidden'} md:block`}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-700">Blocos</div>
              <button onClick={() => setShowPalette(!showPalette)} className="p-2 rounded hover:bg-gray-100" aria-label="Alternar"><Grid3X3 className="h-4 w-4" /></button>
            </div>
            <div className="mb-2 flex items-center space-x-2">
              <Search className="h-4 w-4 text-gray-500" />
              <input value={nodeSearch} onChange={(e)=>setNodeSearch(e.target.value)} placeholder="Buscar" className="flex-1 text-xs border rounded px-2 py-1" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {paletteItems.map(p => {
                const Icon = iconMap[p.type]
                const color = colorMap[p.type]
                return (
                  <button key={p.type} onClick={()=>addNode(p.type)} className="border rounded p-2 hover:bg-gray-50 flex items-center space-x-2">
                    <div className={`w-6 h-6 ${color} rounded flex items-center justify-center`}><Icon className="h-3 w-3 text-white" /></div>
                    <div className="text-xs">
                      <div className="font-medium text-gray-900">{p.label}</div>
                      <div className="text-gray-500">{p.description}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="relative flex-1 overflow-hidden select-none" ref={canvasRef} onMouseDown={startPan} onMouseUp={handleMouseUp} onMouseMove={(e)=>{handleMouseMove(e);handleCanvasMouseMove(e)}} onWheel={handleWheel} style={{ cursor: isPanning ? 'grabbing' : 'grab', userSelect: 'none' }}>
            <div className="absolute inset-0" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}>
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                {connections.map(c => (
                  <g key={c.id}>{renderPath(c)}</g>
                ))}
              </svg>
              {nodes.map(n => {
                const Icon = iconMap[n.type]
                const color = colorMap[n.type]
                const portsAll: Port[] = (n.content?.ports || getDefaultPorts())
                const outputs: Port[] = portsAll.filter((p: Port)=>p.type==='output')
                const inputs: Port[] = portsAll.filter((p: Port)=>p.type==='input')
                return (
                  <div key={n.id} className={`absolute bg-white rounded-xl shadow border ${selectedNode?.id===n.id?'border-blue-600':'border-gray-200'} transition-all select-none`} style={{ left: n.position.x, top: n.position.y, width: NODE_WIDTH, height: NODE_HEIGHT }} onMouseDown={(e)=>{ if (connectionStart) { e.stopPropagation(); completeConnection(n.id, 'input'); return; } handleNodeMouseDown(e,n.id) }} onClick={()=>{ setSelectedNode(n); setShowProperties(true) }}>
                    <div className="flex items-center justify-between p-3">
                      <div className="flex items-center space-x-2">
                        <div className={`w-8 h-8 ${color} rounded-lg flex items-center justify-center`}><Icon className="h-4 w-4 text-white" /></div>
                        <div className="text-sm font-medium text-gray-900">{n.type.replace('_',' ')}</div>
                      </div>
                      <button className="p-1 rounded hover:bg-gray-100" onClick={(e)=>{e.stopPropagation(); setSelectedNode(n)}} aria-label="Editar"><Settings className="h-4 w-4 text-gray-600" /></button>
                    </div>
                    <div className="px-3 pb-3 text-xs text-gray-600 truncate">
                      {n.type==='MESSAGE' || n.type==='START' ? (n.content?.text || n.content?.message || '') : n.type==='CONDITION' ? (n.content?.condition || '') : n.type==='API_CALL' ? (n.content?.endpoint || '') : n.type==='COLLECT_INFO' ? ((n.content?.fields||[]).join(', ')) : ''}
                    </div>
                    <div className="relative h-5">
                      {inputs.map((port)=> (
                        <div key={`${n.id}-in-${port.id}`} className={`absolute -top-3 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full border bg-white ${selectedNode?.id===n.id?'border-blue-600':'border-gray-400'} cursor-pointer`} title={port.label} onMouseDown={(e)=>{ e.stopPropagation(); completeConnection(n.id, port.id) }} />
                      ))}
                    </div>
                    <div className="relative h-8">
                      {outputs.map((port, idx)=> (
                        <div key={`${n.id}-${port.id}`} className={`absolute -bottom-3 w-5 h-5 rounded-full border bg-white ${selectedNode?.id===n.id?'border-blue-600':'border-gray-400'} cursor-pointer`} style={{ left: `${((idx+1)/(outputs.length+1))*100}%` }} title={port.label} onMouseDown={(e)=>{e.stopPropagation(); startConnection(n.id, port.id, 'output')}} />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {showProperties && selectedNode && (
            <div className="absolute right-0 top-0 bottom-0 w-96 border-l bg-white p-4 overflow-y-auto shadow-xl z-20">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-gray-900">Propriedades</div>
                <button onClick={()=>{ setShowProperties(false); setSelectedNode(null) }} className="p-2 rounded hover:bg-gray-100" aria-label="Fechar"><X className="h-4 w-4" /></button>
              </div>
              <div className="space-y-3">
                <div className="text-sm font-semibold text-gray-900">Propriedades</div>
                {selectedNode.type==='MESSAGE' || selectedNode.type==='START' ? (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Texto</label>
                    <input type="text" value={selectedNode.content.text || ''} onChange={(e)=>updateNodeContent(selectedNode.id,{ text: e.target.value })} className="w-full text-xs border rounded px-2 py-1" />
                  </div>
                ) : null}
                {selectedNode.type==='CONDITION' ? (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Condição</label>
                    <input type="text" value={selectedNode.content.condition || ''} onChange={(e)=>updateNodeContent(selectedNode.id,{ condition: e.target.value })} className="w-full text-xs border rounded px-2 py-1" placeholder="continue|end" />
                  </div>
                ) : null}
                {selectedNode.type==='API_CALL' ? (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Endpoint</label>
                      <input type="text" value={selectedNode.content.endpoint || ''} onChange={(e)=>updateNodeContent(selectedNode.id,{ endpoint: e.target.value })} className="w-full text-xs border rounded px-2 py-1" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Mensagem</label>
                      <input type="text" value={selectedNode.content.message || ''} onChange={(e)=>updateNodeContent(selectedNode.id,{ message: e.target.value })} className="w-full text-xs border rounded px-2 py-1" />
                    </div>
                  </div>
                ) : null}
                {selectedNode.type==='GPT_RESPONSE' ? (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Prompt do Sistema</label>
                    <textarea value={selectedNode.content.systemPrompt || ''} onChange={(e)=>updateNodeContent(selectedNode.id,{ systemPrompt: e.target.value })} className="w-full text-xs border rounded px-2 py-1" rows={3} />
                  </div>
                ) : null}
                {selectedNode.type==='DATA_COLLECTION' ? (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Campo</label>
                      <select value={selectedNode.content.field || ''} onChange={(e)=>updateNodeContent(selectedNode.id,{ field: e.target.value })} className="w-full text-xs border rounded px-2 py-1">
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
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Prompt</label>
                      <input type="text" value={selectedNode.content.prompt || ''} onChange={(e)=>updateNodeContent(selectedNode.id,{ prompt: e.target.value })} className="w-full text-xs border rounded px-2 py-1" />
                    </div>
                  </div>
                ) : null}
                {selectedNode.type==='COLLECT_INFO' ? (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Campos</label>
                      <input type="text" value={(selectedNode.content.fields || []).join(',')} onChange={(e)=>updateNodeContent(selectedNode.id,{ fields: e.target.value.split(',').map(s=>s.trim()).filter(Boolean) })} className="w-full text-xs border rounded px-2 py-1" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Mensagem</label>
                      <input type="text" value={selectedNode.content.message || ''} onChange={(e)=>updateNodeContent(selectedNode.id,{ message: e.target.value })} className="w-full text-xs border rounded px-2 py-1" />
                    </div>
                  </div>
                ) : null}
                {(selectedNode.type==='TRANSFER_HUMAN' || selectedNode.type==='END') ? (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Mensagem Final</label>
                    <input type="text" value={selectedNode.content.finalMessage || ''} onChange={(e)=>updateNodeContent(selectedNode.id,{ finalMessage: e.target.value })} className="w-full text-xs border rounded px-2 py-1" />
                  </div>
                ) : null}
                {selectedNode.type==='DELAY' ? (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Delay (s)</label>
                    <input type="number" value={selectedNode.content.delay || 1} onChange={(e)=>updateNodeContent(selectedNode.id,{ delay: parseInt(e.target.value) })} className="w-full text-xs border rounded px-2 py-1" min={1} max={60} />
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
