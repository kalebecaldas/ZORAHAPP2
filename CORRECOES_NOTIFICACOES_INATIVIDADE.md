# Correções: Notificações e Inatividade

## Problemas Identificados

### 1. Notificações de Timeout Sendo Enviadas para Todos os Usuários
**Problema:** Quando uma conversa retornava à fila por inatividade, todos os usuários conectados recebiam notificação, não apenas o atendente que estava responsável pela conversa.

**Causa:** O código estava usando `io.emit()` que faz broadcast para todos os clientes conectados.

### 2. Conversas Retornando à Fila Antes do Tempo
**Problema:** Conversas estavam retornando à fila principal mesmo quando o atendente estava ativo visualizando a conversa.

**Causa:** O campo `lastUserActivity` só era atualizado quando o PACIENTE enviava mensagem, não quando o atendente estava ativo na conversa.

### 3. Frontend Disparando Muitos Eventos de Join/Leave
**Problema:** Os logs mostravam o mesmo socket entrando e saindo de conversas repetidamente.

**Causa:** O `useEffect` estava sendo disparado a toda mudança de estado do objeto `selectedConversation`, mesmo quando o ID não mudava.

## Soluções Implementadas

### 1. Sistema de Notificações Individuais

#### Backend - `api/services/inactivityMonitor.ts`
```typescript
// ✅ Emitir notificação individual para o usuário que perdeu a conversa
if (conversation.assignedToId) {
    io.to(`user_${conversation.assignedToId}`).emit('conversation:timeout', {
        conversationId: conversation.id,
        phone: conversation.phone,
        previousAgent: conversation.assignedTo?.name,
        previousAgentId: conversation.assignedToId
    })
    console.log(`📡 Notificação de timeout enviada apenas para usuário ${conversation.assignedToId}`)
}

// Emitir evento geral de atualização para todos (sem notificação)
io.emit('conversation:updated', {
    conversationId: conversation.id,
    phone: conversation.phone,
    status: 'PRINCIPAL',
    assignedToId: null,
    reason: 'inactivity_timeout'
})
```

#### Backend - `api/realtime.ts`
Adicionado suporte a salas de usuário:
```typescript
socket.on('join_user_room', (userId: string) => {
    socket.join(`user_${userId}`)
    console.log(`Cliente ${socket.id} entrou na sala do usuário ${userId}`)
})

socket.on('leave_user_room', (userId: string) => {
    socket.leave(`user_${userId}`)
    console.log(`Cliente ${socket.id} saiu da sala do usuário ${userId}`)
})
```

#### Frontend - `src/hooks/useSocket.ts`
Cliente entra automaticamente na sua sala ao conectar:
```typescript
socket.on('connect', () => {
    setState(prev => ({ ...prev, isConnected: true, socket }));
    console.log('Socket connected');
    
    // ✅ Entrar na sala do usuário para receber notificações individuais
    if (user?.id) {
        socket.emit('join_user_room', user.id);
        console.log(`🔔 Joined user room: user_${user.id}`);
    }
});
```

#### Frontend - `src/pages/ConversationsNew.tsx`
Melhorada a notificação exibida ao usuário:
```typescript
socket.on('conversation:timeout', (data) => {
    console.log('⏰ [conversation:timeout] Conversa retornou por inatividade:', data);

    // ✅ Se o usuário está visualizando esta conversa, limpar seleção
    if (selectedConversation?.id === data.conversationId) {
        setSelectedConversation(null);
        setMessages([]);
    }

    // Remover conversa da lista atual
    setConversations(prev => prev.filter(c => c.id !== data.conversationId));

    // ✅ Mostrar notificação individual
    toast.warning(`⏰ Sua conversa retornou à fila por inatividade`, {
        description: `Paciente: ${data.phone || 'Desconhecido'} - Sem resposta por tempo prolongado`
    });

    fetchConversations();
});
```

### 2. Sistema de Inatividade Correto (REFEITO)

#### Conceito: Dois Sistemas Independentes

**Sistema de Sessão (24 horas):**
- Controla janela de mensagens do WhatsApp
- Expira 24h após última mensagem do **PACIENTE**
- `lastUserActivity` = timestamp da última mensagem do paciente
- Usado para determinar se pode enviar mensagens template

