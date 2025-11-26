import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixDuplicateEdges() {
  try {
    console.log('🔍 Procurando workflow ativo...')
    
    const workflow = await prisma.workflow.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    })
    
    if (!workflow) {
      console.log('❌ Nenhum workflow ativo encontrado!')
      return
    }
    
    console.log(`✅ Workflow encontrado: ${workflow.name} (${workflow.id})`)
    
    const cfg = typeof workflow.config === 'string' 
      ? JSON.parse(workflow.config) 
      : (workflow.config || {})
    
    const nodes = Array.isArray(cfg?.nodes) ? cfg.nodes : []
    const edges = Array.isArray(cfg?.edges) ? cfg.edges : []
    
    console.log(`📊 Estado atual:`)
    console.log(`   Nós: ${nodes.length}`)
    console.log(`   Conexões: ${edges.length}`)
    
    // Verificar conexões de msg_cadastro_sucesso
    const cadastroEdges = edges.filter((e: any) => e.source === 'msg_cadastro_sucesso')
    console.log(`\n🔍 Conexões de msg_cadastro_sucesso: ${cadastroEdges.length}`)
    cadastroEdges.forEach((e: any) => {
      console.log(`   → ${e.target}`)
    })
    
    // Verificar se há conexão direta para msg_procedimentos_insurance
    const directConnection = edges.find((e: any) => 
      e.source === 'msg_cadastro_sucesso' && 
      e.target === 'msg_procedimentos_insurance'
    )
    
    if (directConnection) {
      console.log('\n⚠️ PROBLEMA ENCONTRADO:')
      console.log('   Há uma conexão DIRETA de msg_cadastro_sucesso para msg_procedimentos_insurance!')
      console.log('   Isso faz o fluxo PULAR o action_get_procedimentos_insurance!')
      
      // Remover conexão duplicada/incorreta
      const fixedEdges = edges.filter((e: any) => 
        !(e.source === 'msg_cadastro_sucesso' && e.target === 'msg_procedimentos_insurance')
      )
      
      console.log(`\n🔧 Removendo conexão incorreta...`)
      console.log(`   Conexões antes: ${edges.length}`)
      console.log(`   Conexões depois: ${fixedEdges.length}`)
      
      // Verificar se o fluxo correto existe
      const actionEdge = fixedEdges.find((e: any) => 
        e.source === 'msg_cadastro_sucesso' && 
        e.target === 'action_get_procedimentos_insurance'
      )
      
      const msgEdge = fixedEdges.find((e: any) => 
        e.source === 'action_get_procedimentos_insurance' && 
        e.target === 'msg_procedimentos_insurance'
      )
      
      const transferEdge = fixedEdges.find((e: any) => 
        e.source === 'msg_procedimentos_insurance' && 
        e.target === 'transfer_to_queue'
      )
      
      console.log(`\n✅ Verificando fluxo correto:`)
      console.log(`   ${actionEdge ? '✅' : '❌'} msg_cadastro_sucesso -> action_get_procedimentos_insurance`)
      console.log(`   ${msgEdge ? '✅' : '❌'} action_get_procedimentos_insurance -> msg_procedimentos_insurance`)
      console.log(`   ${transferEdge ? '✅' : '❌'} msg_procedimentos_insurance -> transfer_to_queue`)
      
      if (actionEdge && msgEdge && transferEdge) {
        // Atualizar workflow
        const updatedConfig = {
          ...cfg,
          edges: fixedEdges
        }
        
        await prisma.workflow.update({
          where: { id: workflow.id },
          data: {
            config: updatedConfig
          }
        })
        
        console.log(`\n✅ Workflow corrigido com sucesso!`)
        console.log(`   Conexão duplicada removida`)
        console.log(`   Fluxo correto mantido`)
      } else {
        console.log(`\n⚠️ ATENÇÃO: Fluxo correto não está completo!`)
        console.log(`   Não foi possível corrigir automaticamente.`)
        console.log(`   Verifique manualmente no editor.`)
      }
    } else {
      console.log('\n✅ Nenhum problema encontrado!')
      console.log('   As conexões estão corretas.')
    }
    
  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixDuplicateEdges()

