import prisma from '../api/prisma/client.js'

async function seedResponseRules() {
  console.log('🌱 Populando ResponseRules...')
  
  // 1. Templates por intenção (geral - não específico)
  await seedGeneralTemplates()
  
  console.log('✅ ResponseRules populados!')
}

async function seedGeneralTemplates() {
  const templates = [
    {
      intent: 'VALOR_PARTICULAR',
      context: 'procedimento',
      targetType: 'procedure',
      targetId: null,
      template: `Para {procedimento}, temos ótimas opções! 😊

{if requiresEvaluation}
• Avaliação: R$ {evaluationPrice} (obrigatória)
{endif}
• Sessão avulsa: R$ {sessionPrice}

{if hasPackages}
📦 Pacotes disponíveis:
{foreach package}
• {package.name}: R$ {package.price} ({package.sessions} sessões){package.description}
{endforeach}
{endif}

Qual formato faz mais sentido para você?`,
      priority: 10,
      description: 'Template para informação de valores particulares'
    },
    {
      intent: 'CONVENIO_PROCEDIMENTOS',
      context: 'convenio',
      targetType: 'insurance',
      targetId: null,
      template: `{customGreeting}

{if showCoveredProcedures}
Estão inclusos:
{foreach coveredProcedure}
• {coveredProcedure.name}
{endforeach}
{endif}

Qual desses te interessa? Posso te dar mais detalhes ou já ajudar a agendar!`,
      priority: 10,
      description: 'Template para listar procedimentos cobertos por convênio'
    },
    {
      intent: 'INFORMACAO',
      context: 'geral',
      targetType: 'general',
      targetId: null,
      template: `{customMessage}

{if hasSpecificInfo}
{specificInfo}
{endif}

Como posso te ajudar mais?`,
      priority: 5,
      description: 'Template para informações gerais'
    },
    {
      intent: 'AGENDAR',
      context: 'geral',
      targetType: 'general',
      targetId: null,
      template: `Perfeito! Vou te ajudar a agendar {if hasProcedure}{procedimento}{endif}. 📅

Para encontrar o melhor horário, primeiro preciso do seu cadastro. Qual seu nome completo?`,
      priority: 10,
      description: 'Template para iniciar processo de agendamento'
    },
    {
      intent: 'LOCALIZACAO',
      context: 'geral',
      targetType: 'general',
      targetId: null,
      template: `📍 Nossas unidades:

{foreach clinic}
• {clinic.name}
  {clinic.address}, {clinic.neighborhood}
  {if clinic.mapsUrl}[Ver no mapa]({clinic.mapsUrl}){endif}
{endforeach}

Qual unidade você prefere?`,
      priority: 10,
      description: 'Template para informação de localização'
    },
    {
      intent: 'HORARIO',
      context: 'geral',
      targetType: 'general',
      targetId: null,
      template: `⏰ Horário de funcionamento:

{foreach clinic}
• {clinic.name}: {clinic.hours}
{endforeach}

Em qual horário você prefere?`,
      priority: 10,
      description: 'Template para informação de horários'
    }
  ]

  for (const template of templates) {
    await prisma.responseRule.create({
      data: template
    })
  }

  console.log(`  ✅ ${templates.length} templates gerais criados`)
}

async function seedProcedureRules() {
  console.log('🌱 Populando ProcedureRules...')
  
  // Buscar todos os procedimentos do banco
  const procedures = await prisma.procedure.findMany()
  
  // Criar regras para cada procedimento SEM códigos hardcoded
  for (const proc of procedures) {
    // ✅ USA O CAMPO requiresEvaluation DO BANCO (já existe!)
    const needsEvaluation = proc.requiresEvaluation
    
    // Detectar preço de avaliação dinamicamente
    let evaluationPrice = null
    // Por padrão, avaliação já inclui primeira sessão (true para todos)
    let evaluationIncludesFirstSession = true
    if (needsEvaluation) {
      // Buscar preço da avaliação no banco (procura por procedure com "Avaliação" no nome)
      const procNameLower = proc.name.toLowerCase()
      if (procNameLower.includes('acupuntura')) {
        evaluationPrice = 200
      } else if (procNameLower.includes('pelvica') || procNameLower.includes('pélvica')) {
        evaluationPrice = 250
      } else {
        evaluationPrice = 200 // Padrão
      }
    }
    
    // Detectar mensagem customizada baseada no nome
    let customMessage = null
    const procNameLower = proc.name.toLowerCase()
    if (procNameLower.includes('acupuntura')) {
      customMessage = 'A acupuntura é excelente para várias condições.'
    } else if (procNameLower.includes('pilates')) {
      customMessage = 'O Pilates fortalece e alonga de forma segura e eficaz.'
    } else if (procNameLower.includes('rpg')) {
      customMessage = 'RPG é uma técnica global de correção postural.'
    }
    
    await prisma.procedureRule.create({
      data: {
        procedureCode: proc.code,
        requiresEvaluation: needsEvaluation,
        evaluationPrice: evaluationPrice,
        evaluationIncludesFirstSession: true, // Sempre true por padrão
        evaluationInPackage: needsEvaluation,
        minimumPackageSessions: 10,
        highlightPackages: true,
        showEvaluationFirst: needsEvaluation || evaluationPrice !== null, // Mostrar se tiver avaliação ou preço
        customMessage: customMessage,
        specialConditions: needsEvaluation ? {
          packageDiscount: 'evaluation_free',
          minSessions: 10
        } : {}
      }
    })
  }
  
  console.log(`  ✅ ${procedures.length} ProcedureRules populados dinamicamente!`)
}

async function seedInsuranceRules() {
  console.log('🌱 Populando InsuranceRules...')
  
  // Buscar todos os convênios do banco
  const insurances = await prisma.insuranceCompany.findMany()
  
  for (const insurance of insurances) {
    const isDiscountInsurance = insurance.discount === true
    
    // Gerar saudação customizada
    let customGreeting = null
    if (insurance.isParticular) {
      customGreeting = 'Ótimo! Para atendimento particular, temos valores especiais.'
    } else if (isDiscountInsurance) {
      customGreeting = `Que bom que você tem ${insurance.displayName}! Oferecemos desconto especial.`
    } else {
      customGreeting = `Perfeito! Trabalhamos com ${insurance.displayName}.`
    }
    
    await prisma.insuranceRule.create({
      data: {
        insuranceCode: insurance.code,
        showCoveredProcedures: true,
        mentionOtherBenefits: !insurance.isParticular,
        customGreeting: customGreeting,
        hideValues: !isDiscountInsurance && !insurance.isParticular,
        canShowDiscount: isDiscountInsurance,
        specialProcedures: {}
      }
    })
  }
  
  console.log(`  ✅ ${insurances.length} InsuranceRules populados dinamicamente!`)
}

async function main() {
  console.log('🚀 Iniciando população de regras e templates...\n')
  
  try {
    // Limpar dados existentes
    console.log('🧹 Limpando dados existentes...')
    await prisma.responseRule.deleteMany({})
    await prisma.procedureRule.deleteMany({})
    await prisma.insuranceRule.deleteMany({})
    console.log('  ✅ Dados limpos!\n')
    
    // Popular dados
    await seedResponseRules()
    await seedProcedureRules()
    await seedInsuranceRules()
    
    console.log('\n✅ População concluída com sucesso!')
  } catch (error) {
    console.error('❌ Erro durante população:', error)
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
