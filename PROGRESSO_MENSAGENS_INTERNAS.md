# ✅ Sistema de Mensagens Internas - PROGRESSO

## 📊 **STATUS ATUAL**

### ✅ **CONCLUÍDO:**

1. **Schema Prisma Atualizado**
   - ✅ Modelo `SystemSettings` criado
     - `inactivityTimeoutMinutes` (padrão: 10)
     - `closingMessage` (mensagem de encerramento)
     - `autoAssignEnabled`
     - `maxConversationsPerAgent`
   
   - ✅ Modelo `Message` atualizado
     - `systemMessageType` (tipo da mensagem do sistema)
     - `systemMetadata` (metadados JSON)
     - `messageType` agora inclui "SYSTEM"

2. **Database**
   - ✅ Schema sincronizado com `prisma db push`
   - ✅ Prisma Client regenerado

---

## 🚧 **PRÓXIMOS PASSOS**

### **Fase 1: API de Configurações** (30min)

#### **1.1 Criar rota GET /api/settings/system**
```typescript
// Retorna configurações do sistema
{
  inactivityTimeoutMinutes: 10,
  closingMessage: "Obrigado pelo contato!...",
  autoAssignEnabled: true,
  maxConversationsPerAgent: 5
}
```

#### **1.2 Criar rota PUT /api/settings/system**
```typescript
// Atualiza configurações
{
  inactivityTimeoutMinutes?: number,
  closingMessage?: string,
  autoAssignEnabled?: boolean,
  maxConversationsPerAgent?: number
}
```

#### **1.3 Seed inicial**
```typescript
// Criar registro padrão se não existir
await prisma.systemSettings.upsert({
  where: { id: 'default' },
  update: {},
  create: {
    id: 'default',
    inactivityTimeoutMinutes: 10,
    closingMessage: "Obrigado pelo contato! Estamos à disposição. 😊"
  }
});
```

---

### **Fase 2: Função de Mensagens do Sistema** (20min)

#### **2.1 Criar utils/systemMessages.ts**
```typescript
export async function createSystemMessage(
  conversationId: string,
  type: 'AGENT_ASSIGNED' | 'TRANSFERRED_TO_QUEUE' | 'TRANSFERRED_TO_AGENT' | 
        'RETURNED_TO_QUEUE' | 'TIMEOUT_INACTIVITY' | 'CONVERSATION_CLOSED' | 'BOT_TO_HUMAN',
  metadata: {
    agentName?: string;
    queueName?: string;
    targetAgentName?: string;
    reason?: string;
  }
): Promise<Message> {
  const messageText = getSystemMessageText(type, metadata);
  
  return await prisma.message.create({
    data: {
      conversationId,
      phoneNumber: 'system',
      messageText,
      messageType: 'SYSTEM',
      direction: 'system',
      from: 'system',
      systemMessageType: type,
      systemMetadata: metadata
    }
  });
}

function getSystemMessageText(type: string, metadata: any): string {
  switch (type) {
    case 'AGENT_ASSIGNED':
      return `${metadata.agentName} assumiu a conversa`;
    case 'TRANSFERRED_TO_QUEUE':
      return `Conversa transferida para fila ${metadata.queueName}`;
    case 'TRANSFERRED_TO_AGENT':
      return `Conversa transferida para ${metadata.targetAgentName}`;
    case 'RETURNED_TO_QUEUE':
      return `Conversa devolvida para fila ${metadata.queueName}`;
    case 'TIMEOUT_INACTIVITY':
      return `Conversa retornou automaticamente por inatividade (${metadata.reason})`;
    case 'CONVERSATION_CLOSED':
      return `Conversa encerrada por ${metadata.agentName}`;
    case 'BOT_TO_HUMAN':
      return `Conversa transferida do bot para atendimento humano`;
    default:
      return 'Ação do sistema';
  }
}
```

---

### **Fase 3: Background Job de Timeout** (30min)

#### **3.1 Criar services/inactivityMonitor.ts**
```typescript
import { io } from '../realtime.js';
import { createSystemMessage } from '../utils/systemMessages.js';

let timeoutCheckInterval: NodeJS.Timeout | null = null;

export async function startInactivityMonitor() {
  // Buscar configuração
  const settings = await prisma.systemSettings.findFirst();
  const timeoutMinutes = settings?.inactivityTimeoutMinutes || 10;
  
  // Rodar a cada 1 minuto
  timeoutCheckInterval = setInterval(async () => {
    await checkInactiveConversations(timeoutMinutes);
  }, 60000); // 1 minuto
  
  console.log(`✅ Monitor de inatividade iniciado (timeout: ${timeoutMinutes}min)`);
}

export function stopInactivityMonitor() {
  if (timeoutCheckInterval) {
    clearInterval(timeoutCheckInterval);
    timeoutCheckInterval = null;
    console.log('🛑 Monitor de inatividade parado');
  }
}

async function checkInactiveConversations(timeoutMinutes: number) {
  const timeoutDate = new Date();
  timeoutDate.setMinutes(timeoutDate.getMinutes() - timeoutMinutes);

  const inactiveConversations = await prisma.conversation.findMany({
    where: {
      status: { not: 'FECHADA' },
      assignedToId: { not: null },
      queue: { notIn: ['AGUARDANDO', 'ENCERRADOS'] },
      lastTimestamp: { lt: timeoutDate }
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

    // Criar mensagem do sistema
    await createSystemMessage(conversation.id, 'TIMEOUT_INACTIVITY', {
      agentName: conversation.assignedTo?.name,
      reason: `Sem resposta por ${timeoutMinutes} minutos`
    });

    // Emitir evento Socket.IO
    io.emit('conversation:timeout', {
      conversationId: conversation.id,
      phone: conversation.phone,
      previousAgent: conversation.assignedTo?.name
    });

    console.log(`⏰ Conversa ${conversation.phone} retornou por inatividade`);
  }
}
```

