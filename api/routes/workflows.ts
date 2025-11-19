import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import prisma from '../prisma/client.js'
import { authMiddleware } from '../utils/auth.js'
import { workflowSchema } from '../utils/validation.js'
import axios from 'axios'
import { WorkflowEngine, type WorkflowNode } from '../../src/services/workflowEngine.js'

const router = Router()

// In development, allow public access for listing and viewing workflows
const workflowsAuth = process.env.NODE_ENV === 'development'
  ? ((req: Request, res: Response, next: any) => next())
  : authMiddleware

async function ensureDefaultWorkflows(): Promise<void> {
  const total = await prisma.workflow.count()
  if (total > 0) return

  const samples = [
    {
      name: 'Atendimento Clínica – Unidade e Intenção',
      description: 'Identifica unidade, verifica intenção, encaminha e retorna até agendar.',
      isActive: true,
      type: 'CONSULTATION',
      config: {
        nodes: [
          { id: 'start', type: 'START', content: { message: 'Em qual unidade você gostaria de ser atendido(a)?' } },
          { id: 'clinic_selection', type: 'CONDITION', content: { condition: 'clinic_selection', finalMessage: 'Por favor, escolha uma de nossas unidades.' } },
          { id: 'service_menu', type: 'MESSAGE', content: { message: 'Escolha: 1) Valores  2) Convênios  3) Localização  4) Agendar  5) Falar com atendente' } },
          { id: 'service_selection', type: 'CONDITION', content: { condition: 'service_selection' } },
          { id: 'info_procedures', type: 'API_CALL', content: { endpoint: 'get_clinic_procedures', message: 'Buscando procedimentos e valores...' } },
          { id: 'info_insurances', type: 'API_CALL', content: { endpoint: 'get_clinic_insurances', message: 'Listando convênios aceitos...' } },
          { id: 'info_location', type: 'API_CALL', content: { endpoint: 'get_clinic_location', message: 'Localização e como chegar...' } },
          { id: 'continue_prompt', type: 'MESSAGE', content: { message: 'Deseja mais informações ou prefere agendar agora?' } },
          { id: 'continue_decision', type: 'CONDITION', content: { condition: 'continue|end' } },
          { id: 'collect_info', type: 'COLLECT_INFO', content: { fields: ['name','insurance','birth_date','procedure_type','preferred_date','preferred_shift'], message: 'Processando dados para agendamento...' } },
          { id: 'schedule', type: 'ACTION', content: { action: 'schedule_appointment' } },
          { id: 'transfer_human', type: 'TRANSFER_HUMAN', content: { finalMessage: 'Transferindo para atendimento humano...' } },
          { id: 'end', type: 'END', content: { finalMessage: 'Obrigado! Se precisar, posso continuar ajudando.' } }
        ],
        edges: [
          { id: 'e_start_selection', source: 'start', target: 'clinic_selection', data: { port: 'main' } },
          { id: 'e_selection_true', source: 'clinic_selection', target: 'service_menu', data: { port: 'true' } },
          { id: 'e_menu_to_cond', source: 'service_menu', target: 'service_selection', data: { port: 'main' } },
          { id: 'e_sel_1', source: 'service_selection', target: 'info_procedures', data: { port: '1' } },
          { id: 'e_sel_2', source: 'service_selection', target: 'info_insurances', data: { port: '2' } },
          { id: 'e_sel_3', source: 'service_selection', target: 'info_location', data: { port: '3' } },
          { id: 'e_sel_4', source: 'service_selection', target: 'collect_info', data: { port: '4' } },
          { id: 'e_sel_5', source: 'service_selection', target: 'transfer_human', data: { port: '5' } },
          { id: 'e_procedures_continue', source: 'info_procedures', target: 'continue_prompt', data: { port: 'main' } },
          { id: 'e_insurances_continue', source: 'info_insurances', target: 'continue_prompt', data: { port: 'main' } },
          { id: 'e_location_continue', source: 'info_location', target: 'continue_prompt', data: { port: 'main' } },
          { id: 'e_prompt_decision', source: 'continue_prompt', target: 'continue_decision', data: { port: 'main' } },
          { id: 'e_decision_continue', source: 'continue_decision', target: 'service_menu', data: { port: 'continue' } },
          { id: 'e_decision_end', source: 'continue_decision', target: 'end', data: { port: 'end' } },
          { id: 'e_collect_schedule', source: 'collect_info', target: 'schedule', data: { port: 'main' } },
          { id: 'e_schedule_end', source: 'schedule', target: 'end', data: { port: 'main' } }
        ]
      }
    },
    {
      name: 'Agendamento Rápido',
      description: 'Coleta telefone e agenda procedimento com horário sugerido.',
      isActive: false,
      type: 'APPOINTMENT',
      config: {
        nodes: [
          { id: 'start', type: 'START', data: { welcomeMessage: 'Vamos agendar sua consulta.' } },
          { id: 'collect', type: 'DATA_COLLECTION', data: { field: 'phone', prompt: 'Qual seu telefone com DDD?' } },
          { id: 'book', type: 'APPOINTMENT_BOOKING', data: { procedure: 'Consulta', availableTimes: ['09:00','10:00','14:00'] } },
          { id: 'end', type: 'END', data: { finalMessage: 'Agendamento realizado! Até breve.' } }
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'collect' },
          { id: 'e2', source: 'collect', target: 'book' },
          { id: 'e3', source: 'book', target: 'end' }
        ]
      }
    }
  ]

  for (const s of samples) {
    await prisma.workflow.create({ data: s as any })
  }
}

