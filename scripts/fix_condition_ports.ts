/**
 * Script para corrigir ports de edges em CONDITION nodes
 * 
 * ⚠️ JÁ FOI EXECUTADO EM 24/11/2025
 * 
 * Corrigiu 14 edges que estavam usando 'port: main' quando deveriam usar
 * o token específico da condição (ex: 'acupuntura', 'rpg', 'bradesco')
 * 
 * Para re-executar (se necessário):
 *   node --input-type=module -e "import { PrismaClient } from '@prisma/client'; ..."
 * 
 * Resultado da última execução:
 *   - branch_valores: 8 edges corrigidas
 *   - ask_convenio_procedimentos: 3 edges corrigidas
 *   - info_procedimento_explicacao: 3 edges corrigidas
 *   Total: 14 edges
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixConditionPorts() {
  const wf = await prisma.workflow.findUnique({ 
    where: { id: 'cmid7w6gf0000xgtvf4j0n0qe' } 
  })
  
  if (!wf) {
    console.error('Workflow não encontrado')
    return
  }

  const cfg = typeof wf.config === 'string' ? JSON.parse(wf.config) : wf.config

  console.log('\n🔧 CORRIGINDO PORTS DOS CONDITION NODES\n')

  let fixed = 0

  cfg.edges.forEach((edge: any) => {
    const sourceNode = cfg.nodes.find((n: any) => n.id === edge.source)
    
    if (sourceNode && sourceNode.type === 'CONDITION') {
      const currentPort = edge.data?.port || edge.sourceHandle || edge.port || 'main'
      const condition = edge.data?.condition || edge.condition || ''
      
      // Se port é 'main' e há uma condição, precisamos corrigir
      if (currentPort === 'main' && condition) {
        // Pegar o primeiro token da condição como port
        const tokens = condition.split('|').map((s: string) => s.trim()).filter(Boolean)
        if (tokens.length > 0) {
          const newPort = tokens[0]
          
          console.log(`✅ Corrigindo edge: ${edge.source} → ${edge.target}`)
          console.log(`   Port: ${currentPort} → ${newPort}`)
          console.log(`   Condition: ${condition}`)
          
          // Atualizar o port
          if (!edge.data) edge.data = {}
          edge.data.port = newPort
          edge.sourceHandle = newPort
          
          fixed++
        }
      }
    }
  })

  console.log(`\n📊 Total de edges corrigidas: ${fixed}`)

  if (fixed > 0) {
    console.log('\n💾 Salvando no banco de dados...')
    
    await prisma.workflow.update({
      where: { id: 'cmid7w6gf0000xgtvf4j0n0qe' },
      data: {
        config: cfg
      }
    })
    
    console.log('✅ Salvo com sucesso!')
  } else {
    console.log('\n✅ Nenhuma correção necessária.')
  }

  await prisma.$disconnect()
}

fixConditionPorts().catch(console.error)

