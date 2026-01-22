#!/usr/bin/env python3
import json

# Ler o arquivo JSON
with open('ZoraH Bot - Optimized v2.2.4.json', 'r', encoding='utf-8') as f:
    workflow = json.load(f)

# 1. Atualizar Parse Appointment Response
for node in workflow['nodes']:
    if node.get('id') == 'parse-appointment-response':
        node['parameters']['jsCode'] = "const agentResponse = $json;\\nconst mergeData = $items('Merge Patient Data')[0]?.json || {};\\n\\nlet responseText =\\n  agentResponse.output?.text ||\\n  agentResponse.output ||\\n  agentResponse.text ||\\n  'Erro ao processar.';\\n\\nlet collectedData = {};\\nlet isComplete = false;\\nlet needsInsuranceValidation = false;\\nlet needsProcedureList = false;\\n\\nconst match = responseText.match(/\\\\{[\\\\s\\\\S]*?\\\\}/);\\nif (match) {\\n  try {\\n    const parsed = JSON.parse(match[0]);\\n    collectedData = parsed.collectedData || {};\\n    isComplete = parsed.isComplete || false;\\n    needsInsuranceValidation = parsed.needsInsuranceValidation || false;\\n    needsProcedureList = parsed.needsProcedureList || false;\\n    responseText = parsed.response || responseText;\\n  } catch {}\\n}\\n\\nconst hasPatientData = mergeData.patientExists || (\\n  collectedData.nome &&\\n  collectedData.cpf &&\\n  collectedData.email &&\\n  collectedData.dataNascimento\\n);\\n\\nconst hasPhone = mergeData.platform === 'whatsapp' || collectedData.telefone;\\n\\nconst hasInsurance = collectedData.convenio || collectedData.isParticular;\\n\\nconst hasAppointmentDetails =\\n  collectedData.procedimento &&\\n  collectedData.data &&\\n  collectedData.horario;\\n\\nif (hasPatientData && hasPhone && hasInsurance && hasAppointmentDetails) {\\n  isComplete = true;\\n}\\n\\nconst needsPatientRegistration = !mergeData.patientExists && hasPatientData && hasPhone;\\n\\nreturn [{\\n  json: {\\n    conversationId: mergeData.conversationId,\\n    message: responseText,\\n    intent: 'AGENDAR',\\n    action: isComplete ? 'READY_TO_CREATE' : (\\n      needsPatientRegistration ? 'REGISTER_PATIENT' :\\n      needsInsuranceValidation ? 'VALIDATE_INSURANCE' :\\n      needsProcedureList ? 'GET_PROCEDURES' :\\n      'COLLECTING_DATA'\\n    ),\\n    requiresQueueTransfer: isComplete,\\n    queueName: isComplete ? 'Principal' : null,\\n    appointmentFlow: {\\n      ...mergeData.appointmentFlow,\\n      step: isComplete ? 'ready' : 'collecting',\\n      collectedData,\\n      isComplete,\\n      needsInsuranceValidation,\\n      needsProcedureList,\\n      needsPatientRegistration\\n    },\\n    patient: mergeData.patient,\\n    unit: mergeData.unit,\\n    platform: mergeData.platform,\\n    success: true\\n  }\\n}];\\n"
        print("✅ Updated Parse Appointment Response")

# 2. Atualizar Format Final Response  
for node in workflow['nodes']:
    if node.get('id') == 'format-final-response':
        node['parameters']['jsCode'] = "const data = $json;\\n\\nif (!data.conversationId) throw new Error('conversationId obrigatório');\\nif (!data.message) throw new Error('message obrigatório');\\n\\nreturn [{\\n  json: {\\n    conversationId: data.conversationId,\\n    message: data.message,\\n    intent: data.intent || 'INFORMACAO',\\n    action: data.action || 'RESPOND',\\n    aiProvider: 'n8n-gemini-v2.2.4',\\n    requiresHumanIntervention: data.requiresHumanIntervention || false,\\n    requiresQueueTransfer: data.requiresQueueTransfer || false,\\n    queueName: data.queueName || null,\\n    appointmentFlow: data.appointmentFlow || null,\\n    success: true,\\n    timestamp: new Date().toISOString()\\n  }\\n}];\\n"
        print("✅ Updated Format Final Response")

