# ✅ CORREÇÃO: Transferência para Fila Principal

## 🐛 Problema Identificado

Quando o N8N detectava intent `AGENDAR` e enviava:
```json
{
  "action": "TRANSFER_TO_QUEUE",
  "requiresQueueTransfer": true,
  "requiresTransfer": true,
  "intent": "AGENDAR"
}
```

A conversa **NÃO era transferida** para a fila principal.

---

## 🔍 Causa Raiz

O webhook N8N (`api/routes/webhook-n8n.ts`) apenas tratava:
```typescript
// ❌ ANTES - Só tratava estes casos:
if (action === 'transfer_human' || intent === 'FALAR_ATENDENTE') {
  // transferir...
}
```

Mas o N8N estava enviando:
- `action: "TRANSFER_TO_QUEUE"` ❌ (não tratado)
- `intent: "AGENDAR"` ❌ (não tratado)
- `requiresQueueTransfer: true` ❌ (não tratado)

---

## ✅ Solução Aplicada

Adicionado suporte para **múltiplos formatos** de transferência:

```typescript
// ✅ DEPOIS - Suporta todos os formatos:
const shouldTransfer = 
  action === 'transfer_human' ||        // Formato antigo
  action === 'TRANSFER_TO_QUEUE' ||     // ✅ Novo formato N8N
  intent === 'FALAR_ATENDENTE' ||       // Intent direto
  intent === 'AGENDAR' ||                // ✅ Intent de agendamento
  (req.body.requiresQueueTransfer === true) ||  // ✅ Flag N8N
  (req.body.requiresTransfer === true)          // ✅ Flag N8N alternativa

if (shouldTransfer) {
  console.log('👤 Transferindo para fila principal...', {
    action,
    intent,
    requiresQueueTransfer: req.body.requiresQueueTransfer,
    requiresTransfer: req.body.requiresTransfer
  })
  
  // Transferir conversa para PRINCIPAL
  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      status: 'PRINCIPAL',
      assignedToId: null,
      awaitingInput: true
    }
  })
  
  // Criar mensagem de sistema
  // Emitir eventos Socket.IO
  // ...
}
```

---

## 📊 Casos Cobertos

Agora a transferência funciona para:

| Caso | Antes | Depois |
|------|-------|--------|
| `action: "transfer_human"` | ✅ | ✅ |
| `action: "TRANSFER_TO_QUEUE"` | ❌ | ✅ |
| `intent: "FALAR_ATENDENTE"` | ✅ | ✅ |
| `intent: "AGENDAR"` | ❌ | ✅ |
| `requiresQueueTransfer: true` | ❌ | ✅ |
| `requiresTransfer: true` | ❌ | ✅ |

---

## 🧪 Teste

### Cenário:
1. Paciente: "queria remarcar minha fisioterapia"
2. Bot: "Qual unidade? 1-Vieiralves 2-São José"
3. Paciente: "1"
4. N8N detecta: `intent: "AGENDAR"`, `action: "TRANSFER_TO_QUEUE"`

### Resultado Esperado:
✅ Conversa transferida para fila PRINCIPAL  
✅ Mensagem de sistema criada  
✅ Socket.IO notifica frontend  
✅ Conversa aparece na aba "Principal" para agentes

---

## 📝 Logs Esperados

```
👤 Transferindo para fila principal... {
  action: 'TRANSFER_TO_QUEUE',
  intent: 'AGENDAR',
  requiresQueueTransfer: true,
  requiresTransfer: true
}
✅ Conversa transferida para fila PRINCIPAL
```

---

## 🚀 Deploy

```bash
✅ git add api/routes/webhook-n8n.ts
✅ git commit -m "Fix: Add support for TRANSFER_TO_QUEUE action from N8N"
✅ git push origin main
```

---

## ✅ Status

**Correção: 100% Completa**

- ✅ Suporte para `TRANSFER_TO_QUEUE`
- ✅ Suporte para `intent: "AGENDAR"`
- ✅ Suporte para `requiresQueueTransfer`
- ✅ Suporte para `requiresTransfer`
- ✅ Logs detalhados
- ✅ Commit e push concluídos

---

**Problema resolvido!** 🎉

Agora todas as conversas com intent `AGENDAR` serão transferidas corretamente para a fila principal.
