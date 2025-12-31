# 🔌 Guia de Integração N8N com ZorahApp

## 📋 Visão Geral

Este guia explica como integrar o workflow N8N com o sistema ZorahApp para processar mensagens com IA.

---

## 🎯 Arquitetura da Integração

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│  WhatsApp   │────────>│   ZorahApp   │────────>│     N8N     │
│   Usuário   │         │    Backend   │         │  Workflow   │
└─────────────┘         └──────────────┘         └─────────────┘
                              ^                          │
                              │                          │
                              └──────────────────────────┘
                                   Response via Webhook
```

### **Fluxo:**
1. **Usuário envia mensagem** → WhatsApp
2. **ZorahApp recebe** → `POST /webhook` (WhatsApp webhook)
3. **Sistema verifica N8N** → `n8nBotService.processMessage()`
4. **Se N8N configurado** → Envia para N8N via HTTP
5. **N8N processa** → IA classifica, agenda, etc.
6. **N8N responde** → `POST /webhook/n8n-response`
7. **Sistema processa** → Salva mensagem, envia WhatsApp, notifica frontend
8. **Fallback automático** → Se N8N falhar, usa sistema antigo

---

## 🔧 Configuração

### **1. Variáveis de Ambiente**

Adicione ao `.env`:

```env
# N8N Configuration
N8N_WEBHOOK_URL=https://seu-n8n.com/webhook/zorahbot
N8N_TIMEOUT=30000
N8N_RETRIES=2
N8N_FALLBACK_ENABLED=true

# AI Provider (para N8N)
AI_PROVIDER=openai
AI_API_URL=https://api.openai.com/v1/chat/completions
AI_API_KEY=sk-proj-seu-token
AI_MODEL=gpt-4o
AI_API_HEADER_NAME=Authorization
AI_API_HEADER_VALUE=Bearer {{AI_API_KEY}}

# System URL (para N8N responder)
ZORAHAPP_API_URL=https://zorahapp.com.br
```

### **2. N8N Workflow**

Importe o workflow:
```
n8n/WORKFLOW_MULTI_AI.json
```

Configure no N8N:
```env
ZORAHAPP_API_URL=https://zorahapp.com.br
AI_API_URL=https://api.openai.com/v1/chat/completions
AI_API_KEY=sk-...
AI_MODEL=gpt-4o
```

### **3. Expor Webhook Público**

O endpoint `/webhook/n8n-response` **deve ser público** (sem autenticação) para N8N conseguir responder.

---

## 📁 Arquivos Criados

### **1. `api/services/n8nBotService.ts`**
Serviço para enviar mensagens ao N8N:

```typescript
export class N8NBotService {
  // Verifica se N8N está configurado
  isEnabled(): boolean

  // Envia mensagem para N8N com retry
  async processMessage(data): Promise<Response>

  // Testa conectividade
  async testConnection(): Promise<Status>

  // Estatísticas
  getStats()
}
```

**Features:**
- ✅ Retry automático (2 tentativas por padrão)
- ✅ Fallback para sistema antigo se falhar
- ✅ Timeout configurável
- ✅ Detecção de erros (ECONNREFUSED, ETIMEDOUT, etc.)
- ✅ Backoff exponencial

---

### **2. `api/routes/webhook-n8n.ts`**
Endpoint para N8N enviar respostas:

```typescript
POST /webhook/n8n-response
Body: {
  conversationId: string
  message: string
  intent: string
  action?: string
  entities?: object
  aiProvider?: string
}
```

**O que faz:**
1. Valida conversationId e message
2. Busca conversa no banco
3. Envia mensagem ao WhatsApp
4. Salva no histórico
5. Atualiza contexto da conversa
6. Notifica frontend via Socket.IO
7. Executa ações especiais:
   - `transfer_human` → Transfere para fila PRINCIPAL
   - `appointment_created` → Cria mensagem de resumo

**Também tem:**
```typescript
GET /webhook/n8n-health
// Testa se o endpoint está acessível
```

---

### **3. Integração em `conversations.ts`**
Precisa adicionar chamada ao `n8nBotService` onde o bot processa mensagens.

**Exemplo de integração:**

```typescript
import { n8nBotService } from '../services/n8nBotService.js'

