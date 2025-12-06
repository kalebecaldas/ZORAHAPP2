import prisma from '../api/prisma/client.js'

/**
 * Script para adicionar exemplos de conversas sobre escolha de unidade
 */

async function addUnitSelectionExamples() {
    console.log('🚀 Adicionando exemplos de escolha de unidade...\n')

    try {
        const config = await prisma.aIConfiguration.findFirst({
            where: { isActive: true }
        })

        if (!config) {
            throw new Error('Configuração da IA não encontrada!')
        }

        // Exemplo 1: Pergunta sobre valor - Bot pergunta unidade
        await prisma.aIExample.create({
            data: {
                name: 'Pergunta sobre valor - Pedir unidade',
                configurationId: config.id,
                userMessage: 'Quanto custa fisioterapia?',
                botResponse: 'Para qual unidade você gostaria? Temos a unidade Vieiralves e a unidade São José.',
                intent: 'informacao_valor',
                entities: JSON.stringify({ procedimento: 'fisioterapia' }),
                action: 'ask_unit',
                isActive: true
            }
        })
        console.log('✅ Exemplo 1 criado: Pergunta sobre valor')

        // Exemplo 2: Paciente escolhe unidade - Bot informa preço
        await prisma.aIExample.create({
            data: {
                name: 'Escolha Vieiralves - Informar preço',
                configurationId: config.id,
                userMessage: 'Vieiralves',
                botResponse: 'Na unidade Vieiralves, a sessão de Fisioterapia Ortopédica custa R$ 90,00. Temos também pacotes com desconto! Pacote de 10 sessões por R$ 800,00. Gostaria de agendar?',
                intent: 'escolha_unidade',
                entities: JSON.stringify({ unidade: 'vieiralves', procedimento: 'fisioterapia' }),
                action: 'inform_price',
                isActive: true
            }
        })
        console.log('✅ Exemplo 2 criado: Escolha de unidade')

        // Exemplo 3: Paciente escolhe São José
        await prisma.aIExample.create({
            data: {
                name: 'Escolha São José - Informar preço',
                configurationId: config.id,
                userMessage: 'São José',
                botResponse: 'Na unidade São José, a sessão de Fisioterapia Ortopédica custa R$ 45,00. Temos pacote de 10 sessões por R$ 200,00. Gostaria de agendar?',
                intent: 'escolha_unidade',
                entities: JSON.stringify({ unidade: 'sao_jose', procedimento: 'fisioterapia' }),
                action: 'inform_price',
                isActive: true
            }
        })
        console.log('✅ Exemplo 3 criado: Escolha São José')

        // Exemplo 4: Agendamento - Bot pergunta unidade
        await prisma.aIExample.create({
            data: {
                name: 'Agendamento - Pedir unidade',
                configurationId: config.id,
                userMessage: 'Quero agendar acupuntura',
                botResponse: 'Perfeito! Para qual unidade você gostaria de agendar? Vieiralves ou São José?',
                intent: 'agendamento',
                entities: JSON.stringify({ procedimento: 'acupuntura' }),
                action: 'ask_unit',
                isActive: true
            }
        })
        console.log('✅ Exemplo 4 criado: Agendamento sem unidade')

        // Exemplo 5: Com convênio - Bot pergunta unidade
        await prisma.aIExample.create({
            data: {
                name: 'Com convênio - Pedir unidade',
                configurationId: config.id,
                userMessage: 'Tenho Bradesco, quanto custa acupuntura?',
                botResponse: 'Ótimo! Acupuntura é coberta pelo Bradesco, não há custo adicional. Para qual unidade você prefere? Vieiralves ou São José?',
                intent: 'informacao_valor',
                entities: JSON.stringify({ procedimento: 'acupuntura', convenio: 'bradesco' }),
                action: 'ask_unit',
                isActive: true
            }
        })
        console.log('✅ Exemplo 5 criado: Com convênio')

        console.log('\n✅ Total de 5 exemplos adicionados!')
        console.log('\n📋 Comportamento esperado:')
        console.log('   1. Paciente pergunta sobre procedimento')
        console.log('   2. Bot SEMPRE pergunta a unidade')
        console.log('   3. Paciente escolhe')
        console.log('   4. Bot informa preço APENAS da unidade escolhida')

    } catch (error) {
        console.error('❌ Erro:', error)
        throw error
    } finally {
        await prisma.$disconnect()
    }
}

// Executar
addUnitSelectionExamples()
    .then(() => {
        console.log('\n🎉 Script finalizado!')
        process.exit(0)
    })
    .catch((error) => {
        console.error('\n💥 Erro fatal:', error)
        process.exit(1)
    })
