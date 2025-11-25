import { PrismaClient } from '@prisma/client'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

// Initialize Prisma with proper error handling
let prisma: PrismaClient
try {
  prisma = new PrismaClient()
} catch (error) {
  console.error('❌ Erro ao inicializar Prisma Client:', error)
  console.error('💡 Certifique-se de que as dependências estão instaladas: npm install')
  process.exit(1)
}

// Mapeamento de nomes de procedimentos do arquivo para códigos do banco
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
  'Quiropraxia': 'quiropraxia',
  'Pilates': 'pilates-solo',
  'Estimulação Elétrica Transcutânea': 'tens',
  'Estimulação Elétrica Transcutânea (TENS)': 'tens',
  'Terapias por Ondas de Choque': 'ondas-de-choque',
}

// Mapeamento de nomes de convênios para códigos
const INSURANCE_NAME_MAP: Record<string, string> = {
  'BRADESCO': 'bradesco',
  'SULAMÉRICA': 'sulamerica',
  'MEDISERVICE': 'mediservice',
  'SAÚDE CAIXA': 'saude-caixa',
  'PETROBRAS': 'petrobras',
  'GEAP': 'geap',
  'PRO SOCIAL': 'pro-social',
  'POSTAL SAÚDE': 'postal-saude',
  'CONAB': 'conab',
  'AFFEAM': 'affeam',
  'AMBEP': 'ambep',
  'GAMA': 'gama',
  'LIFE': 'life',
  'NOTREDAME': 'notredame',
  'OAB': 'oab',
  'CAPESAUDE': 'capesaude',
  'CASEMBRAPA': 'casembrapa',
  'CULTURAL': 'cultural',
  'EVIDA': 'evida',
  'FOGAS': 'fogas',
  'FUSEX': 'fusex',
  'PLAN-ASSITE': 'plan-assite',
}

// Códigos das clínicas
const CLINIC_CODES = {
  VIEIRALVES: 'vieiralves',
  SAO_JOSE: 'sao-jose',
}

interface InsuranceBlock {
  insuranceName: string
  clinicName: string
  procedures: string[]
}

