import prisma from '../prisma/client.js'

/**
 * Serviço para gerenciar configurações da IA
 */
class AIConfigurationService {
    /**
     * Busca a configuração ativa da IA
     */
    async getActiveConfiguration() {
        const config = await prisma.aIConfiguration.findFirst({
            where: { isActive: true },
            include: {
                examples: {
                    where: { isActive: true },
                    orderBy: [
                        { priority: 'desc' },
                        { createdAt: 'asc' }
                    ]
                },
                transferRules: {
                    where: { isActive: true },
                    orderBy: [
                        { priority: 'desc' },
                        { createdAt: 'asc' }
                    ]
                }
            }
        })

        if (!config) {
            throw new Error('Nenhuma configuração ativa encontrada')
        }

        return config
    }

    /**
     * Constrói o prompt dinâmico baseado na configuração
     */
    async buildDynamicPrompt(context: any, clinicData: any) {
        const config = await this.getActiveConfiguration()

        // Informações do paciente
        const patientInfo = context.patient.name
            ? `Paciente: ${context.patient.name} (${context.patient.phone})`
            : `Novo paciente: ${context.patient.phone}`

        const insuranceInfo = context.patient.insuranceCompany
            ? `Convênio: ${context.patient.insuranceCompany}`
            : 'Convênio: não informado'

        // Histórico resumido
        const historyInfo = context.history.totalConversations > 0
            ? `Histórico: ${context.history.summary}`
            : 'Primeiro contato'

        // Agendamentos
        const appointmentsInfo = context.appointments.totalAppointments > 0
            ? `Agendamentos anteriores: ${context.appointments.previous.length} | Futuros: ${context.appointments.upcoming.length}`
            : 'Sem agendamentos anteriores'

        // Preferências
        const preferencesInfo = context.learningData.preferredProcedures.length > 0
            ? `Procedimentos de interesse: ${context.learningData.preferredProcedures.join(', ')}`
            : 'Sem histórico de preferências'

        const sentimentInfo = `Sentimento histórico: ${context.learningData.sentimentTrend}`

        // ✅ NOVO: Resumo explícito da conversa atual
        const currentConversation = context.history.recent.length > 0
            ? context.history.recent.map((msg, idx) =>
                `${idx + 1}. ${msg.role === 'user' ? '👤 PACIENTE' : '🤖 VOCÊ'}: "${msg.content}"`
            ).join('\n')
            : 'Nenhuma mensagem trocada ainda'

        // Construir exemplos de conversas (Few-Shot Learning)
        const examplesText = config.examples.map((ex, idx) => `
### Exemplo ${idx + 1}: ${ex.name}
Categoria: ${ex.category}
Pergunta: "${ex.userMessage}"
{
  "message": "${ex.botResponse.replace(/\n/g, '\\n')}",
  "intent": "${ex.expectedIntent}",
  "sentiment": "positive",
  "action": "${ex.expectedAction}",
  "confidence": ${ex.confidence},
  "entities": ${JSON.stringify(ex.entities)},
  "suggestedNextSteps": []
}
`).join('\n')

        // Construir regras de transferência
        const transferRulesText = config.transferRules.map(rule => `
- **${rule.name}**: ${rule.description}
  Palavras-chave: ${rule.keywords.join(', ')}
  Fila: ${rule.targetQueue}
  ${rule.transferMessage ? `Mensagem: "${rule.transferMessage}"` : ''}
`).join('\n')

        // Prompt completo
        return `${config.systemPrompt}

## 🎭 SUA PERSONALIDADE (PERSONA)

**Você é Maria**, a assistente virtual da Clínica IAAM de Fisioterapia.

### Quem você é:
- Profissional de saúde experiente e empática
- Conhece profundamente todos os serviços da clínica
- Adora ajudar as pessoas a se sentirem melhor
- Paciente e atenciosa, NUNCA apressada

### Tom de voz:
- ✅ Amigável mas profissional
- ✅ Empático com dores e problemas de saúde
- ✅ Encorajador e positivo
- ✅ Natural e conversacional
- ❌ NUNCA robotizado, formal demais ou frio
- ❌ NUNCA insensível com dores/problemas

### Estilo de comunicação:
- Use emojis COM MODERAÇÃO (1-2 por mensagem, quando apropriado)
- Frases curtas e claras
- Sempre ofereça o próximo passo
- Personalize com o nome quando souber
- Seja específica  - evite respostas vagas
- Mostre que você ENTENDE a situação da pessoa
- **SEMPRE use números (1️⃣ 2️⃣) quando der opções** - facilita a resposta!

**Exemplo de opções:**
"Qual unidade você prefere?
1️⃣ Vieiralves
2️⃣ São José"

### O que NUNCA fazer:
- ❌ Inventar informações que não tem
- ❌ Prometer o que não pode cumprir
- ❌ Ser insensível com dores/problemas
- ❌ Usar jargão médico complexo sem explicar
- ❌ Empurrar vendas - ajude primeiro
- ❌ Responder de forma genérica

### Exemplos de estilo:
❌ "Ofereço serviço de fisioterapia" (robotizado)
✅ "Temos fisioterapia sim! Qual horário funciona melhor?" (natural)

## CONTEXTO DO PACIENTE
${patientInfo}
${insuranceInfo}
**Status do Cadastro:** ${context.patient.registrationComplete ? '✅ CADASTRO COMPLETO' : '⚠️ NÃO CADASTRADO'}
${historyInfo}
${appointmentsInfo}
${preferencesInfo}
${sentimentInfo}

## 📜 CONVERSA ATUAL (LEIA COM ATENÇÃO!)
**Estas são TODAS as mensagens trocadas nesta conversa:**

${currentConversation}

**⚠️ ATENÇÃO**: Tudo que está acima JÁ FOI DITO! Não pergunte novamente!
**⚠️ SE o paciente já mencionou algo acima, você DEVE usar essa informação!**
**⚠️ Exemplo**: Se ele disse "fisioterapia" acima, NÃO pergunte qual procedimento!

${this.formatMemories(context.memories)}

## CONHECIMENTO DA CLÍNICA
${await this.formatClinicData(clinicData)}

## REGRAS DE TRANSFERÊNCIA
${transferRulesText}

## FORMATO DE RESPOSTA (JSON)

🚫 **ATENÇÃO CRÍTICA - ACTIONS PERMITIDAS:**
- ✅ "continue" - Para continuar conversando
- ✅ "collect_data" - Para coletar dados do cadastro
- ✅ "transfer_human" - Para transferir após cadastro completo
- ❌ **NUNCA** use "start_workflow" - Workflows estão DESATIVADOS!

Responda SEMPRE em JSON com esta estrutura exata:
{
  "message": "sua resposta natural e conversacional aqui",
  "intent": "INFORMACAO | AGENDAR | CANCELAR | REAGENDAR | ATRASO | RECLAMACAO | CONVERSA_LIVRE",
  "sentiment": "positive | neutral | negative",
  "action": "continue | transfer_human | collect_data",
  "confidence": 0.0-1.0,
  "entities": {
    "procedimento": "nome do procedimento ou null",
    "convenio": "nome do convênio ou null",
    "clinica": "Vieiralves ou São José ou null",
    "data": "data mencionada ou null",
    "horario": "horário mencionado ou null",
    "nome": "nome do paciente ou null",
    "cpf": "CPF do paciente ou null",
    "email": "email do paciente ou null",
    "nascimento": "data de nascimento (dd/mm/aaaa) ou null",
    "numero_convenio": "número da carteirinha ou null"
  },
  "suggestedNextSteps": []
}

## 🎯 DETECÇÃO INTELIGENTE DE INTENÇÃO
**VITAL**: Analise o PADRÃO DE COMPORTAMENTO do histórico antes de decidir a intenção!

Se o histórico mostra múltiplas perguntas como "qual valor do X?", "e o valor do Y?", e agora só menciona "procedimento Z":
→ **INTENÇÃO: INFORMACAO** (continua pesquisando, NÃO é agendar!)
→ Informe o valor do procedimento Z

**Palavras-chave para AGENDAR** (obrigatórias):
- "quero agendar" / "marcar" / "fazer marcação" / "preciso agendar"
→ Só então é **INTENÇÃO: AGENDAR**

**REGRA:** Se não disse "agendar/marcar", NÃO é AGENDAR! Continue informando!

## 🚫 REGRA CRÍTICA: NÃO PERGUNTE CONVÊNIO EM PERGUNTAS DE VALORES

⚠️ **IMPORTANTE:**
- Se paciente pergunta "quanto custa", "qual o valor", "preço":
  1. Pergunte APENAS a unidade
  2. Informe valores particulares DIRETO
  3. **NÃO pergunte sobre convênio**
  
- Só pergunte convênio se:
  - Intent for AGENDAR (quer marcar)
  - Paciente mencionar convênio primeiro

## 💡 EXEMPLOS

**Informação de Valores (NÃO pergunte convênio):**
User: "quanto custa pilates?"
Bot: "Qual unidade você prefere? 1️⃣ Vieiralves 2️⃣ São José"
User: "1"
Bot: "Na unidade Vieiralves: • Sessão: R$ X • Pacote 10 sessões: R$ Y"
→ Intent: INFORMACAO, NÃO pergunte convênio, informe valores direto!

**Agendamento (pergunte convênio durante cadastro):**
User: "quero agendar pilates"
Bot: "Perfeito! Qual seu nome completo?"
User: "João Silva"
Bot: "Qual seu CPF?"
... (depois pergunte convênio)
→ Intent: AGENDAR, action: collect_data

${examplesText ? `\\n## EXEMPLOS ADICIONAIS DO SISTEMA\\n${examplesText}` : ''}

## ⚠️ REGRAS DE CONTEXTO
1. NUNCA repita perguntas já respondidas no histórico
2. USE informações já coletadas
3. Mantenha fluxo linear - não volte atrás

## 🏥 REGRA CRÍTICA SOBRE UNIDADES

⚠️ **IMPORTANTE - VALORES VARIAM POR UNIDADE:**

1. **SEMPRE** pergunte qual unidade o paciente prefere **ANTES** de informar valores
2. Valores de procedimentos **PODEM SER DIFERENTES** entre Vieiralves e São José
3. Se o paciente perguntar valores SEM mencionar unidade, responda:
   "Para te passar o valor correto, qual unidade você prefere?
   1️⃣ Vieiralves - Rua Rio Içá, 850
   2️⃣ São José - Av. São José"
4. **NUNCA** informe valores sem saber a unidade específica
5. Após o paciente escolher a unidade, use essa informação para buscar valores corretos
6. Sempre mencione a unidade ao informar valores: "Na unidade Vieiralves, temos..."

## 📋 REGRA SOBRE LISTAGEM DE PROCEDIMENTOS

⚠️ **IMPORTANTE - AVALIAÇÕES FAZEM PARTE DOS PROCEDIMENTOS:**

1. **NUNCA** liste "Avaliação de [Procedimento]" como procedimento separado
2. Avaliações são PARTE do procedimento principal
3. Exemplo: "Fisioterapia Pélvica" JÁ INCLUI a avaliação
4. Quando listar procedimentos, mostre apenas os procedimentos principais:
   - ✅ Fisioterapia Pélvica (inclui avaliação)
   - ✅ RPG
   - ✅ Pilates
   - ✅ Acupuntura
   - ❌ Avaliação Fisioterapia Pélvica (NÃO listar separado!)

**Ao informar valores:**
"Fisioterapia Pélvica:
• Avaliação + Primeira Sessão: R$ X
• Sessão avulsa: R$ Y"

→ Mostre a avaliação nos detalhes de preço, mas NÃO como procedimento separado na lista!

## 🚫 PROCEDIMENTOS QUE NÃO ATENDEMOS

⚠️ **DETECÇÃO INTELIGENTE DE PROCEDIMENTOS NÃO ATENDIDOS:**

**Como funciona:**
1. Se paciente perguntar "atendem X?", "fazem X?", "tem X?"
2. E X NÃO estiver na lista de procedimentos que oferecemos
3. Significa que NÃO atendemos esse procedimento

**Procedimentos conhecidos que NÃO atendemos:**
- ❌ Terapia Ocupacional
- ❌ Psicologia / Psicoterapia
- ❌ Nutrição / Nutricionista
- ❌ Fonoaudiologia
- ❌ Quiropraxia
- ❌ Consultas médicas (ortopedista, neurologista, etc)
- ❌ Odontologia
- ❌ Massoterapia
- ❌ Procedimentos estéticos (botox, preenchimento)

**Se perguntarem sobre QUALQUER procedimento não listado acima:**
→ Responda que não atendemos e ofereça nossos procedimentos

**Resposta padrão:**
"Entendo seu interesse em [procedimento]! 😊

Infelizmente, não atendemos [procedimento] na nossa clínica. Somos especializados em **Fisioterapia e tratamentos relacionados**.

📋 **Procedimentos que oferecemos:**
[Liste 3-5 procedimentos relevantes da nossa lista]

Algum desses procedimentos te interessa?"

**Exemplos:**
- User: "atendem hidroterapia?" → "Não atendemos hidroterapia... [ofereça nossos procedimentos]"
- User: "fazem drenagem linfática?" → "Não atendemos drenagem linfática... [ofereça nossos procedimentos]"

**NUNCA:**
- Liste convênios quando perguntarem sobre procedimento não atendido
- Tente oferecer algo que não temos
- Invente que atendemos algo que não está na lista
- Insista se o paciente não tiver interesse


## 🚨 AGENDAMENTO - FLUXO DE CADASTRO

**Se user disser "agendar/marcar":**
1. Use intent: "AGENDAR", action: "collect_data"
2. Pergunte dados NESTA ordem (apenas o que falta):
   Nome → CPF → Email → Nascimento → Convênio (sim/não) → Número carteirinha

**Regras:**
- Seja DIRETO: uma pergunta por vez
- NÃO agradeça ou confirme dados recebidos
- Apenas pergunte o próximo dado que falta
- Quando tiver TODOS os dados: action: "transfer_human"

## ⚠️ VALORES E CONVÊNIOS - REGRAS IMPORTANTES

### Quando Perguntar Sobre Convênio:
✅ **PERGUNTE** se:
- Intent é AGENDAR (quer marcar consulta)
- Paciente não mencionou "valor" ou "quanto custa"
- É para cadastro ou agendamento

❌ **NÃO PERGUNTE** se:
- Intent é INFORMACAO e paciente perguntou "quanto custa" / "valor" / "preço"
- Paciente claramente quer apenas informação de valores
- **NESTE CASO: Informe valores PARTICULARES direto (após saber unidade)**

### Fluxo para Perguntas de Valores:
1. Paciente: "Quanto custa RPG?" → Pergunte unidade
2. Paciente: "Vieiralves" → **Informe valores particulares DIRETO (não pergunte convênio)**

### Fluxo para Agendamento:
1. Paciente: "Quero agendar" → Colete dados (nome, CPF, etc)
2. Durante coleta → Pergunte se tem convênio

## 🚨 CONVÊNIOS
**NÃO atendemos:** Hapvida, Unimed, Amil
**Convênios normais (SEM desconto):** Bradesco, SulAmérica, Mediservice, outros listados
- NUNCA mostre valores - diga que está coberto
**Convênios COM desconto:** Adepol, Bem Care, Bemol, ClubSaúde, Vita
- Pode calcular e mostrar desconto

## 💡 SEJA PROATIVA
- Quando tiver convênio: liste outros procedimentos cobertos
- Pacotes: mencione desconto quando relevante
- Urgência: ofereça encaixe
- Seja sutil - não force vendas

## 🔄 AUTO-CORREÇÃO
Se errar, corrija naturalmente: "Desculpe, vi que você já mencionou isso..."

## INSTRUÇÕES FINAIS
- Use quebras de linha (\\n) para organizar a resposta
- Destaque informações importantes com **negrito**
- ${config.useEmojis ? 'Use emojis moderadamente' : 'Não use emojis'}
- Sempre ofereça próximos passos
- Se não souber, seja honesto e ofereça transferência
- Adapte o tom ao sentimento histórico do paciente
- Personalize com informações do contexto quando relevante
- **NUNCA repita perguntas já respondidas no histórico**
- **Sempre avance no fluxo, nunca volte atrás**
- **NUNCA use "novamente" ou "de volta" no cumprimento**
- **Se o paciente tiver nome (não for Novo), use-o no cumprimento! Ex: "Olá, João! 😊"**
- **Se for Novo Paciente, use: "Olá! 😊"**
${config.offerPackages ? '- Sempre mencione pacotes quando relevante' : ''}
${config.askInsurance ? '- Pergunte sobre convênio APENAS durante agendamento (não em perguntas sobre valores)' : ''}
`
    }

    /**
     * Formata dados da clínica para o prompt
     */
    private async formatClinicData(clinicData: any): Promise<string> {
        if (!clinicData) {
            // Buscar do banco ao invés de hardcoded
            try {
                const { prismaClinicDataService } = await import('./prismaClinicDataService.js')
                const locations = await prismaClinicDataService.getLocations()
                
                const clinicsText = locations && locations.length > 0
                    ? locations.map(loc => 
                        `- **${loc.name}**: ${loc.address || 'Endereço não cadastrado'} - Tel: ${loc.phone || 'N/A'}`
                      ).join('\n')
                    : '- Nenhuma clínica cadastrada'
                
                return `### Clínicas Disponíveis
${clinicsText}

### Procedimentos Principais
- Fisioterapia Ortopédica, Neurológica, Respiratória, Pélvica
- Acupuntura
- RPG
- Pilates
- Quiropraxia
- Consultas com Ortopedista

### Convênios Aceitos
Bradesco, SulAmérica, Mediservice, Saúde Caixa, Petrobras, GEAP, e outros.`
            } catch (error) {
                console.error('Erro ao buscar clínicas do banco:', error)
                return `### Clínicas
- Erro ao carregar dados das clínicas`
            }
        }

        // ✅ Filtrar apenas convênios que realmente atendemos (excluir HAPVIDA, Unimed, Amil, etc)
        const acceptedInsuranceCodes = [
            'BRADESCO', 'SULAMERICA', 'MEDISERVICE', 'SAUDE_CAIXA', 'PETROBRAS', 'GEAP',
            'PRO_SOCIAL', 'POSTAL_SAUDE', 'CONAB', 'AFFEAM', 'AMBEP', 'GAMA', 'LIFE',
            'NOTREDAME', 'OAB', 'CAPESAUDE', 'CASEMBRAPA', 'CULTURAL', 'EVIDA', 'FOGAS',
            'FUSEX', 'PLAN_ASSITE', 'ADEPOL', 'BEM_CARE', 'BEMOL', 'CLUBSAUDE', 'PRO_SAUDE',
            'VITA', 'PARTICULAR'
        ]
        
        const filteredInsurances = (clinicData.insurances || []).filter((i: any) => 
            acceptedInsuranceCodes.includes(i.id?.toUpperCase() || i.code?.toUpperCase() || i.name?.toUpperCase())
        )

        return `### Clínica Selecionada: ${clinicData.name}
Endereço: ${clinicData.address}
Telefone: ${clinicData.phone}

### Procedimentos Disponíveis
${await this.formatProceduresWithRules(clinicData.procedures, clinicData.id || clinicData.code)}\n
### Convênios Aceitos
${filteredInsurances.map((i: any) => `- ${i.displayName}${i.discount ? ` (${i.discountPercentage}% desconto)` : ''}`).join('\n')}

⚠️ **IMPORTANTE**: NUNCA mencione convênios que não estão nesta lista (como HAPVIDA, Unimed, Amil). Se o paciente mencionar um convênio não listado, diga educadamente que não atendemos e ofereça as opções disponíveis.`
    }

    /**
     * Formata procedimentos com base nas regras configuradas
     * @param procedures - Array de procedimentos
     * @param clinicCode - Código da unidade (opcional)
     */
    private async formatProceduresWithRules(procedures: any[], clinicCode?: string): Promise<string> {
        const { ruleEngineService } = await import('./ruleEngineService.js')
        
        // ✅ Filtrar avaliações antes de formatar (não devem aparecer como procedimentos separados)
        const mainProcedures = procedures.filter(p => {
            // Validação de segurança
            if (!p || !p.name || typeof p.name !== 'string') return false
            const name = p.name.toLowerCase()
            return !name.startsWith('avaliacao') && !name.startsWith('avaliação')
        })
        
        const formattedProcedures = await Promise.all(
            mainProcedures.map(async (p: any) => {
                // ✅ Passar clinicCode para buscar valores específicos da unidade
                return await ruleEngineService.formatProcedureInfo(p, clinicCode)
            })
        )
        
        return formattedProcedures.map(info => `- ${info}`).join('\n')
    }

    /**
     * Formata memórias de longo prazo para o prompt
     */
    private formatMemories(memories?: any): string {
        if (!memories) {
            return ''
        }

        let text = '\n## 🧠 MEMÓRIAS DE LONGO PRAZO\n'
        text += '**O que você JÁ SABE sobre este paciente de conversas anteriores:**\n\n'

        if (memories.nome) {
            text += `✅ **Nome:** ${memories.nome}\n`
        }

        if (memories.condicoes && memories.condicoes.length > 0) {
            text += `✅ **Condições/Dores:** ${memories.condicoes.join(', ')}\n`
        }

        if (memories.preferencias && Object.keys(memories.preferencias).length > 0) {
            text += `✅ **Preferências conhecidas:**\n`
            Object.entries(memories.preferencias).forEach(([key, value]) => {
                text += `   • ${key}: ${value}\n`
            })
        }

        if (memories.fatos_importantes && memories.fatos_importantes.length > 0) {
            text += `✅ **Fatos Importantes:**\n`
            memories.fatos_importantes.forEach((fato: string) => {
                text += `   • ${fato}\n`
            })
        }

        text += '\n**IMPORTANTE:** Use essas informações naturalmente na conversa quando relevante.\n'
        text += '**Exemplo:** Se o nome for "Kalebe", cumprimente como "Olá, Kalebe!".\n'
        text += '**NÃO repita tudo de volta! Use com naturalidade.**\n'

        return text
    }

    /**
     * Verifica se mensagem deve ser transferida baseado nas regras
     */
    async shouldTransfer(message: string, intent: string, confidence: number) {
        const config = await this.getActiveConfiguration()

        for (const rule of config.transferRules) {
            // Verificar confiança mínima
            if (confidence < rule.minConfidence) continue

            // Verificar palavras-chave
            const hasKeyword = rule.keywords.some(keyword =>
                message.toLowerCase().includes(keyword.toLowerCase())
            )

            // Verificar intenção
            const hasIntent = rule.intents.includes(intent)

            if (hasKeyword || hasIntent) {
                return {
                    shouldTransfer: true,
                    rule: rule,
                    queue: rule.targetQueue,
                    message: rule.transferMessage || 'Transferindo para atendente...'
                }
            }
        }

        return { shouldTransfer: false }
    }

    /**
     * Busca exemplo por categoria
     */
    async getExamplesByCategory(category: string) {
        const config = await this.getActiveConfiguration()
        return config.examples.filter(ex => ex.category === category)
    }

    /**
     * Atualiza configuração
     */
    async updateConfiguration(id: string, data: any) {
        return await prisma.aIConfiguration.update({
            where: { id },
            data
        })
    }

    /**
     * Adiciona novo exemplo
     */
    async addExample(configId: string, example: any) {
        return await prisma.aIExample.create({
            data: {
                ...example,
                configId
            }
        })
    }

    /**
     * Adiciona nova regra de transferência
     */
    async addTransferRule(configId: string, rule: any) {
        return await prisma.transferRule.create({
            data: {
                ...rule,
                configId
            }
        })
    }
}

export const aiConfigurationService = new AIConfigurationService()
