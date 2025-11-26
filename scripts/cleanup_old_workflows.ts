import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanupOldWorkflows() {
  try {
    console.log('🧹 Limpando workflows antigos/inativos...\n')
    
    // Buscar workflow ativo
    const activeWorkflow = await prisma.workflow.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    })
    
    if (!activeWorkflow) {
      console.log('❌ Nenhum workflow ativo encontrado!')
      console.log('   Não é seguro continuar sem um workflow ativo.')
      return
    }
    
    console.log(`✅ Workflow ativo encontrado:`)
    console.log(`   ID: ${activeWorkflow.id}`)
    console.log(`   Nome: ${activeWorkflow.name}`)
    console.log(`   Criado em: ${activeWorkflow.createdAt}\n`)
    
    // Buscar todos os workflows
    const allWorkflows = await prisma.workflow.findMany({
      orderBy: { createdAt: 'desc' }
    })
    
    console.log(`📊 Total de workflows no banco: ${allWorkflows.length}\n`)
    
    // Separar workflows para manter e deletar
    const workflowsToKeep = [activeWorkflow.id]
    const workflowsToDelete = allWorkflows.filter(w => !workflowsToKeep.includes(w.id))
    
    console.log(`📋 Workflows para MANTER: 1`)
    console.log(`   - ${activeWorkflow.name} (${activeWorkflow.id})\n`)
    
    console.log(`🗑️  Workflows para DELETAR: ${workflowsToDelete.length}`)
    workflowsToDelete.forEach((w, idx) => {
      console.log(`   ${idx + 1}. ${w.name} (${w.id})`)
      console.log(`      Criado: ${w.createdAt}`)
      console.log(`      Ativo: ${w.isActive}`)
    })
    
    if (workflowsToDelete.length === 0) {
      console.log('\n✅ Nenhum workflow para deletar!')
      return
    }
    
    // Confirmar antes de deletar
    console.log('\n⚠️  ATENÇÃO: Esta operação é IRREVERSÍVEL!')
    console.log(`   Você está prestes a deletar ${workflowsToDelete.length} workflow(s).`)
    console.log(`   Apenas o workflow ativo será mantido.\n`)
    
    // Se executado via script, usar flag --yes para confirmar
    const args = process.argv.slice(2)
    const confirmed = args.includes('--yes') || args.includes('-y')
    
    if (!confirmed) {
      console.log('❌ Operação cancelada por segurança.')
      console.log('   Use --yes ou -y para confirmar a exclusão.')
      console.log('   Exemplo: npm run cleanup:workflows -- --yes\n')
      return
    }
    
    console.log('🗑️  Deletando workflows...\n')
    
    let deletedCount = 0
    let errorCount = 0
    
    for (const workflow of workflowsToDelete) {
      try {
        await prisma.workflow.delete({
          where: { id: workflow.id }
        })
        console.log(`   ✅ Deletado: ${workflow.name}`)
        deletedCount++
      } catch (error: any) {
        console.log(`   ❌ Erro ao deletar ${workflow.name}: ${error.message}`)
        errorCount++
      }
    }
    
    console.log(`\n📊 Resultado:`)
    console.log(`   ✅ Deletados: ${deletedCount}`)
    console.log(`   ❌ Erros: ${errorCount}`)
    console.log(`   📌 Mantidos: 1 (workflow ativo)`)
    
    // Verificar resultado final
    const remainingWorkflows = await prisma.workflow.findMany()
    console.log(`\n✅ Workflows restantes no banco: ${remainingWorkflows.length}`)
    remainingWorkflows.forEach(w => {
      console.log(`   - ${w.name} (${w.isActive ? 'ATIVO' : 'inativo'})`)
    })
    
    console.log('\n🎯 Limpeza concluída!')
    
  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

cleanupOldWorkflows()