**Sistema de Inatividade (30 minutos):**
- Controla se **ATENDENTE** está respondendo o paciente
- Se paciente enviou mensagem e atendente não respondeu em 30min → volta à fila
- `lastAgentActivity` = timestamp da última ação do atendente (resposta ou visualização)
- Usado para devolver conversas sem resposta à fila

#### Backend - Novo Campo no Banco de Dados
Adicionado campo `lastAgentActivity` ao modelo `Conversation`:
```sql
ALTER TABLE "Conversation" ADD COLUMN "lastAgentActivity" TIMESTAMP(3);
```

#### Backend - `api/routes/conversations.ts`
Criado endpoint `/heartbeat` para atualizar `lastAgentActivity`:
```typescript
// ✅ Heartbeat para manter conversa ativa (atualiza lastAgentActivity)
router.post('/:phone/heartbeat', listAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const conversation = await prisma.conversation.findFirst({
      where: { phone: req.params.phone },
      orderBy: { createdAt: 'desc' }
    })

    if (!conversation) {
      res.status(404).json({ error: 'Conversa não encontrada' })
      return
    }

    // ✅ Atualizar lastAgentActivity (atendente está visualizando)
    if (conversation.status === 'EM_ATENDIMENTO' && conversation.assignedToId) {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastAgentActivity: new Date() }
      })
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Erro ao fazer heartbeat:', error)
    res.status(500).json({ error: 'Erro interno' })
  }
})
```

**Assumir Conversa (action: 'take'):**
```typescript
case 'take':
  updateData = {
    status: 'EM_ATENDIMENTO',
    lastAgentActivity: now, // ✅ Atendente começou a atender
    assignedToId: assigneeId
  }
  // lastUserActivity NÃO é alterado (mantém data da última msg do paciente)
```

**Enviar Mensagem:**
```typescript
const updatedConversation = await prisma.conversation.update({
  where: { id: conversation.id },
  data: {
    lastMessage: text,
    lastTimestamp: now,
    lastAgentActivity: now // ✅ Atendente enviou resposta
  }
})
```

#### Frontend - `src/pages/ConversationsNew.tsx`
Adicionado heartbeat periódico a cada 30 segundos:
```typescript
// ✅ Heartbeat para manter conversa ativa (atualiza lastUserActivity)
useEffect(() => {
    if (!selectedConversation) return;
    if (selectedConversation.status !== 'EM_ATENDIMENTO') return;

    const sendHeartbeat = async () => {
        try {
            await api.post(`/conversations/${selectedConversation.phone}/heartbeat`);
        } catch (error) {
            // Silenciar erros de heartbeat
        }
    };

    // Chamar heartbeat imediatamente
    sendHeartbeat();

    // Configurar intervalo para chamar a cada 30 segundos
    const heartbeatInterval = setInterval(sendHeartbeat, 30000);

    return () => {
        clearInterval(heartbeatInterval);
    };
}, [selectedConversation?.id, selectedConversation?.status]);
```

#### Backend - `api/services/inactivityMonitor.ts`
Monitor verifica lógica correta:
```typescript
// Lógica: Paciente enviou mensagem e está esperando resposta?
const inactiveConversations = await prisma.conversation.findMany({
  where: {
    status: 'EM_ATENDIMENTO',
    assignedToId: { not: null },
    lastUserActivity: {
      lt: timeoutDate, // Paciente enviou há mais de 30min
      not: null
    }
  }
})

// Filtrar: paciente enviou DEPOIS da última ação do atendente?
const conversationsAwaitingResponse = inactiveConversations.filter(conv => {
  if (!conv.lastAgentActivity) return true // Atendente nunca respondeu
  
  const userActivityTime = new Date(conv.lastUserActivity).getTime()
  const agentActivityTime = new Date(conv.lastAgentActivity).getTime()
  
  return userActivityTime > agentActivityTime // Paciente enviou depois
})

// Para cada conversa: devolver à fila
```

**Como Funciona:**

1. **Paciente envia mensagem** → `lastUserActivity` atualizado
2. **Atendente assume conversa** → `lastAgentActivity` = now (começa atendimento)
3. **Atendente visualiza (heartbeat a cada 30s)** → `lastAgentActivity` atualizado
4. **Atendente envia resposta** → `lastAgentActivity` = now
5. **Monitor verifica:**
   - Se `lastUserActivity` > `lastAgentActivity` (paciente aguardando)
   - E `(now - lastUserActivity)` > 30min
   - Então: devolve à fila

