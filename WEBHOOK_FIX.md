# 🐛 Problema Identificado: Webhook não dispara

## Causa Raiz

O webhook `first_message` está cadastrado e ativo, mas **nunca foi disparado** porque:

1. ✅ Webhook existe no banco: `whk_6c89d8da1a45719b4ba2a86b17e908200616a6364d0c0c3ba05caf8162fa5103`
2. ✅ Webhook está ativo
3. ✅ Webhook está configurado para evento `first_message`
4. ❌ **MAS**: O código que dispara o webhook só está em **1 de 4 locais** onde conversas são criadas!

## Locais onde conversas são criadas

### 1. Linha ~1200 - Primeira conversa (FALTANDO webhook)
```typescript
conversation = await prisma.conversation.create({
  data: {
    phone,
    status: 'BOT_QUEUE',
    // ...
  }
})
// ❌ SEM webhook aqui!
```

### 2. Linha ~1026 - Conversa via /send (FALTANDO webhook)
```typescript
conversation = await prisma.conversation.create({
  data: {
    phone,
    status: 'EM_ATENDIMENTO',
    // ...
  }
})
// ❌ SEM webhook aqui!
```

### 3. Linha ~1326 - Após conversa fechada expirada (TEM webhook) ✅
```typescript
conversation = await prisma.conversation.create({
  // ...
})

// ✅ TEM webhook aqui!
await WebhookService.trigger('first_message', { ... })
```

### 4. Linha ~1585 - Após sessão expirada (FALTANDO webhook)
```typescript
conversation = await prisma.conversation.create({
  // ...
})
// ❌ SEM webhook aqui!
```

---

## Solução

Adicionar o disparo do webhook `first_message` em **TODOS** os 4 locais onde conversas são criadas.

### Código para adicionar (após cada `conversation.create`):

```typescript
// ✅ Disparar webhook de primeira mensagem
try {
  const { WebhookService } = await import('../services/webhookService.js')
  
  await WebhookService.trigger('first_message', {
    conversationId: conversation.id,
    phone: phone,
    message: text,
    timestamp: now.toISOString(),
    patientId: patient?.id || null,
    patientName: patient?.name || null,
    source: channel || 'whatsapp',
    metadata: {
      isNewConversation: true,
      hasPatient: !!patient
    }
  })
  
  console.log(`📤 Webhook "first_message" disparado para ${phone}`)
} catch (webhookError) {
  console.error('⚠️ Erro ao disparar webhook (não bloqueia fluxo):', webhookError)
}
```

---

## Implementação

Vou adicionar o webhook nos 3 locais faltantes:

1. ✅ Linha ~1218 (após primeira criação)
2. ✅ Linha ~1035 (após criação via /send)  
3. ✅ Linha ~1620 (após sessão expirada)

Quer que eu implemente agora?
