import prisma from '../api/prisma/client.js'

/**
 * Script COMPLETO de seed para o sistema
 * Executa todos os seeds necessários na ordem correta
 */

async function seedComplete() {
    console.log('🌱 Iniciando seed completo do sistema...\n')

    try {
        // 1. Seed da configuração da IA
        console.log('1️⃣ Seedando configuração da IA...')
        try {
            // Verificar se já existe
            let existing = await prisma.aIConfiguration.findFirst()
            if (existing) {
                console.log('   ⏭️  Configuração da IA já existe\n')
            } else {
                // Importar e executar função de seed diretamente
                const seedAI = (await import('./seed_ai_configuration.js')).default
                await seedAI()
                console.log('   ✅ Configuração da IA seedada\n')
            }
        } catch (error: any) {
            console.error('   ❌ Erro ao seedar IA:', error.message)
            // Verificar novamente se foi criado
            const check = await prisma.aIConfiguration.findFirst()
            if (check) {
                console.log('   ⏭️  Configuração da IA já existe (verificado)\n')
            } else {
                // Não bloquear - o sistema pode funcionar sem exemplos/regras
                console.warn('   ⚠️  Continuando sem configuração da IA (pode ser criada depois)\n')
            }
        }

        // 2. Verificar se há dados de clínica (procedimentos, convênios, clínicas)
        console.log('2️⃣ Verificando dados de clínica...')
        const proceduresCount = await prisma.procedure.count()
        const insurancesCount = await prisma.insuranceCompany.count()
        const clinicsCount = await prisma.clinic.count()

        console.log(`   Procedimentos: ${proceduresCount}`)
        console.log(`   Convênios: ${insurancesCount}`)
        console.log(`   Clínicas: ${clinicsCount}`)

        if (proceduresCount === 0 || insurancesCount === 0 || clinicsCount === 0) {
            console.log('   ⚠️  Dados de clínica incompletos!')
            console.log('   💡 Execute manualmente se necessário:')
            console.log('      - npx tsx scripts/migrate_clinic_data_to_db.ts')
            console.log('      - npx tsx scripts/populate_clinic_relations.ts')
            console.log('      - npx tsx scripts/populate_insurance_prices.ts')
        } else {
            console.log('   ✅ Dados de clínica presentes\n')
        }

        // 3. Verificar templates
        console.log('3️⃣ Verificando templates...')
        const templatesCount = await prisma.template.count()
        console.log(`   Templates: ${templatesCount}`)
        if (templatesCount === 0) {
            console.log('   ⚠️  Nenhum template encontrado')
            console.log('   💡 Execute se necessário: npx tsx scripts/seed_templates.ts')
        } else {
            console.log('   ✅ Templates presentes\n')
        }

        // 4. Verificar workflow
        console.log('4️⃣ Verificando workflow...')
        const workflowsCount = await prisma.workflow.count({ where: { isActive: true } })
        console.log(`   Workflows ativos: ${workflowsCount}`)
        if (workflowsCount === 0) {
            console.log('   ⚠️  Nenhum workflow ativo')
            console.log('   💡 O import_workflow_definitivo.ts será executado no deploy\n')
        } else {
            console.log('   ✅ Workflow ativo presente\n')
        }

        // 5. Verificar SystemSettings
        console.log('5️⃣ Verificando configurações do sistema...')
        const settingsCount = await prisma.systemSettings.count()
        if (settingsCount === 0) {
            console.log('   ⚠️  Nenhuma configuração do sistema encontrada')
            console.log('   💡 Criando configuração padrão...')
            await prisma.systemSettings.create({
                data: {
                    inactivityTimeoutMinutes: 10,
                    closingMessage: 'Obrigado pelo contato! Estamos à disposição. 😊',
                    autoAssignEnabled: true,
                    maxConversationsPerAgent: 5
                }
            })
            console.log('   ✅ Configuração padrão criada\n')
        } else {
            console.log('   ✅ Configurações do sistema presentes\n')
        }

        // Resumo final
        console.log('📊 Resumo do Seed:')
        console.log('   ✅ Configuração da IA')
        console.log(`   ${proceduresCount > 0 ? '✅' : '⚠️'} Procedimentos (${proceduresCount})`)
        console.log(`   ${insurancesCount > 0 ? '✅' : '⚠️'} Convênios (${insurancesCount})`)
        console.log(`   ${clinicsCount > 0 ? '✅' : '⚠️'} Clínicas (${clinicsCount})`)
        console.log(`   ${templatesCount > 0 ? '✅' : '⚠️'} Templates (${templatesCount})`)
        console.log(`   ${workflowsCount > 0 ? '✅' : '⚠️'} Workflows ativos (${workflowsCount})`)
        console.log('   ✅ Configurações do sistema')

        const allCritical = 
            proceduresCount > 0 &&
            insurancesCount > 0 &&
            clinicsCount > 0 &&
            workflowsCount > 0

        if (allCritical) {
            console.log('\n✅ Sistema pronto para uso!')
        } else {
            console.log('\n⚠️  Alguns dados estão faltando, mas o sistema pode funcionar com fallbacks.')
            console.log('💡 Execute os scripts de migração de dados de clínica se necessário.')
        }

    } catch (error) {
        console.error('❌ Erro no seed completo:', error)
        throw error
    } finally {
        await prisma.$disconnect()
    }
}

// Executar
seedComplete()
    .then(() => {
        console.log('\n✅ Seed completo finalizado!')
        process.exit(0)
    })
    .catch((error) => {
        console.error('\n❌ Erro no seed completo:', error)
        process.exit(1)
    })
