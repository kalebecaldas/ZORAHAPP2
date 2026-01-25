# Como Importar o Workflow no N8N v2.2.4

## 📥 PASSO 1: Gerar Token de API do Zorah

Antes de importar, você precisa gerar o token de API.

### Via Postman/Insomnia:

```http
POST https://zorahapp2-production.up.railway.app/api/auth/generate-n8n-token
Authorization: Bearer {seu_token_de_master_ou_admin}
```

### Via curl:

```bash
curl -X POST https://zorahapp2-production.up.railway.app/api/auth/generate-n8n-token \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

**Resposta:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "type": "n8n_integration",
  "expiresIn": "10 years"
}
```

**⚠️ IMPORTANTE**: Copie e guarde esse token!

---

## 📥 PASSO 2: Configurar Variável de Ambiente no N8N

No N8N, adicione a variável de ambiente:

```
ZORAH_API_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Como adicionar:**
1. No N8N, vá em **Settings** (Configurações)
2. Clique em **Environments** (Ambientes)
3. Adicione: `ZORAH_API_TOKEN` com o valor do token

---

## 📥 PASSO 3: Importar o Workflow

### Método 1: Importação Direta (Recomendado)

1. Acesse o N8N
2. Clique em **"+"** (New Workflow)
3. Clique nos **3 pontinhos** (menu) no canto superior direito
4. Selecione **"Import from File"**
5. Selecione o arquivo: `n8n/ZoraH Bot - Cadastro Inteligente v2.3.0.json`
6. Clique em **"Import"**

### Método 2: Copiar e Colar JSON

1. Abra o arquivo `n8n/ZoraH Bot - Cadastro Inteligente v2.3.0.json`
2. Copie **todo** o conteúdo
3. No N8N, clique em **"+"** (New Workflow)
4. Clique nos **3 pontinhos** → **"Import from JSON"**
5. Cole o JSON
6. Clique em **"Import"**

---

## 🔧 PASSO 4: Configurar Credenciais

Após importar, você precisará configurar as credenciais do Google Gemini e Postgres:

### 4.1. Google Gemini (PaLM) API

Os seguintes nodes precisam de credencial:
- `Gemini Intent Model`
- `Gemini Information Model`
- `Gemini Coletor Model`

**Para configurar:**
1. Clique em cada node
2. Em "Credentials", selecione ou adicione sua conta Google Gemini
3. Se não tiver, clique em **"+ Create New"**
4. Adicione sua API Key do Google

### 4.2. Postgres Database

Os seguintes nodes precisam de credencial:
- `Postgres Memory Intent`
- `Postgres Memory Information`
- `Postgres Memory Coletor`

**Para configurar:**
1. Clique em cada node
2. Em "Credentials", selecione ou adicione sua conta Postgres
3. Configure:
   - **Host**: Seu servidor Postgres
   - **Database**: Nome do banco
   - **User**: Usuário
   - **Password**: Senha
   - **Port**: 5432 (padrão)

---

## ✅ PASSO 5: Ativar o Workflow

1. Certifique-se de que todas as credenciais estão OK
2. Clique no botão **"Active"** (toggle no canto superior direito)
3. O workflow ficará ativo e pronto para receber webhooks

---

## 🧪 PASSO 6: Testar o Workflow

### Teste 1: Webhook Test

1. No node "Webhook Start", clique em **"Listen for Test Event"**
2. Envie uma requisição de teste:

```bash
curl -X POST https://seu-n8n.com/webhook/zorahbot \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "test-123",
    "phone": "5592991234567",
    "message": "Oi, quero agendar"
  }'