// No handler de recebimento de mensagem
async function handleIncomingMessage(conversationId, message, phone) {
  // Verificar se deve usar bot
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { patient: true }
  })

  if (conversation.status === 'BOT_QUEUE') {
    // Enviar para N8N
    const result = await n8nBotService.processMessage({
      message: message.content,
      phone: conversation.phone,
      conversationId: conversationId,
      patient: conversation.patient,
      context: {
        history: [], // últimas mensagens
        currentIntent: conversation.currentIntent,
        workflowContext: conversation.workflowContext
      }
    })

    if (!result.success) {
      console.error('❌ Erro ao processar com N8N:', result.error)
      // Fallback já foi executado automaticamente
    }

    // N8N vai responder via webhook /webhook/n8n-response
    // Não precisa fazer mais nada aqui
    return
  }

  // Se não for bot, continua fluxo normal (atendimento humano)
}
```

---

## 🔍 Como Funciona

### **Fluxo Completo Detalhado:**

#### **1. Mensagem Recebida (WhatsApp → ZorahApp)**
```
POST /webhook (WhatsApp Webhook)
  ↓
Verifica se conversa está em BOT_QUEUE
  ↓
Sim? → Processa com bot
```

#### **2. Envio para N8N (ZorahApp → N8N)**
```typescript
n8nBotService.processMessage({
  message: "quero agendar fisioterapia",
  phone: "5592999999999",
  conversationId: "abc123",
  patient: { id: "...", name: "João" },
  context: { history: [...] }
})
  ↓
POST https://n8n.com/webhook/zorahbot
  ↓
Timeout: 30s, Retries: 2
  ↓
Se falhar → Fallback automático
```

#### **3. Processamento no N8N**
```
N8N Workflow:
1. Extract Data
2. Get Context (busca histórico da conversa)
3. Get Clinic Data (busca procedimentos, convênios)
4. Merge Context
5. AI Classifier (OpenAI/Claude/Gemini/Groq)
6. Parse AI Response
7. Decisões (Valores? Agendar? Humano?)
8. Actions (Search Patient, Schedule, etc.)
9. Format Response
10. Send to System
```

#### **4. Resposta do N8N (N8N → ZorahApp)**
```typescript
POST https://zorahapp.com.br/webhook/n8n-response
Body: {
  conversationId: "abc123",
  message: "Ótimo! Para agendar fisioterapia, qual unidade você prefere?",
  intent: "AGENDAR",
  entities: { procedimento: "Fisioterapia" },
  aiProvider: "openai"
}
  ↓
ZorahApp recebe:
1. Envia mensagem ao WhatsApp
2. Salva no banco de dados
3. Notifica frontend via Socket.IO
4. Executa ações especiais (transfer, appointment)
```

---

## 🧪 Testando a Integração

### **1. Testar Conectividade N8N**
```bash
curl -X POST http://localhost:3001/api/n8n/test
```

**Resposta esperada:**
```json
{
  "success": true,
  "latency": 234,
  "config": {
    "enabled": true,
    "webhookUrl": "***configured***",
    "timeout": 30000,
    "retries": 2,
    "fallbackEnabled": true
  }
}
```

### **2. Testar Workflow N8N Diretamente**
```bash
curl -X POST https://seu-n8n.com/webhook/zorahbot \
  -H "Content-Type: application/json" \
  -d '{
    "message": "quero agendar",
    "phone": "5592999999999",
    "conversationId": "test-123",
    "patient": {},
    "context": {}
  }'
```

### **3. Testar Webhook de Resposta**
```bash
curl -X POST http://localhost:3001/webhook/n8n-response \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "abc123",
    "message": "Resposta de teste",
    "intent": "AGENDAR",
    "entities": {},
    "aiProvider": "openai"
  }'
