import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function listAllWorkflows() {
  try {
    console.log('📋 Listando todos os workflows no banco local...\n')

    const workflows = await prisma.workflow.findMany({
      orderBy: { createdAt: 'desc' }
    })

    if (workflows.length === 0) {
      console.log('❌ Nenhum workflow encontrado no banco')
      return
    }

    console.log(`📊 Total de workflows: ${workflows.length}\n`)

    workflows.forEach((wf, index) => {
      const config = wf.config as any
      const nodes = config?.nodes || []
      const edges = config?.edges || []
      
      console.log(`${index + 1}. ${wf.name}`)
      console.log(`   ID: ${wf.id}`)
      console.log(`   Nodes: ${nodes.length} | Edges: ${edges.length}`)
      console.log(`   Ativo: ${wf.isActive ? '🟢 SIM' : '⚪ NÃO'}`)
      console.log(`   Criado em: ${wf.createdAt}`)
      console.log('')
    })

    // Encontrar workflows com 28 nós
    const workflows28 = workflows.filter(wf => {
      const config = wf.config as any
      const nodes = config?.nodes || []
      return nodes.length === 28
    })

    if (workflows28.length > 0) {
      console.log(`\n✅ Encontrados ${workflows28.length} workflow(s) com 28 nós:\n`)
      workflows28.forEach(wf => {
        console.log(`   - ${wf.name} (ID: ${wf.id}, Ativo: ${wf.isActive ? 'SIM' : 'NÃO'})`)
      })
    } else {
      console.log('\n⚠️  Nenhum workflow com 28 nós encontrado no banco')
    }

  } catch (error) {
    console.error('❌ Erro ao listar workflows:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

listAllWorkflows()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Falha:', error)
    process.exit(1)
  })

