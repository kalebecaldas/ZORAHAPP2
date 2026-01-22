# 🔧 Ajuste de Webhooks - Integração Unificada

## Objetivo
Ajustar o sistema de webhooks para funcionar corretamente com **ambos** os bots:
- ✅ Bot N8N (externo)
- ✅ Bot Interno (Gemini)

Independente de onde a mensagem esteja sendo processada, os webhooks devem disparar corretamente.

---

## 📊 Webhooks Disponíveis (da imagem)

1. ✅ **Nova mensagem recebida** - Quando paciente envia mensagem
2. ✅ **Conversa iniciada** - Nova conversa criada
3. ⚠️ **Agente assumiu** - Agente entra na conversa
4. ⚠️ **Conversa finalizada** - Atendimento encerrado

---

## 🔍 Análise Atual

### Onde os webhooks são disparados:

#### 1. **Nova mensagem recebida** (`first_message`)
**Localização:** `api/routes/conversations.ts` linha ~1348-1369

```typescript
// ✅ JÁ IMPLEMENTADO
await WebhookService.trigger('first_message', {
  conversationId: conversation.id,
  phone: phone,
  message: text,
  timestamp: now.toISOString(),
  patientId: patient?.id || null,
  patientName: patient?.name || null,
  source: channel,
  metadata: {
    isNewConversation: true,
    hasPatient: !!patient
  }
})
```

**Status:** ✅ Funciona para ambos os bots

---

#### 2. **Conversa iniciada** (`conversation_started`)
**Localização:** Precisa ser adicionado

**Status:** ⚠️ Faltando - Precisa implementar

---

#### 3. **Agente assumiu** (`agent_assigned`)
**Localização:** `api/routes/conversations.ts` linha ~829-834

```typescript
// ✅ JÁ CRIA MENSAGEM DO SISTEMA
await createSystemMessage(conversation.id, 'AGENT_ASSIGNED', {
  agentName: currentAgentName
})
```

**Status:** ⚠️ Cria mensagem do sistema mas NÃO dispara webhook

---

#### 4. **Conversa finalizada** (`conversation_closed`)
**Localização:** `api/routes/conversations.ts` linha ~861-864

```typescript
// ✅ JÁ CRIA MENSAGEM DO SISTEMA
await createSystemMessage(conversation.id, 'CONVERSATION_CLOSED', {
  agentName: currentAgentName
})
```

**Status:** ⚠️ Cria mensagem do sistema mas NÃO dispara webhook

---

## 🛠️ Implementação Necessária

### 1. Adicionar webhook `conversation_started`

**Onde:** `api/routes/conversations.ts` após criar nova conversa

```typescript
// Após criar conversa (linhas ~1200-1234, ~1326-1395, ~1585-1620)
try {
  const { WebhookService } = await import('../services/webhookService.js')
  
  await WebhookService.trigger('conversation_started', {
    conversationId: conversation.id,
    phone: phone,
    timestamp: now.toISOString(),
    patientId: patient?.id || null,
    patientName: patient?.name || null,
    source: channel,
    status: conversation.status,
    metadata: {
      sessionExpiryTime: sessionExpiryTime.toISOString(),
      workflowId: defaultWorkflowId
    }
  })
  
  console.log(`📤 Webhook "conversation_started" disparado para ${phone}`)
} catch (webhookError) {
  console.error('⚠️ Erro ao disparar webhook (não bloqueia fluxo):', webhookError)
}
```

---

### 2. Adicionar webhook `agent_assigned`

**Onde:** `api/routes/conversations.ts` após assumir conversa (action 'take')

