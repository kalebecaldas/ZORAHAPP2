# Correção: Race Condition Bot/Atendente

## Problema Identificado

Conversas voltando para fila anterior após atendente assumir, causado por dois problemas principais:

### 1. Monitor de Inatividade Retornando Conversa Imediatamente

**Causa:** Ao assumir uma conversa, o campo `lastUserActivity` não era atualizado. O monitor de inatividade verificava esse campo e, se a última mensagem do paciente foi há mais de X minutos (10-20min configurável), retornava a conversa para PRINCIPAL imediatamente após assumir.

**Cenário:**
1. Paciente envia mensagem às 10:00
2. Bot responde e conversa fica em BOT_QUEUE
3. Às 10:15 (15 min depois), atendente assume
4. `lastUserActivity` ainda é 10:00
5. Monitor verifica às 10:16 e vê que já passaram 16min desde lastUserActivity
6. Conversa é retornada para PRINCIPAL

### 2. Race Condition entre Bot (N8N) e Atendente

**Causa:** Quando bot (N8N) está processando uma mensagem e atendente assume a conversa simultaneamente, o bot pode sobrescrever o status ou transferir a conversa de volta para PRINCIPAL.

**Cenários:**
1. **Bot respondendo após assumir:**
   - Paciente envia mensagem → dispara N8N assíncrono
   - Atendente assume (status ← EM_ATENDIMENTO)
   - N8N responde e pode alterar status de volta

2. **Bot transferindo após assumir:**
   - Bot decide transferir para PRINCIPAL (ex: intent FALAR_ATENDENTE)
   - Mas atendente já assumiu
   - Bot transfere de volta para PRINCIPAL

## Correções Aplicadas

### ✅ 1. Resetar Timer ao Assumir Conversa

**Arquivo:** `api/routes/conversations.ts`  
**Linha:** ~663-670

```typescript
case 'take':
  if (conversation.assignedToId && conversation.assignedToId !== assigneeId) {
    res.status(409).json({ error: 'Conversa já está atribuída a outro atendente. Use Solicitar conversa.' })
    return
  }
  // ✅ Atualizar lastUserActivity para evitar que o monitor de inatividade
  // retorne a conversa imediatamente após assumir
  const now = new Date()
  updateData = {
    status: 'EM_ATENDIMENTO',
    assignedToId: assigneeId,
    lastUserActivity: now // ✅ Resetar timer de inatividade ao assumir
  }
```

**Benefício:** Garante que atendente tenha o tempo completo do timeout (10-20min) para responder.

---

### ✅ 2. N8N Não Responde se Conversa Já Foi Assumida

**Arquivo:** `api/routes/webhook-n8n.ts`  
**Linha:** ~73-84

```typescript
// ✅ VERIFICAR SE CONVERSA JÁ FOI ASSUMIDA POR ATENDENTE
// Se conversa está EM_ATENDIMENTO, ignorar resposta do bot para evitar conflitos
if (conversation.status === 'EM_ATENDIMENTO' && conversation.assignedToId) {
  console.log(`⚠️ Conversa ${conversationId} já está EM_ATENDIMENTO com agente ${conversation.assignedTo?.name}. Ignorando resposta do bot.`)
  return res.status(200).json({
    success: true,
    skipped: true,
    reason: 'Conversa já assumida por atendente',
    conversationId,
    assignedTo: conversation.assignedTo?.name
  })
}
```

**Benefício:** Evita que N8N sobrescreva dados após atendente assumir.

---

### ✅ 3. N8N Não Transfere se Conversa Já Foi Assumida

**Arquivo:** `api/routes/webhook-n8n.ts`  
**Linhas:** ~208-219 e ~280-297

**Transferência para PRINCIPAL:**
```typescript
// ✅ Verificar se conversa não está EM_ATENDIMENTO antes de transferir
const currentConv = await prisma.conversation.findUnique({
  where: { id: conversationId },
  select: { status: true, assignedToId: true }
})

if (currentConv?.status === 'EM_ATENDIMENTO' && currentConv.assignedToId) {
  console.log('⚠️ Conversa já está EM_ATENDIMENTO. Não transferindo para PRINCIPAL.')
} else {
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { status: 'PRINCIPAL', assignedToId: null, awaitingInput: true }
  })
}
```

**Benefício:** Evita que N8N tire conversa do atendente quando detecta necessidade de transferência.

---

### ✅ 4. Sistema Antigo Não Transfere se Conversa Já Foi Assumida

**Arquivo:** `api/routes/conversations.ts`  
**Linha:** ~2057-2089

