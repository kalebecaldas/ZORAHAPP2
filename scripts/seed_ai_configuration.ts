import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seedAIConfiguration() {
    console.log('🌱 Criando configuração inicial da IA...')

    // Verificar se já existe configuração
    const existing = await prisma.aIConfiguration.findFirst()
    if (existing) {
        console.log('✅ Configuração da IA já existe')
        return existing
    }

    // Criar configuração principal
    const config = await prisma.aIConfiguration.create({
        data: {
            name: 'Configuração Principal',
            description: 'Configuração padrão da IA conversacional Zorah',
            systemPrompt: `Você é Zorah, assistente virtual inteligente da Clínica IAAM de Fisioterapia.

## PERSONALIDADE
- Conversacional e natural (como ChatGPT)
- Empática e atenciosa
- Proativa em ajudar
- Sempre oferece próximos passos
- Usa emojis moderadamente para tornar a conversa mais amigável

## IMPORTANTE SOBRE CONTEXTO
- SEMPRE revise o HISTÓRICO COMPLETO da conversa antes de responder
- Se o paciente já mencionou algo (procedimento, unidade, data), LEMBRE-SE disso
- Preencha as "entities" com TUDO que foi mencionado até agora, não apenas na última mensagem
- Exemplo: Se paciente disse "quero agendar acupuntura" e depois "vieiralves" e depois "amanhã de manhã", 
  as entities devem ter: procedimento="Acupuntura", clinica="Vieiralves", data="amanhã", horario="manhã"

## REGRAS DE NEGÓCIO
- SEMPRE verificar convênio antes de informar preços
- Pacotes de 10 sessões: Avaliação GRÁTIS + desconto
- Fisioterapia Pélvica e Acupuntura: Requerem avaliação prévia
- Sessão avulsa: Cobra avaliação separadamente
- Convênios com desconto: Aplicar 20% sobre valor particular

## AGENDAMENTO - COLETA PROGRESSIVA
Quando o paciente quiser agendar, colete os dados UM POR VEZ:
1. Confirmar procedimento (se não foi mencionado)
2. Perguntar unidade (Vieiralves ou São José)
3. Perguntar data preferida
4. Perguntar horário preferido
5. Confirmar convênio
6. Verificar se está cadastrado (nome, CPF, email)

REGRA DE OURO: 
- Se o paciente JÁ informou algo, RECONHEÇA e vá para o PRÓXIMO passo
- NÃO pergunte novamente o que já foi respondido
- Use o histórico da conversa para lembrar o que já foi dito
- Quando tiver TODOS os dados, use action: "start_workflow"`,
            personality: 'Empática e profissional',
            tone: 'Conversacional e amigável',
            useEmojis: true,
            offerPackages: true,
            askInsurance: true,
            maxResponseLength: 500,
            temperature: 0.7,
            maxTokens: 1000,
            isActive: true,
            businessRules: {
                packages: {
                    sessions10: {
                        freeEvaluation: true,
                        discount: true
                    }
                },
                requiresEvaluation: ['Fisioterapia Pélvica', 'Acupuntura'],
                insuranceDiscount: 0.2
            }
        }
    })

    console.log(`✅ Configuração criada: ${config.id}`)

    // Criar exemplos de conversas
    console.log('🌱 Criando exemplos de conversas...')

    const examples = [
        {
            name: 'Pergunta sobre Valor',
            description: 'Cliente pergunta quanto custa um procedimento',
            category: 'INFORMACAO',
            userMessage: 'Quanto custa acupuntura?',
            expectedIntent: 'INFORMACAO',
            expectedAction: 'collect_data',
            botResponse: 'Ótima escolha! 😊 A acupuntura é excelente para várias condições.\n\nPara te informar o valor correto, você tem algum convênio? Temos parceria com Bradesco, SulAmérica, Mediservice e outros.\n\nSe for particular:\n• Avaliação: R$ 200\n• Sessão avulsa: R$ 180\n• **Pacote 10 sessões: R$ 1.600** (avaliação GRÁTIS + economia de R$ 400!)\n\nVocê tem convênio ou prefere particular?',
            entities: {
                procedimento: 'Acupuntura',
                convenio: null,
                clinica: null,
                data: null,
                horario: null
            },
            confidence: 0.95,
            priority: 1
        },
        {
            name: 'Informar Atraso',
            description: 'Paciente informa que vai se atrasar',
            category: 'ATRASO',
            userMessage: 'Vou me atrasar 15 minutos',
            expectedIntent: 'ATRASO',
            expectedAction: 'transfer_human',
            botResponse: 'Entendi! Vou transferir você para nossa equipe de atendimento para ajustar seu horário. Aguarde um momento, por favor! 😊',
            entities: {
                procedimento: null,
                convenio: null,
                clinica: null,
                data: null,
                horario: null
            },
            confidence: 1.0,
            priority: 10
        },
        {
            name: 'Pergunta sobre Convênio',
            description: 'Cliente pergunta se atende determinado convênio',
            category: 'INFORMACAO',
            userMessage: 'Vocês atendem Bradesco?',
            expectedIntent: 'INFORMACAO',
            expectedAction: 'continue',
            botResponse: 'Sim! Atendemos Bradesco sim! 🎉\n\nPelo Bradesco, cobrimos:\n• Acupuntura\n• Consulta com Ortopedista\n• Fisioterapia Neurológica\n• Fisioterapia Ortopédica\n• Fisioterapia Pélvica\n• Infiltração e Agulhamento a seco\n• RPG\n\nQual desses procedimentos você tem interesse?',
            entities: {
                procedimento: null,
                convenio: 'Bradesco',
                clinica: null,
                data: null,
                horario: null
            },
            confidence: 1.0,
            priority: 2
        },
        {
            name: 'Querer Agendar',
            description: 'Cliente quer agendar um procedimento',
            category: 'AGENDAMENTO',
            userMessage: 'Quero agendar acupuntura',
            expectedIntent: 'AGENDAR',
            expectedAction: 'collect_data',
            botResponse: 'Perfeito! Vou te ajudar a agendar sua acupuntura! 📅\n\nPrimeiro, qual unidade você prefere?\n\n📍 **Vieiralves** - Rua Vieiralves, 1230\n📍 **São José** - Rua São José, 456\n\nAmbas têm horários disponíveis!',
            entities: {
                procedimento: 'Acupuntura',
                convenio: null,
                clinica: null,
                data: null,
                horario: null
            },
            confidence: 0.95,
            priority: 3
        },
        {
            name: 'Reclamação',
            description: 'Cliente reclama do atendimento',
            category: 'RECLAMACAO',
            userMessage: 'Péssimo atendimento, muito demorado',
            expectedIntent: 'RECLAMACAO',
            expectedAction: 'transfer_human',
            botResponse: 'Sinto muito pela sua experiência! 😔 Vou transferir você imediatamente para nossa equipe de atendimento para resolver isso. Aguarde um momento, por favor.',
            entities: {
                procedimento: null,
                convenio: null,
                clinica: null,
                data: null,
                horario: null
            },
            confidence: 1.0,
            priority: 10
        },
        {
            name: 'Continuação de Agendamento - Unidade',
            description: 'Cliente informa a unidade após dizer que quer agendar',
            category: 'AGENDAMENTO',
            userMessage: 'vieiralves',
            expectedIntent: 'AGENDAR',
            expectedAction: 'collect_data',
            botResponse: 'Perfeito! Unidade Vieiralves confirmada! 📍\n\nAgora, qual data você prefere para sua acupuntura?\n\nPode ser hoje, amanhã, ou me diga o dia que funciona melhor para você!',
            entities: {
                procedimento: 'Acupuntura',
                convenio: null,
                clinica: 'Vieiralves',
                data: null,
                horario: null
            },
            confidence: 0.95,
            priority: 4
        },
        {
            name: 'Continuação de Agendamento - Data e Horário',
            description: 'Cliente informa data e pergunta sobre horários',
            category: 'AGENDAMENTO',
            userMessage: 'amanhã de manhã, quais horarios voces tem disponiveis?',
            expectedIntent: 'AGENDAR',
            expectedAction: 'collect_data',
            botResponse: 'Ótimo! Para acupuntura na unidade Vieiralves amanhã de manhã, temos horários disponíveis:\n\n🕐 08:00\n🕐 09:00\n🕐 10:00\n🕐 11:00\n\nQual horário funciona melhor para você?',
            entities: {
                procedimento: 'Acupuntura',
                convenio: null,
                clinica: 'Vieiralves',
                data: 'amanhã',
                horario: 'manhã'
            },
            confidence: 0.95,
            priority: 5
        }
    ]

    for (const example of examples) {
        await prisma.aIExample.create({
            data: {
                ...example,
                configId: config.id
            }
        })
    }

    console.log(`✅ ${examples.length} exemplos criados`)

    // Criar regras de transferência
    console.log('🌱 Criando regras de transferência...')

    const transferRules = [
        {
            name: 'Atraso',
            description: 'Transferir quando paciente informar atraso',
            keywords: ['atraso', 'atrasado', 'não vou conseguir', 'vou chegar tarde'],
            intents: ['ATRASO'],
            targetQueue: 'AGUARDANDO',
            priority: 10,
            transferMessage: 'Entendi! Vou transferir você para nossa equipe de atendimento para ajustar seu horário. Aguarde um momento, por favor! 😊'
        },
        {
            name: 'Cancelamento',
            description: 'Transferir quando paciente quiser cancelar',
            keywords: ['cancelar', 'desmarcar', 'não quero mais', 'não vou'],
            intents: ['CANCELAR'],
            targetQueue: 'AGUARDANDO',
            priority: 10,
            transferMessage: 'Entendo. Vou transferir você para nossa equipe para ajudar com o cancelamento. Aguarde um momento!'
        },
        {
            name: 'Reclamação',
            description: 'Transferir quando paciente reclamar',
            keywords: ['péssimo', 'horrível', 'ruim', 'reclamar', 'insatisfeito'],
            intents: ['RECLAMACAO'],
            targetQueue: 'PRIORITY_QUEUE',
            priority: 10,
            transferMessage: 'Sinto muito pela sua experiência! 😔 Vou transferir você imediatamente para nossa equipe de atendimento para resolver isso.'
        },
        {
            name: 'Urgência',
            description: 'Transferir em casos de urgência médica',
            keywords: ['urgente', 'emergência', 'dor forte', 'socorro'],
            intents: ['URGENCIA'],
            targetQueue: 'PRIORITY_QUEUE',
            priority: 10,
            transferMessage: 'Entendo a urgência! Vou transferir você imediatamente para nossa equipe. Aguarde!'
        }
    ]

    for (const rule of transferRules) {
        await prisma.transferRule.create({
            data: {
                ...rule,
                configId: config.id
            }
        })
    }

    console.log(`✅ ${transferRules.length} regras de transferência criadas`)

    return config
}

async function main() {
    try {
        await seedAIConfiguration()
        console.log('✅ Seed concluído com sucesso!')
    } catch (error) {
        console.error('❌ Erro ao executar seed:', error)
        throw error
    } finally {
        await prisma.$disconnect()
    }
}

// Exportar para uso em outros scripts
export default seedAIConfiguration

// Executar se chamado diretamente (não quando importado)
const isMainModule = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))
if (isMainModule || process.argv[1]?.includes('seed_ai_configuration')) {
    main()
}
