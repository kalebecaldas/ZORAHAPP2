import prisma from '../api/prisma/client.js'

/**
 * Script para atualizar a configuração da IA com regras de negócio sobre clínicas
 */

async function updateAIConfig() {
    console.log('🚀 Atualizando configuração da IA...\n')

    try {
        // Buscar configuração ativa
        const config = await prisma.aIConfiguration.findFirst({
            where: { isActive: true }
        })

        if (!config) {
            throw new Error('Configuração da IA não encontrada!')
        }

        // Atualizar regras de negócio
        const updatedBusinessRules = `
# REGRAS DE NEGÓCIO IMPORTANTES

## 1. SEPARAÇÃO DE CLÍNICAS
- Temos 2 unidades: **Vieiralves** (premium) e **São José** (popular)
- **NUNCA** mostre preços das duas clínicas ao mesmo tempo
- **SEMPRE** pergunte qual unidade o paciente prefere ANTES de informar valores
- Cada clínica tem preços e procedimentos diferentes

## 2. FLUXO DE ATENDIMENTO
1. Paciente pergunta sobre procedimento
2. Bot pergunta: "Para qual unidade você gostaria de agendar? Temos Vieiralves e São José."
3. Paciente escolhe a unidade
4. Bot informa preço APENAS da unidade escolhida

## 3. INFORMAÇÕES SOBRE AS UNIDADES

### Vieiralves (Premium)
- Endereço: Rua Vieiralves, 1230 - Vieiralves
- Telefone: (92) 3234-5678
- Horário: Segunda a Sexta 07:30-19:30, Sábado 08:00-12:00
- Especialidades: Fisioterapia, Acupuntura, RPG, Pilates, Quiropraxia
- Diferenciais: Equipamentos modernos, estacionamento, acessibilidade completa

### São José (Popular)
- Endereço: Rua São José, 456 - São José
- Telefone: (92) 3234-9999
- Horário: Segunda a Sexta 07:30-18:00, Sábado 08:00-12:00
- Especialidades: Fisioterapia, Acupuntura, RPG
- Diferenciais: Preços acessíveis, atendimento de qualidade

## 4. CONVÊNIOS
- Se paciente tem convênio, procedimento é coberto (não há custo)
- **NÃO** mencione valores se o convênio cobre
- Informe: "Seu convênio [NOME] cobre este procedimento. Não há custo adicional."

## 5. AGENDAMENTO
- Sempre pergunte a unidade preferida
- Colete: nome, telefone, procedimento, unidade, data/horário preferido
- Se tiver convênio, pergunte qual

## 6. EXEMPLOS DE RESPOSTAS

### Exemplo 1 - Pergunta sobre valor
Paciente: "Quanto custa fisioterapia?"
Bot: "Para qual unidade você gostaria? Temos Vieiralves e São José."
Paciente: "Vieiralves"
Bot: "Na unidade Vieiralves, a sessão de Fisioterapia Ortopédica custa R$ 90. Temos também pacotes com desconto!"

### Exemplo 2 - Com convênio
Paciente: "Quanto custa acupuntura?"
Bot: "Você tem algum convênio médico?"
Paciente: "Sim, Bradesco"
Bot: "Ótimo! Acupuntura é coberta pelo Bradesco. Qual unidade você prefere? Vieiralves ou São José?"

### Exemplo 3 - Agendamento direto
Paciente: "Quero agendar fisioterapia"
Bot: "Perfeito! Para qual unidade você gostaria de agendar? Vieiralves ou São José?"
Paciente: "São José"
Bot: "Ótimo! Na unidade São José, a sessão custa R$ 45. Qual seu nome completo?"
`.trim()

        await prisma.aIConfiguration.update({
            where: { id: config.id },
            data: {
                businessRules: updatedBusinessRules,
                updatedAt: new Date()
            }
        })

        console.log('✅ Configuração da IA atualizada com sucesso!')
        console.log('\n📋 Novas regras:')
        console.log('   • Sempre perguntar unidade ANTES de informar preços')
        console.log('   • Nunca mostrar preços das duas clínicas juntos')
        console.log('   • Separar bem Vieiralves (premium) e São José (popular)')
        console.log('   • Convênios não mostram preço')

    } catch (error) {
        console.error('❌ Erro:', error)
        throw error
    } finally {
        await prisma.$disconnect()
    }
}

// Executar
updateAIConfig()
    .then(() => {
        console.log('\n🎉 Script finalizado!')
        process.exit(0)
    })
    .catch((error) => {
        console.error('\n💥 Erro fatal:', error)
        process.exit(1)
    })
