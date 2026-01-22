# 🔧 Ajustes do Workflow - Intent Classifier Pede Unidade Primeiro

## 📋 Análise do Workflow Atual

### Fluxo Atual:
```
Webhook Start → Extract Data1 → Intent Classifier Agent1 → Parse Intent Response1 → Intent Router1
```

### Problemas Identificados:
1. ❌ Intent Classifier não pede unidade primeiro
2. ❌ Parse Intent Response não preserva dados do Extract Data1
3. ❌ Information Agent pede unidade, mas deveria usar a já selecionada
4. ❌ Falta buscar dados da clínica baseado na unidade selecionada

---

## ✅ Ajustes Necessários

### 1. **Intent Classifier Agent1** - Modificar System Message

**Código Atual:**
```javascript
"systemMessage": "={{`Você é **Zorah**, o classificador de intenções do IAAM.\n\n## MISSÃO: Classificar intenção em:\n\n1. **INFORMACAO** - Perguntas sobre procedimentos, valores, convênios, localização, horários, cumprimentos\n2. **AGENDAR** - APENAS se EXPLICITAMENTE mencionar: \"agendar\", \"marcar\", \"reservar\" (confiança mínima: 0.9)\n3. **FALAR_ATENDENTE** - Quer falar com humano\n\n## REGRAS:\n- Cumprimentos = INFORMACAO\n- Dúvida? = INFORMACAO\n- Só AGENDAR com palavras-chave EXPLÍCITAS\n\n## RESPOSTA (JSON):\n{\"intent\": \"INFORMACAO|AGENDAR|FALAR_ATENDENTE\", \"confidence\": 0.95}`}}"
```

**Código NOVO:**
```javascript
"systemMessage": "={{`Você é **Zorah**, o classificador de intenções do IAAM.\n\n## MISSÃO PRINCIPAL:\nSEMPRE perguntar a UNIDADE primeiro (se não informada), depois classificar a intenção.\n\n## UNIDADES DISPONÍVEIS:\n- Vieiralves\n- São José\n\n## FLUXO OBRIGATÓRIO:\n\n1. **VERIFICAR UNIDADE:**\n   - Se a mensagem NÃO menciona unidade específica → PERGUNTAR: \"Qual unidade você prefere? Vieiralves ou São José?\"\n   - Se já mencionou unidade → CONTINUAR\n\n2. **CLASSIFICAR INTENÇÃO:**\n   - **INFORMACAO** - Perguntas sobre procedimentos, valores, convênios, localização, horários, cumprimentos\n   - **AGENDAR** - APENAS se EXPLICITAMENTE mencionar: \"agendar\", \"marcar\", \"reservar\" (confiança mínima: 0.9)\n   - **FALAR_ATENDENTE** - Quer falar com humano\n   - **PEDIR_UNIDADE** - Quando precisar perguntar unidade primeiro\n\n## REGRAS:\n- SEMPRE perguntar unidade PRIMEIRO (exceto se já mencionada)\n- Cumprimentos = INFORMACAO (mas perguntar unidade depois)\n- Dúvida? = INFORMACAO\n- Só AGENDAR com palavras-chave EXPLÍCITAS\n\n## RESPOSTA (JSON):\n{\n  \"intent\": \"INFORMACAO|AGENDAR|FALAR_ATENDENTE|PEDIR_UNIDADE\",\n  \"confidence\": 0.95,\n  \"unit\": \"Vieiralves|São José|null\",\n  \"response\": \"sua resposta ao paciente\",\n  \"needsUnit\": true|false\n}`}}"
```

---

### 2. **Parse Intent Response1** - Preservar dados do Extract Data1

**Código NOVO (completo):**
```javascript
const crypto = require('crypto');

// Obter dados do Extract Data1 (preservar contexto)
const extractData = $items('Extract Data1')[0]?.json || {};

