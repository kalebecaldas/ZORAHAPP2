# 🔄 Reorganização do Intent Classifier - PRIORIDADE ABSOLUTA

## 🎯 Objetivo

Garantir que o **Intent Classifier Agent** seja executado **ANTES** de qualquer atendimento, e principalmente para **SEMPRE perguntar a unidade** na qual o paciente quer atendimento.

---

## ❌ Problema Atual

O fluxo atual permite pular o Intent Classifier quando há um fluxo de agendamento ativo:

```
Webhook Start1
  ↓
Extract Data
  ↓
Get Clinic Data
  ↓
Merge Context
  ↓
Check Active Flow  ← Verifica se há fluxo ativo
  ↓
Route Switch       ← Se skipIntentClassifier = true, PULA o Intent Classifier
  ├─ continueFlow → Prepare Appointment Input (PULA Intent!)
  └─ default → Intent Classifier Agent
```

**Problemas:**
1. ❌ Intent Classifier pode ser pulado
2. ❌ Unidade não é perguntada primeiro
3. ❌ Fluxo não guia mensagens adequadamente

---

## ✅ Solução Proposta

### Nova Estrutura do Fluxo

```
Webhook Start1
  ↓
Extract Data
  ↓
Get Clinic Data
  ↓
Merge Context
  ↓
Intent Classifier Agent  ← SEMPRE executado primeiro!
  ↓
Parse Intent Response
  ↓
Check Unit Selected     ← Novo: Verifica se unidade foi informada
  ↓
Intent Router
  ├─ INFORMACAO → Information Agent
  ├─ AGENDAR → Check Unit → Check Patient → Appointment Agent
  └─ FALAR_ATENDENTE → Handler Transfer
```

---

## 🔧 Mudanças Necessárias no Workflow N8N

### 1. **Remover ou Modificar o Node "Check Active Flow"**

**Ação:** Remover a conexão que permite pular o Intent Classifier.

**Antes:**
```
Merge Context → Check Active Flow → Route Switch
```

**Depois:**
```
Merge Context → Intent Classifier Agent
```

---

### 2. **Modificar o "Intent Classifier Agent"**

**Objetivo:** Sempre perguntar a unidade PRIMEIRO (se não informada).

**System Message Atual:**
```
Você é **Zorah**, o classificador de intenções do IAAM.

## MISSÃO: Classificar intenção em:

1. **INFORMACAO** - Perguntas sobre procedimentos, valores, convênios, localização, horários, cumprimentos
2. **AGENDAR** - APENAS se EXPLICITAMENTE mencionar: "agendar", "marcar", "reservar" (confiança mínima: 0.9)
3. **FALAR_ATENDENTE** - Quer falar com humano

## REGRAS:
- Cumprimentos = INFORMACAO
- Dúvida? = INFORMACAO
- Só AGENDAR com palavras-chave EXPLÍCITAS

## RESPOSTA (JSON):
{"intent": "INFORMACAO|AGENDAR|FALAR_ATENDENTE", "confidence": 0.95}
```

**System Message NOVO:**
```
Você é **Zorah**, o classificador de intenções do IAAM.

## MISSÃO PRINCIPAL: 
SEMPRE perguntar a UNIDADE primeiro (se não informada), depois classificar a intenção.

## UNIDADES DISPONÍVEIS:
${$json.units?.map(u => `- ${u.name}`).join('\n') || '- Vieiralves\n- São José'}

## FLUXO OBRIGATÓRIO:

1. **VERIFICAR UNIDADE:**
   - Se a mensagem NÃO menciona unidade específica → PERGUNTAR: "Qual unidade você prefere? Vieiralves ou São José?"
   - Se já mencionou unidade → CONTINUAR

2. **CLASSIFICAR INTENÇÃO:**
   - **INFORMACAO** - Perguntas sobre procedimentos, valores, convênios, localização, horários, cumprimentos
   - **AGENDAR** - APENAS se EXPLICITAMENTE mencionar: "agendar", "marcar", "reservar" (confiança mínima: 0.9)
   - **FALAR_ATENDENTE** - Quer falar com humano

## REGRAS:
- SEMPRE perguntar unidade PRIMEIRO (exceto se já mencionada)
- Cumprimentos = INFORMACAO (mas perguntar unidade depois)
- Dúvida? = INFORMACAO
- Só AGENDAR com palavras-chave EXPLÍCITAS

## RESPOSTA (JSON):
{
  "intent": "INFORMACAO|AGENDAR|FALAR_ATENDENTE|PEDIR_UNIDADE",
  "confidence": 0.95,
  "unit": "Vieiralves|São José|null",
  "response": "sua resposta ao paciente",
  "needsUnit": true|false
}
```