# 3. Adicionar rota REGISTER_PATIENT no Action Router
for node in workflow['nodes']:
    if node.get('id') == 'appointment-action-router':
        new_condition = {
            "conditions": {
                "options": {
                    "caseSensitive": True,
                    "leftValue": "",
                    "typeValidation": "strict",
                    "version": 1
                },
                "conditions": [{
                    "leftValue": "={{ $json.action }}",
                    "rightValue": "REGISTER_PATIENT",
                    "operator": {
                        "type": "string",
                        "operation": "equals",
                        "singleValue": True
                    },
                    "id": "register-patient-condition"
                }],
                "combinator": "and"
            },
            "renameOutput": True,
            "outputKey": "register_patient"
        }
        node['parameters']['rules']['values'].insert(0, new_condition)
        print("✅ Added REGISTER_PATIENT route")

# 4. Adicionar Register Patient HTTP node
register_patient_http = {
    "parameters": {
        "method": "POST",
        "url": "=https://365ecd1b9845.ngrok-free.app/api/patients",
        "sendBody": True,
        "specifyBody": "json",
        "jsonBody": "={{ { name: $json.appointmentFlow.collectedData.nome, cpf: $json.appointmentFlow.collectedData.cpf, email: $json.appointmentFlow.collectedData.email, birthDate: $json.appointmentFlow.collectedData.dataNascimento, phone: $json.appointmentFlow.phone || $json.appointmentFlow.collectedData.telefone, source: 'n8n-bot' } }}",
        "options": {}
    },
    "id": "register-patient-http",
    "name": "Register Patient HTTP",
    "type": "n8n-nodes-base.httpRequest",
    "typeVersion": 4.2,
    "position": [2200, -400]
}
workflow['nodes'].append(register_patient_http)
print("✅ Added Register Patient HTTP node")

# 5. Adicionar Process Patient Registration node
process_registration = {
    "parameters": {
        "jsCode": "const parseData = $items('Parse Appointment Response')[0]?.json || {};\\nconst registerResponse = $json;\\n\\nif (registerResponse.success && registerResponse.patient) {\\n  return [{\\n    json: {\\n      conversationId: parseData.conversationId,\\n      message: `✅ Cadastro realizado com sucesso!\\\\n\\\\nAgora vamos continuar com o agendamento...`,\\n      intent: 'AGENDAR',\\n      action: 'COLLECTING_DATA',\\n      appointmentFlow: {\\n        ...parseData.appointmentFlow,\\n        patientData: registerResponse.patient,\\n        patientId: registerResponse.patient.id,\\n        patientChecked: true\\n      },\\n      patient: registerResponse.patient,\\n      unit: parseData.unit,\\n      success: true\\n    }\\n  }];\\n}\\n\\nreturn [{\\n  json: {\\n    conversationId: parseData.conversationId,\\n    message: 'Erro ao cadastrar paciente. Transferindo para atendente.',\\n    intent: 'AGENDAR',\\n    action: 'TRANSFER_TO_HUMAN',\\n    requiresHumanIntervention: true\\n  }\\n}];\\n"
    },
    "id": "process-patient-registration",
    "name": "Process Patient Registration",
    "type": "n8n-nodes-base.code",
    "typeVersion": 2,
    "position": [2400, -400]
}
workflow['nodes'].append(process_registration)
print("✅ Added Process Patient Registration node")

# 6. Atualizar conexões
current_routes = workflow['connections'].get('Appointment Action Router', {}).get('main', [])
while len(current_routes) < 5:
    current_routes.append([])

current_routes.insert(0, [{
    "node": "Register Patient HTTP",
    "type": "main",
    "index": 0
}])

workflow['connections']['Appointment Action Router']['main'] = current_routes

workflow['connections']['Register Patient HTTP'] = {
    "main": [[{
        "node": "Process Patient Registration",
        "type": "main",
        "index": 0
    }]]
}

workflow['connections']['Process Patient Registration'] = {
    "main": [[{
        "node": "Format Final Response",
        "type": "main",
        "index": 0
    }]]
}

print("✅ Updated connections")

# Salvar arquivo
with open('ZoraH Bot - Optimized v2.2.4.json', 'w', encoding='utf-8') as f:
    json.dump(workflow, f, indent=2, ensure_ascii=False)

print("\\n🎉 Workflow atualizado com sucesso!")
print("📁 Arquivo: ZoraH Bot - Optimized v2.2.4.json")
print("💾 Backup: ZoraH Bot - Optimized v2.2.4.backup.json")