// Get all workflows
router.get('/', workflowsAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureDefaultWorkflows()
    const { type, active, page = 1, limit = 20 } = req.query
    const skip = (Number(page) - 1) * Number(limit)

    const where: any = {}
    if (type) where.type = type
    if (active !== undefined) where.isActive = active === 'true'

    const [workflows, total] = await Promise.all([
      prisma.workflow.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.workflow.count({ where })
    ])

    res.json({
      workflows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    })
  } catch (error) {
    console.error('Erro ao buscar workflows:', error)
    res.status(500).json({ error: 'Erro interno' })
  }
})

// Default workflow management (GET placed before ID route to avoid conflict)
router.get('/default', workflowsAuth, async (req: Request, res: Response): Promise<void> => {
  const latest = await prisma.auditLog.findFirst({ where: { action: 'DEFAULT_WORKFLOW' }, orderBy: { createdAt: 'desc' } })
  const details: any = latest?.details as any
  res.json({ defaultWorkflowId: details?.id || null })
})

// Get workflow by ID
router.get('/:id', workflowsAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const workflow = await prisma.workflow.findUnique({
      where: { id }
    })

    if (!workflow) {
      res.status(404).json({ error: 'Workflow não encontrado' })
      return
    }

    res.json(workflow)
  } catch (error) {
    console.error('Erro ao buscar workflow:', error)
    res.status(500).json({ error: 'Erro interno' })
  }
})

// Create workflow
router.post('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const data = workflowSchema.parse(req.body)

    const workflow = await prisma.workflow.create({
      data: data as any
    })

    res.status(201).json(workflow)
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Dados inválidos', details: error.errors })
      return
    }
    console.error('Erro ao criar workflow:', error)
    res.status(500).json({ error: 'Erro interno' })
  }
})

// Update workflow
router.put('/:id', workflowsAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const data = workflowSchema.parse(req.body)

    const workflow = await prisma.workflow.findUnique({ where: { id } })
    if (!workflow) {
      res.status(404).json({ error: 'Workflow não encontrado' })
      return
    }

    const updatedWorkflow = await prisma.workflow.update({
      where: { id },
      data
    })

    res.json(updatedWorkflow)
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Dados inválidos', details: error.errors })
      return
    }
    console.error('Erro ao atualizar workflow:', error)
    res.status(500).json({ error: 'Erro interno' })
  }
})

// Support PATCH update for frontend compatibility
router.patch('/:id', workflowsAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const data = workflowSchema.parse(req.body)

    const workflow = await prisma.workflow.findUnique({ where: { id } })
    if (!workflow) {
      res.status(404).json({ error: 'Workflow não encontrado' })
      return
    }

    const updatedWorkflow = await prisma.workflow.update({
      where: { id },
      data
    })

    res.json(updatedWorkflow)
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Dados inválidos', details: error.errors })
      return
    }
    console.error('Erro ao atualizar workflow (PATCH):', error)
    res.status(500).json({ error: 'Erro interno' })
  }
})

