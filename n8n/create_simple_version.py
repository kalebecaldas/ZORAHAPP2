#!/usr/bin/env python3
import json

# Ler o workflow completo
with open('ZoraH Bot - Optimized v2.2.4.json', 'r', encoding='utf-8') as f:
    workflow = json.load(f)

print("🔧 Criando versão simplificada do workflow...")

# Nodes que queremos MANTER
keep_nodes = [
    'webhook-start',
    'extract-data',
    'intent-classifier',
    'gemini-intent-model',
    'postgres-memory-intent',
    'parse-intent-response',
    'intent-router',
    'information-agent',
    'gemini-information-model',
    'postgres-memory-information',
    'http-request-vieiralves',
    'http-request-sao-jose',
    'parse-information-response',
    'handler-transfer',
    'format-ask-unit-response',
    'format-final-response',
    'send-to-system',
    'webhook-response'
]

# CRIAR NOVO NODE: Handle Appointment Request (simplificado)
handle_appointment = {
    "parameters": {
        "jsCode": "const extractData = $items('Extract Data')[0]?.json || {};\\nconst parseIntent = $items('Parse Intent Response')[0]?.json || {};\\n\\nreturn [{\\n  json: {\\n    conversationId: extractData.conversationId,\\n    message: 'Entendi que você deseja agendar um procedimento. Vou transferir você para nossa equipe de atendimento que irá auxiliá-lo com o agendamento. Aguarde um momento! 😊',\\n    intent: 'AGENDAR',\\n    action: 'TRANSFER_TO_QUEUE',\\n    requiresQueueTransfer: true,\\n    queueName: 'Principal',\\n    success: true\\n  }\\n}];\\n"
    },
    "id": "handle-appointment-simple",
    "name": "Handle Appointment Request",
    "type": "n8n-nodes-base.code",
    "typeVersion": 2,
    "position": [800, -200]
}

# Filtrar nodes
simplified_nodes = []
for node in workflow['nodes']:
    if node.get('id') in keep_nodes:
        simplified_nodes.append(node)

# Adicionar o novo node
simplified_nodes.append(handle_appointment)

print(f"✅ Nodes mantidos: {len(keep_nodes)}")
print(f"✅ Nodes na versão simplificada: {len(simplified_nodes)}")

# Filtrar conexões
simplified_connections = {}

# Conexões que queremos manter
keep_connections = [
    'Webhook Start',
    'Extract Data',
    'Intent Classifier Agent',
    'Gemini Intent Model',
    'Postgres Memory Intent',
    'Parse Intent Response',
    'Intent Router',
    'Information Agent',
    'Gemini Information Model',
    'Postgres Memory Information',
    'HTTP Request Vieiralves',
    'HTTP Request São José',
    'Parse Information Response',
    'Handler Transfer',
    'Format Ask Unit Response',
    'Format Final Response',
    'Send to System'
]

for source in keep_connections:
    if source in workflow['connections']:
        simplified_connections[source] = workflow['connections'][source]

# ATUALIZAR Intent Router para conectar AGENDAR ao novo node
simplified_connections['Intent Router'] = {
    "main": [
        [{"node": "Information Agent", "type": "main", "index": 0}],  # INFORMACAO
        [{"node": "Handle Appointment Request", "type": "main", "index": 0}],  # AGENDAR (SIMPLIFICADO)
        [{"node": "Handler Transfer", "type": "main", "index": 0}],  # FALAR_ATENDENTE
        [{"node": "Format Ask Unit Response", "type": "main", "index": 0}]  # PEDIR_UNIDADE
    ]
}

# Adicionar conexão do novo node
simplified_connections['Handle Appointment Request'] = {
    "main": [[{"node": "Format Final Response", "type": "main", "index": 0}]]
}

print(f"✅ Conexões atualizadas")

# Criar novo workflow
simplified_workflow = {
    "name": "ZoraH Bot - Simple v2.2.4",
    "nodes": simplified_nodes,
    "pinData": {},
    "connections": simplified_connections,
    "active": True,
    "settings": {
        "executionOrder": "v1",
        "availableInMCP": True,
        "timeSavedMode": "fixed",
        "callerPolicy": "workflowsFromSameOwner"
    },
    "versionId": "simple-v2.2.4",
    "meta": {
        "templateCredsSetupCompleted": True,
        "instanceId": "5b105df77e781b669665abdc37a7b4ef359bca880b5ffd0a3d44e19f5f31eba3"
    },
    "tags": []
}

# Salvar
with open('ZoraH Bot - Simple v2.2.4.json', 'w', encoding='utf-8') as f:
    json.dump(simplified_workflow, f, indent=2, ensure_ascii=False)

print("\n" + "=" * 80)
print("🎉 VERSÃO SIMPLIFICADA CRIADA COM SUCESSO!")
print("=" * 80)
print("\n📁 Arquivo: ZoraH Bot - Simple v2.2.4.json")
print("\n📋 Funcionalidades:")
print("   ✅ INFORMACAO - Responde perguntas sobre a clínica")
print("   ✅ AGENDAR - Transfere direto para fila Principal")
print("   ✅ FALAR_ATENDENTE - Transfere para humano")
print("   ✅ PEDIR_UNIDADE - Pergunta unidade ao paciente")
print("\n📊 Comparação:")
print(f"   Workflow completo: {len(workflow['nodes'])} nodes")
print(f"   Versão simplificada: {len(simplified_nodes)} nodes")
print(f"   Redução: {len(workflow['nodes']) - len(simplified_nodes)} nodes")
