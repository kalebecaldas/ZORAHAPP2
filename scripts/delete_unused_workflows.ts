import prisma from '../api/prisma/client'

async function getDefaultWorkflow() {
  const latest = await prisma.auditLog.findFirst({ where: { action: 'DEFAULT_WORKFLOW' }, orderBy: { createdAt: 'desc' } })
  const details: any = latest?.details as any
  if (details?.id) {
    const wf = await prisma.workflow.findUnique({ where: { id: String(details.id) } })
    if (wf) return wf
  }
  const actives = await prisma.workflow.findMany({ where: { isActive: true }, orderBy: { createdAt: 'desc' } })
  return actives[0] || null
}

async function getStartNodeId(wf: any): Promise<string> {
  const cfg = typeof wf.config === 'string' ? (() => { try { return JSON.parse(wf.config as any) } catch { return {} } })() : (wf.config || {})
  const nodes = Array.isArray((cfg as any).nodes) ? (cfg as any).nodes : []
  const start = nodes.find((n: any) => n.type === 'START')
  return start?.id || 'start'
}

async function run() {
  const def = await getDefaultWorkflow()
  if (!def) {
    console.log('No default workflow found. Aborting cleanup.')
    return
  }
  const startId = await getStartNodeId(def)

  const unused = await prisma.workflow.findMany({ where: { isActive: false, id: { not: def.id } } })
  if (unused.length === 0) {
    console.log('No inactive workflows to delete.')
    return
  }

  let reassignedConversations = 0
  for (const wf of unused) {
    const convs = await prisma.conversation.findMany({ where: { workflowId: wf.id } })
    for (const c of convs) {
      await prisma.conversation.update({
        where: { id: c.id },
        data: {
          workflowId: def.id,
          currentWorkflowNode: startId,
          workflowContext: {},
          awaitingInput: false,
          status: 'BOT_QUEUE'
        }
      })
      reassignedConversations++
    }
    await prisma.workflow.delete({ where: { id: wf.id } })
    console.log(`Deleted workflow: ${wf.id} (${wf.name})`)
  }

  console.log(JSON.stringify({ deletedWorkflows: unused.length, reassignedConversations }))
}

run().catch(err => { console.error(err); process.exit(1) }).finally(async () => { await prisma.$disconnect() })
