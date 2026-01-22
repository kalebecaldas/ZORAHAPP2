const fs = require('fs');
const path = require('path');

// Ler o workflow atual
const workflowPath = path.join(__dirname, '../n8n/Workflow Funcionando.json');
const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));

// IDs dos nodes importantes
const NODES = {
  MERGE_CONTEXT: '6738047a-1083-4162-8bd3-26c99d5337bc',
  CHECK_ACTIVE_FLOW: 'a811245c-7e2c-48e6-9088-133c1d15d19e',
  ROUTE_SWITCH: '9f6aa910-dc96-447e-8403-fe9656a3a8bd',
  INTENT_CLASSIFIER: 'ca97e69e-0671-4897-96f7-beffb4570916',
  PARSE_INTENT: 'ca35f397-cb11-48ec-94ac-3a5c02060903',
  INTENT_ROUTER: 'b318922c-d8b9-4153-8d92-f7758441ac41',
  PREPARE_APPOINTMENT: '0605187a-8145-47b2-a80d-928b5aec74dc',
};

// 1. Modificar Intent Classifier Agent para perguntar unidade primeiro
const intentClassifierNode = workflow.nodes.find(n => n.id === NODES.INTENT_CLASSIFIER);
if (intentClassifierNode) {
  intentClassifierNode.parameters.promptType = "define";
  intentClassifierNode.parameters.text = "={{ $json.chatInput || $json.originalMessage || '' }}";
  intentClassifierNode.parameters.options.systemMessage = `={{ \`Você é **Zorah**, o classificador de intenções do IAAM.

## MISSÃO PRINCIPAL: 
SEMPRE perguntar a UNIDADE primeiro (se não informada), depois classificar a intenção.

## UNIDADES DISPONÍVEIS:
\${$json.units?.map(u => \`- \${u.name}\`).join('\\n') || '- Vieiralves\\n- São José'}

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
}

// 2. Modificar Parse Intent Response para extrair unidade
const parseIntentNode = workflow.nodes.find(n => n.id === NODES.PARSE_INTENT);
if (parseIntentNode) {
  const originalCode = parseIntentNode.parameters.jsCode;
  // Adicionar extração de unidade após a parte de parsear JSON
  parseIntentNode.parameters.jsCode = originalCode.replace(
    /let intent = 'INFORMACAO';[\s\S]*?let reasoning = '';/,
    `let intent = 'INFORMACAO';
let confidence = 0.5;
let reasoning = '';
let unit = null;
let needsUnit = false;`
  );
  
  // Adicionar extração de unit e needsUnit do JSON parseado
  parseIntentNode.parameters.jsCode = parseIntentNode.parameters.jsCode.replace(
    /const parsed = JSON\.parse\(jsonMatch\[0\]\);[\s\S]*?reasoning = parsed\.reasoning \|\| '';[\s\S]*?} catch \(e\) \{/,
    `const parsed = JSON.parse(jsonMatch[0]);
      intent = parsed.intent || intent;
      confidence = parsed.confidence || confidence;
      reasoning = parsed.reasoning || '';
      unit = parsed.unit || null;
      needsUnit = parsed.needsUnit !== undefined ? parsed.needsUnit : false;
    } catch (e) {`
  );
  
  // Adicionar detecção de unidade na mensagem original
  parseIntentNode.parameters.jsCode = parseIntentNode.parameters.jsCode.replace(
    /\/\/ Fallback: detecção por palavras-chave/,
    `// Extrair unidade da mensagem original se mencionada
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

// Fallback: detecção por palavras-chave`
  );
  
  // Adicionar verificação de needsUnit antes do return
  parseIntentNode.parameters.jsCode = parseIntentNode.parameters.jsCode.replace(
    /\/\/ Garantir que intent seja válido[\s\S]*?intent = 'INFORMACAO';[\s\S]*?}\n\n\/\/ Retornar resultado formatado/,
    `// Garantir que intent seja válido
if (!['INFORMACAO', 'AGENDAR', 'FALAR_ATENDENTE', 'PEDIR_UNIDADE'].includes(intent)) {
  intent = 'INFORMACAO';
}

// Se precisa de unidade e não tem, definir intent especial
if (!unit && (intent === 'AGENDAR' || intent === 'INFORMACAO')) {
  needsUnit = true;
  // Se não tem unidade e precisa, mudar intent para PEDIR_UNIDADE
  if (intent !== 'FALAR_ATENDENTE') {
    intent = 'PEDIR_UNIDADE';
  }
}

// Retornar resultado formatado`
  );
  
  // Modificar o return para incluir unit e needsUnit
  parseIntentNode.parameters.jsCode = parseIntentNode.parameters.jsCode.replace(
    /return \[\{\s+json: \{[\s\S]*?reasoning: reasoning,/,
    `return [{
  json: {
    conversationId: conversationId,
    sessionId: sessionId,
    intent: intent,
    confidence: confidence,
    reasoning: reasoning,
    unit: unit,
    needsUnit: needsUnit,
    response: responseText,`
  );
}

// 3. Criar novo node "Check Unit Selected"
const checkUnitNodeId = 'check-unit-selected-new-id';
const checkUnitNode = {
  parameters: {
    jsCode: `const data = $json;
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
    needsUnit: !selectedUnit && (intentData.intent === 'AGENDAR' || intentData.intent === 'INFORMACAO' || intentData.intent === 'PEDIR_UNIDADE'),
    units: units,
    intent: intentData.needsUnit && !selectedUnit ? 'PEDIR_UNIDADE' : intentData.intent
  }
}];`
  },
  id: checkUnitNodeId,
  name: 'Check Unit Selected',
  type: 'n8n-nodes-base.code',
  typeVersion: 2,
  position: [-1280, 4080]
};

// Adicionar o novo node ao workflow
workflow.nodes.push(checkUnitNode);

// 4. Adicionar rota PEDIR_UNIDADE no Intent Router
const intentRouterNode = workflow.nodes.find(n => n.id === NODES.INTENT_ROUTER);
if (intentRouterNode) {
  // Adicionar nova regra PEDIR_UNIDADE antes das outras
  intentRouterNode.parameters.rules.values.unshift({
    conditions: {
      options: {
        caseSensitive: false,
        leftValue: "",
        typeValidation: "strict"
      },
      conditions: [{
        leftValue: "={{ $json.intent }}",
        rightValue: "PEDIR_UNIDADE",
        operator: {
          type: "string",
          operation: "equals",
          singleValue: true
        }
      }],
      combinator: "and"
    },
    renameOutput: true,
    outputKey: "askUnit"
  });
}

// 5. Modificar conexões
// Remover Check Active Flow e Route Switch do fluxo principal
// Merge Context → Intent Classifier Agent (direto)
workflow.connections['Merge Context'] = {
  main: [[{
    node: 'Intent Classifier Agent',
    type: 'main',
    index: 0
  }]]
};

// Parse Intent Response → Check Unit Selected
workflow.connections['Parse Intent Response'] = {
  main: [[{
    node: 'Check Unit Selected',
    type: 'main',
    index: 0
  }]]
};

// Check Unit Selected → Intent Router
workflow.connections['Check Unit Selected'] = {
  main: [[{
    node: 'Intent Router',
    type: 'main',
    index: 0
  }]]
};

// Adicionar rota askUnit no Intent Router (conecta com Information Agent via Prepare Information Input1)
// A rota já existe no output 0 (information), então askUnit vai para o mesmo lugar
// Mas precisamos garantir que a ordem está correta

// Modificar Prepare Information Input1 para lidar com pedido de unidade
const prepareInfoNode = workflow.nodes.find(n => n.name === 'Prepare Information Input1');
if (prepareInfoNode) {
  prepareInfoNode.parameters.jsCode = `// Preparar dados para Information Agent
const data = $json;
const intentData = $('Check Unit Selected').item?.json || {};

// Usar dados do Check Unit Selected se disponível
return [{
  json: {
    chatInput: data.originalMessage || data.chatInput || intentData.originalMessage || '',
    conversationId: data.conversationId || intentData.conversationId || '',
    sessionId: data.sessionId || intentData.sessionId || '',
    clinicInfo: data.clinicInfo || '',
    clinicDataRaw: data.clinicDataRaw || {},
    intent: intentData.intent || data.intent || 'INFORMACAO',
    unit: intentData.unit || null,
    needsUnit: intentData.needsUnit || false,
    units: intentData.units || []
  }
}];`;
}

// Modificar Information Agent para lidar com pedido de unidade
const informationAgentNode = workflow.nodes.find(n => n.name === 'Information Agent');
if (informationAgentNode) {
  const currentSystemMessage = informationAgentNode.parameters.options.systemMessage;
  informationAgentNode.parameters.options.systemMessage = currentSystemMessage.replace(
    '## SUA MISSÃO:',
    `## SUA MISSÃO:

**IMPORTANTE:** Se $json.intent === "PEDIR_UNIDADE" → PERGUNTAR: "Qual unidade você prefere? Vieiralves ou São José?"

## SUA MISSÃO:`
  );
}

// 6. Modificar Prepare Appointment Input para validar unidade
const prepareAppointmentNode = workflow.nodes.find(n => n.id === NODES.PREPARE_APPOINTMENT);
if (prepareAppointmentNode) {
  const originalCode = prepareAppointmentNode.parameters.jsCode;
  prepareAppointmentNode.parameters.jsCode = `// Preparar dados para Appointment Agent
const data = $json;
const patientResponse = $input.all()[1]?.json || {};
const patients = patientResponse.patients || [];
const intentData = $('Check Unit Selected').item?.json || {};

// Obter phone do contexto atual
const phone = data.phone || '';

const normalizedPhone = phone.replace(/\\D/g, '');
const foundPatient = patients.find(p => p.phone && p.phone.replace(/\\D/g, '') === normalizedPhone);

// VERIFICAR SE UNIDADE FOI SELECIONADA
const selectedUnit = intentData.unit || data.unit || null;

if (!selectedUnit) {
  // Se não tem unidade, voltar para pedir unidade
  const mergeContext = $('Merge Context').item?.json || {};
  return [{
    json: {
      conversationId: data.conversationId || intentData.conversationId || '',
      message: "Para agendar, preciso saber qual unidade você prefere: Vieiralves ou São José? 😊",
      intent: 'PEDIR_UNIDADE',
      action: 'ASK_UNIT',
      requiresUnit: true,
      success: false,
      sessionId: data.sessionId || intentData.sessionId || '',
      clinicInfo: mergeContext.clinicInfo || ''
    }
  }];
}

let appointmentContext = \`**CONTEXTO:**\\n\\n\`;
if (foundPatient) {
  appointmentContext += \`✅ Paciente: \${foundPatient.name}\\nUnidade: \${selectedUnit}\\nPule dados pessoais.\\n\\n\`;
} else {
  appointmentContext += \`⚠️ NÃO cadastrado\\nUnidade: \${selectedUnit}\\nColete: nome, CPF, data nascimento.\\n\\n\`;
}
appointmentContext += data.clinicInfo || '';

return [{
  json: {
    chatInput: data.chatInput || data.originalMessage || '',
    conversationId: data.conversationId || '',
    sessionId: data.sessionId || '',
    appointmentContext: appointmentContext,
    patientExists: !!foundPatient,
    patient: foundPatient || null,
    unit: selectedUnit,
    clinicData: data.clinicDataRaw || data.clinicData || {},
    appointmentFlow: data.appointmentFlow || {
      step: foundPatient ? 'collect_procedure' : 'collect_patient_data',
      phone: phone,
      patientId: foundPatient?.id || null,
      unit: selectedUnit,
      collectedData: {}
    }
  }
}];`;
}

// 7. Remover ou manter Check Active Flow e Route Switch (mas não usar mais)
// Manter os nodes para não quebrar, mas não conectar

// Salvar workflow modificado
const outputPath = path.join(__dirname, '../n8n/Workflow Intent First.json');
fs.writeFileSync(outputPath, JSON.stringify(workflow, null, 2), 'utf8');

console.log('✅ Workflow modificado com sucesso!');
console.log(`📁 Arquivo salvo em: ${outputPath}`);
console.log('\n🔧 Mudanças aplicadas:');
console.log('1. ✅ Intent Classifier sempre executado primeiro (pula Check Active Flow)');
console.log('2. ✅ Intent Classifier modificado para perguntar unidade primeiro');
console.log('3. ✅ Novo node "Check Unit Selected" adicionado');
console.log('4. ✅ Parse Intent Response modificado para extrair unidade');
console.log('5. ✅ Rota PEDIR_UNIDADE adicionada no Intent Router');
console.log('6. ✅ Prepare Appointment Input valida unidade antes de agendar');
console.log('7. ✅ Information Agent modificado para lidar com pedido de unidade');
console.log('\n📋 Próximos passos:');
console.log('1. Importe o arquivo "Workflow Intent First.json" no N8N');
console.log('2. Teste o fluxo completo');
console.log('3. Ative o workflow quando estiver funcionando corretamente');
