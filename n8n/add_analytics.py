#!/usr/bin/env python3
import json

# Ler o workflow simplificado
with open('ZoraH Bot - Simple v2.2.4.json', 'r', encoding='utf-8') as f:
    workflow = json.load(f)

print("🔧 Adicionando Analytics e Métricas ao workflow...")

# 1. ATUALIZAR Extract Data para incluir timestamp de entrada
for node in workflow['nodes']:
    if node.get('id') == 'extract-data':
        # Adicionar timestamp de entrada
        node['parameters']['jsCode'] = "const crypto = require('crypto');\\n\\nconst data = $json.body || $json;\\nconst conversationId = data.conversationId || '';\\n\\nif (!conversationId) throw new Error('conversationId ausente');\\n\\nconst sessionId = crypto.createHash('md5').update(conversationId).digest('hex');\\n\\nconst platform = data.platform || 'whatsapp';\\nconst needsPhone = platform === 'instagram';\\n\\nconst now = new Date();\\n\\nreturn [{\\n  json: {\\n    chatInput: data.message || '',\\n    phone: data.phone || '',\\n    conversationId,\\n    sessionId,\\n    platform,\\n    needsPhone,\\n    patient: data.patient || {},\\n    context: data.context || {},\\n    appointmentFlow: data.context?.appointmentFlow || {\\n      patientChecked: false,\\n      patientData: null,\\n      insuranceValidated: false,\\n      step: 'initial'\\n    },\\n    analytics: {\\n      messageReceivedAt: now.toISOString(),\\n      messageReceivedTimestamp: now.getTime()\\n    },\\n    timestamp: now.toISOString()\\n  }\\n}];\\n"
        print("✅ Extract Data atualizado com analytics.messageReceivedAt")