```typescript
case 'TRANSFER_TO_HUMAN':
  // ✅ Verificar se conversa ainda está em BOT_QUEUE antes de transferir
  const convBeforeTransfer = await prisma.conversation.findUnique({
    where: { id: conversation.id },
    select: { status: true, assignedToId: true }
  })

  if (convBeforeTransfer?.status === 'EM_ATENDIMENTO' && convBeforeTransfer.assignedToId) {
    console.log(`⚠️ Conversa ${conversation.id} já está EM_ATENDIMENTO. Não transferindo para PRINCIPAL.`)
    // Apenas enviar a resposta do bot sem mudar status
    // ...
    break
  }
```

**Benefício:** Mesma proteção para o sistema de IA antigo (fallback quando N8N falha).

---

### ✅ 5. Monitor de Inatividade com Double-Check

**Arquivo:** `api/services/inactivityMonitor.ts`  
**Linha:** ~71-95

```typescript
for (const conversation of inactiveConversations) {
  // ✅ Recarregar conversa para verificar status atual
  // Evitar race condition: conversa pode ter sido modificada entre busca e update
  const currentConv = await prisma.conversation.findUnique({
    where: { id: conversation.id },
    select: { status: true, assignedToId: true, lastUserActivity: true }
  })

  // Verificar se conversa ainda está EM_ATENDIMENTO e inativa
  if (!currentConv || currentConv.status !== 'EM_ATENDIMENTO' || !currentConv.assignedToId) {
    console.log(`⏭️ Conversa ${conversation.phone} não está mais EM_ATENDIMENTO, pulando...`)
    continue
  }

  // Verificar novamente se realmente está inativa
  // ...
}
```

**Benefício:** Evita retornar conversa que foi modificada entre a query e o update.

---

### ✅ 6. Logs de Debug no Monitor

**Arquivo:** `api/services/inactivityMonitor.ts`  
**Linha:** ~66-72

```typescript
if (inactiveConversations.length > 0) {
    console.log(`⏰ [Monitor] Verificando ${inactiveConversations.length} conversas inativas (timeout: ${timeoutMinutes}min)`)
    inactiveConversations.forEach(conv => {
        const lastActivity = conv.lastUserActivity || conv.lastTimestamp
        const minutesSinceActivity = lastActivity 
            ? Math.floor((now.getTime() - new Date(lastActivity).getTime()) / (1000 * 60))
            : 'N/A'
        console.log(`  - ${conv.phone}: ${minutesSinceActivity}min desde última atividade (agente: ${conv.assignedTo?.name})`)
    })
}
```

**Benefício:** Facilita debugging e monitoramento do sistema.

---

## Configuração do Timeout

O timeout de inatividade é configurável:

- **Padrão:** 20 minutos
- **Localização:** `SystemSettings.inactivityTimeoutMinutes`
- **Como alterar:**
  1. Frontend: Configurações → Timeout de Inatividade
  2. SQL: `UPDATE "SystemSettings" SET "inactivityTimeoutMinutes" = 10;`

---

## Fluxo Protegido

### Antes (❌):
```
Paciente → Bot → Atendente assume → Bot responde → Status volta para PRINCIPAL ❌
```

### Depois (✅):
```
Paciente → Bot → Atendente assume → Bot detecta EM_ATENDIMENTO → Bot ignora ✅
```

---

## Como Testar

1. Configure timeout para 10 minutos
2. Crie conversa com bot
3. Deixe bot responder
4. **Antes dos 10min:** Assuma a conversa
5. Verifique que conversa permanece em "Minhas Conversas"
6. Verifique que bot não responde mais (se nova mensagem chegar)
7. **Após 10min sem resposta do paciente:** Conversa deve retornar para PRINCIPAL

---

## Arquivos Modificados

- ✅ `api/routes/conversations.ts` - Action 'take' atualiza lastUserActivity
- ✅ `api/routes/conversations.ts` - Sistema antigo verifica status antes de transferir
- ✅ `api/routes/webhook-n8n.ts` - N8N verifica status antes de responder/transferir
- ✅ `api/services/inactivityMonitor.ts` - Double-check antes de retornar para fila
- ✅ `api/services/inactivityMonitor.ts` - Logs de debug para monitoramento

---

## Observações

- `lastUserActivity` é atualizado apenas quando **PACIENTE** envia mensagem
- `lastTimestamp` é atualizado quando **qualquer** mensagem é enviada
- Monitor usa `lastUserActivity` como prioridade, `lastTimestamp` como fallback
- Ao assumir, `lastUserActivity` é resetado para dar tempo completo ao atendente
