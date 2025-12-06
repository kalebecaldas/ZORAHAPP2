# 🔄 ESTRATÉGIA DE MIGRAÇÃO - ConversationsNew.tsx

## ✅ **BACKUP CRIADO:**
`src/pages/ConversationsNew.tsx.backup` - Arquivo original salvo!

---

## 🎯 **ESTRATÉGIA:**

**NÃO vamos reescrever tudo de uma vez!**

Vamos fazer **migração incremental** para não quebrar nada:

### **FASE 1: Adicionar imports dos novos componentes** ✅
### **FASE 2: Usar hooks gradualmente** ✅
### **FASE 3: Substituir seções do JSX** ✅
### **FASE 4: Remover código antigo** ✅

---

## 📋 **PLANO DETALHADO:**

### **PASSO 1: Adicionar imports (SEGURO)**

No topo do arquivo, adicione:

```tsx
// Novos hooks
import { useConversations } from '../hooks/conversations/useConversations';
import { useMessages } from '../hooks/conversations/useMessages';
import { useAudioRecorder } from '../hooks/conversations/useAudioRecorder';

// Novos componentes
import { ConversationHeader } from '../components/conversations/ConversationHeader';
import { QueueTabs } from '../components/conversations/QueueTabs';
```

**Teste:** Arquivo deve compilar sem erros.

---

### **PASSO 2: Usar hook useConversations (GRADUAL)**

Encontre esta linha (~63):
```tsx
const [conversations, setConversations] = useState<Conversation[]>([]);
```

**Substitua por:**
```tsx
// Hook de conversas
const conversationsHook = useConversations();
const {
    conversations,
    setConversations,
    fetchConversations,
    handleAssume,
    handleReopen,
    handleTransfer,
    handleClose
} = conversationsHook;
```

**Remova** as funções antigas:
- `fetchConversations` (linha ~161)
- `handleAssume` (linha ~336)
- `handleReopen` (linha ~413)

**Teste:** Conversas devem carregar normalmente.

---

### **PASSO 3: Usar hook useMessages (GRADUAL)**

Encontre:
```tsx
const [messages, setMessages] = useState<Message[]>([]);
```

**Substitua por:**
```tsx
// Hook de mensagens
const messagesHook = useMessages(selectedConversation?.id || '');
const {
    messages,
    setMessages,
    fetchMessages,
    sendMessage: sendMessageHook,
    addMessage
} = messagesHook;
```

**Mantenha** a função `sendMessage` antiga por enquanto, mas use o hook internamente.

**Teste:** Mensagens devem carregar e enviar normalmente.

---

### **PASSO 4: Substituir Header (VISUAL)**

Encontre esta seção (~1146-1315):
```tsx
{/* Chat Header */}
<div className="bg-white border-b border-gray-200 px-6 py-4">
    ...
</div>
```

**Substitua por:**
```tsx
{/* Chat Header - NOVO */}
<ConversationHeader 
    conversation={selectedConversation} 
    sessionInfo={sessionInfo}
/>
```

**Teste:** Header deve aparecer com o novo design!

---

### **PASSO 5: Substituir Tabs (VISUAL)**

Encontre (~962-995):
```tsx
{/* Queue Tabs */}
<div className="px-3 py-2 border-b border-gray-200">
    ...
</div>
```

**Substitua por:**
```tsx
{/* Queue Tabs - NOVO */}
<QueueTabs
    activeQueue={activeQueue}
    onQueueChange={setActiveQueue}
    counts={{
        BOT_QUEUE: getQueueCount('BOT_QUEUE'),
        PRINCIPAL: getQueueCount('PRINCIPAL'),
        EM_ATENDIMENTO: getQueueCount('EM_ATENDIMENTO'),
        MINHAS_CONVERSAS: getQueueCount('MINHAS_CONVERSAS'),
        ENCERRADOS: closedTotal
    }}
/>
```

**Teste:** Tabs devem funcionar normalmente!

---

## ⚠️ **IMPORTANTE:**

### **NÃO FAÇA TUDO DE UMA VEZ!**

Faça **1 passo por vez** e teste:

1. ✅ Adicionar imports → Testar
2. ✅ Usar hook de conversas → Testar
3. ✅ Usar hook de mensagens → Testar
4. ✅ Substituir header → Testar
5. ✅ Substituir tabs → Testar

---

## 🔧 **SE ALGO QUEBRAR:**

```bash
# Restaurar backup
cp src/pages/ConversationsNew.tsx.backup src/pages/ConversationsNew.tsx
```

---

## 📊 **RESULTADO ESPERADO:**

### **Antes:**
- 1898 linhas
- Tudo em 1 arquivo
- Difícil de manter

### **Depois:**
- ~400-500 linhas (orquestração)
- Lógica nos hooks
- UI nos componentes
- Fácil de manter!

---

## 🚀 **COMEÇAR AGORA?**

**Opção 1:** Eu faço PASSO 1 e 2 para você (imports + hooks)
**Opção 2:** Você faz manualmente seguindo este guia
**Opção 3:** Deixar para depois (já temos os componentes prontos)

**Qual prefere?**