// Obter dados do input atual (Agent Response)
let agentResponse = {};
try {
  if ($input && $input.first) {
    agentResponse = $input.first().json || {};
  } else if ($json) {
    agentResponse = $json;
  } else if ($input && $input.item) {
    agentResponse = $input.item.json || {};
  }
} catch (e) {
  agentResponse = $json || {};
}

// Função segura para extrair texto do Agent
function extractText(res) {
  if (!res) return '';
  if (typeof res === 'string') return res;
  if (res.output?.text) return res.output.text;
  if (typeof res.output === 'string') return res.output;
  if (res.text) return res.text;
  if (res.response) return res.response;
  if (res.message) return res.message;
  return '';
}

// Extrair resposta textual
let responseText = extractText(agentResponse);

// Limpar resposta (remover prefixos como "json\n")
if (typeof responseText === 'string') {
  responseText = responseText.replace(/^json\s*\n?/i, '').trim();
}

// Obter dados do contexto (priorizar Extract Data1)
const conversationId = extractData.conversationId || agentResponse.conversationId || agentResponse.sessionId || '';
const chatInput = extractData.chatInput || agentResponse.chatInput || agentResponse.originalMessage || '';

// Calcular sessionId se necessário
let sessionId = extractData.sessionId || agentResponse.sessionId || '';
if (!sessionId && conversationId) {
  sessionId = crypto.createHash('md5').update(conversationId).digest('hex');
}

// Valores padrão
let intent = 'INFORMACAO';
let confidence = 0.5;
let reasoning = '';
let unit = null;
let needsUnit = false;

// Tentar parsear JSON da resposta
if (responseText) {
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
      // Ignorar erro de parse
    }
  }
}

// Tentar extrair intent diretamente do objeto (se já estiver parseado)
if (agentResponse.intent) {
  intent = agentResponse.intent;
  confidence = agentResponse.confidence || confidence;
  unit = agentResponse.unit || null;
}

// Extrair unidade da mensagem original se mencionada
if (!unit && chatInput) {
  const lowerInput = chatInput.toLowerCase();
  const units = ['vieiralves', 'são josé', 'sao jose', 'sao jose'];
  
  for (const u of units) {
    if (lowerInput.includes(u)) {
      if (u.includes('sao jose') || u.includes('são josé')) {
        unit = 'São José';
      } else if (u.includes('vieiralves')) {
        unit = 'Vieiralves';
      }
      break;
    }
  }
}

// Fallback: detecção por palavras-chave
if (intent === 'INFORMACAO' && chatInput) {
  const lowerInput = chatInput.toLowerCase();
  
  const agendarKeywords = ['agendar', 'marcar', 'reservar', 'preciso de horário', 'quero horário', 'fazer consulta'];
  if (agendarKeywords.some(k => lowerInput.includes(k))) {
    intent = 'AGENDAR';
    confidence = 0.9;
  } else if (lowerInput.includes('atendente') || lowerInput.includes('humano') || lowerInput.includes('falar com')) {
    intent = 'FALAR_ATENDENTE';
    confidence = 0.95;
  }
}

// Garantir que intent seja válido
const validIntents = ['INFORMACAO', 'AGENDAR', 'FALAR_ATENDENTE', 'PEDIR_UNIDADE'];
if (!validIntents.includes(intent)) {
  intent = 'INFORMACAO';
}

// Se precisa de unidade e não tem, definir PEDIR_UNIDADE
if (!unit && (intent === 'AGENDAR' || intent === 'INFORMACAO')) {
  needsUnit = true;
  intent = 'PEDIR_UNIDADE';
}