```

### **4. Testar Health**
```bash
curl http://localhost:3001/webhook/n8n-health
```

---

## 🔄 Fallback Automático

Se N8N falhar, o sistema usa automaticamente o bot antigo:

```typescript
// n8nBotService.ts
async processMessage(data) {
  try {
    // Tenta N8N
    return await this.sendToN8N(data)
  } catch (error) {
    console.error('❌ N8N falhou:', error)
    
    // Usa fallback automático
    return await intelligentBotService.processMessage(...)
  }
}
```

**Logs de fallback:**
```
❌ Erro N8N (tentativa 1): ECONNREFUSED
❌ Erro N8N (tentativa 2): ECONNREFUSED
❌ Todas as tentativas N8N falharam
🔄 Usando fallback (sistema antigo)
✅ Resposta gerada pelo fallback
```

---

## 📊 Monitoramento

### **Status do N8N**
```typescript
import { n8nBotService } from './services/n8nBotService.js'

// Verificar se está habilitado
if (n8nBotService.isEnabled()) {
  console.log('✅ N8N configurado')
} else {
  console.log('⚠️ N8N não configurado, usando fallback')
}

// Estatísticas
const stats = n8nBotService.getStats()
console.log(stats)
// {
//   enabled: true,
//   webhookUrl: '***configured***',
//   timeout: 30000,
//   retries: 2,
//   fallbackEnabled: true
// }

// Testar conexão
const test = await n8nBotService.testConnection()
console.log(test)
// { success: true, latency: 234 }
```

### **Logs do Sistema**
```
🔄 Enviando para N8N (tentativa 1/2)...
✅ Resposta do N8N recebida
📨 Resposta do N8N recebida: { conversationId, intent, aiProvider }
✅ Mensagem enviada ao WhatsApp
💾 Mensagem salva no banco: msg-123
📡 Mensagem enviada via Socket.IO
```

---

## ⚙️ Configurações Avançadas

### **Desabilitar N8N Temporariamente**
```env
# Deixe vazio para desabilitar
N8N_WEBHOOK_URL=
```

### **Aumentar Timeout**
```env
N8N_TIMEOUT=60000  # 60 segundos
```

### **Mais Retries**
```env
N8N_RETRIES=3
```

### **Desabilitar Fallback** (não recomendado)
```env
N8N_FALLBACK_ENABLED=false
```

---

## 🚨 Troubleshooting

### **Problema: N8N não responde**
```
❌ Erro N8N: ECONNREFUSED
```

**Solução:**
1. Verifique se N8N está rodando
2. Verifique URL do webhook
3. Teste: `curl https://seu-n8n.com/webhook/zorahbot`

---

### **Problema: Timeout**
```
❌ Erro N8N: ETIMEDOUT
```

**Solução:**
1. Aumente `N8N_TIMEOUT`
2. Otimize workflow N8N (remova nós desnecessários)
3. Verifique latência de rede

---

### **Problema: Webhook de resposta não funciona**
```
404 Not Found: /webhook/n8n-response
```

**Solução:**
1. Verifique se route está registrada em `app.ts`
2. Verifique se `webhookN8NRoutes` foi importado
3. Reinicie o servidor

---

### **Problema: Fallback não funciona**
```
❌ Fallback também falhou
```

**Solução:**
1. Verifique se `intelligentBotService` está funcionando
2. Verifique logs de erro
3. Considere retornar mensagem genérica ao usuário

---

## 📝 Checklist de Implementação

### **Backend:**
- [x] Criar `api/services/n8nBotService.ts`
- [x] Criar `api/routes/webhook-n8n.ts`
- [ ] Atualizar `api/routes/conversations.ts` (integrar chamada ao n8nBotService)
- [x] Registrar rotas em `api/app.ts`
- [ ] Adicionar variáveis de ambiente
- [ ] Testar conectividade
- [ ] Testar fluxo completo
- [ ] Deploy no Railway

### **N8N:**
- [ ] Importar workflow `WORKFLOW_MULTI_AI.json`
- [ ] Configurar variáveis de ambiente
- [ ] Configurar IA (OpenAI/Claude/Groq)
- [ ] Ativar workflow
- [ ] Testar webhook

### **Monitoramento:**
- [ ] Adicionar logs de processamento
- [ ] Configurar alertas de erro
- [ ] Monitorar latência
- [ ] Monitorar taxa de fallback

---

**Criado em**: 29/12/2025  
**Versão**: 1.0.0  
**Status**: ✅ Pronto para implementação
