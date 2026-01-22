# Mudanças Necessárias no Workflow n8n

## 1. Appointment Agent - System Prompt (JÁ APLICADO ✅)

O prompt foi atualizado com validação estrita. Verifique se está correto no workflow.

## 2. Parse Appointment Response - Adicionar Lógica de Registro

**Localização:** Node "Parse Appointment Response"

**Adicionar após linha que verifica `isComplete`:**

```javascript
// Verificar se precisa cadastrar paciente novo
const needsPatientRegistration = !mergeData.patientExists && hasPatientData && hasPhone;

return [{
  json: {
    conversationId: mergeData.conversationId,
    message: responseText,
    intent: 'AGENDAR',
    action: isComplete ? 'READY_TO_CREATE' : (
      needsPatientRegistration ? 'REGISTER_PATIENT' :  // NOVO
      needsInsuranceValidation ? 'VALIDATE_INSURANCE' :
      needsProcedureList ? 'GET_PROCEDURES' :
      'COLLECTING_DATA'
    ),
    requiresQueueTransfer: isComplete,  // NOVO
    queueName: isComplete ? 'Principal' : null,  // NOVO
    // ... resto do código
  }
}];
```

## 3. Appointment Action Router - Adicionar Rota REGISTER_PATIENT

**Localização:** Node "Appointment Action Router"

**Adicionar nova condição:**

```json
{
  "conditions": {
    "conditions": [{
      "leftValue": "={{ $json.action }}",
      "rightValue": "REGISTER_PATIENT",
      "operator": {"type": "string", "operation": "equals"}
    }]
  },
  "renameOutput": true,
  "outputKey": "register_patient"
}
```

## 4. CRIAR NOVO NODE: Register Patient HTTP

**Tipo:** HTTP Request  
**Método:** POST  
**URL:** `https://365ecd1b9845.ngrok-free.app/api/patients`

**Body (JSON):**
```json
{
  "name": "={{ $json.appointmentFlow.collectedData.nome }}",
  "cpf": "={{ $json.appointmentFlow.collectedData.cpf }}",
  "email": "={{ $json.appointmentFlow.collectedData.email }}",
  "birthDate": "={{ $json.appointmentFlow.collectedData.dataNascimento }}",
  "phone": "={{ $json.appointmentFlow.phone || $json.appointmentFlow.collectedData.telefone }}",
  "source": "n8n-bot"
}
```

## 5. CRIAR NOVO NODE: Process Patient Registration

**Tipo:** Code  
**Código:**

```javascript
const parseData = $items('Parse Appointment Response')[0]?.json || {};
const registerResponse = $json;

if (registerResponse.success && registerResponse.patient) {
  return [{
    json: {
      conversationId: parseData.conversationId,
      message: `✅ Cadastro realizado com sucesso!\\n\\nAgora vamos continuar com o agendamento...`,
      intent: 'AGENDAR',
      action: 'COLLECTING_DATA',
      appointmentFlow: {
        ...parseData.appointmentFlow,
        patientData: registerResponse.patient,
        patientId: registerResponse.patient.id
      },
      patient: registerResponse.patient,
      unit: parseData.unit,
      success: true
    }
  }];
}

return [{
  json: {
    conversationId: parseData.conversationId,
    message: 'Erro ao cadastrar paciente. Transferindo para atendente.',
    intent: 'AGENDAR',
    action: 'TRANSFER_TO_HUMAN',
    requiresHumanIntervention: true
  }
}];
```

## 6. Format Final Response - Adicionar Campos

**Localização:** Node "Format Final Response"

**Adicionar:**

```javascript
return [{
  json: {
    conversationId: data.conversationId,
    message: data.message,
    intent: data.intent || 'INFORMACAO',
    action: data.action || 'RESPOND',
    aiProvider: 'n8n-gemini-v2.2.4',
    requiresHumanIntervention: data.requiresHumanIntervention || false,
    requiresQueueTransfer: data.requiresQueueTransfer || false,  // NOVO
    queueName: data.queueName || null,  // NOVO
    appointmentFlow: data.appointmentFlow || null,
    success: true,
    timestamp: new Date().toISOString()
  }
}];
```

## 7. Conexões

**Appointment Action Router → Register Patient HTTP** (nova rota "register_patient")  
**Register Patient HTTP → Process Patient Registration**  
**Process Patient Registration → Format Final Response**

## 8. Backend - webhook-n8n.ts

**Adicionar após receber resposta do n8n:**

```typescript
// Transferir para fila se necessário
if (response.requiresQueueTransfer && response.queueName) {
  await conversationService.transferToQueue(
    conversationId,
    response.queueName,
    'Bot completou coleta de dados'
  );
  
  logger.info(`Conversation ${conversationId} transferred to queue: ${response.queueName}`);
}
```