#### **3.2 Iniciar no server.ts**
```typescript
import { startInactivityMonitor } from './services/inactivityMonitor.js';

// Após inicializar o servidor
startInactivityMonitor();
```

---

### **Fase 4: Endpoint de Encerramento com Mensagem** (20min)

#### **4.1 Atualizar POST /api/conversations/:phone/close**
```typescript
router.post('/:phone/close', authMiddleware, async (req, res) => {
  const { phone } = req.params;
  const userId = req.user?.id;
  
  // Buscar configuração
  const settings = await prisma.systemSettings.findFirst();
  const closingMessage = settings?.closingMessage || 
    "Obrigado pelo contato! Estamos à disposição. 😊";
  
  // Atualizar conversa
  const conversation = await prisma.conversation.update({
    where: { phone },
    data: {
      status: 'FECHADA',
      queue: 'ENCERRADOS'
    },
    include: { assignedTo: true }
  });
  
  // Criar mensagem do sistema
  await createSystemMessage(conversation.id, 'CONVERSATION_CLOSED', {
    agentName: conversation.assignedTo?.name || req.user?.name
  });
  
  // Enviar mensagem de encerramento para o paciente
  await sendWhatsAppMessage(phone, closingMessage);
  
  // Emitir evento
  io.emit('conversation:closed', {
    conversationId: conversation.id,
    phone
  });
  
  res.json({ success: true, conversation });
});
```

---

### **Fase 5: Frontend - Página de Configurações** (40min)

#### **5.1 Criar componente SystemSettingsTab**
```tsx
const SystemSettingsTab = () => {
  const [settings, setSettings] = useState({
    inactivityTimeoutMinutes: 10,
    closingMessage: '',
    autoAssignEnabled: true,
    maxConversationsPerAgent: 5
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const res = await api.get('/api/settings/system');
    setSettings(res.data);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.put('/api/settings/system', settings);
      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar configurações');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold">Timeout de Inatividade</h3>
        </div>
        <div className="card-body">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tempo limite sem resposta do agente (minutos)
          </label>
          <input
            type="number"
            min="1"
            max="60"
            value={settings.inactivityTimeoutMinutes}
            onChange={(e) => setSettings({
              ...settings,
              inactivityTimeoutMinutes: parseInt(e.target.value)
            })}
            className="border border-gray-300 rounded-lg px-4 py-2 w-32"
          />
          <p className="text-sm text-gray-500 mt-2">
            Após este tempo sem resposta, a conversa retorna automaticamente para a fila AGUARDANDO
          </p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold">Mensagem de Encerramento</h3>
        </div>
        <div className="card-body">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Mensagem enviada ao paciente quando a conversa é encerrada
          </label>
          <textarea
            value={settings.closingMessage}
            onChange={(e) => setSettings({
              ...settings,
              closingMessage: e.target.value
            })}
            rows={4}
            className="w-full border border-gray-300 rounded-lg px-4 py-2"
            placeholder="Obrigado pelo contato! Estamos à disposição. 😊"
          />
          <p className="text-sm text-gray-500 mt-2">
            Esta mensagem será enviada automaticamente ao paciente quando o atendente encerrar a conversa
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={loading}
          className="btn btn-primary"
        >
          {loading ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </div>
    </div>
  );
};
```

#### **5.2 Adicionar tab em Settings.tsx**
```tsx
<Tab label="Sistema" value="system">
  <SystemSettingsTab />
</Tab>
```

---

### **Fase 6: Frontend - Componente SystemMessage** (20min)

```tsx
interface SystemMessageProps {
  type: string;
  content: string;
  metadata: any;
  timestamp: Date;
}

const SystemMessage: React.FC<SystemMessageProps> = ({ 
  type, 
  content, 
  metadata, 
  timestamp 
}) => {
  const getIcon = () => {
    switch (type) {
      case 'AGENT_ASSIGNED': return <UserPlus className="h-3 w-3" />;
      case 'TRANSFERRED_TO_QUEUE': return <ArrowRight className="h-3 w-3" />;
      case 'TRANSFERRED_TO_AGENT': return <Users className="h-3 w-3" />;
      case 'TIMEOUT_INACTIVITY': return <Clock className="h-3 w-3" />;
      case 'CONVERSATION_CLOSED': return <XCircle className="h-3 w-3" />;
      default: return <Info className="h-3 w-3" />;
    }
  };

  return (
    <div className="flex justify-center my-2">
      <div className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-sm flex items-center gap-2 max-w-md">
        {getIcon()}
        <span>{content}</span>
        <span className="text-xs opacity-70">
          {new Date(timestamp).toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </span>
      </div>
    </div>
  );
};
```

---

## 📝 **CHECKLIST COMPLETO**

### **Backend:**
- [x] Schema Prisma atualizado
- [x] Database sincronizado
- [ ] API GET /api/settings/system
- [ ] API PUT /api/settings/system
- [ ] Seed de configurações padrão
- [ ] Função createSystemMessage()
- [ ] Background job de timeout
- [ ] Endpoint de encerramento atualizado
- [ ] Socket.IO eventos

### **Frontend:**
- [ ] Componente SystemMessage
- [ ] Tab de configurações do sistema
- [ ] Input de timeout
- [ ] Textarea de mensagem de encerramento
- [ ] Integração com API
- [ ] Renderizar mensagens do sistema no chat

---

**Quer que eu continue implementando as próximas fases?** 🚀
