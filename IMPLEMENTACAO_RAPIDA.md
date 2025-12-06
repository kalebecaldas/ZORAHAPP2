# 🚀 Implementação Imediata - Conversas em Tempo Real

## ✅ O QUE FAZER AGORA

### 1. CORRIGIR EVENTOS SOCKET.IO (15 min)

**Arquivo**: `api/routes/conversations.ts`

**Adicionar após salvar mensagem do bot**:
```typescript
// Emitir evento de nova mensagem
realtime.io.emit('message:new', {
  conversationId: conversation.id,
  message: {
    id: newMessage.id,
    text: decision.response,
    from: 'BOT',
    timestamp: new Date()
  }
})

// Emitir evento de conversa atualizada
realtime.io.emit('conversation:updated', {
  conversationId: conversation.id,
  status: conversation.status
})
```

---

### 2. FRONTEND - ESCUTAR EVENTOS (10 min)

**Arquivo**: `src/pages/ConversationsNew.tsx`

**Adicionar listeners**:
```typescript
useEffect(() => {
  // Escutar novas mensagens
  socket.on('message:new', (data) => {
    // Adicionar mensagem ao chat
    setMessages(prev => [...prev, data.message])
  })

  // Escutar atualizações de conversa
  socket.on('conversation:updated', (data) => {
    // Atualizar lista de conversas
    fetchConversations()
  })

  return () => {
    socket.off('message:new')
    socket.off('conversation:updated')
  }
}, [])
```

---

### 3. ADICIONAR BADGE DE MENSAGENS NOVAS (20 min)

**Model no Prisma**:
```prisma
model Conversation {
  // ... campos existentes
  unreadCount Int @default(0)
}
```

**Atualizar ao receber mensagem**:
```typescript
await prisma.conversation.update({
  where: { id: conversationId },
  data: {
    unreadCount: { increment: 1 }
  }
})
```

**Zerar ao abrir conversa**:
```typescript
await prisma.conversation.update({
  where: { id: conversationId },
  data: {
    unreadCount: 0
  }
})
```

---

### 4. UI MINIMALISTA (30 min)

**Cores Neutras**:
```css
/* Substituir cores vibrantes */
.card-conversa {
  background: #FFFFFF;
  border: 1px solid #E5E7EB;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.badge-novas {
  background: #EF4444;
  color: white;
  border-radius: 9999px;
  padding: 2px 8px;
  font-size: 12px;
}
```

---

### 5. SISTEMA DE ATALHOS (1h)

**Migration Prisma**:
```prisma
model QuickReply {
  id        String   @id @default(cuid())
  userId    String
  shortcut  String   // "saudacao"
  text      String   // "Olá, meu nome é..."
  isGlobal  Boolean  @default(false)
  createdAt DateTime @default(now())
  
  user User @relation(fields: [userId], references: [id])
  
  @@unique([userId, shortcut])
}
```

**API Routes**:
- `GET /api/quick-replies` - Listar atalhos
- `POST /api/quick-replies` - Criar atalho
- `DELETE /api/quick-replies/:id` - Deletar atalho

**Frontend - Modal**:
- Botão ⚡ ao lado do input
- Modal para criar/editar
- Autocomplete ao digitar `/`

---

## 📋 ORDEM DE EXECUÇÃO

1. ✅ **PRIMEIRO** (25 min): Corrigir Socket.IO (eventos)
2. ✅ **SEGUNDO** (20 min): Adicionar badge de mensagens
3. ✅ **TERCEIRO** (30 min): UI minimalista
4. ✅ **QUARTO** (1h): Sistema de atalhos

**Total**: ~2 horas

---

## 🎯 QUER QUE EU COMECE?

Posso começar agora mesmo pela **correção do Socket.IO** que é o mais crítico.

Confirma para eu começar? 🚀
