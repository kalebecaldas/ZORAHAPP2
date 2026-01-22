const fs = require('fs');
const path = require('path');

// Ler o workflow atual
const workflowPath = path.join(__dirname, '../n8n/Zorah Bot.json');
const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));

console.log('🔧 Aplicando ajustes no workflow...\n');

// 1. Modificar Intent Classifier Agent1
const intentClassifierNode = workflow.nodes.find(n => n.name === 'Intent Classifier Agent1');
if (intentClassifierNode) {
  intentClassifierNode.parameters.options.systemMessage = `={{ \`Você é **Zorah**, o classificador de intenções do IAAM.

## MISSÃO PRINCIPAL:
SEMPRE perguntar a UNIDADE primeiro (se não informada), depois classificar a intenção.

## UNIDADES DISPONÍVEIS:
- Vieiralves
- São José

## FLUXO OBRIGATÓRIO:

1. **VERIFICAR UNIDADE:**
   - Se a mensagem NÃO menciona unidade específica → PERGUNTAR: "Qual unidade você prefere? Vieiralves ou São José?"
   - Se já mencionou unidade → CONTINUAR

2. **CLASSIFICAR INTENÇÃO:**
   - **INFORMACAO** - Perguntas sobre procedimentos, valores, convênios, localização, horários, cumprimentos
   - **AGENDAR** - APENAS se EXPLICITAMENTE mencionar: "agendar", "marcar", "reservar" (confiança mínima: 0.9)
   - **FALAR_ATENDENTE** - Quer falar com humano
   - **PEDIR_UNIDADE** - Quando precisar perguntar unidade primeiro

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
}\` }}`;
  console.log('✅ Intent Classifier Agent1 - System message atualizado');
}

// 2. Modificar Parse Intent Response1
const parseIntentNode = workflow.nodes.find(n => n.name === 'Parse Intent Response1');
if (parseIntentNode) {
  parseIntentNode.parameters.jsCode = `const crypto = require('crypto');

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

// Limpar resposta (remover prefixos como "json\\n")
if (typeof responseText === 'string') {
  responseText = responseText.replace(/^json\\s*\\n?/i, '').trim();
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
let parsedResponse = null;
if (responseText) {
  const jsonMatch = responseText.match(/\\{[\\s\\S]*?\\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      intent = parsed.intent || intent;
      confidence = parsed.confidence || confidence;
      reasoning = parsed.reasoning || '';
      unit = parsed.unit || null;
      needsUnit = parsed.needsUnit !== undefined ? parsed.needsUnit : false;
      // Extrair o campo 'response' do JSON parseado
      parsedResponse = parsed.response || null;
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
    response: parsedResponse || responseText, // Usar apenas o texto da resposta, não o JSON completo
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
}];`;
  console.log('✅ Parse Intent Response1 - Código atualizado');
}

// 3. Modificar Information Agent1
const informationAgentNode = workflow.nodes.find(n => n.name === 'Information Agent1');
if (informationAgentNode) {
  informationAgentNode.parameters.options.systemMessage = `={{ \`Você é **Zorah**, assistente de informações do IAAM.

## UNIDADE SELECIONADA:
\${$json.unit ? \`Unidade: \${$json.unit}\` : 'Unidade não selecionada ainda'}

## REGRAS:
1. **Se $json.intent === "PEDIR_UNIDADE" ou não tem unidade:**
   → PERGUNTAR: "Qual unidade você prefere? Vieiralves ou São José?"

2. **Se tem unidade selecionada:**
   → Use a tool específica da unidade:
   - Se unidade = "Vieiralves" → use tool "Base de Informações da Unidade Vieiralves"
   - Se unidade = "São José" → use tool "Base de Informações da Unidade São José"
   → Responda com informações ESPECÍFICAS daquela unidade

3. **Seja amigável e clara 😊**
4. **Use as informações da clínica da unidade selecionada**
5. **Mantenha contexto (memória)**
6. **Convide para agendar quando relevante**
7. **Traga sempre informações completas, mas compactas**
8. **Sempre formate as respostas da melhor forma possível**
9. **Sempre analise qual tipo de informação o paciente quer, entregue somente o necessário**

## EXEMPLOS:
- Sem unidade: "Olá! 😊 Para melhor atendê-lo, qual unidade você prefere? Vieiralves ou São José?"
- Com unidade: "Ótimo! Na unidade \${$json.unit}, temos... [informações específicas]"\` }}`;
  console.log('✅ Information Agent1 - System message atualizado');
}

// 4. Modificar Prepare Information Input
const prepareInfoNode = workflow.nodes.find(n => n.name === 'Prepare Information Input');
if (prepareInfoNode) {
  prepareInfoNode.parameters.jsCode = `const crypto = require('crypto');

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
}];`;
  console.log('✅ Prepare Information Input - Código atualizado');
}

