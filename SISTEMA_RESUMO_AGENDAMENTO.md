# 📋 Sistema de Resumo Automático de Agendamento

## ✅ Implementação Completa

### 🎯 Objetivo

Quando um paciente quer agendar e fornece todas as informações, o sistema:
1. Coleta todos os dados necessários (nome, CPF, email, nascimento, convênio)
2. Captura informações do agendamento (procedimento, unidade, data, horário)
3. Transfere a conversa para fila PRINCIPAL
4. **Cria mensagem de resumo interna** visível para o atendente

---

## 🔄 Fluxo Completo

### Passo 1: Paciente Inicia Agendamento
```
USER: "Quero agendar fisioterapia"
BOT: "Perfeito! Qual unidade você prefere?
     1️⃣ Vieiralves
     2️⃣ São José"
USER: "Vieiralves"
BOT: "Qual seu nome completo?"
```

### Passo 2: Bot Coleta Dados
```
Intent: AGENDAR
Action: collect_data

Coleta na ordem:
1. Nome
2. CPF
3. Email
4. Nascimento
5. Convênio (sim/não)
6. Número carteirinha (se tiver convênio)
```

### Passo 3: Todos os Dados Coletados
```
Action muda automaticamente para: transfer_human
```

### Passo 4: Transferência Automática
✅ Conversa vai para fila **PRINCIPAL**  
✅ `assignedToId` = null (disponível para qualquer atendente)  
✅ Status = "PRINCIPAL"  

### Passo 5: Mensagens Internas Criadas

#### 5.1. Card de Dados do Paciente
```
📋 Dados coletados pelo bot

Nome: João Silva
CPF: 123.456.789-00
Email: joao@email.com
Nascimento: 15/03/1990
Convênio: SulAmérica
Nº Carteirinha: 123456
```

#### 5.2. Resumo do Agendamento (NOVO ✨)
```
🤖 RESUMO DO ATENDIMENTO DO BOT
━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 QUER AGENDAR

📅 O Paciente Quer:
🔸 Procedimento: Fisioterapia Pélvica
🏥 Unidade: Vieiralves
📅 Data: 15/01/2025
⏰ Horário: Manhã
💳 Convênio: SulAmérica

📋 Dados Cadastrais:
Nome: João Silva
CPF: 123.456.789-00
Email: joao@email.com
Nascimento: 15/03/1990

💭 Últimas Mensagens:
👤 Paciente: Quero agendar fisioterapia
🤖 Bot: Qual unidade você prefere?
👤 Paciente: Vieiralves
🤖 Bot: Qual seu nome completo?
...
```

---

## 💻 Arquivos Modificados

### 1. Backend

#### `api/utils/systemMessages.ts`
- ✅ Melhorado template de `BOT_INTENT_CONTEXT`
- ✅ Seção destacada "O QUE O PACIENTE QUER"
- ✅ Formatação específica para intent AGENDAR
- ✅ Resumo das últimas mensagens

#### `api/routes/conversations.ts` (linha ~1971)
- ✅ Cria mensagem de resumo automático quando `transfer_human`
- ✅ Busca últimas 10 mensagens (excluindo SYSTEM)
- ✅ Combina entities de `decision.initialData` + `decision.aiContext.entities`
- ✅ Inclui resumo da conversa formatado

### 2. Frontend

#### `src/components/chat/SystemMessage.tsx`
- ✅ Renderização especial para `BOT_INTENT_CONTEXT`
- ✅ Card destacado verde para agendamentos
- ✅ Seção "O Que o Paciente Quer" em destaque
- ✅ Ícones e badges coloridos
- ✅ Grid responsivo para dados

#### `src/components/MessageList.tsx`
- ✅ Suporte a `messageType: 'SYSTEM'`
- ✅ Detecta e renderiza usando `SystemMessage` component
- ✅ Interface atualizada com campos `systemMessageType` e `systemMetadata`

---

## 🎨 Visual do Resumo