// Retornar resultado formatado (PRESERVAR todos os dados do Extract Data1)
return [{
  json: {
    conversationId: conversationId,
    sessionId: sessionId,
    intent: intent,
    confidence: confidence,
    reasoning: reasoning,
    unit: unit,
    needsUnit: needsUnit,
    response: responseText,
    originalMessage: chatInput,
    chatInput: chatInput,
    phone: extractData.phone || agentResponse.phone || '',
    patient: extractData.patient || agentResponse.patient || {},
    context: extractData.context || agentResponse.context || {},
    appointmentFlow: extractData.appointmentFlow || agentResponse.appointmentFlow || null,
    clinicInfo: agentResponse.clinicInfo || '',
    clinicDataRaw: agentResponse.clinicDataRaw || {},
    success: true
  }
}];
```

---

### 3. **Intent Router1** - Verificar Rota PEDIR_UNIDADE

A rota "pedir unidade" já existe (linha 154-178), mas precisa conectar corretamente. Verificar se está conectada ao Information Agent1.

**Conexão esperada:**
- Output "pedir unidade" → Information Agent1 (para perguntar unidade)

---

### 4. **Information Agent1** - Usar Unidade Já Selecionada

**System Message Atual:**
```javascript
"systemMessage": "={{`Você é **Zorah**, assistente de informações do IAAM.\n\n## INFORMAÇÕES:\nConvênios\nProcedimentos\nProcedimentos Particulares\nPacotes de Procedimentos\nLocalização\n## REGRAS:\nREGRA PRINCIPAL: PERGUNTAR PRA QUAL UNIDADE O PACIENTE QUER SABER A INFORMAÇÃO, SE É 1 PARA UNIDADE VIEIRALVES OU 2 PRA SÃO JOSÉ.\n1. Seja amigável e clara 😊\n2. Use as informações da clínica\n3. Mantenha contexto (memória)\n4. Convide para agendar quando relevante\n5. Traga sempre informações completas, mas compactas pra não ficar muito grande o texto da mensagem.\n6. Usar e identificar a tool expecifica pra cada unidade, pra ter como base de informação\n7.Sempre formate as respostas da melhor forma possível.\n8.Sempre analise qual tipo de informação o paciente quer, entregue somente o necessário.\n## EXEMPLOS:\n\"Olá! 😊 Bem-vindo ao IAAM! Como posso ajudar?\"\n\"Temos essas unidades: Vieiralves e São José. Qual prefere?\"`}}"
```

**System Message NOVO:**
```javascript
"systemMessage": "={{`Você é **Zorah**, assistente de informações do IAAM.\n\n## UNIDADE SELECIONADA:\n${$json.unit ? `Unidade: ${$json.unit}` : 'Unidade não selecionada ainda'}\n\n## REGRAS:\n1. **Se $json.intent === \"PEDIR_UNIDADE\" ou não tem unidade:**\n   → PERGUNTAR: \"Qual unidade você prefere? Vieiralves ou São José?\"\n\n2. **Se tem unidade selecionada:**\n   → Use a tool específica da unidade:\n   - Se unidade = \"Vieiralves\" → use tool \"Base de Informações da Unidade Vieiralves\"\n   - Se unidade = \"São José\" → use tool \"Base de Informações da Unidade São José\"\n   → Responda com informações ESPECÍFICAS daquela unidade\n\n3. **Seja amigável e clara 😊**\n4. **Use as informações da clínica da unidade selecionada**\n5. **Mantenha contexto (memória)**\n6. **Convide para agendar quando relevante**\n7. **Traga sempre informações completas, mas compactas**\n8. **Sempre formate as respostas da melhor forma possível**\n9. **Sempre analise qual tipo de informação o paciente quer, entregue somente o necessário**\n\n## EXEMPLOS:\n- Sem unidade: \"Olá! 😊 Para melhor atendê-lo, qual unidade você prefere? Vieiralves ou São José?\"\n- Com unidade: \"Ótimo! Na unidade ${$json.unit}, temos... [informações específicas]\"`}}"
```

---

### 5. **Prepare Information Input** - Passar Unidade

**Código Atual (linha 372-384):**
```javascript
const crypto = require('crypto');

// Função helper
const pick = (...v) => v.find(x => x !== undefined && x !== null && x !== '');