router.put('/default', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.body
  if (!id) {
    res.status(400).json({ error: 'ID do workflow é obrigatório' })
    return
  }
  const wf = await prisma.workflow.findUnique({ where: { id } })
  if (!wf) {
    res.status(404).json({ error: 'Workflow não encontrado' })
    return
  }
  await prisma.auditLog.create({ data: { actorId: req.user!.id, action: 'DEFAULT_WORKFLOW', details: { id } } })
  res.json({ success: true })
})

// Delete workflow
router.delete('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const workflow = await prisma.workflow.findUnique({ where: { id } })
    if (!workflow) {
      res.status(404).json({ error: 'Workflow não encontrado' })
      return
    }

    await prisma.workflow.delete({ where: { id } })

    res.json({ message: 'Workflow deletado com sucesso' })
  } catch (error) {
    console.error('Erro ao deletar workflow:', error)
    res.status(500).json({ error: 'Erro interno' })
  }
})

// Test workflow
router.post('/:id/test', workflowsAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { phone, message } = req.body

    const workflow = await prisma.workflow.findUnique({ where: { id } })
    if (!workflow) {
      res.status(404).json({ error: 'Workflow não encontrado' })
      return
    }

    // Use new WorkflowEngine
    const config = workflow.config as any
    const nodes = (config.nodes || []).map((node: any) => {
      // Build connections from edges
      const connections: Array<string | { targetId: string; condition?: string; port?: string }> = [];
      
      // Find all edges that start from this node
      (config.edges || []).forEach((edge: any) => {
        if (edge.source === node.id) {
          connections.push({
            targetId: edge.target,
            condition: edge.data?.condition,
            port: edge.data?.port || 'main'
          });
        }
      });
      
      return {
        id: node.id,
        type: node.type,
        content: node.content || node.data || {},
        position: node.position || { x: 0, y: 0 },
        connections
      };
    }) as WorkflowNode[]

    const engine = new WorkflowEngine(nodes, id, phone, message)
    const result = await engine.execute()

    res.json({ 
      result: {
        responses: result.responses,
        executed: result.context.conversationHistory.map((msg, index) => ({
          step: index + 1,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp
        })),
        finalStatus: 'completed',
        userData: result.context.userData
      }, 
      workflow 
    })
  } catch (error) {
    console.error('Erro ao testar workflow:', error)
    res.status(500).json({ error: 'Erro interno' })
  }
})

// Auto-layout nodes (BFS by edges)
router.post('/:id/autolayout', workflowsAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const wf = await prisma.workflow.findUnique({ where: { id } })
    if (!wf) {
      res.status(404).json({ error: 'Workflow não encontrado' })
      return
    }

    const cfg = typeof wf.config === 'string' ? (()=>{ try { return JSON.parse(wf.config as any) } catch { return {} } })() : (wf.config as any) || {}
    const nodes = Array.isArray(cfg?.nodes) ? cfg.nodes : []
    const edges = Array.isArray(cfg?.edges) ? cfg.edges : []
    if (!Array.isArray(nodes) || nodes.length === 0) {
      res.status(400).json({ error: 'Workflow sem nós' })
      return
    }

    const idToNode: Record<string, any> = {}
    nodes.forEach((n: any) => { idToNode[n.id] = n })
    const adjacency: Record<string, string[]> = {}
    edges.forEach((e: any) => {
      if (!adjacency[e.source]) adjacency[e.source] = []
      adjacency[e.source].push(e.target)
    })

    const start = nodes.find((n: any) => n.type === 'START') || nodes[0]
    const level: Record<string, number> = {}
    const visited = new Set<string>()
    const queue: string[] = []
    if (start) {
      queue.push(start.id)
      visited.add(start.id)
      level[start.id] = 0
    }
    while (queue.length) {
      const cur = queue.shift() as string
      const lv = level[cur]
      const outs = adjacency[cur] || []
      outs.forEach(t => {
        if (!visited.has(t)) {
          visited.add(t)
          level[t] = lv + 1
          queue.push(t)
        }
      })
    }

    const maxLevel = Object.values(level).reduce((a, b) => Math.max(a, b), 0)
    const orphanLevel = (maxLevel + 1)
    const groups: Record<number, any[]> = {}
    nodes.forEach((n: any) => {
      const lv = (level[n.id] !== undefined) ? level[n.id] : orphanLevel
      ;(groups[lv] ||= []).push(n)
    })

    const baseX = 120, baseY = 120, col = 260, row = 180
    Object.keys(groups).forEach(k => {
      const lv = Number(k)
      groups[lv].forEach((n: any, i: number) => {
        n.position = { x: baseX + i * col, y: baseY + lv * row }
      })
    })

    const updated = await prisma.workflow.update({ where: { id }, data: { config: { ...(cfg || {}), nodes, edges } } })
    res.json({ success: true, workflow: updated })
  } catch (error) {
    console.error('Erro ao aplicar auto-layout:', error)
    res.status(500).json({ error: 'Erro interno ao aplicar auto-layout' })
  }
})

