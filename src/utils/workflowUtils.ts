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
  // IMPORTANTE: CONDITION nodes sempre têm ports 'true' e 'false' para as edges
  // Os tokens (ex: sim|quero|adicionar) são apenas para lógica de classificação
  // mas as edges sempre usam true/false como sourceHandle
  return [...base, { id: 'true', label: 'Verdadeiro', type: 'output', position: 'bottom' }, { id: 'false', label: 'Falso', type: 'output', position: 'bottom' }]
}

// Conversão Backend -> React Flow
export const nodesToReactFlow = (nodes: BackendNode[]): Node[] => {
  return nodes.map(node => {
    // Determinar ports baseado no tipo e conteúdo do nó
    let ports: Port[] = []
    
    if (node.type === 'CONDITION') {
      // Procurar condition em content ou data
      const condition = node.content?.condition || (node.content as any)?.data?.condition || (node.content as any)?.condition || ''
      
      if (condition === 'clinic_selection') {
        ports = getConditionPorts('clinic_selection')
      } else if (condition === 'service_selection') {
        ports = getConditionPorts('service_selection')
      } else {
        // IMPORTANTE: Todos os CONDITION nodes (exceto clinic_selection e service_selection)
        // sempre têm ports 'true' e 'false', independente dos tokens na condição
        // Os tokens (ex: sim|quero|adicionar) são apenas para lógica de classificação
        // mas as edges sempre usam true/false como sourceHandle
        ports = [
          { id: 'input', label: 'Entrada', type: 'input', position: 'top' },
          { id: 'true', label: 'Verdadeiro', type: 'output', position: 'bottom' },
          { id: 'false', label: 'Falso', type: 'output', position: 'bottom' }
        ]
      }
      
      console.log(`🔧 CONDITION node "${node.id}":`, {
        condition,
        ports: ports.map(p => p.id).join(', ')
      })
    } else if (node.type === 'GPT_RESPONSE') {
      // GPT_RESPONSE precisa de ports 1-6 para as diferentes intenções
      ports = [
        { id: 'input', label: 'Entrada', type: 'input', position: 'top' },
        { id: '1', label: 'Valores', type: 'output', position: 'bottom' },
        { id: '2', label: 'Convênios', type: 'output', position: 'bottom' },
        { id: '3', label: 'Localização', type: 'output', position: 'bottom' },
        { id: '4', label: 'Explicação', type: 'output', position: 'bottom' },
        { id: '5', label: 'Agendar', type: 'output', position: 'bottom' },
        { id: '6', label: 'Humano', type: 'output', position: 'bottom' }
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

  // Criar um mapa de nós para acesso rápido
  const nodeMap = new Map(nodes.map(n => [n.id, n]))

  console.log('🔗 edgesToReactFlow - Convertendo edges do backend')
  console.log('   Nodes disponíveis:', nodes.map(n => n.id))
  console.log('   Backend edges recebidas:', backendEdges?.length || 0)

  // Se temos edges do backend, usar elas diretamente
  if (backendEdges && backendEdges.length > 0) {
    const convertedEdges = backendEdges.map((edge, idx) => {
      // Pegar port do data.port ou sourceHandle
      let port = edge.data?.port || edge.sourceHandle || edge.port || 'main'
      const condition = edge.data?.condition || edge.condition
      
      // Verificar se source e target existem
      const sourceExists = nodeMap.has(edge.source)
      const targetExists = nodeMap.has(edge.target)
      
      if (!sourceExists || !targetExists) {
        console.warn(`⚠️ Edge inválida: ${edge.source} -> ${edge.target}`, {
          sourceExists,
          targetExists,
          edge
        })
        return null
      }
      
      const sourceNode = nodeMap.get(edge.source)
      
      // Para CONDITION nodes, validar que o port existe nos tokens
      if (sourceNode && sourceNode.type === 'CONDITION') {
        const condValue = (sourceNode.content?.condition || '').toLowerCase()
        
        // Se o port ainda é 'main', precisamos inferir do condition
        if (port === 'main' && condition) {
          const tokens = condition.split('|').map(s => s.trim()).filter(Boolean)
          if (tokens.length > 0) {
            port = tokens[0] // Usar primeiro token
          }
        }
        
        // Validar se o port existe na lista de tokens do node
        if (condValue.includes('|')) {
          const tokens = condValue.split('|').map(s => s.trim())
          // Se port não está nos tokens e não é 'true'/'false', usar primeiro token do condition da edge
          if (!tokens.includes(port) && port !== 'true' && port !== 'false') {
            const edgeTokens = (condition || '').split('|').map(s => s.trim()).filter(Boolean)
            if (edgeTokens.length > 0 && tokens.includes(edgeTokens[0])) {
              port = edgeTokens[0]
            }
          }
        } else if (condValue === 'clinic_selection') {
          // Usar 'true' como padrão para ambas as clínicas (só temos 2 saídas)
          if (port === 'main') {
            port = 'true'
          }
        } else {
          // Nodes com condição simples (ex: patient_found) usam 'true'/'false'
          if (port === 'main') {
            port = condition ? 'false' : 'true'
          }
        }
      }
      
      // Mapear "output" para "main" (padrão dos nós que não são CONDITION)
      if (port === 'output') {
        if (!sourceNode || sourceNode.type !== 'CONDITION') {
          port = 'main'
        }
      }
      
      const reactFlowEdge = {
        id: edge.id || `e_${edge.source}_${edge.target}_${idx}`,
        source: edge.source,
        target: edge.target,
        sourceHandle: port,
        targetHandle: 'input',
        label: condition,
        type: 'smoothstep',
        animated: false,
        style: {
          stroke: '#64748b',
          strokeWidth: 3
        },
        markerEnd: {
          type: 'arrowclosed' as const,
          color: '#64748b',
          width: 20,
          height: 20
        }
      }
      
      console.log(`   ✅ ${edge.source}[${port}] → ${edge.target}`)
      
      return reactFlowEdge
    }).filter(Boolean) // Remove edges inválidas (null)
    
    console.log(`✅ Total de edges convertidas: ${convertedEdges.length}`)
    return convertedEdges as Edge[]
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

// Ensure required edges exist for the pre-scheduling chain
export const ensureRequiredEdges = (wf: BackendWorkflow): BackendWorkflow => {
  const nodes = wf.nodes || []
  const edges = wf.edges || []
  const nodeIds = new Set(nodes.map(n => n.id))
  const hasEdge = (src: string, tgt: string) => edges.some((e: any) => e.source === src && e.target === tgt)
  const pushEdge = (src: string, tgt: string, port = 'main', condition?: string) => {
    if (nodeIds.has(src) && nodeIds.has(tgt) && !hasEdge(src, tgt)) {
      edges.push({ id: `e_${src}_${tgt}_${edges.length+1}`, source: src, target: tgt, data: { port, condition } })
    }
  }
  // Minimal chain fix-ups
  pushEdge('msg_cadastro_sucesso', 'ask_procedimentos')
  pushEdge('msg_paciente_encontrado', 'ask_procedimentos')
  pushEdge('ask_procedimentos', 'collect_proc_1')
  return { ...wf, edges }
}