```

### Teste 2: Via WhatsApp Real

Envie uma mensagem para o número do seu bot:
```
Oi
```

---

## 📊 O Que Foi Adicionado

### ✅ Novos Nodes:

1. **Verificador Paciente Zorah** (Tool)
   - Verifica se paciente existe no sistema Zorah
   - Usa a API do Zorah Railway

2. **Patient Status Checker** (Code)
   - Lógica de decisão inteligente
   - Compara Agil vs Zorah
   - Define ação: CONTINUE, CREATE_FROM_AGIL ou COLLECT_DATA

3. **Registration Router** (Switch)
   - Roteia para o fluxo correto
   - 3 saídas diferentes

4. **Criar Paciente do Agil** (HTTP Request)
   - POST /api/patients
   - Usa dados do Agil
   - Cadastra automaticamente

5. **Format Agil Registration** (Code)
   - Formata resposta de sucesso
   - Adiciona logs

6. **Coletor Rápido Agent** (AI Agent)
   - Coleta dados do paciente
   - Pede todos de uma vez
   - Valida CPF

7. **Gemini Coletor Model** (Language Model)
   - Modelo para o agent coletor

8. **Postgres Memory Coletor** (Memory)
   - Memória para o agent coletor

9. **Parse Coleta Response** (Code)
   - Extrai JSON do agent
   - Valida dados coletados

10. **Criar Paciente Coletado** (HTTP Request)
    - POST /api/patients
    - Usa dados coletados manualmente

11. **Format Coleta Registration** (Code)
    - Formata resposta de sucesso

12. **Merge Registration Flows** (Merge)
    - Une os 3 fluxos de registro
    - Continua para Intent Router

---

## 🔍 Fluxo Completo

```
Webhook Start
  ↓
Extract Data
  ↓
Intent Classifier Agent
  ├── Tool: Identificador de Paciente (Agil)
  └── Tool: Verificador Paciente Zorah
  ↓
Parse Intent Response
  ↓
Patient Status Checker (lógica)
  ↓
Registration Router (switch)
  ├─→ [continue] → Merge → Intent Router
  ├─→ [create_from_agil] → Criar Paciente do Agil → Format → Merge
  └─→ [collect_data] → Coletor Agent → Parse → Criar Paciente → Format → Merge
  ↓
Intent Router (original)
  ├─→ Information Agent
  ├─→ Handle Appointment
  ├─→ Handler Transfer
  └─→ Format Ask Unit
  ↓
Format Final Response
  ↓
Send to System
  ↓
Webhook Response
```

---

## 🎯 3 Cenários de Teste

### Cenário 1: Paciente cadastrado em ambos
```json
{
  "conversationId": "test-1",
  "phone": "5592991234567",
  "message": "Oi, quero agendar"
}
```
**Resultado esperado**: "Olá, João Silva! Para qual unidade..."

---

### Cenário 2: Paciente só no Agil
```json
{
  "conversationId": "test-2",
  "phone": "5592998765432",
  "message": "Oi"
}
```
**Resultado esperado**: "Olá, João! Vi que você já é paciente... [cadastra automaticamente]"

---

### Cenário 3: Paciente novo
```json
{
  "conversationId": "test-3",
  "phone": "5592987654321",
  "message": "Oi, quero agendar"
}
```
**Resultado esperado**: "Para continuar, preciso de alguns dados rápidos..."

---

## ⚠️ Troubleshooting

### Erro: "ZORAH_API_TOKEN is not defined"
**Solução**: Configure a variável de ambiente no N8N

### Erro: "Authorization failed"
**Solução**: Gere um novo token usando o endpoint `/api/auth/generate-n8n-token`

### Erro: "Credentials not found"
**Solução**: Configure as credenciais do Google Gemini e Postgres

### Node não aparece no workflow
**Solução**: Reimporte o JSON completo

### Workflow não ativa
**Solução**: Verifique se todas as credenciais estão OK (ícone vermelho = erro)

---

## 📈 Métricas a Acompanhar

No N8N, você pode ver:
- **Execuções**: Total de execuções do workflow
- **Taxa de sucesso**: % de execuções bem-sucedidas
- **Tempo médio**: Tempo de resposta
- **Erros**: Logs de erros

Para ver:
1. Clique no workflow
2. Vá em **"Executions"** (Execuções)
3. Analise os logs

---

## 🚀 Próximos Passos

Após importar e testar:

1. **Monitorar** por 24h os primeiros cadastros
2. **Ajustar** mensagens do bot se necessário
3. **Analisar** métricas de conversão
4. **Otimizar** flows baseado no comportamento real

---

**Versão do Workflow**: 2.3.0  
**Data**: 25/01/2026  
**Compatível com**: N8N 2.2.4+
