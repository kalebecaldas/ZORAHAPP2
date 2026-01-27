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

### 2. Atualização de `lastUserActivity` em Conversas Ativas

#### Backend - `api/routes/conversations.ts`
Modificado o endpoint `mark-read` para atualizar `lastUserActivity`:
```typescript
// ✅ Atualizar unreadCount e lastUserActivity para manter conversa ativa
const updateData: any = { unreadCount: 0 }

// Se a conversa está em atendimento (EM_ATENDIMENTO), atualizar lastUserActivity
// para indicar que o atendente está ativo visualizando a conversa
if (conversation.status === 'EM_ATENDIMENTO' && conversation.assignedToId) {
    updateData.lastUserActivity = new Date()
}

await prisma.conversation.update({
    where: { id: conversation.id },
    data: updateData
})
```

**Como Funciona:**
- Quando o atendente está visualizando uma conversa em atendimento, o frontend envia requisições de `mark-read` periodicamente
- Cada requisição de `mark-read` agora atualiza o `lastUserActivity` da conversa
- O monitor de inatividade verifica `lastUserActivity` para determinar se a conversa está inativa
- Resultado: Conversas sendo atendidas ativamente não voltam mais à fila por inatividade

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