### Card de Agendamento (Verde)
```
┌─────────────────────────────────────────┐
│ 📅 RESUMO DO AGENDAMENTO                │
│ ─────────────────────────────────────── │
│                                          │
│ 📅 Quer Agendar  😊 Positivo            │
│                                          │
│ ┌─────────────────────────────────────┐ │
│ │ 🎯 O Paciente Quer:                 │ │
│ │ 🔸 Procedimento: Fisioterapia       │ │
│ │ 🏥 Unidade: Vieiralves              │ │
│ │ 📅 Data: 15/01/2025                 │ │
│ │ ⏰ Horário: Manhã                   │ │
│ │ 💳 Convênio: SulAmérica             │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ 📋 Dados Cadastrais:                    │
│ Nome: João Silva                        │
│ CPF: 123.456.789-00                     │
│ Email: joao@email.com                   │
│ Nascimento: 15/03/1990                  │
│                                          │
│ 💭 Últimas Mensagens:                   │
│ [histórico da conversa]                 │
│                                          │
│ 10:30                                   │
└─────────────────────────────────────────┘
```

### Card de Informação (Azul)
```
┌─────────────────────────────────────────┐
│ 🤖 Contexto da Conversa com o Bot       │
│ ─────────────────────────────────────── │
│                                          │
│ 💬 Pedindo Info  😐 Neutro              │
│                                          │
│ 💬 Informações Mencionadas:             │
│ • Procedimento: Acupuntura              │
│ • Unidade: São José                     │
│                                          │
│ 10:30                                   │
└─────────────────────────────────────────┘
```

---

## 📊 Informações Capturadas

### Dados Cadastrais
- ✅ Nome completo
- ✅ CPF
- ✅ Email
- ✅ Data de nascimento
- ✅ Convênio
- ✅ Número da carteirinha

### Dados do Agendamento
- ✅ Procedimento desejado
- ✅ Unidade preferida (Vieiralves ou São José)
- ✅ Data preferida (se mencionada)
- ✅ Horário preferido (se mencionado)
- ✅ Observações especiais

### Contexto da Conversa
- ✅ Intenção detectada (AGENDAR, INFORMACAO, etc)
- ✅ Sentimento do paciente (positivo, neutro, negativo)
- ✅ Confiança da IA (percentual)
- ✅ Últimas 10 mensagens da conversa

---

## 🚀 Quando o Resumo é Criado

O resumo automático é criado quando:
1. **Intent = AGENDAR** (paciente quer agendar)
2. **Action = transfer_human** (todos os dados coletados)
3. Bot transfere conversa para fila PRINCIPAL

### Gatilho Automático
```typescript
if (decision.action === 'TRANSFER_TO_HUMAN') {
  // 1. Criar/atualizar paciente no banco
  // 2. Mudar status para PRINCIPAL
  // 3. Criar card de dados do paciente
  // 4. Criar mensagem de resumo do agendamento ✨
  // 5. Emitir eventos Socket.IO
}
```

---

## 💡 Benefícios para o Atendente

### ✅ Agilidade
- Atendente vê **imediatamente** o que o paciente quer
- Não precisa ler toda a conversa
- Informações destacadas visualmente

### ✅ Completude
- Todos os dados cadastrais visíveis
- Preferências de agendamento claras
- Histórico da conversa disponível

### ✅ Contexto
- Sabe qual procedimento o paciente quer
- Sabe qual unidade prefere
- Sabe se tem convênio
- Conhece o humor do paciente

---

## 🔍 Detalhes Técnicos

### Tipo de Mensagem
```typescript
messageType: 'SYSTEM'
systemMessageType: 'BOT_INTENT_CONTEXT'
direction: 'system'
from: 'system'
phoneNumber: 'system'
```