```typescript
// Após linha 834 (depois de createSystemMessage)
try {
  const { WebhookService } = await import('../services/webhookService.js')
  
  await WebhookService.trigger('agent_assigned', {
    conversationId: conversation.id,
    phone: conversation.phone,
    timestamp: new Date().toISOString(),
    agentId: req.user.id,
    agentName: req.user.name,
    agentEmail: req.user.email,
    patientId: conversation.patientId,
    metadata: {
      previousStatus: conversation.status,
      newStatus: 'EM_ATENDIMENTO'
    }
  })
  
  console.log(`📤 Webhook "agent_assigned" disparado para conversa ${conversation.id}`)
} catch (webhookError) {
  console.error('⚠️ Erro ao disparar webhook:', webhookError)
}
```

---

### 3. Adicionar webhook `conversation_closed`

**Onde:** `api/routes/conversations.ts` após fechar conversa (action 'close')

```typescript
// Após linha 864 (depois de createSystemMessage)
try {
  const { WebhookService } = await import('../services/webhookService.js')
  
  await WebhookService.trigger('conversation_closed', {
    conversationId: conversation.id,
    phone: conversation.phone,
    timestamp: new Date().toISOString(),
    closedBy: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email
    },
    patientId: conversation.patientId,
    metadata: {
      duration: conversation.sessionStartTime 
        ? Date.now() - new Date(conversation.sessionStartTime).getTime()
        : null,
      messageCount: await prisma.message.count({
        where: { conversationId: conversation.id }
      })
    }
  })
  
  console.log(`📤 Webhook "conversation_closed" disparado para conversa ${conversation.id}`)
} catch (webhookError) {
  console.error('⚠️ Erro ao disparar webhook:', webhookError)
}
```

---

## 📝 Checklist de Implementação

### Webhook: `conversation_started`
- [ ] Adicionar após criar nova conversa (3 locais)
  - [ ] Linha ~1234 (primeira criação)
  - [ ] Linha ~1395 (após conversa fechada expirada)
  - [ ] Linha ~1620 (após sessão expirada)

### Webhook: `agent_assigned`
- [ ] Adicionar após action 'take' (linha ~834)

### Webhook: `conversation_closed`
- [ ] Adicionar após action 'close' (linha ~864)

### Webhook: `first_message`
- [x] Já implementado ✅

---

## 🧪 Como Testar

### 1. Verificar webhooks cadastrados
```bash
GET /api/webhooks
Authorization: Bearer {token}
```

### 2. Criar webhook de teste
```bash
POST /api/webhooks
{
  "url": "https://webhook.site/seu-id",
  "events": [
    "conversation_started",
    "first_message",
    "agent_assigned",
    "conversation_closed"
  ],
  "active": true
}
```

### 3. Testar cada evento

**Conversa iniciada:**
- Enviar mensagem via WhatsApp
- Verificar se webhook `conversation_started` foi disparado

**Agente assumiu:**
- Assumir conversa no frontend
- Verificar se webhook `agent_assigned` foi disparado

**Conversa finalizada:**
- Fechar conversa no frontend
- Verificar se webhook `conversation_closed` foi disparado

---

## 🔄 Fluxo Completo

```
1. Paciente envia mensagem
   ↓
2. Webhook: first_message ✅
   ↓
3. Sistema cria conversa
   ↓
4. Webhook: conversation_started (NOVO)
   ↓
5. Bot processa (N8N ou Interno)
   ↓
6. Agente assume conversa
   ↓
7. Webhook: agent_assigned (NOVO)
   ↓
8. Atendimento acontece
   ↓
9. Agente fecha conversa
   ↓
10. Webhook: conversation_closed (NOVO)
```

---

## 💡 Benefícios

✅ **Webhooks funcionam independente do bot** (N8N ou Interno)  
✅ **Rastreamento completo** do ciclo de vida da conversa  
✅ **Integrações externas** podem reagir a cada evento  
✅ **Auditoria** completa de todas as ações

---

## 🚀 Próximos Passos

1. Implementar os 3 webhooks faltantes
2. Testar cada um individualmente
3. Verificar logs no webhook.site
4. Documentar payloads de cada evento
5. Criar exemplos de uso

Quer que eu implemente esses webhooks agora?