**Prompt de Entrada:**
```
={{ $('Extract Data').item.json.chatInput }}

Contexto da Clínica:
${$json.clinicInfo}

Unidades disponíveis:
${$json.units?.map(u => `- ${u.name}`).join('\n') || '- Vieiralves\n- São José'}
```

---

### 3. **Adicionar Node "Check Unit Selected" (Novo)**

**Tipo:** Code Node

**Código:**
```javascript
const data = $json;
const intentData = $('Parse Intent Response').item?.json || {};
const extractData = $('Extract Data').item?.json || {};
const mergeContext = $('Merge Context').item?.json || {};

const units = mergeContext.units || [];
const unitName = intentData.unit || extractData.unit || null;

// Verificar se unidade foi mencionada na mensagem original
const originalMessage = (extractData.chatInput || '').toLowerCase();
const unitMentioned = units.some(u => 
  originalMessage.includes(u.name.toLowerCase())
);

const selectedUnit = intentData.unit || (unitMentioned ? 
  units.find(u => originalMessage.includes(u.name.toLowerCase()))?.name : null
) || null;

return [{
  json: {
    ...intentData,
    conversationId: intentData.conversationId || extractData.conversationId,
    unit: selectedUnit,
    needsUnit: !selectedUnit && (intentData.intent === 'AGENDAR' || intentData.intent === 'INFORMACAO'),
    units: units,
    intent: intentData.needsUnit && !selectedUnit ? 'PEDIR_UNIDADE' : intentData.intent
  }
}];
```

**Conexão:**
```
Parse Intent Response → Check Unit Selected → Intent Router
```

---

### 4. **Modificar o "Parse Intent Response"**

**Código Atual:** Manter, mas adicionar extração de `unit` e `needsUnit`:

