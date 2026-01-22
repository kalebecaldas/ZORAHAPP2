# 🎯 Webhooks Consolidados - Envio em Batch ao Encerrar

## Conceito

Ao invés de enviar webhooks em tempo real, **acumular eventos** durante a conversa e **enviar todos de uma vez** ao encerrar.

---

## 📊 Como Funciona

### Durante a Conversa:
```
1. Paciente envia primeira mensagem
   → Salvar evento "first_message" no contexto
   
2. Conversa é criada
   → Salvar evento "conversation_started" no contexto
   
3. Agente assume conversa
   → Salvar evento "agent_assigned" no contexto
   
4. Conversa é encerrada
   → Enviar TODOS os eventos de uma vez
```

---

## 🔧 Implementação

### 1. Estrutura de Dados

Adicionar campo `webhookEvents` no `workflowContext` da conversa:

```typescript
workflowContext: {
  webhookEvents: [
    {
      type: 'first_message',
      timestamp: '2026-01-21T10:00:00Z',
      data: {
        message: 'Olá',
        phone: '5585999887766'
      }
    },
    {
      type: 'conversation_started',
      timestamp: '2026-01-21T10:00:01Z',
      data: {
        channel: 'whatsapp',
        workflowId: 'workflow-123'
      }
    },
    {
      type: 'agent_assigned',
      timestamp: '2026-01-21T10:01:00Z',
      data: {
        agentId: 'agent-123',
        agentName: 'João Silva'
      }
    }
  ]
}
```

---

### 2. Função Helper para Adicionar Eventos

```typescript
// api/utils/webhookEvents.ts

export async function addWebhookEvent(
  conversationId: string,
  eventType: string,
  eventData: any
) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId }
  })
  
  if (!conversation) return
  
  const context = conversation.workflowContext as any || {}
  const events = context.webhookEvents || []
  
  events.push({
    type: eventType,
    timestamp: new Date().toISOString(),
    data: eventData
  })
  
  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      workflowContext: {
        ...context,
        webhookEvents: events
      }
    }
  })
  
  console.log(`📝 Evento "${eventType}" adicionado à conversa ${conversationId}`)
}
```

---

### 3. Adicionar Eventos Durante a Conversa

#### A) First Message
```typescript
// api/routes/conversations.ts - linha ~1218
await addWebhookEvent(conversation.id, 'first_message', {
  phone: phone,
  message: text,
  channel: channel,
  patientId: patient?.id || null,
  patientName: patient?.name || null
})
```

#### B) Conversation Started
```typescript
// api/routes/conversations.ts - linha ~1234
await addWebhookEvent(conversation.id, 'conversation_started', {
  phone: phone,
  channel: channel,
  workflowId: defaultWorkflowId,
  sessionExpiryTime: sessionExpiryTime.toISOString()
})
```

#### C) Agent Assigned
```typescript
// api/routes/conversations.ts - linha ~834
await addWebhookEvent(conversation.id, 'agent_assigned', {
  agentId: req.user.id,
  agentName: req.user.name,
  agentEmail: req.user.email,
  previousStatus: conversation.status
})
```

---

### 4. Enviar Todos os Eventos ao Encerrar

```typescript
// api/routes/conversations.ts - após linha 820

// ✅ Disparar TODOS os webhooks acumulados
try {
  const { WebhookService } = await import('../services/webhookService.js')
  
  // Buscar eventos acumulados
  const context = conversation.workflowContext as any || {}
  const events = context.webhookEvents || []
  
  // Buscar métricas finais
  const messageCount = await prisma.message.count({
    where: { conversationId: conversation.id }
  })
  
  const duration = conversation.sessionStartTime 
    ? Date.now() - new Date(conversation.sessionStartTime).getTime()
    : null
  
  // Payload consolidado com TODOS os eventos
  const consolidatedPayload = {
    conversationId: conversation.id,
    phone: conversation.phone,
    category: req.body.category || 'OUTROS',
    closedBy: {
      id: req.user?.id || 'system',
      name: req.user?.name || 'Sistema',
      email: req.user?.email || null
    },
    patientId: conversation.patientId,
    patientName: conversation.patient?.name || null,
    
    // ✅ Eventos acumulados durante a conversa
    events: events,
    
    // ✅ Métricas finais
    metrics: {
      duration,
      messageCount,
      sessionExpired: isSessionExpired,
      channel: conversation.channel || 'whatsapp',
      totalEvents: events.length
    },
    
    timestamp: new Date().toISOString()
  }
  
  // Disparar webhook único com tudo
  await WebhookService.trigger('conversation_closed', consolidatedPayload)
  
  console.log(`📤 Webhook consolidado disparado com ${events.length} eventos`)
} catch (webhookError) {
  console.error('⚠️ Erro ao disparar webhook:', webhookError)
}
```

---

## 📦 Payload Final

```json
{
  "event": "conversation_closed",
  "timestamp": "2026-01-21T10:05:00Z",
  "data": {
    "conversationId": "conv-123",
    "phone": "5585999887766",
    "category": "AGENDAMENTO",
    
    "closedBy": {
      "id": "user-123",
      "name": "João Agente",
      "email": "joao@email.com"
    },
    
    "patientId": "patient-123",
    "patientName": "Maria Silva",
    
    "events": [
      {
        "type": "first_message",
        "timestamp": "2026-01-21T10:00:00Z",
        "data": {
          "message": "Olá, quero agendar",
          "phone": "5585999887766",
          "channel": "whatsapp"
        }
      },
      {
        "type": "conversation_started",
        "timestamp": "2026-01-21T10:00:01Z",
        "data": {
          "channel": "whatsapp",
          "workflowId": "workflow-123"
        }
      },
      {
        "type": "agent_assigned",
        "timestamp": "2026-01-21T10:01:00Z",
        "data": {
          "agentId": "user-123",
          "agentName": "João Agente"
        }
      }
    ],
    
    "metrics": {
      "duration": 300000,
      "messageCount": 20,
      "sessionExpired": false,
      "channel": "whatsapp",
      "totalEvents": 3
    }
  }
}
```

---

## ✅ Vantagens

1. **Performance** ⚡
   - 1 webhook por conversa (não importa quantos eventos)
   - Menos requisições HTTP

2. **Dados Completos** 📊
   - Timeline completa da conversa
   - Todos os eventos em ordem cronológica
   - Métricas finais consolidadas

3. **Flexibilidade** 🎨
   - Webhook pode processar eventos que precisa
   - Ignora eventos que não precisa
   - Fácil adicionar novos tipos de eventos

4. **Confiabilidade** 🛡️
   - Se webhook falhar, não perde eventos
   - Eventos ficam salvos no banco
   - Pode reenviar depois

---

## 🚀 Implementação

Quer que eu implemente isso? Vou:

1. ✅ Criar função `addWebhookEvent`
2. ✅ Adicionar eventos em 3 locais:
   - First message
   - Conversation started
   - Agent assigned
3. ✅ Modificar `conversation_closed` para enviar tudo junto
4. ✅ Testar com webhook.site

Posso começar?
