import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface NodeCheck {
  id: string
  type: string
  action?: string
  exists: boolean
  position?: { x: number; y: number }
}

interface EdgeCheck {
  source: string
  target: string
  exists: boolean
}

async function checkWorkflowRailway() {
  try {
    console.log('🔍 Verificando workflow no Railway...\n')
    
    // Verificar se está no Railway
    const isRailway = process.env.RAILWAY_ENVIRONMENT === 'production' || 
                     process.env.RAILWAY_SERVICE_NAME !== undefined ||
                     process.env.DATABASE_URL?.includes('railway')
    
    if (!isRailway) {
      console.log('⚠️  ATENÇÃO: Este script deve ser executado no Railway!')
      console.log('   Use: railway ssh')
      console.log('   Depois: npm run check:workflow:railway\n')
    }
    
    const workflow = await prisma.workflow.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    })
    
    if (!workflow) {
      console.log('❌ Nenhum workflow ativo encontrado!')
      return
    }
    
    console.log(`✅ Workflow encontrado: ${workflow.name}`)
    console.log(`   ID: ${workflow.id}`)
    console.log(`   Criado em: ${workflow.createdAt}`)
    console.log(`   Ativo: ${workflow.isActive}\n`)
    
    const cfg = typeof workflow.config === 'string' 
      ? JSON.parse(workflow.config) 
      : (workflow.config || {})
    
    const nodes = Array.isArray(cfg?.nodes) ? cfg.nodes : []
    const edges = Array.isArray(cfg?.edges) ? cfg.edges : []
    
    console.log(`📊 Estatísticas:`)
    console.log(`   Nós: ${nodes.length}`)
    console.log(`   Conexões: ${edges.length}\n`)
    
    // Nós obrigatórios do fluxo de cadastro
    const requiredNodes: Array<{ id: string; type: string; action?: string; description: string }> = [
      { id: 'create_patient', type: 'ACTION', action: 'create_patient_profile', description: 'Cria o paciente no banco' },
      { id: 'msg_cadastro_sucesso', type: 'MESSAGE', description: 'Mensagem de cadastro realizado' },
      { id: 'action_get_procedimentos_insurance', type: 'ACTION', action: 'get_procedures_by_insurance', description: 'Busca procedimentos do convênio' },
      { id: 'msg_procedimentos_insurance', type: 'MESSAGE', description: 'Mostra procedimentos disponíveis' },
      { id: 'transfer_to_queue', type: 'TRANSFER_HUMAN', description: 'Transfere para fila' }
    ]
    
    console.log('🔍 Verificando nós obrigatórios:\n')
    const nodeChecks: NodeCheck[] = []
    
    for (const required of requiredNodes) {
      const node = nodes.find((n: any) => n.id === required.id)
      const exists = !!node
      
      nodeChecks.push({
        id: required.id,
        type: required.type,
        action: required.action,
        exists,
        position: node?.position
      })
      
      if (exists) {
        const nodeType = node.type || node.data?.type || 'N/A'
        const nodeAction = node.data?.action || node.content?.action || 'N/A'
        
        console.log(`  ✅ ${required.id}`)
        console.log(`     Tipo: ${nodeType} ${nodeType !== required.type ? '⚠️ (esperado: ' + required.type + ')' : ''}`)
        if (required.action) {
          console.log(`     Action: ${nodeAction} ${nodeAction !== required.action ? '⚠️ (esperado: ' + required.action + ')' : ''}`)
        }
        console.log(`     Descrição: ${required.description}`)
      } else {
        console.log(`  ❌ ${required.id} - NÃO ENCONTRADO`)
        console.log(`     Tipo esperado: ${required.type}`)
        if (required.action) {
          console.log(`     Action esperada: ${required.action}`)
        }
        console.log(`     Descrição: ${required.description}`)
      }
      console.log()
    }
    
    // Verificar conexões obrigatórias
    console.log('🔗 Verificando conexões obrigatórias:\n')
    const requiredEdges: Array<{ source: string; target: string; description: string }> = [
      { source: 'create_patient', target: 'msg_cadastro_sucesso', description: 'Após criar paciente, mostra mensagem' },
      { source: 'msg_cadastro_sucesso', target: 'action_get_procedimentos_insurance', description: 'Após mensagem, busca procedimentos' },
      { source: 'action_get_procedimentos_insurance', target: 'msg_procedimentos_insurance', description: 'Após buscar, mostra procedimentos' },
      { source: 'msg_procedimentos_insurance', target: 'transfer_to_queue', description: 'Após mostrar, transfere para fila' }
    ]
    
    const edgeChecks: EdgeCheck[] = []
    
    for (const required of requiredEdges) {
      const edge = edges.find((e: any) => e.source === required.source && e.target === required.target)
      const exists = !!edge
      
      edgeChecks.push({
        source: required.source,
        target: required.target,
        exists
      })
      
      if (exists) {
        console.log(`  ✅ ${required.source} → ${required.target}`)
        console.log(`     ${required.description}`)
      } else {
        console.log(`  ❌ ${required.source} → ${required.target} - NÃO ENCONTRADO`)
        console.log(`     ${required.description}`)
      }
      console.log()
    }
    
    // Resumo
    const missingNodes = nodeChecks.filter(n => !n.exists)
    const missingEdges = edgeChecks.filter(e => !e.exists)
    
    console.log('📋 RESUMO:\n')
    console.log(`   Nós encontrados: ${nodeChecks.filter(n => n.exists).length}/${requiredNodes.length}`)
    console.log(`   Conexões encontradas: ${edgeChecks.filter(e => e.exists).length}/${requiredEdges.length}`)
    
    if (missingNodes.length > 0) {
      console.log(`\n   ⚠️  Nós faltando: ${missingNodes.length}`)
      missingNodes.forEach(n => {
        console.log(`      - ${n.id} (${n.type}${n.action ? ', action: ' + n.action : ''})`)
      })
    }
    
    if (missingEdges.length > 0) {
      console.log(`\n   ⚠️  Conexões faltando: ${missingEdges.length}`)
      missingEdges.forEach(e => {
        console.log(`      - ${e.source} → ${e.target}`)
      })
    }
    
    if (missingNodes.length === 0 && missingEdges.length === 0) {
      console.log('\n   ✅ Workflow completo! Todos os nós e conexões estão presentes.')
    } else {
      console.log('\n   ⚠️  Workflow incompleto! Execute a sincronização:')
      console.log('      npm run sync:workflow:railway:upload')
    }
    
    // Verificar se há conexões duplicadas ou incorretas
    console.log('\n🔍 Verificando conexões problemáticas:\n')
    const cadastroEdges = edges.filter((e: any) => e.source === 'msg_cadastro_sucesso')
    if (cadastroEdges.length > 1) {
      console.log('   ⚠️  Múltiplas conexões de msg_cadastro_sucesso encontradas:')
      cadastroEdges.forEach((e: any) => {
        console.log(`      → ${e.target}`)
      })
      
      const directConnection = cadastroEdges.find((e: any) => e.target === 'msg_procedimentos_insurance')
      if (directConnection) {
        console.log('\n   ❌ PROBLEMA: Conexão direta de msg_cadastro_sucesso para msg_procedimentos_insurance!')
        console.log('      Isso faz o fluxo PULAR o action_get_procedimentos_insurance!')
        console.log('      Execute: npm run fix:duplicate-edges')
      }
    } else {
      console.log('   ✅ Nenhuma conexão duplicada encontrada')
    }
    
  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkWorkflowRailway()

