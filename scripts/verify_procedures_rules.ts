import prisma from '../api/prisma/client.js'

async function verifyProceduresRules() {
  console.log('🔍 Verificando procedimentos e regras...\n')
  
  try {
    const procedures = await prisma.procedure.findMany({
      select: { code: true, name: true }
    })
    
    const rules = await prisma.procedureRule.findMany({
      select: { procedureCode: true }
    })
    
    const procedureCodes = new Set(procedures.map(p => p.code))
    const ruleCodes = new Set(rules.map(r => r.procedureCode))
    
    console.log(`📊 Estatísticas:`)
    console.log(`   - Procedimentos no banco: ${procedures.length}`)
    console.log(`   - Regras no banco: ${rules.length}`)
    
    const missingRules = procedures.filter(p => !ruleCodes.has(p.code))
    const extraRules = rules.filter(r => !procedureCodes.has(r.procedureCode))
    
    if (missingRules.length > 0) {
      console.log(`\n⚠️  Procedimentos SEM regras (${missingRules.length}):`)
      missingRules.forEach(p => {
        console.log(`   - ${p.code}: ${p.name}`)
      })
    }
    
    if (extraRules.length > 0) {
      console.log(`\n⚠️  Regras SEM procedimentos correspondentes (${extraRules.length}):`)
      extraRules.forEach(r => {
        console.log(`   - ${r.procedureCode}`)
      })
    }
    
    if (missingRules.length === 0 && extraRules.length === 0) {
      console.log('\n✅ Todos os procedimentos têm regras correspondentes!')
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

verifyProceduresRules()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
