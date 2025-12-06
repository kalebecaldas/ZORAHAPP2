import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkDefaultWorkflow() {
  try {
    console.log('🔍 Verificando workflow padrão (usado pelo bot)...\n')

    // Verificar AuditLog
    const latest = await prisma.auditLog.findFirst({ 
      where: { action: 'DEFAULT_WORKFLOW' }, 
      orderBy: { createdAt: 'desc' } 
    })

    if (latest) {
      const details: any = latest.details as any
      console.log('📋 AuditLog (DEFAULT_WORKFLOW):')
      console.log(`   Workflow ID: ${details?.id}`)
      console.log(`   Nome: ${details?.name || 'N/A'}`)
      console.log(`   Nodes: ${details?.nodes || 'N/A'}`)
      console.log(`   Criado em: ${latest.createdAt}\n`)

      if (details?.id) {
        const wf = await prisma.workflow.findUnique({ where: { id: String(details.id) } })
        if (wf) {
          const config = wf.config as any
          const nodes = config?.nodes || []
          const edges = config?.edges || []
          
          console.log('📊 Workflow do AuditLog:')
          console.log(`   ID: ${wf.id}`)
          console.log(`   Nome: ${wf.name}`)
          console.log(`   Nodes: ${nodes.length}`)
          console.log(`   Edges: ${edges.length}`)
          console.log(`   Ativo: ${wf.isActive ? 'SIM' : 'NÃO'}\n`)
        }
      }
    } else {
      console.log('⚠️  Nenhum DEFAULT_WORKFLOW no AuditLog\n')
    }

    // Verificar workflow ativo
    const activeWorkflow = await prisma.workflow.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    })

    if (activeWorkflow) {
      const config = activeWorkflow.config as any
      const nodes = config?.nodes || []
      const edges = config?.edges || []
      
      console.log('📊 Workflow Ativo (isActive: true):')
      console.log(`   ID: ${activeWorkflow.id}`)
      console.log(`   Nome: ${activeWorkflow.name}`)
      console.log(`   Nodes: ${nodes.length}`)
      console.log(`   Edges: ${edges.length}\n`)
    }

    // Verificar qual workflow o getDefaultWorkflow() retornaria
    console.log('🔍 Simulando getDefaultWorkflow()...\n')
    
    let defaultWorkflowId: string | null = null
    
    if (latest) {
      const details: any = latest.details as any
      if (details?.id) {
        const wf = await prisma.workflow.findUnique({ where: { id: String(details.id) } })
        if (wf) {
          defaultWorkflowId = wf.id
          console.log('✅ Workflow padrão: AuditLog (DEFAULT_WORKFLOW)')
        }
      }
    }

    if (!defaultWorkflowId && activeWorkflow) {
      defaultWorkflowId = activeWorkflow.id
      console.log('✅ Workflow padrão: Workflow ativo (isActive: true)')
    }

    if (defaultWorkflowId) {
      const wf = await prisma.workflow.findUnique({ where: { id: defaultWorkflowId } })
      if (wf) {
        const config = wf.config as any
        const nodes = config?.nodes || []
        console.log(`\n🎯 Workflow que o bot está usando:`)
        console.log(`   ID: ${wf.id}`)
        console.log(`   Nome: ${wf.name}`)
        console.log(`   Nodes: ${nodes.length}`)
        console.log(`   Edges: ${config?.edges?.length || 0}`)
      }
    }

  } catch (error) {
    console.error('❌ Erro ao verificar workflow padrão:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

checkDefaultWorkflow()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Falha:', error)
    process.exit(1)
  })

