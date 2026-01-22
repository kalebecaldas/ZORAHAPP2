#!/usr/bin/env python3
import json

# Ler o workflow
with open('ZoraH Bot - Simple v2.2.4.json', 'r', encoding='utf-8') as f:
    workflow = json.load(f)

print("🔧 Corrigindo TODOS os nodes com código JavaScript...")
print("=" * 80)

# Definir códigos corretos para cada node
codes = {
    'extract-data': """const crypto = require('crypto');

const data = $json.body || $json;
const conversationId = data.conversationId || '';

if (!conversationId) throw new Error('conversationId ausente');

const sessionId = crypto.createHash('md5').update(conversationId).digest('hex');
const platform = data.platform || 'whatsapp';
const needsPhone = platform === 'instagram';

return [{
  json: {
    chatInput: data.message || '',
    phone: data.phone || '',
    conversationId,
    sessionId,
    platform,
    needsPhone,
    patient: data.patient || {},
    context: data.context || {},
    appointmentFlow: data.context?.appointmentFlow || {
      patientChecked: false,
      patientData: null,
      insuranceValidated: false,
      step: 'initial'
    },
    messageReceivedAt: Date.now(),
    timestamp: new Date().toISOString()
  }
}];
""",

    'parse-intent-response': """const crypto = require('crypto');

const agentResponse = $json;
const extractData = $items('Extract Data')[0]?.json || {};

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

let responseText = extractText(agentResponse);

if (typeof responseText === 'string') {
  responseText = responseText.replace(/^json\\s*\\n?/i, '').trim();
}

const conversationId = extractData.conversationId || agentResponse.conversationId || '';
const chatInput = extractData.chatInput || agentResponse.chatInput || '';

let sessionId = extractData.sessionId || agentResponse.sessionId || '';
if (!sessionId && conversationId) {
  sessionId = crypto.createHash('md5').update(conversationId).digest('hex');
}

let intent = 'INFORMACAO';
let confidence = 0.5;
let reasoning = '';
let unit = null;
let needsUnit = false;
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
      parsedResponse = parsed.response || null;
    } catch (e) {}
  }
}

if (agentResponse.intent) {
  intent = agentResponse.intent;
  confidence = agentResponse.confidence || confidence;
  unit = agentResponse.unit || null;
}

if (!unit && chatInput) {
  const lowerInput = chatInput.toLowerCase();
  const units = ['vieiralves', 'são josé', 'sao jose'];
  
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

const validIntents = ['INFORMACAO', 'AGENDAR', 'FALAR_ATENDENTE', 'PEDIR_UNIDADE'];
if (!validIntents.includes(intent)) {
  intent = 'INFORMACAO';
}

if (!unit && (intent === 'AGENDAR' || intent === 'INFORMACAO')) {
  needsUnit = true;
  intent = 'PEDIR_UNIDADE';
}

return [{
  json: {
    conversationId,
    sessionId,
    intent,
    confidence,
    reasoning,
    unit,
    needsUnit,
    response: parsedResponse || responseText,
    originalMessage: chatInput,
    chatInput,
    phone: extractData.phone || '',
    platform: extractData.platform || 'whatsapp',
    needsPhone: extractData.needsPhone || false,
    patient: extractData.patient || {},
    context: extractData.context || {},
    appointmentFlow: extractData.appointmentFlow || {
      patientChecked: false,
      patientData: null,
      insuranceValidated: false,
      step: 'initial'
    },
    messageReceivedAt: extractData.messageReceivedAt,
    success: true
  }
}];
""",

    'format-final-response': """const data = $json;
const extractData = $items('Extract Data')[0]?.json || {};

if (!data.conversationId) throw new Error('conversationId obrigatório');
if (!data.message) throw new Error('message obrigatório');

const now = Date.now();
const messageReceivedAt = extractData.messageReceivedAt || now;
const responseTimeMs = now - messageReceivedAt;

return [{
  json: {
    conversationId: data.conversationId,
    message: data.message,
    intent: data.intent || 'INFORMACAO',
    action: data.action || 'RESPOND',
    aiProvider: 'n8n-gemini-v2.2.4-simple',
    requiresHumanIntervention: data.requiresHumanIntervention || false,
    requiresQueueTransfer: data.requiresQueueTransfer || false,
    queueName: data.queueName || null,
    appointmentFlow: data.appointmentFlow || null,
    metrics: {
      intent: data.intent || 'INFORMACAO',
      responseTimeMs: responseTimeMs,
      timestamp: new Date().toISOString(),
      requiresTransfer: data.requiresQueueTransfer || false
    },
    success: true,
    timestamp: new Date().toISOString()
  }
}];
""",

    'handle-appointment-simple': """const extractData = $items('Extract Data')[0]?.json || {};
const parseIntent = $items('Parse Intent Response')[0]?.json || {};

return [{
  json: {
    conversationId: extractData.conversationId,
    message: 'Entendi que você deseja agendar um procedimento. Vou transferir você para nossa equipe de atendimento que irá auxiliá-lo com o agendamento. Aguarde um momento! 😊',
    intent: 'AGENDAR',
    action: 'TRANSFER_TO_QUEUE',
    requiresQueueTransfer: true,
    queueName: 'Principal',
    success: true
  }
}];
""",

    'prepare-analytics': """const data = $json;

// Apenas passar os dados adiante (métricas já estão em data.metrics)
return [{ json: data }];
"""
}

# Atualizar todos os nodes
fixed_count = 0
for node in workflow['nodes']:
    node_id = node.get('id')
    if node_id in codes:
        node['parameters']['jsCode'] = codes[node_id]
        print(f"✅ {node.get('name', node_id)} corrigido")
        fixed_count += 1

print("\n" + "=" * 80)
print(f"✅ {fixed_count} nodes corrigidos!")
print("=" * 80)

# Salvar
with open('ZoraH Bot - Simple v2.2.4.json', 'w', encoding='utf-8') as f:
    json.dump(workflow, f, indent=2, ensure_ascii=False)

print("\n📁 Arquivo salvo: ZoraH Bot - Simple v2.2.4.json")
print("\n🎉 Todos os códigos JavaScript corrigidos!")
print("🚀 Workflow pronto para importar no n8n!")
