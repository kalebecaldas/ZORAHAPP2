# 💬 Sistema de Mensagens Internas e Auto-retorno

## 📊 **ESPECIFICAÇÃO**

### **1. Mensagens Internas do Sistema**

Mensagens que aparecem no chat (estilo WhatsApp) para informar ações:

#### **Tipos de Mensagens:**

1. **AGENT_ASSIGNED** - "João Silva assumiu a conversa"
2. **TRANSFERRED_TO_QUEUE** - "Conversa transferida para fila AGUARDANDO"
3. **TRANSFERRED_TO_AGENT** - "Conversa transferida para Maria Santos"
4. **RETURNED_TO_QUEUE** - "Conversa devolvida para fila AGUARDANDO"
5. **TIMEOUT_INACTIVITY** - "Conversa retornou automaticamente por inatividade (10min)"
6. **CONVERSATION_CLOSED** - "Conversa encerrada por João Silva"
7. **BOT_TO_HUMAN** - "Conversa transferida do bot para atendimento humano"

#### **Formato da Mensagem:**

```typescript
interface SystemMessage {
  id: string;
  conversationId: string;
  type: 'SYSTEM';
  systemMessageType: 'AGENT_ASSIGNED' | 'TRANSFERRED_TO_QUEUE' | 'TRANSFERRED_TO_AGENT' | 'RETURNED_TO_QUEUE' | 'TIMEOUT_INACTIVITY' | 'CONVERSATION_CLOSED' | 'BOT_TO_HUMAN';
  content: string; // Texto da mensagem
  metadata: {
    agentName?: string;
    queueName?: string;
    targetAgentName?: string;
    reason?: string;
  };
  timestamp: Date;
}
```

#### **Estilo Visual:**

```css
/* Mensagem do sistema - centralizada, fundo cinza claro */
.system-message {
  background: #E5E7EB;
  color: #6B7280;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  text-align: center;
  margin: 8px auto;
  max-width: 80%;
}
```

---

### **2. Auto-retorno por Inatividade**

#### **Regras:**

1. **Timer de Inatividade**: 10 minutos sem interação do agente
2. **Condições**:
   - Conversa está em fila de agente específico (não AGUARDANDO)
   - Última mensagem foi do paciente
   - Agente não respondeu em 10 minutos

3. **Ação**:
   - Mover conversa para fila AGUARDANDO
   - Remover assignedToId
   - Criar mensagem interna do tipo TIMEOUT_INACTIVITY
   - Emitir evento Socket.IO

#### **Implementação:**

```typescript
// Background job que roda a cada 1 minuto
async function checkInactiveConversations() {
  const TIMEOUT_MINUTES = 10;
  const timeoutDate = new Date();
  timeoutDate.setMinutes(timeoutDate.getMinutes() - TIMEOUT_MINUTES);

  const inactiveConversations = await prisma.conversation.findMany({
    where: {
      status: 'ATIVA',
      assignedToId: { not: null },
      queue: { not: 'AGUARDANDO' },
      lastTimestamp: { lt: timeoutDate },
      messages: {
        some: {
          sender: 'patient',
          timestamp: { gte: timeoutDate }
        }
      }
    },
    include: {
      assignedTo: true
    }
  });

  for (const conversation of inactiveConversations) {
    // Retornar para fila AGUARDANDO
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        queue: 'AGUARDANDO',
        assignedToId: null
      }
    });

    // Criar mensagem interna
    await createSystemMessage(conversation.id, 'TIMEOUT_INACTIVITY', {
      agentName: conversation.assignedTo?.name,
      reason: `Sem resposta por ${TIMEOUT_MINUTES} minutos`
    });

    // Emitir evento Socket.IO
    io.emit('conversation:timeout', {
      conversationId: conversation.id,
      previousAgent: conversation.assignedTo?.name
    });
  }
}

// Executar a cada 1 minuto
setInterval(checkInactiveConversations, 60000);
```

---

### **3. Transferências em Tempo Real**

#### **Eventos Socket.IO:**

```typescript
// Quando transferir conversa
socket.emit('conversation:transferred', {
  conversationId: string,
  fromQueue: string,
  toQueue: string,
  fromAgent?: string,
  toAgent?: string,
  timestamp: Date
});

// Quando assumir conversa
socket.emit('conversation:assigned', {
  conversationId: string,
  agentId: string,
  agentName: string,
  timestamp: Date
});

// Quando devolver conversa
socket.emit('conversation:returned', {
  conversationId: string,
  agentId: string,
  agentName: string,
  toQueue: string,
  timestamp: Date
});
```

#### **Frontend - Listeners:**