// Toggle workflow active state for frontend compatibility
router.patch('/:id/toggle', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const workflow = await prisma.workflow.findUnique({ where: { id } })
    if (!workflow) {
      res.status(404).json({ error: 'Workflow não encontrado' })
      return
    }

    const updated = await prisma.workflow.update({
      where: { id },
      data: { isActive: !workflow.isActive }
    })

    res.json(updated)
  } catch (error) {
    console.error('Erro ao alternar status do workflow:', error)
    res.status(500).json({ error: 'Erro interno' })
  }
})

// Simulate workflow execution
async function simulateWorkflow(workflow: any, phone: string, message: string): Promise<any> {
  const config = workflow.config as any
  const nodes = config.nodes || []
  const edges = config.edges || []

  const result = {
    executed: [],
    responses: [],
    finalStatus: 'pending'
  }

  // Find start node
  const startNode = nodes.find((n: any) => n.type === 'START')
  if (!startNode) {
    throw new Error('Nó inicial não encontrado')
  }

  let currentNode = startNode
  let step = 0
  const maxSteps = 50 // Prevent infinite loops

  while (currentNode && step < maxSteps) {
    step++
    
    // Execute current node
    const nodeResult = await executeNode(currentNode, phone, message)
    result.executed.push({
      nodeId: currentNode.id,
      type: currentNode.type,
      result: nodeResult
    })

    if (nodeResult.response) {
      result.responses.push(nodeResult.response)
    }

    // Find next node
    const outgoingEdges = edges.filter((e: any) => e.source === currentNode.id)
    
    if (outgoingEdges.length === 0) {
      result.finalStatus = 'completed'
      break
    }

    if (outgoingEdges.length === 1) {
      currentNode = nodes.find((n: any) => n.id === outgoingEdges[0].target)
    } else {
      // Handle conditional branching
      const conditionEdge = outgoingEdges.find((e: any) => {
        const condition = e.data?.condition
        if (!condition) return false
        return evaluateCondition(condition, phone, message, nodeResult)
      })
      
      if (conditionEdge) {
        currentNode = nodes.find((n: any) => n.id === conditionEdge.target)
      } else {
        // Default to first edge if no condition matches
        currentNode = nodes.find((n: any) => n.id === outgoingEdges[0].target)
      }
    }
  }

  if (step >= maxSteps) {
    result.finalStatus = 'timeout'
  }

  return result
}

