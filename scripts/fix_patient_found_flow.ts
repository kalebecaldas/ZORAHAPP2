import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixPatientFoundFlow() {
  try {
    console.log('🔧 Unificando fluxos de cadastro novo e paciente encontrado...\n')
    
    const workflow = await prisma.workflow.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    })
    
    if (!workflow) {
      console.log('❌ Nenhum workflow ativo encontrado!')
      return
    }
    
    const cfg = typeof workflow.config === 'string' 
      ? JSON.parse(workflow.config) 
      : (workflow.config || {})
    
    let nodes = Array.isArray(cfg?.nodes) ? cfg.nodes : []
    let edges = Array.isArray(cfg?.edges) ? cfg.edges : []
    
    console.log(`📋 Workflow: ${workflow.name}`)
    console.log(`   Nós: ${nodes.length}, Conexões: ${edges.length}\n`)
    
    // Verificar nós duplicados
    const duplicatedNodes = [
      'action_get_procedimentos_insurance_encontrado',
      'msg_procedimentos_insurance_encontrado',
      'transfer_to_queue_encontrado'
    ]
    
    console.log('🔍 Verificando nós duplicados:')
    duplicatedNodes.forEach(nodeId => {
      const exists = nodes.some((n: any) => n.id === nodeId)
      console.log(`   ${exists ? '⚠️' : '✅'} ${nodeId} ${exists ? '(DUPLICADO - será removido)' : '(não existe)'}`)
    })
    
    // Verificar conexões atuais
    console.log('\n🔗 Conexões atuais:')
    console.log('   msg_cadastro_sucesso → ', edges.find((e: any) => e.source === 'msg_cadastro_sucesso')?.target || 'NADA')
    console.log('   msg_paciente_encontrado → ', edges.find((e: any) => e.source === 'msg_paciente_encontrado')?.target || 'NADA')
    
    // Criar backup
    console.log('\n💾 Criando backup do workflow...')
    const backupFilename = `workflow_backup_${Date.now()}.json`
    await import('fs/promises').then(fs => 
      fs.writeFile(backupFilename, JSON.stringify({ nodes, edges }, null, 2))
    )
    console.log(`   Backup salvo em: ${backupFilename}`)
    
    // Remover nós duplicados
    console.log('\n🗑️ Removendo nós duplicados...')
    const nodesToRemove = duplicatedNodes
    nodes = nodes.filter((n: any) => !nodesToRemove.includes(n.id))
    console.log(`   Nós removidos: ${nodesToRemove.length}`)
    console.log(`   Nós restantes: ${nodes.length}`)
    
    // Redirecionar conexões para usar os nós unificados
    console.log('\n🔄 Redirecionando conexões...')
    edges = edges.map((e: any) => {
      // Redirecionar para action_get_procedimentos_insurance (principal)
      if (e.target === 'action_get_procedimentos_insurance_encontrado') {
        console.log(`   Redirecionando: ${e.source} → action_get_procedimentos_insurance`)
        return {
          ...e,
          id: `edge-${e.source}-action_get_procedimentos_insurance`,
          target: 'action_get_procedimentos_insurance'
        }
      }
      
      // Redirecionar para msg_procedimentos_insurance (principal)
      if (e.target === 'msg_procedimentos_insurance_encontrado') {
        console.log(`   Redirecionando: ${e.source} → msg_procedimentos_insurance`)
        return {
          ...e,
          id: `edge-${e.source}-msg_procedimentos_insurance`,
          target: 'msg_procedimentos_insurance'
        }
      }
      
      // Redirecionar para transfer_to_queue (principal)
      if (e.target === 'transfer_to_queue_encontrado') {
        console.log(`   Redirecionando: ${e.source} → transfer_to_queue`)
        return {
          ...e,
          id: `edge-${e.source}-transfer_to_queue`,
          target: 'transfer_to_queue'
        }
      }
      
      return e
    })
    
    // Remover edges dos nós removidos
    edges = edges.filter((e: any) => 
      !nodesToRemove.includes(e.source) && 
      !nodesToRemove.includes(e.target)
    )
    
    console.log(`   Conexões atualizadas: ${edges.length}`)
    
    // Verificar fluxo final
    console.log('\n✅ Fluxo unificado:')
    console.log('   msg_cadastro_sucesso → ', edges.find((e: any) => e.source === 'msg_cadastro_sucesso')?.target || 'NADA')
    console.log('   msg_paciente_encontrado → ', edges.find((e: any) => e.source === 'msg_paciente_encontrado')?.target || 'NADA')
    console.log('\n   Ambos agora usam os MESMOS nós:')
    console.log('   → action_get_procedimentos_insurance')
    console.log('   → msg_procedimentos_insurance')
    console.log('   → transfer_to_queue')
    
    // Atualizar workflow
    console.log('\n💾 Atualizando workflow...')
    const updatedConfig = {
      ...cfg,
      nodes,
      edges
    }
    
    await prisma.workflow.update({
      where: { id: workflow.id },
      data: {
        config: updatedConfig
      }
    })
    
    console.log('✅ Workflow atualizado com sucesso!')
    console.log(`   Nós: ${nodes.length} (removidos: ${nodesToRemove.length})`)
    console.log(`   Conexões: ${edges.length}`)
    console.log('\n🎯 Agora ambos os fluxos (cadastro novo e paciente encontrado) compartilham os mesmos nós!')
    
  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixPatientFoundFlow()

