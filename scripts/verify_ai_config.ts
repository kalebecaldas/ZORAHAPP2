import prisma from '../api/prisma/client.js'

/**
 * Script para verificar se a configuração da IA está correta no Railway
 */
async function verifyAIConfig() {
    console.log('🔍 Verificando configuração da IA...\n')

    try {
        // 1. Verificar se existe configuração ativa
        const config = await prisma.aIConfiguration.findFirst({
            where: { isActive: true },
            include: {
                examples: true,
                transferRules: true
            }
        })

        if (!config) {
            console.error('❌ Nenhuma configuração ativa encontrada!')
            console.log('💡 Execute: npx tsx scripts/seed_ai_configuration.ts')
            process.exit(1)
        }

        console.log('✅ Configuração ativa encontrada:')
        console.log(`   ID: ${config.id}`)
        console.log(`   Nome: ${config.name}`)
        console.log(`   Descrição: ${config.description || 'N/A'}`)
        console.log(`   Modelo: ${process.env.OPENAI_MODEL || 'gpt-4o'}`)
        console.log(`   Temperature: ${config.temperature}`)
        console.log(`   Max Tokens: ${config.maxTokens}`)
        console.log(`   Use Emojis: ${config.useEmojis ? 'Sim ✅' : 'Não ❌'}`)
        console.log(`   Offer Packages: ${config.offerPackages ? 'Sim ✅' : 'Não ❌'}`)
        console.log(`   Ask Insurance: ${config.askInsurance ? 'Sim ✅' : 'Não ❌'}`)
        console.log(`   System Prompt: ${config.systemPrompt.length} caracteres`)

        // 2. Verificar exemplos
        console.log(`\n📚 Exemplos de conversas: ${config.examples.length}`)
        if (config.examples.length === 0) {
            console.warn('⚠️  Nenhum exemplo encontrado! A IA pode não funcionar bem.')
        } else {
            console.log('   Categorias:')
            const categories = [...new Set(config.examples.map(e => e.category))]
            categories.forEach(cat => {
                const count = config.examples.filter(e => e.category === cat).length
                console.log(`   • ${cat}: ${count} exemplo(s)`)
            })
        }

        // 3. Verificar regras de transferência
        console.log(`\n🔄 Regras de transferência: ${config.transferRules.length}`)
        if (config.transferRules.length === 0) {
            console.warn('⚠️  Nenhuma regra de transferência encontrada!')
        } else {
            config.transferRules.forEach(rule => {
                console.log(`   • ${rule.name}: ${rule.keywords.length} palavra(s)-chave, fila: ${rule.targetQueue}`)
            })
        }

        // 4. Verificar variáveis de ambiente
        console.log('\n🔐 Variáveis de ambiente:')
        const openaiKey = process.env.OPENAI_API_KEY
        if (!openaiKey) {
            console.error('❌ OPENAI_API_KEY não configurada!')
            process.exit(1)
        } else {
            console.log(`   ✅ OPENAI_API_KEY: ${openaiKey.substring(0, 10)}...${openaiKey.substring(openaiKey.length - 4)}`)
        }

        const model = process.env.OPENAI_MODEL || 'gpt-4o'
        console.log(`   ✅ OPENAI_MODEL: ${model}`)

        const timeout = process.env.OPENAI_TIMEOUT || '20000'
        console.log(`   ✅ OPENAI_TIMEOUT: ${timeout}ms`)

        // 5. Verificar dados da clínica
        console.log('\n🏥 Dados da clínica:')
        const procedures = await prisma.procedure.count()
        const insurances = await prisma.insuranceCompany.count()
        const clinics = await prisma.clinic.count()

        console.log(`   Procedimentos: ${procedures}`)
        console.log(`   Convênios: ${insurances}`)
        console.log(`   Clínicas: ${clinics}`)

        if (procedures === 0) {
            console.warn('⚠️  Nenhum procedimento cadastrado!')
        }
        if (insurances === 0) {
            console.warn('⚠️  Nenhum convênio cadastrado!')
        }
        if (clinics === 0) {
            console.warn('⚠️  Nenhuma clínica cadastrada!')
        }

        // 6. Resumo
        console.log('\n📊 Resumo:')
        const allGood = 
            config !== null &&
            config.examples.length > 0 &&
            config.transferRules.length > 0 &&
            openaiKey !== undefined &&
            procedures > 0 &&
            insurances > 0 &&
            clinics > 0

        if (allGood) {
            console.log('✅ Tudo configurado corretamente! A IA está pronta para uso.')
        } else {
            console.warn('⚠️  Algumas configurações estão faltando. A IA pode não funcionar perfeitamente.')
        }

        await prisma.$disconnect()
        process.exit(allGood ? 0 : 1)

    } catch (error) {
        console.error('❌ Erro ao verificar configuração:', error)
        await prisma.$disconnect()
        process.exit(1)
    }
}

verifyAIConfig()
