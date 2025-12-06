import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

async function checkActiveWorkflow() {
  try {
    console.log('🔍 Verificando workflow usado pelo bot (via AuditLog)...\n')

    // Buscar workflow padrão via AuditLog (o que o bot realmente usa)
    const latest = await prisma.auditLog.findFirst({ 
      where: { action: 'DEFAULT_WORKFLOW' }, 
      orderBy: { createdAt: 'desc' } 
    })

    let workflowInUse = null
    if (latest) {
      const details: any = latest.details as any
      if (details?.id) {
        workflowInUse = await prisma.workflow.findUnique({ where: { id: String(details.id) } })
      }
    }

    // Fallback para workflow ativo se não houver no AuditLog
    if (!workflowInUse) {
      workflowInUse = await prisma.workflow.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' }
      })
    }

    if (!workflowInUse) {
      console.log('❌ Nenhum workflow encontrado no banco')
      return
    }

    const config = workflowInUse.config as any
    const nodes = config?.nodes || []
    const edges = config?.edges || []

    console.log('📊 Workflow Usado pelo Bot:')
    console.log(`   ID: ${workflowInUse.id}`)
    console.log(`   Nome: ${workflowInUse.name}`)
    console.log(`   Descrição: ${workflowInUse.description || 'N/A'}`)
    console.log(`   Nodes: ${nodes.length}`)
    console.log(`   Edges: ${edges.length}`)
    console.log(`   Ativo (isActive): ${workflowInUse.isActive ? 'SIM' : 'NÃO'}`)
    console.log(`   Fonte: ${latest ? 'AuditLog (DEFAULT_WORKFLOW)' : 'isActive: true'}`)
    console.log(`   Criado em: ${workflowInUse.createdAt}\n`)

    // Ler workflow_to_sync.json
    const workflowPath = path.join(process.cwd(), 'workflow_to_sync.json')
    if (!fs.existsSync(workflowPath)) {
      console.log('❌ Arquivo workflow_to_sync.json não encontrado')
      return
    }

    const workflowData = JSON.parse(fs.readFileSync(workflowPath, 'utf8'))
    const fileNodes = workflowData.config?.nodes || workflowData.nodes || []
    const fileEdges = workflowData.config?.edges || workflowData.edges || []

    console.log('📄 Arquivo workflow_to_sync.json:')
    console.log(`   Nome: ${workflowData.name}`)
    console.log(`   Descrição: ${workflowData.description || 'N/A'}`)
    console.log(`   Nodes: ${fileNodes.length}`)
    console.log(`   Edges: ${fileEdges.length}\n`)

    // Comparar
    console.log('🔍 Comparação:')
    const sameName = workflowInUse.name === workflowData.name
    const sameNodeCount = nodes.length === fileNodes.length
    const sameEdgeCount = edges.length === fileEdges.length

    console.log(`   Nome: ${sameName ? '✅ IGUAL' : '❌ DIFERENTE'}`)
    console.log(`   Nodes: ${sameNodeCount ? '✅ IGUAL' : `❌ DIFERENTE (Banco: ${nodes.length}, Arquivo: ${fileNodes.length})`}`)
    console.log(`   Edges: ${sameEdgeCount ? '✅ IGUAL' : `❌ DIFERENTE (Banco: ${edges.length}, Arquivo: ${fileEdges.length})`}`)

    if (sameName && sameNodeCount && sameEdgeCount) {
      console.log('\n✅ O workflow_to_sync.json é o mesmo que está ativo no banco local!')
      
      // Comparar IDs dos nodes para ter certeza
      const dbNodeIds = nodes.map((n: any) => n.id).sort()
      const fileNodeIds = fileNodes.map((n: any) => n.id).sort()
      const sameNodeIds = JSON.stringify(dbNodeIds) === JSON.stringify(fileNodeIds)
      
      if (sameNodeIds) {
        console.log('✅ Os IDs dos nodes também são idênticos!')
      } else {
        console.log('⚠️  Os IDs dos nodes são diferentes (mas a quantidade é igual)')
        console.log(`   Primeiros 5 IDs do banco: ${dbNodeIds.slice(0, 5).join(', ')}`)
        console.log(`   Primeiros 5 IDs do arquivo: ${fileNodeIds.slice(0, 5).join(', ')}`)
      }
    } else {
      console.log('\n❌ O workflow_to_sync.json NÃO é o mesmo que está ativo no banco local!')
      console.log('\n💡 Para sincronizar:')
      console.log('   1. Exporte o workflow ativo do banco')
      console.log('   2. Salve como workflow_to_sync.json')
      console.log('   3. Ou execute: npm run sync:workflow:railway')
    }

  } catch (error) {
    console.error('❌ Erro ao verificar workflow:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

checkActiveWorkflow()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Falha:', error)
    process.exit(1)
  })