**Resultado:**
- ✅ Conversas onde atendente já respondeu: NÃO voltam à fila
- ✅ Conversas onde atendente está visualizando: NÃO voltam à fila (heartbeat ativo)
- ✅ Conversas onde paciente enviou há 30min sem resposta: VOLTAM à fila
- ✅ Sistema de sessão (24h) permanece independente

### 3. Otimização dos Eventos de Socket

#### Frontend - `src/pages/ConversationsNew.tsx`
```typescript
useEffect(() => {
    if (!socket || !selectedConversation) return;

    // ✅ Armazenar referência da conversa atual para cleanup
    const currentPhone = selectedConversation.phone;
    const currentId = selectedConversation.id;

    socket.emit('join_conversation', currentPhone);
    socket.emit('join_conversation', currentId);

    // ... handlers ...

    return () => {
        // ✅ Usar referências capturadas no momento do efeito
        socket.emit('leave_conversation', currentPhone);
        socket.emit('leave_conversation', currentId);
        // ... cleanup ...
    };
}, [socket, selectedConversation?.id]); // ✅ Depender apenas do ID, não do objeto inteiro
```

#### Frontend - `src/components/MessageList.tsx`
Mesma otimização aplicada:
```typescript
useEffect(() => {
    // ... código ...
    
    const currentConvId = conversationId;
    const conversationPhone = (conversation as any)?.phone || (conversation as any)?.patient?.phone;
    
    socket.emit('join_conversation', currentConvId);
    if (conversationPhone) {
        socket.emit('join_conversation', conversationPhone);
    }

    return () => {
        socket.emit('leave_conversation', currentConvId)
        if (conversationPhone) {
            socket.emit('leave_conversation', conversationPhone)
        }
        // ... cleanup ...
    }
}, [conversationId, socket]); // ✅ Depender apenas dos valores primitivos
```

**Benefícios:**
- Redução drástica de eventos desnecessários de join/leave
- Menos carga no servidor
- Logs mais limpos e fáceis de debugar
- Melhor performance geral da aplicação

## Como Testar

### 1. Testar Notificações Individuais
1. Abra o sistema com dois usuários diferentes em navegadores distintos
2. Usuário 1 assume uma conversa
3. Aguarde o tempo de inatividade configurado (padrão: 20 minutos) sem o paciente responder
4. Verifique que:
   - ✅ Apenas o Usuário 1 recebe a notificação de timeout
   - ✅ Usuário 2 não recebe notificação (mas vê a conversa voltar à fila)
   - ✅ A conversa volta para a fila PRINCIPAL
   - ✅ O Usuário 1 vê a notificação: "Sua conversa retornou à fila por inatividade"

### 2. Testar Atualização de lastUserActivity
1. Usuário assume uma conversa
2. Mantenha a conversa aberta e visualizando (sem enviar mensagens)
3. Verifique nos logs que as requisições `mark-read` estão atualizando `lastUserActivity`
4. Aguarde o tempo de inatividade
5. Verifique que:
   - ✅ A conversa NÃO volta à fila se o atendente está ativo visualizando
   - ✅ A conversa só volta à fila se realmente não houver atividade do paciente E o atendente não estiver visualizando

### 3. Testar Otimização de Eventos Socket
1. Abra o console do navegador
2. Abra diferentes conversas
3. Verifique nos logs que:
   - ✅ `join_conversation` só é emitido quando realmente troca de conversa
   - ✅ `leave_conversation` só é emitido quando sai da conversa anterior
   - ✅ Não há emissões repetidas do mesmo evento

## Arquivos Modificados

### Backend
- `api/services/inactivityMonitor.ts` - Sistema de notificações individuais
- `api/realtime.ts` - Suporte a salas de usuário
- `api/routes/conversations.ts` - Atualização de lastUserActivity no mark-read

### Frontend
- `src/hooks/useSocket.ts` - Cliente entra na sala do usuário ao conectar
- `src/pages/ConversationsNew.tsx` - Otimização de eventos socket e melhor tratamento de notificações
- `src/components/MessageList.tsx` - Otimização de eventos socket

## Configuração

### Ajustar Tempo de Inatividade
O tempo de inatividade pode ser configurado via interface do sistema em:
**Configurações → Sistema → Timeout de Inatividade**

