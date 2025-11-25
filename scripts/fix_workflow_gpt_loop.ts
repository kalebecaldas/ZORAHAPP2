import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixWorkflowGPTLoop() {
  console.log('🔧 Ajustando workflow para voltar ao GPT classifier após respostas...\n')

  try {
    // Buscar workflow ativo
    const workflow = await prisma.workflow.findUnique({
      where: { id: 'cmibu88ho0000jizqbv1g3vj0' }
    })

    if (!workflow) {
      console.error('❌ Workflow não encontrado')
      process.exit(1)
    }

    console.log(`✅ Workflow encontrado: ${workflow.name}`)

    // Parse config
    const config = typeof workflow.config === 'string' 
      ? JSON.parse(workflow.config) 
      : workflow.config || {}

    const nodes = Array.isArray(config.nodes) ? config.nodes : []
    const edges = Array.isArray(config.edges) ? config.edges : []

    console.log(`📊 Nós: ${nodes.length}, Conexões: ${edges.length}`)

    // Encontrar nó GPT classifier
    let gptClassifierNode = nodes.find((n: any) => 
      n.type === 'GPT_RESPONSE' && n.id === 'gpt_classifier'
    )

    if (!gptClassifierNode) {
      gptClassifierNode = nodes.find((n: any) => {
        if (n.type !== 'GPT_RESPONSE') return false
        const prompt = (n.data?.systemPrompt || n.content?.systemPrompt || '').toLowerCase()
        return prompt.includes('classificador') || prompt.includes('classificar') || prompt.includes('intenção')
      })
    }

    if (!gptClassifierNode) {
      gptClassifierNode = nodes.find((n: any) => n.type === 'GPT_RESPONSE')
    }

    if (!gptClassifierNode) {
      console.error('❌ Nenhum nó GPT_RESPONSE encontrado no workflow')
      console.log('💡 Crie um nó GPT_RESPONSE com ID "gpt_classifier" no workflow editor')
      process.exit(1)
    }

    console.log(`✅ GPT Classifier encontrado: ${gptClassifierNode.id}`)

    // Encontrar todos os nós MESSAGE que devem voltar ao GPT
    const messageNodes = nodes.filter((n: any) => 
      n.type === 'MESSAGE' && 
      n.id !== 'start' &&
      !n.id.includes('welcome') &&
      !n.id.includes('end')
    )

    console.log(`📝 Nós MESSAGE encontrados: ${messageNodes.length}`)

    // Verificar quais já têm conexão de volta ao GPT
    const nodesNeedingConnection: string[] = []
    
    for (const msgNode of messageNodes) {
      const hasConnectionToGPT = edges.some((e: any) => 
        e.source === msgNode.id && 
        e.target === gptClassifierNode.id
      )

      if (!hasConnectionToGPT) {
        nodesNeedingConnection.push(msgNode.id)
      }
    }

    console.log(`\n🔗 Nós que precisam de conexão ao GPT: ${nodesNeedingConnection.length}`)

    if (nodesNeedingConnection.length === 0) {
      console.log('✅ Todos os nós MESSAGE já têm conexão de volta ao GPT classifier!')
      return
    }

    // Criar conexões de volta ao GPT
    const newEdges = [...edges]
    let addedCount = 0

    for (const nodeId of nodesNeedingConnection) {
      const edgeId = `edge_${nodeId}_to_gpt_classifier`
      
      // Verificar se já existe uma edge com esse ID
      if (!newEdges.find((e: any) => e.id === edgeId)) {
        newEdges.push({
          id: edgeId,
          source: nodeId,
          target: gptClassifierNode.id,
          sourceHandle: 'output',
          targetHandle: 'input',
          data: {
            port: 'main',
            condition: undefined
          },
          type: 'default'
        })
        addedCount++
        console.log(`  ✅ Adicionada conexão: ${nodeId} → ${gptClassifierNode.id}`)
      }
    }

    if (addedCount > 0) {
      // Atualizar workflow
      const updatedConfig = {
        ...config,
        edges: newEdges
      }

      await prisma.workflow.update({
        where: { id: workflow.id },
        data: {
          config: updatedConfig as any
        }
      })

      console.log(`\n✅ Workflow atualizado! ${addedCount} conexões adicionadas.`)
      console.log(`\n🔄 Reinicie o servidor para aplicar as mudanças.`)
    } else {
      console.log('\n✅ Nenhuma conexão adicional necessária.')
    }

  } catch (error: any) {
    console.error('❌ Erro:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

fixWorkflowGPTLoop()

