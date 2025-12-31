# 📦 Workflows N8N - ZoraH Bot Intelligence

## 📋 Lista de Workflows

### 1️⃣ Main Bot Intelligence (`1_main_bot_intelligence.json`)
**Workflow principal** - Recebe todas as mensagens e roteia.

### 2️⃣ Patient Registration (`2_patient_registration.json`)
Coleta completa de dados do paciente.

### 3️⃣ Appointment Scheduling (`3_appointment_scheduling.json`)
Agendamento completo com verificação de disponibilidade.

### 4️⃣ Information Provider (`4_information_provider.json`)
Responde perguntas com cache e fallbacks.

### 5️⃣ Cancellation & Rescheduling (`5_cancellation_rescheduling.json`)
Gerencia cancelamentos e reagendamentos.

### 6️⃣ Human Transfer (`6_human_transfer.json`)
Transfere para atendente humano com resumo completo.

---

## 🚀 Como Importar

### Via Interface N8N:
1. Acesse seu N8N: `https://n8n.zorahapp.com.br`
2. Clique em "Workflows" → "Import from File"
3. Selecione cada arquivo `.json`
4. Ative o workflow

### Via CLI:
```bash
# Importar todos de uma vez
for file in n8n/workflows/*.json; do
  n8n import:workflow --input="$file"
done
```

---

## ⚙️ Configuração

### 1. Variáveis de Ambiente:
```env
ZORAHAPP_API_URL=https://zorahapp.com.br
ZORAHAPP_API_TOKEN=jwt-token-here
OPENAI_API_KEY=sk-...
```

### 2. Credenciais no N8N:
- **OpenAI API** (id: 1)
- **ZorahApp API** (HTTP Header Auth)
- **Redis** (opcional, para cache)

---

## 🔗 Webhook Endpoints

### Entrada (Sistema → N8N):
- `POST /webhook/zorahbot` - Main workflow
- `POST /webhook/patient-registration` - Registration only
- `POST /webhook/schedule-appointment` - Scheduling only
- `POST /webhook/information` - Information only
- `POST /webhook/cancel-reschedule` - Cancel/reschedule only
- `POST /webhook/human-transfer` - Transfer only

### Saída (N8N → Sistema):
- `POST /webhook/n8n-response` - Todas as respostas

---

## 📊 Monitoramento

Acesse o dashboard N8N para ver:
- ✅ Execuções por hora
- ❌ Taxa de erro
- ⏱️ Tempo médio
- 💰 Uso de GPT

---

## 🧪 Testes

Execute os testes incluídos:
```bash
npm run test:n8n
```

---

**Status**: ✅ Pronto para importar  
**Última atualização**: 29/12/2025