// 5. Criar novo node "Format Ask Unit Response"
const formatAskUnitNode = {
  parameters: {
    jsCode: `const data = $json;

if (!data.conversationId) throw new Error('conversationId obrigatório');

// O Parse Intent Response coloca a resposta do Agent em 'response'
// Se o response contém JSON, extrair apenas o campo 'response' do JSON
let message = null;

// Primeiro, tentar usar o campo 'response' diretamente
if (data.response) {
  // Se response é string, pode conter JSON
  if (typeof data.response === 'string') {
    // Tentar parsear se for JSON
    try {
      const parsed = JSON.parse(data.response);
      // Se parseou, pegar o campo 'response' do JSON
      if (parsed.response) {
        message = parsed.response;
      }
    } catch (e) {
      // Não é JSON válido, usar como está
      message = data.response;
    }
  } else {
    message = data.response;
  }
}

// Se não encontrou, tentar message
if (!message && data.message) {
  message = data.message;
}

  // Limpar prefixos como "json\\n" ou markdown code blocks
  if (message && typeof message === 'string') {
    message = message.replace(/^json\\s*\\n?/i, '').trim();
    // Remover markdown code blocks (usando String.fromCharCode para backticks)
    const backtick = String.fromCharCode(96);
    const codeBlockPattern = new RegExp('^' + backtick + backtick + backtick + 'json\\s*\\n?', 'i');
    message = message.replace(codeBlockPattern, '').trim();
    const codeBlockStart = new RegExp('^' + backtick + backtick + backtick + '\\s*\\n?', 'i');
    message = message.replace(codeBlockStart, '').trim();
    const codeBlockEnd = new RegExp(backtick + backtick + backtick + '\\s*$', 'i');
    message = message.replace(codeBlockEnd, '').trim();
  }

// Fallback se ainda não tiver mensagem
if (!message || message.trim() === '') {
  message = 'Qual unidade você prefere? Vieiralves ou São José? 😊';
}

return [{
  json: {
    conversationId: data.conversationId,
    message: message,
    intent: data.intent || 'INFORMACAO',
    action: data.action || 'RESPOND',
    aiProvider: 'n8n-gemini',
    requiresHumanIntervention: data.requiresHumanIntervention || false,
    appointmentFlow: data.appointmentFlow || null,
    success: true,
    timestamp: new Date().toISOString()
  }
}];`
  },
  id: 'format-ask-unit-response-new',
  name: 'Format Ask Unit Response',
  type: 'n8n-nodes-base.code',
  typeVersion: 2,
  position: [-2128, 2176] // Posição entre Intent Router1 e Format Final Response
};

// Adicionar o novo node ao workflow
workflow.nodes.push(formatAskUnitNode);
console.log('✅ Format Ask Unit Response - Node criado');

// 6. Ajustar conexões do Intent Router1
const intentRouterNode = workflow.nodes.find(n => n.name === 'Intent Router1');
if (intentRouterNode) {
  // Garantir que há conexões
  if (!workflow.connections['Intent Router1']) {
    workflow.connections['Intent Router1'] = { main: [] };
  }
  
  // Garantir que há 4 saídas (information, appointment, transfer, pedir unidade)
  if (!workflow.connections['Intent Router1'].main) {
    workflow.connections['Intent Router1'].main = [[], [], [], []];
  }
  
  // Preservar conexões existentes e garantir que a 4ª saída (pedir unidade) conecta ao Format Ask Unit Response
  while (workflow.connections['Intent Router1'].main.length < 4) {
    workflow.connections['Intent Router1'].main.push([]);
  }
  
  // Conectar rota "pedir unidade" (índice 3) ao Format Ask Unit Response
  // (substitui qualquer conexão existente nesta rota)
  workflow.connections['Intent Router1'].main[3] = [{
    node: 'Format Ask Unit Response',
    type: 'main',
    index: 0
  }];
  
  console.log('✅ Intent Router1 - Rota "pedir unidade" conectada ao Format Ask Unit Response');
}

// 7. Conectar Format Ask Unit Response ao Format Final Response
if (!workflow.connections['Format Ask Unit Response']) {
  workflow.connections['Format Ask Unit Response'] = { main: [] };
}

workflow.connections['Format Ask Unit Response'].main = [[{
  node: 'Format Final Response',
  type: 'main',
  index: 0
}]];

console.log('✅ Format Ask Unit Response - Conectado ao Format Final Response');

// Salvar workflow modificado
const outputPath = path.join(__dirname, '../n8n/Zorah Bot - Ajustado.json');
fs.writeFileSync(outputPath, JSON.stringify(workflow, null, 2), 'utf8');

console.log('\n✅ Workflow ajustado com sucesso!');
console.log(`📁 Arquivo salvo em: ${outputPath}`);
console.log('\n📋 Próximos passos:');
console.log('1. Importe o arquivo "Zorah Bot - Ajustado.json" no N8N');
console.log('2. Verifique se a rota "pedir unidade" do Intent Router1 está conectada ao Format Ask Unit Response');
console.log('3. Verifique se Format Ask Unit Response está conectado ao Format Final Response');
console.log('4. Teste o fluxo completo');
