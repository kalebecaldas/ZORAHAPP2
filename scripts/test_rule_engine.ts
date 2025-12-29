import prisma from '../api/prisma/client.js'
import { ruleEngineService } from '../api/services/ruleEngineService.js'

async function testRuleEngine() {
    console.log('🧪 Testando RuleEngineService...\n')
    
    try {
        // 1. Testar busca de regra de procedimento
        console.log('📋 Teste 1: Buscar regra de Acupuntura')
        const acupunturaRule = await ruleEngineService.getProcedureRule('ACUPUNTURA')
        if (acupunturaRule) {
            console.log('  ✅ Regra encontrada:')
            console.log(`     - Requer avaliação: ${acupunturaRule.requiresEvaluation}`)
            console.log(`     - Preço avaliação: R$ ${acupunturaRule.evaluationPrice}`)
            console.log(`     - Mensagem: ${acupunturaRule.customMessage}`)
        } else {
            console.log('  ❌ Regra não encontrada')
        }
        
        console.log('\n')
        
        // 2. Testar formatação de procedimento
        console.log('📋 Teste 2: Formatar informações de Acupuntura')
        const procedureData = {
            code: 'ACUPUNTURA',
            name: 'Acupuntura',
            price: 180,
            packages: [
                {
                    name: 'Pacote 10 sessões',
                    price: 1600,
                    sessions: 10,
                    description: 'Economia de R$ 400'
                }
            ]
        }
        
        const formattedInfo = await ruleEngineService.formatProcedureInfo(procedureData)
        console.log('  ✅ Informação formatada:')
        console.log(formattedInfo.split('\n').map(line => `     ${line}`).join('\n'))
        
        console.log('\n')
        
        // 3. Testar busca de regra de convênio
        console.log('📋 Teste 3: Buscar regra de Bradesco')
        const bradescoRule = await ruleEngineService.getInsuranceRule('BRADESCO')
        if (bradescoRule) {
            console.log('  ✅ Regra encontrada:')
            console.log(`     - Mostrar procedimentos: ${bradescoRule.showCoveredProcedures}`)
            console.log(`     - Esconder valores: ${bradescoRule.hideValues}`)
            console.log(`     - Saudação: ${bradescoRule.customGreeting}`)
        } else {
            console.log('  ❌ Regra não encontrada')
        }
        
        console.log('\n')
        
        // 4. Testar formatação de saudação
        console.log('📋 Teste 4: Formatar saudação para Bradesco')
        const greeting = await ruleEngineService.formatInsuranceGreeting('BRADESCO', 'Bradesco')
        console.log(`  ✅ Saudação: ${greeting}`)
        
        console.log('\n')
        
        // 5. Testar busca de template de resposta
        console.log('📋 Teste 5: Buscar template para VALOR_PARTICULAR')
        const template = await ruleEngineService.getResponseTemplate('VALOR_PARTICULAR', 'procedimento', 'procedure')
        if (template) {
            console.log('  ✅ Template encontrado:')
            console.log(`     - Intenção: ${template.intent}`)
            console.log(`     - Contexto: ${template.context}`)
            console.log(`     - Prioridade: ${template.priority}`)
            console.log(`     - Descrição: ${template.description}`)
        } else {
            console.log('  ❌ Template não encontrado')
        }
        
        console.log('\n')
        
        // 6. Testar renderização de template
        console.log('📋 Teste 6: Renderizar template com variáveis')
        const simpleTemplate = 'Olá {nome}! Para {procedimento}, o valor é R$ {preco}.'
        const variables = {
            nome: 'João',
            procedimento: 'Pilates',
            preco: '150'
        }
        
        const rendered = ruleEngineService.renderTemplate(simpleTemplate, variables)
        console.log(`  ✅ Template renderizado: ${rendered}`)
        
        console.log('\n')
        
        // 7. Testar renderização com condicionais
        console.log('📋 Teste 7: Renderizar template com condicionais')
        const conditionalTemplate = `Preço: R$ {preco}
{if hasDiscount}
✨ Desconto especial disponível!
{endif}`
        
        const withDiscount = ruleEngineService.renderTemplate(conditionalTemplate, { 
            preco: '150', 
            hasDiscount: true 
        })
        console.log('  ✅ Com desconto:')
        console.log(withDiscount.split('\n').map(line => `     ${line}`).join('\n'))
        
        const withoutDiscount = ruleEngineService.renderTemplate(conditionalTemplate, { 
            preco: '150', 
            hasDiscount: false 
        })
        console.log('  ✅ Sem desconto:')
        console.log(withoutDiscount.split('\n').map(line => `     ${line}`).join('\n'))
        
        console.log('\n')
        
        // 8. Testar renderização com loops
        console.log('📋 Teste 8: Renderizar template com loops')
        const loopTemplate = `Pacotes disponíveis:
{foreach packages}
• {packages.name}: R$ {packages.price}
{endforeach}`
        
        const packagesVars = {
            packages: [
                { name: 'Pacote 5 sessões', price: '750' },
                { name: 'Pacote 10 sessões', price: '1400' }
            ]
        }
        
        const withPackages = ruleEngineService.renderTemplate(loopTemplate, packagesVars)
        console.log('  ✅ Template com pacotes:')
        console.log(withPackages.split('\n').map(line => `     ${line}`).join('\n'))
        
        console.log('\n')
        
        // 9. Verificar se deve mostrar valores para convênio
        console.log('📋 Teste 9: Verificar se deve mostrar valores')
        const showValuesBradesco = await ruleEngineService.shouldShowInsuranceValues('BRADESCO')
        const showValuesParticular = await ruleEngineService.shouldShowInsuranceValues('PARTICULAR')
        console.log(`  ✅ Bradesco - Mostrar valores: ${showValuesBradesco}`)
        console.log(`  ✅ Particular - Mostrar valores: ${showValuesParticular}`)
        
        console.log('\n')
        
        // 10. Resumo de estatísticas
        console.log('📊 Estatísticas:')
        const allProcedureRules = await ruleEngineService.getAllProcedureRules()
        const allInsuranceRules = await ruleEngineService.getAllInsuranceRules()
        const allTemplates = await ruleEngineService.getAllResponseTemplates()
        
        console.log(`  - Regras de procedimentos: ${allProcedureRules.length}`)
        console.log(`  - Regras de convênios: ${allInsuranceRules.length}`)
        console.log(`  - Templates de resposta: ${allTemplates.length}`)
        
        console.log('\n✅ Todos os testes concluídos com sucesso!')
        
    } catch (error) {
        console.error('❌ Erro durante os testes:', error)
        throw error
    } finally {
        await prisma.$disconnect()
    }
}

testRuleEngine()
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