// Execute individual node
async function executeNode(node: any, phone: string, message: string): Promise<any> {
  const nodeData = node.data || {}

  switch (node.type) {
    case 'START':
      return {
        type: 'start',
        welcomeMessage: nodeData.welcomeMessage || 'Olá! Bem-vindo à nossa clínica.'
      }

    case 'MESSAGE':
      return {
        type: 'message',
        response: nodeData.message || 'Mensagem padrão'
      }

    case 'GPT_RESPONSE':
      // This would use the AI service in a real implementation
      return {
        type: 'gpt_response',
        response: nodeData.systemPrompt || 'Resposta gerada por IA'
      }

    case 'DATA_COLLECTION':
      return {
        type: 'data_collection',
        field: nodeData.field,
        prompt: nodeData.prompt || 'Por favor, forneça a informação solicitada.'
      }

    case 'CONDITION':
      return {
        type: 'condition',
        condition: nodeData.condition || 'true'
      }

    case 'TRANSFER_HUMAN':
      return {
        type: 'transfer_human',
        reason: nodeData.reason || 'Transferência solicitada'
      }

    case 'DELAY':
      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, (nodeData.delay || 1) * 1000))
      return {
        type: 'delay',
        delay: nodeData.delay || 1
      }

    case 'ACTION':
      try {
        const url = String(nodeData.url || '')
        const method = String(nodeData.method || 'POST').toUpperCase()
        const headers = nodeData.headers || {}
        let body: any = nodeData.body || {}
        const bp = nodeData.bodyParametersUi?.parameter || []
        if (Array.isArray(bp)) {
          body = { ...body }
          for (const p of bp) {
            if (p?.name) body[p.name] = p.value
          }
        }
        if (phone && !body.phone) body.phone = phone
        const reqConfig: any = { url, method, headers }
        if (method === 'GET') reqConfig.params = body
        else reqConfig.data = body
        const resp = url ? await axios(reqConfig) : { status: 204, data: null }
        return { type: 'action', status: resp?.status ?? 200, response: resp?.data }
      } catch (error: any) {
        const msg = error?.response?.data || error?.message || 'Erro'
        return { type: 'action', error: msg }
      }

    case 'END':
      return {
        type: 'end',
        finalMessage: nodeData.finalMessage || 'Obrigado por entrar em contato!'
      }

    case 'APPOINTMENT_BOOKING':
      return {
        type: 'appointment_booking',
        procedure: nodeData.procedure,
        availableDates: nodeData.availableDates || [],
        availableTimes: nodeData.availableTimes || ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'],
        locations: nodeData.locations || ['Unidade Principal'],
        prompt: nodeData.prompt || 'Vamos agendar seu procedimento. Por favor, escolha uma data e horário.'
      }

    case 'WEBHOOK':
      return {
        type: 'webhook',
        route: nodeData.route || '/webhook/custom',
        method: (nodeData.method || 'POST').toUpperCase()
      }

    default:
      return {
        type: 'unknown',
        error: `Tipo de nó desconhecido: ${node.type}`
      }
  }
}

// Evaluate condition
function evaluateCondition(condition: string, phone: string, message: string, context: any): boolean {
  try {
    // Simple condition evaluation
    // In a real implementation, this would be more sophisticated
    const lowerMessage = message.toLowerCase()
    
    if (condition.includes('agendamento') || condition.includes('marcar')) {
      return lowerMessage.includes('agendamento') || lowerMessage.includes('marcar')
    }
    
    if (condition.includes('preço') || condition.includes('valor')) {
      return lowerMessage.includes('preço') || lowerMessage.includes('valor') || lowerMessage.includes('quanto')
    }
    
    if (condition.includes('informação') || condition.includes('informações')) {
      return lowerMessage.includes('informação') || lowerMessage.includes('informações')
    }
    
    return true // Default to true if no specific condition matches
  } catch (error) {
    console.error('Erro ao avaliar condição:', error)
    return false
  }
}

// Create appointment from workflow
router.post('/appointments', workflowsAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      patientId, 
      procedure, 
      date, 
      time, 
      location, 
      notes, 
      conversationId,
      phone
    } = req.body

    if (!procedure || !date || !time || (!patientId && !phone)) {
      res.status(400).json({ error: 'Informe procedimento, data, horário e paciente ou telefone' })
      return
    }

    // Find patient by ID or phone
    let patient = patientId ? await prisma.patient.findUnique({ where: { id: patientId } }) : null
    if (!patient && phone) {
      patient = await prisma.patient.findUnique({ where: { phone } })
    }

    if (!patient) {
      // Create new patient if not found
      patient = await prisma.patient.create({
        data: {
          phone: phone || '00000000000',
          name: 'Paciente ' + (phone?.slice(-4) || 'Novo'),
          preferences: {}
        }
      })
    }

    // Create appointment
    const appointment = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        patientName: patient.name,
        patientPhone: patient.phone,
        procedure,
        date: new Date(date + 'T' + time),
        time,
        
        notes: notes || '',
        status: 'SCHEDULED'
      }
    })

    // Create system message in conversation if conversationId provided
    if (conversationId) {
      await prisma.message.create({
        data: {
          conversationId,
          phoneNumber: patient.phone,
          messageText: `Agendamento criado: ${procedure} para ${new Date(date + 'T' + time).toLocaleString('pt-BR')}`,
          direction: 'SENT',
          from: 'SYSTEM',
          timestamp: new Date()
        }
      })
    }

    // Log appointment creation
    await prisma.patientInteraction.create({
      data: {
        patientId: patient.id,
        type: 'APPOINTMENT_SCHEDULED',
        description: `Agendamento criado: ${procedure}`,
        data: {
          appointmentId: appointment.id,
          procedure,
          date,
          time,
          location
        }
      }
    })

    res.json({
      appointment,
      message: 'Agendamento criado com sucesso!'
    })

  } catch (error) {
    console.error('Erro ao criar agendamento:', error)
    const msg = error instanceof Error ? error.message : 'Erro interno'
    res.status(500).json({ error: 'Erro ao criar agendamento', details: msg })
  }
})

