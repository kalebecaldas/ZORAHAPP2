import { Edge, Node, Position } from '@xyflow/react'

// Definição dos tipos do Backend (baseado no que vimos no WorkflowEditorBeta.tsx)
export type NodeType = 'START' | 'MESSAGE' | 'CONDITION' | 'ACTION' | 'GPT_RESPONSE' | 'DATA_COLLECTION' | 'TRANSFER_HUMAN' | 'DELAY' | 'END' | 'WEBHOOK' | 'API_CALL' | 'COLLECT_INFO'

export interface Port {
  id: string
  label: string
  type: 'input' | 'output'
  position: 'top' | 'bottom'
}

export interface WorkflowNodeContent {
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
  [key: string]: any
}

export interface BackendNode {
  id: string
  type: NodeType
  content: WorkflowNodeContent
  position: { x: number; y: number }
  connections?: Array<string | { targetId: string; condition?: string; port?: string }>
}

export interface BackendWorkflow {
  id?: string
  name: string
  description: string
  nodes: BackendNode[]
  edges?: any[] // Backend edges format if separate
  isActive?: boolean
  config?: any
}

// Helpers para portas
export const getDefaultPorts = (): Port[] => [
  { id: 'input', label: 'Entrada', type: 'input', position: 'top' },
  { id: 'main', label: 'Saída', type: 'output', position: 'bottom' }
]

export const getConditionPorts = (cond?: string): Port[] => {
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

// Conversão Backend -> React Flow
export const nodesToReactFlow = (nodes: BackendNode[]): Node[] => {
  return nodes.map(node => {
    // Determinar ports baseado no tipo e conteúdo do nó
    let ports: Port[] = []
    
    if (node.type === 'CONDITION') {
      const condition = node.content?.condition || ''
      if (condition === 'clinic_selection') {
        ports = getConditionPorts('clinic_selection')
      } else if (condition === 'service_selection') {
        ports = getConditionPorts('service_selection')
      } else {
        ports = getConditionPorts(condition)
      }
    } else if (node.type === 'GPT_RESPONSE') {
      // GPT_RESPONSE precisa de ports 1-5 para as diferentes intenções
      ports = [
        { id: 'input', label: 'Entrada', type: 'input', position: 'top' },
        { id: '1', label: '1', type: 'output', position: 'bottom' },
        { id: '2', label: '2', type: 'output', position: 'bottom' },
        { id: '3', label: '3', type: 'output', position: 'bottom' },
        { id: '4', label: '4', type: 'output', position: 'bottom' },
        { id: '5', label: '5', type: 'output', position: 'bottom' }
      ]
    } else {
      ports = getDefaultPorts()
    }

    return {
      id: node.id,
      type: 'custom', // Vamos usar um único tipo customizado
      position: node.position,
      data: {
        ...node.content,
        type: node.type, // Passamos o tipo original dentro de data
        label: node.type,
        ports
      }
    }
  })
}

export const edgesToReactFlow = (nodes: BackendNode[], backendEdges?: any[]): Edge[] => {
  const edges: Edge[] = []

  // Se temos edges do backend, usar elas diretamente
  if (backendEdges && backendEdges.length > 0) {
    return backendEdges.map((edge, idx) => {
      let port = edge.data?.port || edge.port || 'main'
      
      // Mapear "output" para "main" (padrão dos nós)
      if (port === 'output') {
        port = 'main'
      }
      
      return {
        id: edge.id || `e_${edge.source}_${edge.target}_${idx}`,
        source: edge.source,
        target: edge.target,
        sourceHandle: port,
        targetHandle: 'input',
        label: edge.data?.condition || edge.condition,
        type: edge.type || 'smoothstep',
        animated: edge.animated || false,
      }
    })
  }

  // Fallback: gerar edges a partir de node.connections
  nodes.forEach(node => {
    if (!node.connections) return

    node.connections.forEach((conn, idx) => {
      const targetId = typeof conn === 'string' ? conn : conn.targetId
      const sourceHandle = typeof conn === 'string' ? 'main' : (conn.port || 'main')
      const condition = typeof conn === 'string' ? undefined : conn.condition

      // React Flow precisa de IDs únicos para as arestas
      const edgeId = `e_${node.id}_${targetId}_${idx}`

      edges.push({
        id: edgeId,
        source: node.id,
        target: targetId,
        sourceHandle: sourceHandle,
        targetHandle: 'input', // Assumindo que todos os inputs têm id 'input'
        label: condition,
        type: 'smoothstep', // Estilo da linha
        animated: false,
      })
    })
  })

  return edges
}

// Conversão React Flow -> Backend
export const reactFlowToWorkflow = (rfNodes: Node[], rfEdges: Edge[], originalWorkflow: BackendWorkflow): BackendWorkflow => {
  const nodes: BackendNode[] = rfNodes.map(node => {
    // Reconstrói as conexões baseadas nas arestas do React Flow
    const nodeEdges = rfEdges.filter(e => e.source === node.id)
    const connections = nodeEdges.map(e => ({
      targetId: e.target,
      port: e.sourceHandle || 'main',
      condition: e.label as string | undefined
    }))

    return {
      id: node.id,
      type: node.data.type as NodeType,
      content: {
        ...node.data,
        ports: node.data.ports as Port[]
      },
      position: node.position,
      connections
    }
  })

  return {
    ...originalWorkflow,
    nodes,
    // O backend parece usar 'edges' também em alguns lugares, podemos gerar se necessário
    edges: rfEdges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      data: {
        port: e.sourceHandle,
        condition: e.label
      }
    }))
  }
}
