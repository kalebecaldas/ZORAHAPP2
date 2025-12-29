import prisma from '../api/prisma/client.js'

async function verifyRules() {
  console.log('📊 Verificando população de regras...\n')
  
  try {
    // Contar registros
    const stats = {
      responseRules: await prisma.responseRule.count(),
      procedureRules: await prisma.procedureRule.count(),
      insuranceRules: await prisma.insuranceRule.count(),
      procedures: await prisma.procedure.count(),
      insurances: await prisma.insuranceCompany.count()
    }
    
    console.log('📈 Estatísticas do Banco:')
    console.log(`  ResponseRules: ${stats.responseRules}`)
    console.log(`  ProcedureRules: ${stats.procedureRules} (deve ser igual a Procedures: ${stats.procedures})`)
    console.log(`  InsuranceRules: ${stats.insuranceRules} (deve ser igual a Insurances: ${stats.insurances})`)
    
    // Validar se todos os procedimentos têm regras
    if (stats.procedureRules === stats.procedures) {
      console.log('  ✅ Todos os procedimentos têm regras')
    } else {
      console.log(`  ⚠️  Faltam regras para ${stats.procedures - stats.procedureRules} procedimentos`)
    }
    
    // Validar se todos os convênios têm regras
    if (stats.insuranceRules === stats.insurances) {
      console.log('  ✅ Todos os convênios têm regras')
    } else {
      console.log(`  ⚠️  Faltam regras para ${stats.insurances - stats.insuranceRules} convênios`)
    }
    
    console.log('\n')
    
    // Verificar exemplos específicos de ProcedureRules
    console.log('🔍 Exemplos de ProcedureRules:')
    const procedureRulesExamples = await prisma.procedureRule.findMany({
      take: 5,
      where: {
        requiresEvaluation: true
      }
    })
    
    if (procedureRulesExamples.length > 0) {
      console.log('\n  Procedimentos que requerem avaliação:')
      for (const rule of procedureRulesExamples) {
        console.log(`    • ${rule.procedureCode}:`)
        console.log(`      - Preço avaliação: R$ ${rule.evaluationPrice}`)
        console.log(`      - Avaliação em pacote: ${rule.evaluationInPackage}`)
        if (rule.customMessage) {
          console.log(`      - Mensagem: ${rule.customMessage}`)
        }
      }
    }
    
    console.log('\n')
    
    // Verificar exemplos específicos de InsuranceRules
    console.log('🔍 Exemplos de InsuranceRules:')
    const insuranceRulesExamples = await prisma.insuranceRule.findMany({
      take: 5
    })
    
    if (insuranceRulesExamples.length > 0) {
      console.log('\n  Convênios:')
      for (const rule of insuranceRulesExamples) {
        console.log(`    • ${rule.insuranceCode}:`)
        console.log(`      - Mostrar procedimentos cobertos: ${rule.showCoveredProcedures}`)
        console.log(`      - Esconder valores: ${rule.hideValues}`)
        console.log(`      - Pode mostrar desconto: ${rule.canShowDiscount}`)
        if (rule.customGreeting) {
          console.log(`      - Saudação: ${rule.customGreeting.substring(0, 50)}...`)
        }
      }
    }
    
    console.log('\n')
    
    // Verificar templates de resposta
    console.log('🔍 Templates de Resposta (ResponseRules):')
    const responseRules = await prisma.responseRule.findMany({
      orderBy: { priority: 'desc' }
    })
    
    if (responseRules.length > 0) {
      console.log('\n  Templates por intenção:')
      for (const rule of responseRules) {
        console.log(`    • ${rule.intent} (${rule.context || 'geral'}):`)
        console.log(`      - Prioridade: ${rule.priority}`)
        console.log(`      - Target: ${rule.targetType || 'general'}`)
        if (rule.description) {
          console.log(`      - Descrição: ${rule.description}`)
        }
      }
    }
    
    console.log('\n✅ Verificação concluída!')
    
    // Resumo final
    console.log('\n📋 Resumo:')
    const allGood = 
      stats.procedureRules === stats.procedures && 
      stats.insuranceRules === stats.insurances &&
      stats.responseRules > 0
    
    if (allGood) {
      console.log('  ✅ Todas as regras foram populadas corretamente!')
      console.log('  ✅ Sistema pronto para uso!')
    } else {
      console.log('  ⚠️  Algumas inconsistências encontradas. Revise os logs acima.')
    }
    
  } catch (error) {
    console.error('❌ Erro durante verificação:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

verifyRules()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