export default router
function buildEdgesFromConnections(nodes: any[]): any[] {
  const edges: any[] = []
  for (const n of (nodes || [])) {
    const conns = n?.connections || []
    for (let idx = 0; idx < conns.length; idx++) {
      const c = conns[idx]
      const targetId = typeof c === 'string' ? c : c?.targetId
      if (!targetId) continue
      const condition = typeof c === 'string' ? undefined : c?.condition
      const port = typeof c === 'string' ? 'main' : (c?.port || 'main')
      const edge: any = { id: `e_${n.id}_${targetId}_${idx}`, source: n.id, target: targetId, data: {} }
      if (condition) edge.data.condition = condition
      if (port) edge.data.port = port
      edges.push(edge)
    }
  }
  return edges
}

router.post('/:id/autoconnect', workflowsAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const wf = await prisma.workflow.findUnique({ where: { id } })
    if (!wf) {
      res.status(404).json({ error: 'Workflow não encontrado' })
      return
    }
    const cfg = typeof wf.config === 'string' ? (()=>{ try { return JSON.parse(wf.config as any) } catch { return {} } })() : (wf.config as any) || {}
    const nodes = Array.isArray(cfg?.nodes) ? cfg.nodes : []
    let edges = Array.isArray(cfg?.edges) ? cfg.edges : []
    const hasAnyEdges = Array.isArray(edges) && edges.length > 0
    if (!hasAnyEdges) {
      const start = nodes.find((n: any) => n.type === 'START')
      const orderMap: Record<string, number> = { START: 0, MESSAGE: 1, DATA_COLLECTION: 2, ACTION: 3, GPT_RESPONSE: 4, CONDITION: 5, DELAY: 6, TRANSFER_HUMAN: 7, END: 999 }
      const ordered = start ? [start, ...nodes.filter((n: any) => n.id !== start.id)] : [...nodes]
      ordered.sort((a: any, b: any) => ((orderMap[a.type] ?? 50) - (orderMap[b.type] ?? 50)) || ((a.position?.y || 0) - (b.position?.y || 0)) || ((a.position?.x || 0) - (b.position?.x || 0)))
      const seqEdges = [] as any[]
      for (let i = 0; i < ordered.length - 1; i++) {
        const src = ordered[i]
        const dst = ordered[i + 1]
        seqEdges.push({ id: `e_${src.id}_${dst.id}_${i}`, source: src.id, target: dst.id, data: { port: 'main' } })
      }
      edges = seqEdges
    }
    const connEdges = buildEdgesFromConnections(nodes)
    const finalEdges = (hasAnyEdges ? edges : connEdges.length ? connEdges : edges)
    const updated = await prisma.workflow.update({ where: { id }, data: { config: { ...(cfg || {}), nodes, edges: finalEdges } } })
    res.json({ workflow: updated, edges: finalEdges })
  } catch (error) {
    console.error('Erro ao auto-conectar workflow:', error)
    res.status(500).json({ error: 'Erro interno ao auto-conectar' })
  }
})

