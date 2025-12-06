import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

async function exportWorkflow28() {
  try {
    console.log('📥 Exportando workflow de 28 nós do banco...\n')

    // Buscar workflow de 28 nós
    const workflows = await prisma.workflow.findMany()
    const workflow28 = workflows.find(wf => {
      const config = wf.config as any
      const nodes = config?.nodes || []
      return nodes.length === 28
    })

    if (!workflow28) {
      console.log('❌ Nenhum workflow com 28 nós encontrado no banco')
      return
    }

    const config = workflow28.config as any
    const nodes = config?.nodes || []
    const edges = config?.edges || []

    console.log('📊 Workflow encontrado:')
    console.log(`   ID: ${workflow28.id}`)
    console.log(`   Nome: ${workflow28.name}`)
    console.log(`   Nodes: ${nodes.length}`)
    console.log(`   Edges: ${edges.length}`)
    console.log(`   Ativo: ${workflow28.isActive ? 'SIM' : 'NÃO'}\n`)

    // Criar objeto no formato do workflow_to_sync.json
    const exportData = {
      id: workflow28.id,
      name: workflow28.name,
      description: workflow28.description || '',
      isActive: true,
      config: {
        nodes: nodes,
        edges: edges
      }
    }

    // Salvar como workflow_to_sync.json
    const outputPath = path.join(process.cwd(), 'workflow_to_sync.json')
    fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2))

    console.log(`✅ Workflow exportado para: ${outputPath}`)
    console.log(`\n📋 Resumo:`)
    console.log(`   Nodes: ${nodes.length}`)
    console.log(`   Edges: ${edges.length}`)
    console.log(`\n💡 Agora você pode usar este arquivo para sincronizar com o Railway`)

  } catch (error) {
    console.error('❌ Erro ao exportar workflow:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

exportWorkflow28()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Falha:', error)
    process.exit(1)
  })

