import prisma from '../api/prisma/client.js'

async function updateAcupunturaRule() {
  console.log('🔄 Atualizando regra de Acupuntura...')
  
  try {
    const updated = await prisma.procedureRule.update({
      where: { procedureCode: 'ACUPUNTURA' },
      data: {
        evaluationIncludesFirstSession: true
      }
    })
    
    console.log('✅ Regra de Acupuntura atualizada!')
    console.log('   - evaluationIncludesFirstSession: true')
    console.log('   - Agora a avaliação (R$ 200) já inclui a primeira sessão')
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
