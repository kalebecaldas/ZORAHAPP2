import prisma from '../api/prisma/client.js'

async function updateAllRulesDefault() {
  console.log('🔄 Atualizando todas as regras para ter evaluationIncludesFirstSession = true por padrão...')
  
  try {
    const result = await prisma.procedureRule.updateMany({
      data: {
        evaluationIncludesFirstSession: true
      }
    })
    
    console.log(`✅ ${result.count} regras atualizadas!`)
    console.log('   - evaluationIncludesFirstSession agora é true para todos os procedimentos')
  } catch (error) {
    console.error('❌ Erro ao atualizar regras:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

updateAllRulesDefault()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