### Metadata Estruturada
```typescript
systemMetadata: {
  intentContext: {
    intent: 'AGENDAR',
    sentiment: 'positive',
    confidence: 0.95,
    entities: {
      procedimento: 'Fisioterapia Pélvica',
      clinica: 'Vieiralves',
      data: '15/01/2025',
      horario: 'Manhã',
      nome: 'João Silva',
      cpf: '12345678900',
      email: 'joao@email.com',
      nascimento: '15/03/1990',
      convenio: 'SulAmérica',
      numero_convenio: '123456'
    },
    conversationSummary: '...',
    transferReason: 'Cadastro completo'
  }
}
```

---

## 📝 Exemplos de Uso

### Exemplo 1: Agendamento Completo
```
Paciente: "Quero agendar fisioterapia em vieiralves"
Bot: [coleta dados]
Bot: "Cadastro completo! Em breve um atendente vai finalizar seu agendamento."

→ Conversa vai para PRINCIPAL
→ Resumo aparece no chat:
   📅 RESUMO DO AGENDAMENTO
   🔸 Procedimento: Fisioterapia Pélvica
   🏥 Unidade: Vieiralves
   💳 Convênio: Particular
```

### Exemplo 2: Paciente Não Sabe Data
```
Paciente: "Quero agendar pilates mas não sei o dia ainda"
Bot: [coleta dados]

→ Resumo mostra:
   🔸 Procedimento: Pilates
   🏥 Unidade: [se mencionou]
   📅 Data: Não especificou
   
→ Atendente sabe que precisa ajudar com disponibilidade
```

### Exemplo 3: Apenas Informações
```
Paciente: "Quanto custa acupuntura?"
Bot: [informa valores]

→ Se paciente NÃO disser "agendar", NÃO cria resumo
→ Continua na fila BOT até paciente querer agendar
```

---

## 🎯 Regras de Negócio

### ✅ Quando Transferir para PRINCIPAL
- Intent = AGENDAR
- Todos os dados cadastrais coletados
- Action = transfer_human

### ✅ O Que Fazer se Faltam Dados
- Bot continua coletando
- Não transfere até ter tudo
- Action = collect_data

### ✅ Convênio
- Se paciente tem convênio: coleta número da carteirinha
- Se não tem: marca como "Particular"
- Nunca pergunta convênio se intent for apenas INFORMACAO

---

## 🧪 Como Testar

1. **Iniciar conversa de teste**
2. **Dizer:** "Quero agendar fisioterapia"
3. **Responder** todas as perguntas do bot
4. **Observar:**
   - Bot transfere automaticamente
   - Conversa aparece na fila PRINCIPAL
   - Resumo aparece como mensagem interna no chat
   - Card verde com todas as informações

---

## 📦 Resumo das Alterações

### Backend (3 arquivos)
1. `api/utils/systemMessages.ts` - Template de resumo melhorado
2. `api/routes/conversations.ts` - Criação automática de resumo
3. Sistema já existente de `transferToHuman()` mantido

### Frontend (2 arquivos)
1. `src/components/chat/SystemMessage.tsx` - Card visual melhorado
2. `src/components/MessageList.tsx` - Suporte a mensagens SYSTEM

---

## ✨ Resultado Final

### Para o Paciente
- ✅ Experiência fluida de agendamento
- ✅ Bot coleta dados de forma organizada
- ✅ Confirmação de transferência

### Para o Atendente
- ✅ Vê **imediatamente** o que o paciente quer
- ✅ Todas as informações em um único card
- ✅ Não precisa ler histórico completo
- ✅ Pode agendar rapidamente

### Para o Sistema
- ✅ Processo automatizado
- ✅ Dados estruturados
- ✅ Fila organizada
- ✅ Rastreabilidade completa

---

## 🎉 Status: IMPLEMENTADO E TESTADO

Todas as funcionalidades estão integradas e funcionando:
- ✅ Bot pergunta unidade antes de valores
- ✅ Detecção de procedimentos não atendidos
- ✅ Filtro de avaliações
- ✅ **Resumo automático de agendamento** (NOVO)
- ✅ Mensagens internas visíveis
- ✅ Transferência para fila PRINCIPAL

Pronto para deploy no Railway! 🚀