```javascript
// Parsear resposta do Intent Classifier Agent
const agentResponse = $json;

// Tentar acessar Extract Data
let extractData = {};
try {
  extractData = $('Extract Data').item?.json || {};
} catch (e) {
  extractData = {};
}

// Obter conversationId
let conversationId = agentResponse.conversationId || agentResponse.sessionId || extractData.conversationId || '';

// Obter resposta textual do Agent
let responseText = agentResponse.output || agentResponse.text || agentResponse.response || '';

// Valores padrão
let intent = 'INFORMACAO';
let confidence = 0.5;
let reasoning = '';
let unit = null;
let needsUnit = false;

// Procurar JSON na resposta do Agent
const jsonMatch = responseText.match(/\{[\s\S]*?\}/);
if (jsonMatch) {
  try {
    const parsed = JSON.parse(jsonMatch[0]);
    intent = parsed.intent || intent;
    confidence = parsed.confidence || confidence;
    reasoning = parsed.reasoning || '';
    unit = parsed.unit || null;
    needsUnit = parsed.needsUnit !== undefined ? parsed.needsUnit : false;
  } catch (e) {
    console.log('Erro ao parsear JSON do Agent:', e.message);
  }
}

// Extrair unidade da mensagem original se mencionada
if (!unit) {
  const lowerInput = (agentResponse.chatInput || extractData.chatInput || responseText || '').toLowerCase();
  const units = ['vieiralves', 'são josé', 'sao jose'];
  
  for (const u of units) {
    if (lowerInput.includes(u)) {
      unit = u === 'sao jose' ? 'São José' : (u === 'são josé' ? 'São José' : 'Vieiralves');
      break;
    }
  }
}

// Fallback: detecção por palavras-chave (se ainda for INFORMACAO)
if (intent === 'INFORMACAO' && !needsUnit) {
  const lowerInput = (agentResponse.chatInput || extractData.chatInput || responseText || '').toLowerCase();
  
  const agendarKeywords = ['agendar', 'marcar', 'reservar', 'preciso de horário', 'quero horário', 'fazer consulta'];
  if (agendarKeywords.some(k => lowerInput.includes(k))) {
    intent = 'AGENDAR';
    confidence = 0.9;
  } else if (lowerInput.includes('atendente') || lowerInput.includes('humano') || lowerInput.includes('falar com')) {
    intent = 'FALAR_ATENDENTE';
    confidence = 0.95;
  }
}

// Se precisa de unidade e não tem, definir intent especial
if (!unit && (intent === 'AGENDAR' || intent === 'INFORMACAO')) {
  needsUnit = true;
}

// Retornar resultado formatado
return [{
  json: {
    conversationId: conversationId,
    intent: needsUnit && !unit ? 'PEDIR_UNIDADE' : intent,
    confidence: confidence,
    reasoning: reasoning,
    unit: unit,
    needsUnit: needsUnit,
    response: responseText, // Resposta do agent (pode conter pergunta sobre unidade)
    originalMessage: extractData.chatInput || agentResponse.chatInput || '',
    success: true
  }
}];
```

---

### 5. **Adicionar Nova Rota no "Intent Router"**

**Adicionar nova regra para "PEDIR_UNIDADE":**

```json
{
  "conditions": {
    "options": {
      "caseSensitive": false,
      "leftValue": "",
      "typeValidation": "strict"
    },
    "conditions": [{
      "leftValue": "={{ $json.intent }}",
      "rightValue": "PEDIR_UNIDADE",
      "operator": {
        "type": "string",
        "operation": "equals",
        "singleValue": true
      }
    }],
    "combinator": "and"
  },
  "renameOutput": true,
  "outputKey": "askUnit"
}
```

**Conexão:**
```
Intent Router → askUnit → Information Agent (com prompt especial para perguntar unidade)
```

---

### 6. **Modificar "Information Agent" para Lidar com Pedido de Unidade**

**System Message (modificado):**
```
Você é **Zorah**, assistente de informações do IAAM.

## INFORMAÇÕES:

${$json.clinicInfo}

## REGRAS:
1. Se $json.intent === "PEDIR_UNIDADE" → PERGUNTAR: "Qual unidade você prefere? Vieiralves ou São José?"
2. Seja amigável e clara 😊
3. Use as informações da clínica
4. Mantenha contexto (memória)
5. Convide para agendar quando relevante

## EXEMPLOS:
- Pedindo unidade: "Olá! 😊 Para melhor atendê-lo, qual unidade você prefere? Temos Vieiralves e São José."
- Após unidade: "Ótimo! A unidade ${$json.unit} fica em... [informações]"
```

---

### 7. **Modificar "Prepare Appointment Input" para Incluir Unidade**

**Adicionar validação de unidade:**

