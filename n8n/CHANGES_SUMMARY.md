# ✅ Workflow Atualizado - ZoraH Bot v2.2.4

## 🎯 Mudanças Implementadas

### 1. **Parse Appointment Response** ✅
- Detecta quando paciente não está cadastrado
- Adiciona action `REGISTER_PATIENT` quando necessário
- Inclui flags `requiresQueueTransfer` e `queueName`
- Define `queueName: 'Principal'` quando agendamento completo

### 2. **Format Final Response** ✅
- Adiciona campo `requiresQueueTransfer`
- Adiciona campo `queueName`
- Envia informações para backend processar transferência de fila

### 3. **Appointment Action Router** ✅  
- Nova rota: `REGISTER_PATIENT` (primeira condição)
- Mantém rotas existentes:
  - `VALIDATE_INSURANCE`
  - `GET_PROCEDURES`
  - `READY_TO_CREATE`
  - `COLLECTING_DATA`

### 4. **Register Patient HTTP** ✅ [NOVO NODE]
- **Tipo:** HTTP Request POST
- **URL:** `/api/patients`
- **Body:** Envia dados coletados (nome, CPF, email, data nascimento, telefone)
- **Source:** `n8n-bot`

### 5. **Process Patient Registration** ✅ [NOVO NODE]
- **Tipo:** Code
- **Função:** Processa resposta do cadastro
- **Sucesso:** Continua com agendamento (action: COLLECTING_DATA)
- **Erro:** Transfere para atendente humano

### 6. **Conexões Atualizadas** ✅
```
Appointment Action Router
  ├─[register_patient]→ Register Patient HTTP
  │                     └→ Process Patient Registration
  │                        └→ Format Final Response
  ├─[validate_insurance]→ Validate Insurance HTTP
  ├─[get_procedures]→ Get Procedures HTTP
  ├─[ready_to_create]→ Validate Appointment Data
  └─[collecting_data]→ Format Final Response
```

---

## 📋 Fluxo Completo

### Novo Paciente:
```
1. User: "Quero agendar"
2. Bot coleta: nome, CPF, email, data nascimento, telefone
3. System: REGISTER_PATIENT detected
4. HTTP POST → /api/patients
5. Paciente cadastrado ✅
6. Bot continua: convênio → procedimentos → data → horário
7. Agendamento completo
8. requiresQueueTransfer: true, queueName: "Principal"
9. Backend transfere conversa para Fila Principal
```

### Paciente Existente:
```
1. User: "Quero agendar"  
2. Bot pula dados pessoais (já cadastrado)
3. Bot coleta: convênio → procedimentos → data → horário
4. Agendamento completo
5. requiresQueueTransfer: true, queueName: "Principal"
6. Backend transfere conversa para Fila Principal
```

---

## 🔧 Backend - Próxima Etapa

Você precisa atualizar `webhook-n8n.ts`:

```typescript
// Após receber resposta do n8n
if (response.requiresQueueTransfer && response.queueName) {
  await conversationService.transferToQueue(
    conversationId,
    response.queueName,
    'Bot completou coleta de dados para agendamento'
  );
  
  logger.info(`Conversa ${conversationId} transferida para fila: ${response.queueName}`);
}
```

---

## 📦 Arquivos

- **Workflow atualizado:** `ZoraH Bot - Optimized v2.2.4.json`
- **Backup:** `ZoraH Bot - Optimized v2.2.4.backup.json`
- **Script de atualização:** `update_workflow.py`

---

## 🧪 Testando

1. Importe `ZoraH Bot - Optimized v2.2.4.json` no n8n
2. Configure credenciais (Gemini + Postgres)
3. Ative o workflow
4. Teste com paciente novo
5. Verifique se cadastro acontece
6. Verifique se transferência de fila funciona (após atualizar backend)

---

## ✨ Melhorias Aplicadas

✅ Appointment Agent com validação estrita passo-a-passo  
✅ Cadastro automático de pacientes novos  
✅ Transferência automática para Fila Principal após agendamento  
✅ Validação de convênio antes de mostrar procedimentos  
✅ Fluxo sequencial de coleta de dados  
✅ Tratamento de erros com transferência para humano