```typescript
// No ConversationsNew.tsx
useEffect(() => {
  if (socket) {
    // Conversa transferida
    socket.on('conversation:transferred', (data) => {
      // Remover da lista atual se for o agente que transferiu
      if (data.fromAgent === user.id) {
        setConversations(prev => prev.filter(c => c.id !== data.conversationId));
      }
      // Adicionar na lista se for o agente que recebeu
      if (data.toAgent === user.id) {
        fetchConversations();
      }
      // Atualizar fila
      fetchQueueCounts();
    });

    // Conversa assumida
    socket.on('conversation:assigned', (data) => {
      if (data.agentId === user.id) {
        fetchConversations();
      }
    });

    // Conversa devolvida
    socket.on('conversation:returned', (data) => {
      if (data.agentId === user.id) {
        setConversations(prev => prev.filter(c => c.id !== data.conversationId));
      }
      fetchQueueCounts();
    });

    // Timeout de inatividade
    socket.on('conversation:timeout', (data) => {
      // Mostrar notificação
      toast.warning(`Conversa retornou para fila por inatividade`);
      setConversations(prev => prev.filter(c => c.id !== data.conversationId));
    });
  }
}, [socket, user]);
```

---

### **4. API Endpoints**

#### **POST /api/conversations/:phone/transfer**

```typescript
{
  "targetQueue": "AGUARDANDO" | "ENCERRADOS",
  "targetAgentId": "user_id" (opcional),
  "reason": "Motivo da transferência" (opcional)
}
```

**Resposta:**
```typescript
{
  "success": true,
  "conversation": { ... },
  "systemMessage": { ... }
}
```

#### **POST /api/conversations/:phone/assign**

```typescript
{
  "agentId": "user_id"
}
```

#### **POST /api/conversations/:phone/return**

```typescript
{
  "toQueue": "AGUARDANDO"
}
```

---

### **5. Schema Prisma - Atualização**

Adicionar campo para mensagens do sistema:

```prisma
model Message {
  id              String   @id @default(cuid())
  conversationId  String
  sender          String   // 'patient', 'agent', 'bot', 'system'
  content         String
  timestamp       DateTime @default(now())
  mediaUrl        String?
  mediaType       String?
  status          String?
  
  // Novo: para mensagens do sistema
  systemMessageType String? // 'AGENT_ASSIGNED', 'TRANSFERRED_TO_QUEUE', etc
  systemMetadata    Json?   // { agentName, queueName, etc }
  
  conversation Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  
  @@index([conversationId])
  @@index([timestamp])
}
```

---

### **6. Componente React - SystemMessage**

```tsx
interface SystemMessageProps {
  type: string;
  content: string;
  metadata: any;
  timestamp: Date;
}

const SystemMessage: React.FC<SystemMessageProps> = ({ type, content, metadata, timestamp }) => {
  const getIcon = () => {
    switch (type) {
      case 'AGENT_ASSIGNED': return <UserPlus className="h-4 w-4" />;
      case 'TRANSFERRED_TO_QUEUE': return <ArrowRight className="h-4 w-4" />;
      case 'TRANSFERRED_TO_AGENT': return <Users className="h-4 w-4" />;
      case 'TIMEOUT_INACTIVITY': return <Clock className="h-4 w-4" />;
      case 'CONVERSATION_CLOSED': return <XCircle className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  return (
    <div className="flex justify-center my-2">
      <div className="system-message flex items-center gap-2">
        {getIcon()}
        <span>{content}</span>
        <span className="text-xs opacity-70">
          {new Date(timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
};
```

---

### **7. Notificações Toast**

```typescript
// Quando receber transferência
toast.info('📨 Nova conversa transferida para você!');

// Quando conversa retornar por timeout
toast.warning('⏰ Conversa retornou para fila por inatividade');

// Quando assumir conversa
toast.success('✅ Conversa assumida com sucesso');
```

---

## 🎯 **PRIORIDADES DE IMPLEMENTAÇÃO**

### **Fase 1: Mensagens Internas** (1-2h)
1. Atualizar schema Prisma
2. Criar função `createSystemMessage()`
3. Criar componente `SystemMessage`
4. Integrar no chat

### **Fase 2: Transferências em Tempo Real** (1-2h)
1. Criar endpoints de transferência
2. Implementar eventos Socket.IO
3. Atualizar frontend com listeners
4. Adicionar notificações toast

### **Fase 3: Auto-retorno por Inatividade** (1h)
1. Criar background job
2. Implementar lógica de timeout
3. Testar com conversas reais

---

## ✅ **CHECKLIST**

- [ ] Schema Prisma atualizado
- [ ] Função createSystemMessage()
- [ ] Componente SystemMessage
- [ ] Endpoints de transferência
- [ ] Socket.IO eventos
- [ ] Frontend listeners
- [ ] Background job de timeout
- [ ] Notificações toast
- [ ] Testes

---

**Quer que eu comece implementando?** 🚀