```javascript
const data = $json;
const patientResponse = $input.all()[1]?.json || {};
const patients = patientResponse.patients || [];
const extractData = $('Extract Data').item?.json || {};
const mergeContext = $('Merge Context').item?.json || {};
const intentData = $('Check Unit Selected').item?.json || {};
const phone = extractData.phone || '';

const normalizedPhone = phone.replace(/\D/g, '');
const foundPatient = patients.find(p => p.phone.replace(/\D/g, '') === normalizedPhone);

// VERIFICAR SE UNIDADE FOI SELECIONADA
const selectedUnit = intentData.unit || data.unit || null;

if (!selectedUnit) {
  // Se não tem unidade, voltar para pedir unidade
  return [{
    json: {
      conversationId: data.conversationId || extractData.conversationId,
      message: "Para agendar, preciso saber qual unidade você prefere: Vieiralves ou São José? 😊",
      intent: 'PEDIR_UNIDADE',
      action: 'ASK_UNIT',
      requiresUnit: true,
      success: false
    }
  }];
}

let appointmentContext = `**CONTEXTO:**\n\n`;
if (foundPatient) {
  appointmentContext += `✅ Paciente: ${foundPatient.name}\nUnidade: ${selectedUnit}\nPule dados pessoais.\n\n`;
} else {
  appointmentContext += `⚠️ NÃO cadastrado\nUnidade: ${selectedUnit}\nColete: nome, CPF, data nascimento.\n\n`;
}
appointmentContext += mergeContext.clinicInfo || '';

return [{
  json: {
    chatInput: extractData.chatInput || '',
    conversationId: data.conversationId || extractData.conversationId,
    sessionId: extractData.sessionId,
    appointmentContext: appointmentContext,
    patientExists: !!foundPatient,
    patient: foundPatient || null,
    unit: selectedUnit, // Incluir unidade aqui
    clinicData: mergeContext.clinicDataRaw || {},
    appointmentFlow: extractData.appointmentFlow || {
      step: foundPatient ? 'collect_procedure' : 'collect_patient_data',
      phone: phone,
      patientId: foundPatient?.id || null,
      unit: selectedUnit, // Incluir unidade no flow
      collectedData: {}
    }
  }
}];
```

---

## 📋 Resumo das Mudanças

1. ✅ **Remover "Check Active Flow"** - Não permitir pular Intent Classifier
2. ✅ **Modificar "Intent Classifier Agent"** - Sempre perguntar unidade primeiro
3. ✅ **Adicionar "Check Unit Selected"** - Validar se unidade foi informada
4. ✅ **Modificar "Parse Intent Response"** - Extrair unidade e flag needsUnit
5. ✅ **Adicionar rota "PEDIR_UNIDADE"** no Intent Router
6. ✅ **Modificar "Information Agent"** - Lidar com pedido de unidade
7. ✅ **Modificar "Prepare Appointment Input"** - Validar unidade antes de agendar

---

## 🔄 Novo Fluxo Completo

```
Webhook Start1
  ↓
Extract Data
  ↓
Get Clinic Data
  ↓
Merge Context
  ↓
Intent Classifier Agent  ← SEMPRE primeiro!
  ├─ Pergunta unidade se não informada
  └─ Classifica intenção
  ↓
Parse Intent Response
  ├─ Extrai: intent, unit, needsUnit
  ↓
Check Unit Selected
  ├─ Valida se unidade foi informada
  ├─ Se não: intent = "PEDIR_UNIDADE"
  ↓
Intent Router
  ├─ PEDIR_UNIDADE → Information Agent (pergunta unidade)
  ├─ INFORMACAO → Information Agent
  ├─ AGENDAR → Check Patient → Prepare Appointment Input
  └─ FALAR_ATENDENTE → Handler Transfer
```

---

## ✅ Benefícios

1. ✅ **Intent Classifier sempre executado primeiro** - Não pode ser pulado
2. ✅ **Unidade sempre perguntada primeiro** - Antes de qualquer atendimento
3. ✅ **Fluxo guiado** - Mensagens sempre passam pelo identificador de intenção
4. ✅ **Melhor experiência** - Usuário sabe qual unidade desde o início
5. ✅ **Agendamentos mais precisos** - Sempre com unidade definida

---

## 🚀 Como Aplicar

### Opção 1: Manualmente no N8N

1. Acesse o workflow "Zorah Bot 2.0 - FINAL CORRIGIDO" no n8n
2. Faça as mudanças descritas acima
3. Teste o fluxo completo

### Opção 2: Via Export/Import JSON

1. Exportar workflow atual
2. Modificar JSON conforme as mudanças
3. Importar workflow modificado

---

**Status:** 🟡 Aguardando implementação

**Prioridade:** 🔴 ALTA - Essencial para fluxo correto