// Fontes — FORMA SUPORTADA PELO n8n
const extractData = $items('Extract Data1')[0]?.json || {};
const mergeContext = $items('Merge Context1')[0]?.json || {};
const data = $json;

// conversationId
const conversationId = pick(
  data.conversationId,
  extractData.conversationId,
  mergeContext.conversationId
);

if (!conversationId) {
  throw new Error('conversationId ausente');
}

// sessionId
let sessionId = pick(
  data.sessionId,
  extractData.sessionId,
  mergeContext.sessionId
);

if (!sessionId) {
  sessionId = crypto.createHash('md5').update(conversationId).digest('hex');
}

// chatInput
const chatInput = pick(
  extractData.chatInput,
  data.chatInput,
  extractData.originalMessage,
  data.originalMessage
);

if (!chatInput) {
  throw new Error('chatInput ausente');
}

const intent = pick(data.intent, 'INFORMACAO');

return [{
  json: {
    conversationId,
    sessionId,
    chatInput,
    clinicInfo: mergeContext.clinicInfo || '',
    clinicDataRaw: mergeContext.clinicDataRaw || {},
    intent,
    success: true
  }
}];
```

**Código NOVO:**
```javascript
const crypto = require('crypto');

// Função helper
const pick = (...v) => v.find(x => x !== undefined && x !== null && x !== '');

// Fontes — FORMA SUPORTADA PELO n8n
const extractData = $items('Extract Data1')[0]?.json || {};
const parseIntent = $items('Parse Intent Response1')[0]?.json || {};
const data = $json;

// conversationId
const conversationId = pick(
  data.conversationId,
  parseIntent.conversationId,
  extractData.conversationId
);

if (!conversationId) {
  throw new Error('conversationId ausente');
}

// sessionId
let sessionId = pick(
  data.sessionId,
  parseIntent.sessionId,
  extractData.sessionId
);

if (!sessionId) {
  sessionId = crypto.createHash('md5').update(conversationId).digest('hex');
}

// chatInput
const chatInput = pick(
  extractData.chatInput,
  data.chatInput,
  parseIntent.chatInput,
  extractData.originalMessage,
  data.originalMessage
);

if (!chatInput) {
  throw new Error('chatInput ausente');
}

// Obter intent e unidade do Parse Intent Response
const intent = pick(parseIntent.intent, data.intent, 'INFORMACAO');
const unit = pick(parseIntent.unit, data.unit);

return [{
  json: {
    conversationId,
    sessionId,
    chatInput,
    intent,
    unit: unit || null,
    needsUnit: parseIntent.needsUnit || false,
    clinicInfo: '',
    clinicDataRaw: {},
    success: true
  }
}];
```

---

## 📝 Resumo dos Ajustes

1. ✅ **Intent Classifier Agent1** - Modificar system message para pedir unidade primeiro
2. ✅ **Parse Intent Response1** - Preservar dados do Extract Data1 e extrair unidade corretamente
3. ✅ **Intent Router1** - Verificar conexão da rota "pedir unidade"
4. ✅ **Information Agent1** - Modificar system message para usar unidade já selecionada
5. ✅ **Prepare Information Input** - Passar unidade para o Information Agent

---

## 🔄 Novo Fluxo Esperado

```
Webhook Start
  ↓
Extract Data1
  ↓
Intent Classifier Agent1
  ├─ Pergunta unidade se não informada
  └─ Classifica intenção
  ↓
Parse Intent Response1
  ├─ Extrai: intent, unit, needsUnit
  └─ Preserva dados do Extract Data1
  ↓
Intent Router1
  ├─ PEDIR_UNIDADE → Information Agent1 (pergunta unidade)
  ├─ INFORMACAO → Information Agent1 (usa unidade selecionada)
  ├─ AGENDAR → Check Patient1 → Appointment Agent1
  └─ FALAR_ATENDENTE → Handler Transfer
```

---

**Status:** 🟡 Aguardando implementação