# 2. ATUALIZAR Parse Intent Response para incluir dados de intenção
for node in workflow['nodes']:
    if node.get('id') == 'parse-intent-response':
        node['parameters']['jsCode'] = "const crypto = require('crypto');\\n\\nconst agentResponse = $json;\\nconst extractData = $items('Extract Data')[0]?.json || {};\\n\\nfunction extractText(res) {\\n  if (!res) return '';\\n  if (typeof res === 'string') return res;\\n  if (res.output?.text) return res.output.text;\\n  if (typeof res.output === 'string') return res.output;\\n  if (res.text) return res.text;\\n  if (res.response) return res.response;\\n  if (res.message) return res.message;\\n  return '';\\n}\\n\\nlet responseText = extractText(agentResponse);\\n\\nif (typeof responseText === 'string') {\\n  responseText = responseText.replace(/^json\\\\s*\\\\n?/i, '').trim();\\n}\\n\\nconst conversationId = extractData.conversationId || agentResponse.conversationId || '';\\nconst chatInput = extractData.chatInput || agentResponse.chatInput || '';\\n\\nlet sessionId = extractData.sessionId || agentResponse.sessionId || '';\\nif (!sessionId && conversationId) {\\n  sessionId = crypto.createHash('md5').update(conversationId).digest('hex');\\n}\\n\\nlet intent = 'INFORMACAO';\\nlet confidence = 0.5;\\nlet reasoning = '';\\nlet unit = null;\\nlet needsUnit = false;\\nlet parsedResponse = null;\\n\\nif (responseText) {\\n  const jsonMatch = responseText.match(/\\\\{[\\\\s\\\\S]*?\\\\}/);\\n  if (jsonMatch) {\\n    try {\\n      const parsed = JSON.parse(jsonMatch[0]);\\n      intent = parsed.intent || intent;\\n      confidence = parsed.confidence || confidence;\\n      reasoning = parsed.reasoning || '';\\n      unit = parsed.unit || null;\\n      needsUnit = parsed.needsUnit !== undefined ? parsed.needsUnit : false;\\n      parsedResponse = parsed.response || null;\\n    } catch (e) {}\\n  }\\n}\\n\\nif (agentResponse.intent) {\\n  intent = agentResponse.intent;\\n  confidence = agentResponse.confidence || confidence;\\n  unit = agentResponse.unit || null;\\n}\\n\\nif (!unit && chatInput) {\\n  const lowerInput = chatInput.toLowerCase();\\n  const units = ['vieiralves', 'são josé', 'sao jose'];\\n  \\n  for (const u of units) {\\n    if (lowerInput.includes(u)) {\\n      if (u.includes('sao jose') || u.includes('são josé')) {\\n        unit = 'São José';\\n      } else if (u.includes('vieiralves')) {\\n        unit = 'Vieiralves';\\n      }\\n      break;\\n    }\\n  }\\n}\\n\\nif (intent === 'INFORMACAO' && chatInput) {\\n  const lowerInput = chatInput.toLowerCase();\\n  \\n  const agendarKeywords = ['agendar', 'marcar', 'reservar', 'preciso de horário', 'quero horário', 'fazer consulta'];\\n  if (agendarKeywords.some(k => lowerInput.includes(k))) {\\n    intent = 'AGENDAR';\\n    confidence = 0.9;\\n  } else if (lowerInput.includes('atendente') || lowerInput.includes('humano') || lowerInput.includes('falar com')) {\\n    intent = 'FALAR_ATENDENTE';\\n    confidence = 0.95;\\n  }\\n}\\n\\nconst validIntents = ['INFORMACAO', 'AGENDAR', 'FALAR_ATENDENTE', 'PEDIR_UNIDADE'];\\nif (!validIntents.includes(intent)) {\\n  intent = 'INFORMACAO';\\n}\\n\\nif (!unit && (intent === 'AGENDAR' || intent === 'INFORMACAO')) {\\n  needsUnit = true;\\n  intent = 'PEDIR_UNIDADE';\\n}\\n\\nconst now = new Date();\\nconst analytics = extractData.analytics || {};\\n\\nreturn [{\\n  json: {\\n    conversationId,\\n    sessionId,\\n    intent,\\n    confidence,\\n    reasoning,\\n    unit,\\n    needsUnit,\\n    response: parsedResponse || responseText,\\n    originalMessage: chatInput,\\n    chatInput,\\n    phone: extractData.phone || '',\\n    platform: extractData.platform || 'whatsapp',\\n    needsPhone: extractData.needsPhone || false,\\n    patient: extractData.patient || {},\\n    context: extractData.context || {},\\n    appointmentFlow: extractData.appointmentFlow || {\\n      patientChecked: false,\\n      patientData: null,\\n      insuranceValidated: false,\\n      step: 'initial'\\n    },\\n    analytics: {\\n      ...analytics,\\n      intentClassifiedAt: now.toISOString(),\\n      intentClassificationTimestamp: now.getTime(),\\n      intentClassificationDuration: analytics.messageReceivedTimestamp ? now.getTime() - analytics.messageReceivedTimestamp : null\\n    },\\n    success: true\\n  }\\n}];\n"
        print("✅ Parse Intent Response atualizado com analytics de classificação")

# 3. ATUALIZAR Format Final Response para incluir métricas completas
for node in workflow['nodes']:
    if node.get('id') == 'format-final-response':
        node['parameters']['jsCode'] = "const data = $json;\\nconst extractData = $items('Extract Data')[0]?.json || {};\\n\\nif (!data.conversationId) throw new Error('conversationId obrigatório');\\nif (!data.message) throw new Error('message obrigatório');\\n\\nconst now = new Date();\\nconst analytics = data.analytics || extractData.analytics || {};\\n\\n// Calcular tempo total de resposta\\nconst totalResponseTime = analytics.messageReceivedTimestamp \\n  ? now.getTime() - analytics.messageReceivedTimestamp \\n  : null;\\n\\nreturn [{\\n  json: {\\n    conversationId: data.conversationId,\\n    message: data.message,\\n    intent: data.intent || 'INFORMACAO',\\n    action: data.action || 'RESPOND',\\n    aiProvider: 'n8n-gemini-v2.2.4-simple',\\n    requiresHumanIntervention: data.requiresHumanIntervention || false,\\n    requiresQueueTransfer: data.requiresQueueTransfer || false,\\n    queueName: data.queueName || null,\\n    appointmentFlow: data.appointmentFlow || null,\\n    analytics: {\\n      messageReceivedAt: analytics.messageReceivedAt,\\n      intentClassifiedAt: analytics.intentClassifiedAt,\\n      botRespondedAt: now.toISOString(),\\n      totalResponseTimeMs: totalResponseTime,\\n      intentClassificationDurationMs: analytics.intentClassificationDuration,\\n      intent: data.intent || 'INFORMACAO',\\n      confidence: data.confidence || 0,\\n      unit: data.unit || null,\\n      platform: extractData.platform || 'unknown'\\n    },\\n    success: true,\\n    timestamp: now.toISOString()\\n  }\\n}];\\n"
        print("✅ Format Final Response atualizado com analytics completos")

