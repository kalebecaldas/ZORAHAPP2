import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function getNodeById(nodes: any[], id: string) {
  return nodes.find((n: any) => n.id === id)
}

function getIncomingEdges(edges: any[], nodeId: string) {
  return edges.filter((e: any) => e.target === nodeId)
}

function getOutgoingEdges(edges: any[], nodeId: string) {
  return edges.filter((e: any) => e.source === nodeId)
}

function disconnectedNodes(nodes: any[], edges: any[]) {
  const ids = new Set(nodes.map((n: any) => n.id))
  const incomingMap: Record<string, number> = {}
  const outgoingMap: Record<string, number> = {}
  nodes.forEach((n: any) => { incomingMap[n.id] = 0; outgoingMap[n.id] = 0 })
  edges.forEach((e: any) => { if (ids.has(e.target)) incomingMap[e.target]++; if (ids.has(e.source)) outgoingMap[e.source]++ })
  const isolated = nodes.filter((n: any) => incomingMap[n.id] === 0 && outgoingMap[n.id] === 0)
  const noIncoming = nodes.filter((n: any) => incomingMap[n.id] === 0)
  const noOutgoing = nodes.filter((n: any) => outgoingMap[n.id] === 0)
  return { isolated, noIncoming, noOutgoing }
}

function invalidEdges(nodes: any[], edges: any[]) {
  const ids = new Set(nodes.map((n: any) => n.id))
  return edges.filter((e: any) => !ids.has(e.source) || !ids.has(e.target))
}

function validatePreScheduling(nodes: any[], edges: any[]) {
  const expected = [
    'msg_solicita_cadastro',
    'confirma_cadastro',
    'msg_cadastro_sucesso',
    'ask_procedimentos',
    'ask_turno',
    'collect_turno',
    'resumo_agendamento',
    'confirma_agendamento',
    'create_appointment',
    'fila_aguardando',
    'end_success'
  ]
  const exists = expected.map(id => ({ id, present: !!getNodeById(nodes, id) }))
  const chain = [
    ['msg_solicita_cadastro', 'confirma_cadastro'],
    ['confirma_cadastro', 'msg_cadastro_sucesso'],
    ['msg_cadastro_sucesso', 'ask_procedimentos'],
    ['ask_turno', 'collect_turno'],
    ['collect_turno', 'resumo_agendamento'],
    ['resumo_agendamento', 'confirma_agendamento'],
    ['confirma_agendamento', 'create_appointment'],
    ['create_appointment', 'fila_aguardando'],
    ['fila_aguardando', 'end_success']
  ]
  const chainOk = chain.map(([a, b]) => ({ from: a, to: b, connected: isReachable(edges, a, b) }))
  return { exists, chainOk }
}

function isReachable(edges: any[], from: string, to: string) {
  const seen = new Set<string>()
  const q: string[] = [from]
  let steps = 0
  while (q.length && steps < 300) {
    steps++
    const cur = q.shift() as string
    if (cur === to) return true
    if (seen.has(cur)) continue
    seen.add(cur)
    const nexts = edges.filter((e: any) => e.source === cur).map((e: any) => e.target)
    nexts.forEach(n => { if (!seen.has(n)) q.push(n) })
  }
  return false
}

async function inspectActiveWorkflow() {
  console.log('🔍 Inspecionando workflow ativo\n')
  try {
    const workflow = await prisma.workflow.findFirst({ where: { isActive: true } })
    if (!workflow) {
      console.log('❌ Nenhum workflow ativo encontrado')
      return
    }
    console.log(`📋 Workflow: ${workflow.name} (${workflow.id})`)
    const config = typeof (workflow as any).config === 'string' ? JSON.parse((workflow as any).config) : ((workflow as any).config || {})
    const nodes = (Array.isArray(config?.nodes) ? config.nodes : [])
    const edges = (Array.isArray(config?.edges) ? config.edges : [])
    console.log(`🧩 Nodes: ${nodes.length} | 🔗 Edges: ${edges.length}`)
    const start = nodes.find((n: any) => n.type === 'START')
    const gpt = nodes.find((n: any) => n.type === 'GPT_RESPONSE' && (n.id === 'gpt_classifier' || String(n.content?.systemPrompt || '').toLowerCase().includes('classific'))) || nodes.find((n: any) => n.type === 'GPT_RESPONSE')
    console.log(`🚦 START: ${start ? start.id : 'N/A'} | 🤖 GPT: ${gpt ? gpt.id : 'N/A'}`)
    const disc = disconnectedNodes(nodes, edges)
    console.log(`❗ Isolados: ${disc.isolated.length} | Sem entrada: ${disc.noIncoming.length} | Sem saída: ${disc.noOutgoing.length}`)
    if (disc.isolated.length > 0) { console.log('🔎 Isolados:', disc.isolated.map((n: any) => n.id).join(', ')) }
    const bad = invalidEdges(nodes, edges)
    console.log(`⚠️ Edges inválidas: ${bad.length}`)
    if (bad.length > 0) { bad.slice(0, 10).forEach((e: any) => console.log(`- inválida: ${e.source} → ${e.target}`)) }
    const pre = validatePreScheduling(nodes, edges)
    console.log('🗓️ Pré-agendamento: presença dos nós:')
    pre.exists.forEach(x => console.log(`- ${x.id}: ${x.present ? 'OK' : 'FALTANDO'}`))
    console.log('🧭 Pré-agendamento: conexões da cadeia:')
    pre.chainOk.forEach(x => console.log(`- ${x.from} → ${x.to}: ${x.connected ? 'OK' : 'QUEBRADA'}`))
    const dangling = edges.filter((e: any) => !getOutgoingEdges(edges, e.target).length && getNodeById(nodes, e.target)?.type !== 'END')
    if (dangling.length > 0) { console.log(`🟠 Saídas que terminam sem END: ${dangling.length}`); dangling.slice(0, 10).forEach((e: any) => console.log(`- ${e.source} → ${e.target}`)) }
    const gptOut = edges.filter((e: any) => e.source === (gpt?.id || ''))
    console.log(`🤖 Saídas do GPT classifier: ${gptOut.length}`)
  } catch (error) {
    console.error('❌ Erro ao inspecionar workflow:', error)
  } finally {
    await prisma.$disconnect()
  }
}

inspectActiveWorkflow()