router.post('/autoconnect/all', workflowsAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const all = await prisma.workflow.findMany()
    const results: any[] = []
    for (const wf of all) {
      const cfg = typeof wf.config === 'string' ? (()=>{ try { return JSON.parse(wf.config as any) } catch { return {} } })() : (wf.config as any) || {}
      const nodes = Array.isArray(cfg?.nodes) ? cfg.nodes : []
      let edges = Array.isArray(cfg?.edges) ? cfg.edges : []
      const connEdges = buildEdgesFromConnections(nodes)
      let finalEdges = connEdges.length ? connEdges : edges
      if ((!finalEdges || finalEdges.length === 0) && Array.isArray(nodes) && nodes.length > 1) {
        const start = nodes.find((n: any) => n.type === 'START')
        const orderMap: Record<string, number> = { START: 0, MESSAGE: 1, DATA_COLLECTION: 2, ACTION: 3, GPT_RESPONSE: 4, CONDITION: 5, DELAY: 6, TRANSFER_HUMAN: 7, END: 999 }
        const ordered = start ? [start, ...nodes.filter((n: any) => n.id !== start.id)] : [...nodes]
        ordered.sort((a: any, b: any) => ((orderMap[a.type] ?? 50) - (orderMap[b.type] ?? 50)) || ((a.position?.y || 0) - (b.position?.y || 0)) || ((a.position?.x || 0) - (b.position?.x || 0)))
        finalEdges = [] as any[]
        for (let i = 0; i < ordered.length - 1; i++) {
          const src = ordered[i]
          const dst = ordered[i + 1]
          finalEdges.push({ id: `e_${src.id}_${dst.id}_${i}`, source: src.id, target: dst.id, data: { port: 'main' } })
        }
      }
      const updated = await prisma.workflow.update({ where: { id: wf.id }, data: { config: { ...(cfg || {}), nodes, edges: finalEdges } } })
      results.push({ id: wf.id, edgesCount: finalEdges.length })
    }
    res.json({ success: true, results })
  } catch (error) {
    console.error('Erro ao auto-conectar todos:', error)
    res.status(500).json({ error: 'Erro interno ao auto-conectar todos' })
  }
})
function mapN8nTypeToInternal(node: any): string {
  const type = String(node?.type || '')
  if (!type) return 'MESSAGE'
  if (type.includes('n8n-nodes-base.start')) return 'START'
  if (type.includes('n8n-nodes-base.wait')) return 'DELAY'
  if (type.includes('n8n-nodes-base.if')) return 'CONDITION'
  if (type.includes('n8n-nodes-base.respondToWebhook')) return 'END'
  if (type.includes('n8n-nodes-base.httpRequest')) return 'ACTION'
  if (type.includes('n8n-nodes-base.function')) {
    const p = node?.parameters || {}
    if (p.field || p.prompt) return 'DATA_COLLECTION'
    return 'ACTION'
  }
  if (type.includes('n8n-nodes-base.set')) {
    const p = node?.parameters || {}
    if (p.field || p.prompt) return 'DATA_COLLECTION'
    return 'ACTION'
  }
  return 'MESSAGE'
}

function convertN8nToInternal(n8n: any): { type: string, config: any, name?: string, description?: string } {
  const nodesInput = Array.isArray(n8n?.nodes) ? n8n.nodes : []
  const connectionsInput = n8n?.connections || {}
  const idMap: Record<string, string> = {}
  const nameToId: Record<string, string> = {}
  const nodes = nodesInput.map((n: any, idx: number) => {
    const id = String(n.id ?? n.name ?? `node_${idx}`)
    idMap[n.id ?? id] = id
    nameToId[n.name ?? id] = id
    const internalType = mapN8nTypeToInternal(n)
    const data = n.parameters || {}
    return {
      id,
      type: internalType,
      data,
      content: data,
      position: n.position || { x: 100 + idx * 160, y: 100 },
      connections: []
    }
  })

  const edges: any[] = []
  Object.keys(connectionsInput).forEach((fromName: string) => {
    const outputs = connectionsInput[fromName] || {}
    Object.keys(outputs).forEach((outKey: string) => {
      const lanes = outputs[outKey] || []
      lanes.forEach((lane: any[]) => {
        lane.forEach((conn: any, idx: number) => {
          const sourceId = nameToId[fromName]
          const targetId = nameToId[conn?.node]
          if (sourceId && targetId) {
            edges.push({ id: `e_${sourceId}_${targetId}_${outKey}_${idx}` , source: sourceId, target: targetId, data: { port: outKey } })
          }
        })
      })
    })
  })

  return {
    type: String(n8n?.type || 'CONSULTATION'),
    config: { nodes, edges },
    name: n8n?.name,
    description: n8n?.description
  }
}

// Import workflow from n8n format
router.post('/import/n8n', workflowsAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, workflow } = req.body
    if (!workflow || !Array.isArray(workflow?.nodes)) {
      res.status(400).json({ error: 'Formato n8n inválido: falta nodes' })
      return
    }
    const converted = convertN8nToInternal(workflow)
    const wf = await prisma.workflow.create({
      data: {
        name: String(name || converted.name || 'Importado do n8n'),
        description: String(description || converted.description || ''),
        type: converted.type,
        config: converted.config,
        isActive: false
      }
    })
    res.status(201).json({ workflow: wf })
  } catch (error) {
    console.error('Erro ao importar workflow n8n:', error)
    res.status(500).json({ error: 'Erro ao importar workflow n8n' })
  }
})
