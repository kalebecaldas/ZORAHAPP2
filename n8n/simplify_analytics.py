#!/usr/bin/env python3
import json

# Ler o workflow
with open('ZoraH Bot - Simple v2.2.4.json', 'r', encoding='utf-8') as f:
    workflow = json.load(f)

print("🔧 Simplificando analytics para apenas métricas essenciais...")

# 1. ATUALIZAR Extract Data - apenas timestamp de entrada
for node in workflow['nodes']:
    if node.get('id') == 'extract-data':
        node['parameters']['jsCode'] = "const crypto = require('crypto');\\n\\nconst data = $json.body || $json;\\nconst conversationId = data.conversationId || '';\\n\\nif (!conversationId) throw new Error('conversationId ausente');\\n\\nconst sessionId = crypto.createHash('md5').update(conversationId).digest('hex');\\nconst platform = data.platform || 'whatsapp';\\nconst needsPhone = platform === 'instagram';\\n\\nreturn [{\\n  json: {\\n    chatInput: data.message || '',\\n    phone: data.phone || '',\\n    conversationId,\\n    sessionId,\\n    platform,\\n    needsPhone,\\n    patient: data.patient || {},\\n    context: data.context || {},\\n    appointmentFlow: data.context?.appointmentFlow || {\\n      patientChecked: false,\\n      patientData: null,\\n      insuranceValidated: false,\\n      step: 'initial'\\n    },\\n    messageReceivedAt: Date.now(),\\n    timestamp: new Date().toISOString()\\n  }\\n}];\\n"
        print("✅ Extract Data simplificado")

# 2. Parse Intent Response - manter intent
# (já está bom, só garantir que passa messageReceivedAt)

# 3. ATUALIZAR Format Final Response - métricas essenciais
for node in workflow['nodes']:
    if node.get('id') == 'format-final-response':
        node['parameters']['jsCode'] = "const data = $json;\\nconst extractData = $items('Extract Data')[0]?.json || {};\\n\\nif (!data.conversationId) throw new Error('conversationId obrigatório');\\nif (!data.message) throw new Error('message obrigatório');\\n\\nconst now = Date.now();\\nconst messageReceivedAt = extractData.messageReceivedAt || now;\\nconst responseTimeMs = now - messageReceivedAt;\\n\\nreturn [{\\n  json: {\\n    conversationId: data.conversationId,\\n    message: data.message,\\n    intent: data.intent || 'INFORMACAO',\\n    action: data.action || 'RESPOND',\\n    aiProvider: 'n8n-gemini-v2.2.4-simple',\\n    requiresHumanIntervention: data.requiresHumanIntervention || false,\\n    requiresQueueTransfer: data.requiresQueueTransfer || false,\\n    queueName: data.queueName || null,\\n    appointmentFlow: data.appointmentFlow || null,\\n    metrics: {\\n      intent: data.intent || 'INFORMACAO',\\n      responseTimeMs: responseTimeMs,\\n      timestamp: new Date().toISOString(),\\n      requiresTransfer: data.requiresQueueTransfer || false\\n    },\\n    success: true,\\n    timestamp: new Date().toISOString()\\n  }\\n}];\\n"
        print("✅ Format Final Response com métricas essenciais")

# 4. ATUALIZAR Prepare Analytics - apenas essencial
for node in workflow['nodes']:
    if node.get('id') == 'prepare-analytics':
        node['parameters']['jsCode'] = "const data = $json;\\n\\n// Apenas passar os dados adiante (métricas já estão em data.metrics)\\nreturn [{ json: data }];\\n"
        print("✅ Prepare Analytics simplificado")

# Salvar
with open('ZoraH Bot - Simple v2.2.4.json', 'w', encoding='utf-8') as f:
    json.dump(workflow, f, indent=2, ensure_ascii=False)

print("\n" + "=" * 80)
print("✅ WORKFLOW SIMPLIFICADO COM SUCESSO!")
print("=" * 80)

print("\n📊 MÉTRICAS ENVIADAS AO BACKEND:")
print("   ✅ intent - Intenção detectada")
print("   ✅ responseTimeMs - Tempo total de resposta")
print("   ✅ timestamp - Quando foi processado")
print("   ✅ requiresTransfer - Se transferiu para fila")

print("\n📦 Payload enviado:")
print("""
{
  "conversationId": "...",
  "message": "...",
  "intent": "AGENDAR",
  "requiresQueueTransfer": true,
  "queueName": "Principal",
  "metrics": {
    "intent": "AGENDAR",
    "responseTimeMs": 2300,
    "timestamp": "2026-01-20T12:00:00Z",
    "requiresTransfer": true
  }
}
""")

print("\n📁 Arquivo: ZoraH Bot - Simple v2.2.4.json")
print("🚀 Pronto para importar!")