Padrão: 20 minutos

O tempo é salvo em `SystemSettings.inactivityTimeoutMinutes` no banco de dados.

## Notas Técnicas

### Sistema de Salas do Socket.IO
O sistema agora usa dois tipos de salas:

1. **Salas de Conversa** (`conv:${conversationId}`)
   - Todos os clientes visualizando uma conversa específica
   - Usado para mensagens em tempo real

2. **Salas de Usuário** (`user_${userId}`)
   - Apenas o cliente do usuário específico
   - Usado para notificações individuais (timeout, transferências, etc.)

### Fluxo de Inatividade
```
1. Monitor verifica conversas inativas a cada 1 minuto
2. Busca conversas com status EM_ATENDIMENTO
3. Verifica lastUserActivity < (agora - timeout)
4. Se inativa:
   - Atualiza status para PRINCIPAL
   - Remove assignedToId
   - Cria mensagem do sistema
   - Emite notificação INDIVIDUAL para o usuário (via sala user_${userId})
   - Emite evento GERAL de atualização para todos
```

### Prevenção de Inatividade
```
1. Atendente abre conversa
2. Frontend chama mark-read periodicamente
3. Backend atualiza lastUserActivity se status = EM_ATENDIMENTO
4. Monitor vê lastUserActivity recente
5. Conversa NÃO é marcada como inativa
```

## Problemas Encontrados Durante Implementação

### 1. Loop Infinito de Requisições (RESOLVIDO)
**Problema:** Após a primeira implementação, as conversas começaram a "piscar" com milhares de requisições por segundo em loop infinito.

**Causa:** A atualização de `lastUserActivity` no endpoint `mark-read` estava disparando o evento `conversation:updated`, que fazia o frontend atualizar e chamar `mark-read` novamente, criando um loop.

**Solução:** 
1. Revertida a modificação no endpoint `mark-read`
2. Criado endpoint dedicado `/heartbeat` que:
   - Atualiza apenas `lastUserActivity`
   - NÃO emite eventos Socket.IO
   - É chamado a cada 30 segundos em vez de constantemente
3. Resultado: Zero loops, performance mantida, conversas permanecem ativas

### 2. Conversas Assumidas Retornando Imediatamente (RESOLVIDO)
**Problema:** Conversas antigas (dias sem atividade) eram assumidas pelo atendente mas retornavam imediatamente à fila por inatividade, mesmo com o atendente visualizando ativamente.

**Causa:** Quando o atendente assumia uma conversa (action: 'take'), o `lastUserActivity` não era atualizado. Se a conversa estava há dias sem atividade do paciente, o monitor verificava e a marcava como inativa imediatamente.

**Exemplo dos Logs:**
```
⏰ [Monitor] Verificando 1 conversas inativas (timeout: 20min)
  - 5592993516420: 7226min desde última atividade (agente: Kalebe Caldas)
⏰ Encontradas 1 conversas inativas
```
(7226 minutos = mais de 5 dias sem atividade)

**Solução:** 
1. Modificado o action 'take' para atualizar `lastUserActivity` ao assumir a conversa
2. Isso garante que conversas antigas não retornem imediatamente
3. O heartbeat (a cada 30s) mantém a conversa ativa enquanto visualizando
4. Resultado: Atendente pode assumir qualquer conversa sem ela voltar imediatamente

**Código:**
```typescript
case 'take':
  updateData = {
    status: 'EM_ATENDIMENTO',
    lastUserActivity: now, // ✅ Atualiza ao assumir
    assignedToId: assigneeId
  }
```

## Melhorias Futuras (Opcional)

1. **Heartbeat mais Inteligente**
   - Adicionar evento específico de "viewing_conversation" em vez de usar mark-read
   - Enviar apenas quando a aba está ativa (usando Page Visibility API)

2. **Timeout Progressivo**
   - Aviso aos 15 minutos: "Esta conversa está próxima de retornar à fila por inatividade"
   - Permitir atendente clicar para "manter ativa" mais 10 minutos

3. **Métricas de Inatividade**
   - Dashboard mostrando quantas conversas retornaram por timeout
   - Por atendente, por período, etc.

---

**Data da Implementação:** 27 de Janeiro de 2026
**Versão:** 1.0