function parseInforClinicFile(filePath: string): InsuranceBlock[] {
  const content = readFileSync(filePath, 'utf-8')
  const blocks: InsuranceBlock[] = []
  
  // Dividir por unidade
  const vieiralvesSection = content.match(/## 🟦 \*\*UNIDADE VIEIRALVES\*\*(.*?)(?=## 🟦 \*\*UNIDADE SÃO JOSÉ|$)/s)?.[1] || ''
  const saoJoseSection = content.match(/## 🟦 \*\*UNIDADE SÃO JOSÉ\*\*(.*?)(?=# 📍|$)/s)?.[1] || ''
  
  // Processar Vieiralves
  const vieiralvesBlocks = parseClinicSection(vieiralvesSection, 'Vieiralves')
  blocks.push(...vieiralvesBlocks)
  
  // Processar São José
  const saoJoseBlocks = parseClinicSection(saoJoseSection, 'São José')
  blocks.push(...saoJoseBlocks)
  
  return blocks
}

function parseClinicSection(section: string, clinicName: string): InsuranceBlock[] {
  const blocks: InsuranceBlock[] = []
  
  // Regex para capturar cada convênio e seus procedimentos
  const insuranceRegex = /## \*\*([A-Z\s\-]+) — (Vieiralves|São José)\*\*\s*\n([\s\S]*?)(?=---|##|$)/g
  
  let match
  while ((match = insuranceRegex.exec(section)) !== null) {
    const insuranceName = match[1].trim()
    const proceduresText = match[3]
    
    // Extrair procedimentos (linhas que começam com *)
    const procedures = proceduresText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('*'))
      .map(line => line.replace(/^\*\s*/, '').trim())
      .filter(Boolean)
    
    blocks.push({
      insuranceName,
      clinicName,
      procedures
    })
  }
  
  return blocks
}

async function ensureClinicsExist() {
  const clinics = [
    {
      code: CLINIC_CODES.VIEIRALVES,
      name: 'Clínica Vieiralves',
      displayName: 'Unidade Vieiralves',
      address: 'Rua Rio Içá, 850',
      neighborhood: 'Nossa Sra. das Graças',
      city: 'Manaus',
      state: 'AM',
      zipCode: '69053-100',
      phone: '(92) 3234-5678',
      email: 'vieiralves@clinicafisioterapia.com.br',
      openingHours: {
        'Segunda': '08:00 - 18:00',
        'Terça': '08:00 - 18:00',
        'Quarta': '08:00 - 18:00',
        'Quinta': '08:00 - 18:00',
        'Sexta': '08:00 - 18:00',
        'Sábado': '08:00 - 12:00',
        'Domingo': 'Fechado'
      },
      specialties: ['Fisioterapia Ortopédica', 'Fisioterapia Pélvica', 'Acupuntura', 'Pilates'],
      parkingAvailable: true,
      accessibility: ['Acesso para cadeirantes', 'Elevador', 'Banheiro adaptado'],
      isActive: true
    },
    {
      code: CLINIC_CODES.SAO_JOSE,
      name: 'Clínica São José',
      displayName: 'Unidade São José',
      address: 'Av. Autaz Mirim, 5773',
      neighborhood: 'São José Operário',
      city: 'Manaus',
      state: 'AM',
      zipCode: '69085-000',
      phone: '(92) 3234-5679',
      email: 'saojose@clinicafisioterapia.com.br',
      openingHours: {
        'Segunda': '07:00 - 19:00',
        'Terça': '07:00 - 19:00',
        'Quarta': '07:00 - 19:00',
        'Quinta': '07:00 - 19:00',
        'Sexta': '07:00 - 19:00',
        'Sábado': '08:00 - 14:00',
        'Domingo': 'Fechado'
      },
      specialties: ['Fisioterapia Ortopédica', 'RPG', 'Pilates', 'Acupuntura'],
      parkingAvailable: false,
      accessibility: ['Acesso para cadeirantes', 'Rampa de acesso'],
      isActive: true
    }
  ]
  
  for (const clinicData of clinics) {
    const existing = await prisma.clinic.findUnique({ where: { code: clinicData.code } })
    if (existing) {
      await prisma.clinic.update({
        where: { code: clinicData.code },
        data: clinicData
      })
      console.log(`✅ Updated clinic: ${clinicData.name}`)
    } else {
      await prisma.clinic.create({ data: clinicData })
      console.log(`✅ Created clinic: ${clinicData.name}`)
    }
  }
}

async function ensureProceduresExist() {
  // Lista de procedimentos que devem existir
  const procedures = [
    { code: 'acupuntura', name: 'Acupuntura', description: 'Tratamento com acupuntura', basePrice: 180, duration: 45, requiresEvaluation: true, categories: ['acupuntura'] },
    { code: 'consulta-ortopedista', name: 'Consulta com Ortopedista', description: 'Consulta médica ortopédica', basePrice: 400, duration: 30, requiresEvaluation: false, categories: ['consulta'] },
    { code: 'fisioterapia-neurologica', name: 'Fisioterapia Neurológica', description: 'Tratamento neurológico', basePrice: 100, duration: 60, requiresEvaluation: true, categories: ['fisioterapia'] },
    { code: 'fisioterapia-ortopedica', name: 'Fisioterapia Ortopédica', description: 'Tratamento ortopédico', basePrice: 90, duration: 60, requiresEvaluation: true, categories: ['fisioterapia'] },
    { code: 'fisioterapia-pelvica', name: 'Fisioterapia Pélvica', description: 'Tratamento pélvico', basePrice: 220, duration: 60, requiresEvaluation: true, categories: ['fisioterapia'] },
    { code: 'fisioterapia-respiratoria', name: 'Fisioterapia Respiratória', description: 'Tratamento respiratório', basePrice: 100, duration: 60, requiresEvaluation: true, categories: ['fisioterapia'] },
    { code: 'infiltracao-ponto-gatilho', name: 'Infiltração de Ponto Gatilho', description: 'Infiltração de ponto gatilho', basePrice: 0, duration: 30, requiresEvaluation: true, categories: ['terapia-complementar'] },
    { code: 'agulhamento-seco', name: 'Agulhamento a Seco', description: 'Agulhamento a seco', basePrice: 0, duration: 30, requiresEvaluation: true, categories: ['terapia-complementar'] },
    { code: 'rpg', name: 'RPG', description: 'Reeducação Postural Global', basePrice: 120, duration: 60, requiresEvaluation: true, categories: ['postura'] },
    { code: 'quiropraxia', name: 'Quiropraxia', description: 'Técnicas de ajuste articular', basePrice: 120, duration: 45, requiresEvaluation: false, categories: ['terapia-complementar'] },
    { code: 'tens', name: 'Estimulação Elétrica Transcutânea (TENS)', description: 'Terapia com estimulação transcutânea', basePrice: 80, duration: 20, requiresEvaluation: false, categories: ['terapia-complementar'] },
    { code: 'ondas-de-choque', name: 'Terapias por Ondas de Choque', description: 'Terapia por ondas', basePrice: 0, duration: 30, requiresEvaluation: true, categories: ['terapia-complementar'] },
  ]
  
  for (const proc of procedures) {
    const existing = await prisma.procedure.findUnique({ where: { code: proc.code } })
    if (existing) {
      await prisma.procedure.update({
        where: { code: proc.code },
        data: proc
      })
      console.log(`✅ Updated procedure: ${proc.name}`)
    } else {
      await prisma.procedure.create({ data: proc })
      console.log(`✅ Created procedure: ${proc.name}`)
    }
  }
}

async function syncInsuranceProcedures(blocks: InsuranceBlock[]) {
  console.log('\n📋 Syncing insurance procedures...\n')
  
  for (const block of blocks) {
    const insuranceCode = INSURANCE_NAME_MAP[block.insuranceName.toUpperCase()] || block.insuranceName.toLowerCase().replace(/\s+/g, '-')
    const clinicCode = block.clinicName === 'Vieiralves' ? CLINIC_CODES.VIEIRALVES : CLINIC_CODES.SAO_JOSE
    
    // Buscar IDs reais
    const clinic = await prisma.clinic.findUnique({ where: { code: clinicCode } })
    if (!clinic) {
      console.log(`⚠️  Clinic not found: ${clinicCode}`)
      continue
    }
    
    const insurance = await prisma.insuranceCompany.findUnique({ where: { code: insuranceCode } })
    if (!insurance) {
      console.log(`⚠️  Insurance not found: ${insuranceCode} (${block.insuranceName})`)
      continue
    }
    
    // Garantir que o convênio está vinculado à clínica
    const clinicInsurance = await prisma.clinicInsurance.findFirst({
      where: { clinicId: clinic.id, insuranceCode: insurance.code }
    })
    
    if (!clinicInsurance) {
      await prisma.clinicInsurance.create({
        data: {
          clinicId: clinic.id,
          insuranceCode: insurance.code,
          isActive: true
        }
      })
      console.log(`✅ Linked insurance ${insurance.displayName} to clinic ${clinic.name}`)
    }
    
    // Processar procedimentos
    const procedureCodes: string[] = []
    for (const procName of block.procedures) {
      const procCode = PROCEDURE_NAME_MAP[procName] || procName.toLowerCase().replace(/\s+/g, '-')
      
      // Verificar se o procedimento existe
      const procedure = await prisma.procedure.findUnique({ where: { code: procCode } })
      if (!procedure) {
        console.log(`⚠️  Procedure not found: ${procCode} (${procName})`)
        continue
      }
      
      procedureCodes.push(procCode)
      
      // Verificar se já existe registro
      const existing = await prisma.clinicInsuranceProcedure.findFirst({
        where: {
          clinicId: clinic.id,
          insuranceCode: insurance.code,
          procedureCode: procedure.code
        }
      })
      
      if (existing) {
        // Atualizar para ativo se estava inativo
        if (!existing.isActive) {
          await prisma.clinicInsuranceProcedure.update({
            where: { id: existing.id },
            data: { isActive: true }
          })
          console.log(`  ✅ Activated: ${procedure.name} for ${insurance.displayName} at ${clinic.name}`)
        }
      } else {
        // Criar novo registro
        // Buscar preço base do procedimento ou usar 0
        const basePrice = procedure.basePrice || 0
        
        await prisma.clinicInsuranceProcedure.create({
          data: {
            clinicId: clinic.id,
            insuranceCode: insurance.code,
            procedureCode: procedure.code,
            price: basePrice,
            isActive: true
          }
        })
        console.log(`  ✅ Created: ${procedure.name} for ${insurance.displayName} at ${clinic.name}`)
      }
    }
    
    // Desativar procedimentos que não estão mais na lista
    const allCIPs = await prisma.clinicInsuranceProcedure.findMany({
      where: {
        clinicId: clinic.id,
        insuranceCode: insurance.code,
        isActive: true
      }
    })
    
    for (const cip of allCIPs) {
      if (!procedureCodes.includes(cip.procedureCode)) {
        await prisma.clinicInsuranceProcedure.update({
          where: { id: cip.id },
          data: { isActive: false }
        })
        const proc = await prisma.procedure.findUnique({ where: { code: cip.procedureCode } })
        console.log(`  ⚠️  Deactivated: ${proc?.name || cip.procedureCode} for ${insurance.displayName} at ${clinic.name}`)
      }
    }
  }
}

async function main() {
  console.log('🚀 Starting clinic data sync from infor_clinic.txt\n')
  
  try {
    // 1. Garantir que clínicas existem
    console.log('📍 Step 1: Ensuring clinics exist...')
    await ensureClinicsExist()
    
    // 2. Garantir que procedimentos existem
    console.log('\n🔧 Step 2: Ensuring procedures exist...')
    await ensureProceduresExist()
    
    // 3. Parse do arquivo
    console.log('\n📄 Step 3: Parsing infor_clinic.txt...')
    const filePath = join(process.cwd(), 'src', 'infor_clinic.txt')
    const blocks = parseInforClinicFile(filePath)
    console.log(`✅ Parsed ${blocks.length} insurance blocks`)
    
    // 4. Sincronizar procedimentos dos convênios
    console.log('\n🔄 Step 4: Syncing insurance procedures...')
    await syncInsuranceProcedures(blocks)
    
    console.log('\n✅ Sync completed successfully!')
    
  } catch (error) {
    console.error('\n❌ Error during sync:', error)
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

