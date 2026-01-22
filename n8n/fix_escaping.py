#!/usr/bin/env python3
import json

# Ler o workflow
with open('ZoraH Bot - Simple v2.2.4.json', 'r', encoding='utf-8') as f:
    workflow = json.load(f)

print("🔧 Corrigindo código JavaScript nos nodes...")

# Código correto para Extract Data (sem escapes duplos)
extract_data_code = """const crypto = require('crypto');

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
"""

# Atualizar Extract Data
for node in workflow['nodes']:
    if node.get('id') == 'extract-data':
        node['parameters']['jsCode'] = extract_data_code
        print("✅ Extract Data corrigido")
        break

# Salvar
with open('ZoraH Bot - Simple v2.2.4.json', 'w', encoding='utf-8') as f:
    json.dump(workflow, f, indent=2, ensure_ascii=False)

print("\n✅ Workflow corrigido!")
print("📁 Arquivo: ZoraH Bot - Simple v2.2.4.json")
print("\n🚀 Agora pode importar no n8n sem problemas!")
