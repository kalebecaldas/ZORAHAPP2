import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'
import { join } from 'path'

const prisma = new PrismaClient()

// Mapeamento de nomes para códigos
const PROCEDURE_NAME_MAP: Record<string, string> = {
  'Acupuntura': 'acupuntura',
  'Consulta com Ortopedista': 'consulta-ortopedista',
  'Consulta Ortopédica': 'consulta-ortopedista',
  'Fisioterapia Neurológica': 'fisioterapia-neurologica',
  'Fisioterapia Ortopédica': 'fisioterapia-ortopedica',
  'Fisioterapia Pélvica': 'fisioterapia-pelvica',
  'Fisioterapia Respiratória': 'fisioterapia-respiratoria',
  'Infiltração de ponto gatilho e Agulhamento a seco': 'infiltracao-ponto-gatilho',
  'Infiltração de ponto gatilho': 'infiltracao-ponto-gatilho',
  'Agulhamento a Seco': 'agulhamento-seco',
  'RPG': 'rpg',
}

function getExpectedProceduresForBradesco(clinicName: string): string[] {
  const filePath = join(process.cwd(), 'src', 'infor_clinic.txt')
  const content = readFileSync(filePath, 'utf-8')
  
  // Encontrar seção do Bradesco para a clínica específica
  const section = clinicName === 'Vieiralves' 
    ? content.match(/## 🟦 \*\*UNIDADE VIEIRALVES\*\*(.*?)(?=## 🟦 \*\*UNIDADE SÃO JOSÉ|$)/s)?.[1] || ''
    : content.match(/## 🟦 \*\*UNIDADE SÃO JOSÉ\*\*(.*?)(?=# 📍|$)/s)?.[1] || ''
  
  // Encontrar bloco do Bradesco
  const bradescoMatch = section.match(/## \*\*BRADESCO — (Vieiralves|São José)\*\*\s*\n([\s\S]*?)(?=---|##|$)/)
  if (!bradescoMatch) return []
  
  const proceduresText = bradescoMatch[2]
  const procedures = proceduresText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith('*'))
    .map(line => line.replace(/^\*\s*/, '').trim())
    .filter(Boolean)
    .map(name => PROCEDURE_NAME_MAP[name] || name.toLowerCase().replace(/\s+/g, '-'))
  
  return procedures
}

async function compareBradescoCoverage() {
  console.log('🔍 Comparing Bradesco coverage between file and database...\n')
  
  const clinics = [
    { code: 'vieiralves', name: 'Vieiralves' },
    { code: 'sao-jose', name: 'São José' }
  ]
  
  for (const clinicInfo of clinics) {
    console.log(`\n📋 ${clinicInfo.name.toUpperCase()}`)
    console.log('='.repeat(60))
    
    // Obter procedimentos esperados do arquivo
    const expectedProcedures = getExpectedProceduresForBradesco(clinicInfo.name)
    console.log(`\n✅ Expected procedures (from file): ${expectedProcedures.length}`)
    expectedProcedures.forEach(proc => console.log(`   - ${proc}`))
    
    // Obter procedimentos do banco
    const clinic = await prisma.clinic.findUnique({ where: { code: clinicInfo.code } })
    if (!clinic) {
      console.log(`\n❌ Clinic not found in database: ${clinicInfo.code}`)
      continue
    }
    
    const insurance = await prisma.insuranceCompany.findUnique({ where: { code: 'bradesco' } })
    if (!insurance) {
      console.log(`\n❌ Insurance not found in database: bradesco`)
      continue
    }
    
    const dbProcedures = await prisma.clinicInsuranceProcedure.findMany({
      where: {
        clinicId: clinic.id,
        insuranceCode: 'bradesco',
        isActive: true
      },
      include: {
        procedure: true
      }
    })
    
    const dbProcedureCodes = dbProcedures.map(cip => cip.procedureCode)
    console.log(`\n💾 Database procedures (active): ${dbProcedureCodes.length}`)
    dbProcedureCodes.forEach(code => {
      const proc = dbProcedures.find(cip => cip.procedureCode === code)?.procedure
      console.log(`   - ${code} (${proc?.name || 'unknown'})`)
    })
    
    // Comparar
    console.log(`\n🔍 Comparison:`)
    
    const missing = expectedProcedures.filter(proc => !dbProcedureCodes.includes(proc))
    const extra = dbProcedureCodes.filter(proc => !expectedProcedures.includes(proc))
    const matching = expectedProcedures.filter(proc => dbProcedureCodes.includes(proc))
    
    if (missing.length > 0) {
      console.log(`\n❌ Missing in database (${missing.length}):`)
      missing.forEach(proc => console.log(`   - ${proc}`))
    }
    
    if (extra.length > 0) {
      console.log(`\n⚠️  Extra in database (not in file) (${extra.length}):`)
      extra.forEach(code => {
        const proc = dbProcedures.find(cip => cip.procedureCode === code)?.procedure
        console.log(`   - ${code} (${proc?.name || 'unknown'})`)
      })
    }
    
    if (matching.length > 0) {
      console.log(`\n✅ Matching (${matching.length}):`)
      matching.forEach(proc => console.log(`   - ${proc}`))
    }
    
    if (missing.length === 0 && extra.length === 0) {
      console.log(`\n✅ Perfect match! All procedures are correctly configured.`)
    }
  }
}

async function main() {
  try {
    await compareBradescoCoverage()
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })

