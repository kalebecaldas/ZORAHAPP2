import prisma from '../api/prisma/client.js'

async function updateAcupunturaRule() {
  console.log('🔄 Atualizando regra de Acupuntura...')
  
  try {
    const updated = await prisma.procedureRule.update({
      where: { procedureCode: 'ACUPUNTURA' },
      data: {
        requiresEvaluation: false, // Desmarcar "Requer Avaliação"
        evaluationPrice: 200, // Manter preço
        evaluationIncludesFirstSession: true // Manter marcado (já é padrão agora)
      }
    })
    
    console.log('✅ Regra de Acupuntura atualizada!')
    console.log('   - requiresEvaluation: false (desmarcado)')
    console.log('   - evaluationPrice: 200')
    console.log('   - evaluationIncludesFirstSession: true (padrão)')
    console.log('   - Agora mostra: "Avaliação + Primeira Sessão: R$ 200"')
  } catch (error) {
    console.error('❌ Erro ao atualizar regra:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

updateAcupunturaRule()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
