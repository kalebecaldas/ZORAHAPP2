import prisma from '../api/prisma/client.js'

/**
 * Script completo de migração e seed para Railway
 * 
 * Este script:
 * 1. Cria as tabelas necessárias (se não existirem)
 * 2. Popula com dados iniciais
 * 3. É idempotente (pode ser executado múltiplas vezes sem problemas)
 */

async function railwayMigrateAndSeed() {
    console.log('🚀 Iniciando migração e seed para Railway...\n')

    try {
        // 1. Verificar e criar SystemSettings se não existir
        console.log('1️⃣ Verificando SystemSettings...')
        let systemSettings = await prisma.systemSettings.findFirst()
        if (!systemSettings) {
            console.log('   📝 Criando SystemSettings inicial...')
            systemSettings = await prisma.systemSettings.create({
                data: {
                    inactivityTimeoutMinutes: 20,
                    closingMessage: 'Obrigado pelo contato! Estamos à disposição. 😊',
                    autoAssignEnabled: true,
                    maxConversationsPerAgent: 5
                }
            })
            console.log('   ✅ SystemSettings criado')
        } else {
            console.log('   ⏭️  SystemSettings já existe - preservando configuração')
        }
        console.log('')

        // 2. Seed ResponseRules
        console.log('2️⃣ Populando ResponseRules...')
        await seedResponseRules()
        console.log('   ✅ ResponseRules populados\n')

        // 3. Seed ProcedureRules
        console.log('3️⃣ Populando ProcedureRules...')
        await seedProcedureRules()
        console.log('   ✅ ProcedureRules populados\n')

        // 4. Seed InsuranceRules
        console.log('4️⃣ Populando InsuranceRules...')
        await seedInsuranceRules()
        console.log('   ✅ InsuranceRules populados\n')

        // 5. Verificar dados essenciais (procedimentos, convênios, clínicas)
        console.log('5️⃣ Verificando dados essenciais...')
        const proceduresCount = await prisma.procedure.count()
        const insurancesCount = await prisma.insuranceCompany.count()
        const clinicsCount = await prisma.clinic.count()

        console.log(`   Procedimentos: ${proceduresCount}`)
        console.log(`   Convênios: ${insurancesCount}`)
        console.log(`   Clínicas: ${clinicsCount}`)

        if (proceduresCount === 0 || insurancesCount === 0 || clinicsCount === 0) {
            console.log('   ⚠️  Alguns dados essenciais estão faltando')
            console.log('   ℹ️  Execute seed_clinic_data.ts se necessário\n')
        } else {
            console.log('   ✅ Dados essenciais presentes\n')
        }

        console.log('✅ Migração e seed concluídos com sucesso!')
    } catch (error: any) {
        console.error('❌ Erro durante migração e seed:', error)
        throw error
    } finally {
        await prisma.$disconnect()
    }
}

async function seedResponseRules() {
    // Templates gerais por intenção (mesmos do seed_response_rules.ts)
    const templates = [
        {
            intent: 'VALOR_PARTICULAR',
            context: 'procedimento',
            targetType: 'procedure',
            targetId: null,
            template: `{if unidade}Na unidade {unidade}, para {procedimento}, temos ótimas opções! 😊

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

Qual formato faz mais sentido para você?{endif}{if !unidade}Para te passar o valor correto de {procedimento}, qual unidade você prefere?
1️⃣ Vieiralves
2️⃣ São José{endif}`,
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

{if mentionOtherBenefits}
Também temos outros benefícios disponíveis! 😊
{endif}

Gostaria de agendar uma avaliação?`,
            priority: 10,
            description: 'Template para informações de convênio'
        },
        {
            intent: 'LISTAR_PROCEDIMENTOS_CONVENIO',
            context: 'convenio',
            targetType: 'insurance',
            targetId: null,
            template: `Com {convenio}, temos acesso a:

{foreach procedure}
• {procedure.name}
{endforeach}

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
{clinic.number}️⃣ **{clinic.name}**
   {clinic.address}, {clinic.neighborhood}
   📞 {clinic.phone}
   {if clinic.mapsUrl}🗺️ [Ver no mapa]({clinic.mapsUrl}){endif}
{endforeach}

Qual unidade você prefere para atendimento?`,
            priority: 10,
            description: 'Template para informação de localização'
        },
        {
            intent: 'HORARIO',
            context: 'geral',
            targetType: 'general',
            targetId: null,
            template: `{if unidade}⏰ Horário de funcionamento da unidade {unidade}:

{clinicHours}

Em qual horário você prefere?{endif}{if !unidade}Para te informar o horário correto, qual unidade você prefere?
1️⃣ Vieiralves
2️⃣ São José{endif}`,
            priority: 10,
            description: 'Template para informação de horários'
        }
    ]

    for (const template of templates) {
        const existing = await prisma.responseRule.findFirst({
            where: {
                intent: template.intent,
                targetType: template.targetType,
                targetId: template.targetId
            }
        })

        if (!existing) {
            await prisma.responseRule.create({
                data: template
            })
            console.log(`   ✅ Criado template: ${template.intent}`)
        } else {
            console.log(`   ⏭️  Template já existe: ${template.intent}`)
        }
    }
}

async function seedProcedureRules() {
    // Buscar todos os procedimentos existentes
    const procedures = await prisma.procedure.findMany()

    console.log(`   📋 Encontrados ${procedures.length} procedimentos`)

    for (const proc of procedures) {
        const existing = await prisma.procedureRule.findUnique({
            where: { procedureCode: proc.code }
        })

        if (!existing) {
            // Usar requiresEvaluation do procedimento
            const needsEvaluation = proc.requiresEvaluation
            
            // Detectar preço de avaliação dinamicamente
            let evaluationPrice = null
            if (needsEvaluation) {
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
                    showEvaluationFirst: needsEvaluation || evaluationPrice !== null,
                    customMessage: customMessage,
                    specialConditions: needsEvaluation ? {
                        packageDiscount: 'evaluation_free',
                        minSessions: 10
                    } : {},
                    isActive: true
                }
            })
            console.log(`   ✅ Criada regra para: ${proc.name}`)
        } else {
            // Atualizar apenas se evaluationIncludesFirstSession não estiver definido como true
            if (existing.evaluationIncludesFirstSession !== true) {
                await prisma.procedureRule.update({
                    where: { procedureCode: proc.code },
                    data: { evaluationIncludesFirstSession: true }
                })
                console.log(`   🔄 Atualizada regra para: ${proc.name}`)
            } else {
                console.log(`   ⏭️  Regra já existe: ${proc.name}`)
            }
        }
    }
}

async function seedInsuranceRules() {
    // Buscar todos os convênios existentes
    const insurances = await prisma.insuranceCompany.findMany()

    console.log(`   📋 Encontrados ${insurances.length} convênios`)

    for (const insurance of insurances) {
        const existing = await prisma.insuranceRule.findUnique({
            where: { insuranceCode: insurance.code }
        })

        if (!existing) {
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
                    specialProcedures: {},
                    isActive: true
                }
            })
            console.log(`   ✅ Criada regra para: ${insurance.name}`)
        } else {
            console.log(`   ⏭️  Regra já existe: ${insurance.name}`)
        }
    }
}

// Executar sempre quando o arquivo é executado diretamente
railwayMigrateAndSeed()
    .then(() => {
        console.log('\n✅ Script concluído com sucesso!')
        process.exit(0)
    })
    .catch((error) => {
        console.error('\n❌ Erro ao executar script:', error)
        process.exit(1)
    })

export default railwayMigrateAndSeed