# 4. ADICIONAR node para salvar analytics no banco (opcional)
save_analytics = {
    "parameters": {
        "jsCode": "const data = $json;\\nconst analytics = data.analytics || {};\\n\\n// Preparar dados para salvar no banco\\nconst analyticsRecord = {\\n  conversationId: data.conversationId,\\n  intent: analytics.intent,\\n  confidence: analytics.confidence,\\n  unit: analytics.unit,\\n  platform: analytics.platform,\\n  messageReceivedAt: analytics.messageReceivedAt,\\n  intentClassifiedAt: analytics.intentClassifiedAt,\\n  botRespondedAt: analytics.botRespondedAt,\\n  totalResponseTimeMs: analytics.totalResponseTimeMs,\\n  intentClassificationDurationMs: analytics.intentClassificationDurationMs,\\n  requiresQueueTransfer: data.requiresQueueTransfer || false,\\n  queueName: data.queueName || null,\\n  aiProvider: data.aiProvider,\\n  success: data.success\\n};\\n\\n// Passar dados adiante\\nreturn [{\\n  json: {\\n    ...data,\\n    analyticsRecord\\n  }\\n}];\\n"
    },
    "id": "prepare-analytics",
    "name": "Prepare Analytics",
    "type": "n8n-nodes-base.code",
    "typeVersion": 2,
    "position": [2800, 100]
}

workflow['nodes'].append(save_analytics)
print("✅ Adicionado node Prepare Analytics")

# 5. Atualizar conexão: Format Final Response → Prepare Analytics → Send to System
workflow['connections']['Format Final Response'] = {
    "main": [[{"node": "Prepare Analytics", "type": "main", "index": 0}]]
}

workflow['connections']['Prepare Analytics'] = {
    "main": [[{"node": "Send to System", "type": "main", "index": 0}]]
}

print("✅ Conexões atualizadas para incluir analytics")

# Salvar
with open('ZoraH Bot - Simple v2.2.4.json', 'w', encoding='utf-8') as f:
    json.dump(workflow, f, indent=2, ensure_ascii=False)

print("\n" + "=" * 80)
print("🎉 WORKFLOW ATUALIZADO COM ANALYTICS!")
print("=" * 80)

print("\n📊 MÉTRICAS RASTREADAS:")
print("   ✅ messageReceivedAt - Quando mensagem chegou")
print("   ✅ intentClassifiedAt - Quando intenção foi classificada")
print("   ✅ botRespondedAt - Quando bot respondeu")
print("   ✅ totalResponseTimeMs - Tempo total de resposta (ms)")
print("   ✅ intentClassificationDurationMs - Tempo para classificar (ms)")
print("   ✅ intent - Intenção detectada")
print("   ✅ confidence - Confiança da classificação")
print("   ✅ unit - Unidade selecionada")
print("   ✅ platform - Plataforma (whatsapp/instagram)")
print("   ✅ requiresQueueTransfer - Se precisa transferir")
print("   ✅ queueName - Nome da fila")

print("\n📁 Arquivo atualizado: ZoraH Bot - Simple v2.2.4.json")
print("\n🔄 Esses dados serão enviados para o backend em cada resposta!")
