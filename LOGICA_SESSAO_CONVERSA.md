# ✅ Lógica de Sessão e Reabertura de Conversas

## 📋 Regras Implementadas

### Regra das 24 Horas
- Cada conversa tem um `sessionExpiryTime` que expira após **24 horas** sem atividade do paciente
- Quando o paciente envia uma mensagem, o timer é **resetado** para mais 24 horas
- Se o paciente não enviar mensagem por 24 horas, a sessão expira

---

## 🔄 Cenários de Processamento de Mensagens

### **CENÁRIO 1: Conversa FECHADA + Sessão Expirada (>24h)**
**Ação:** Criar **NOVA conversa**

```
Paciente envia mensagem → Conversa está FECHADA → Sessão expirou (>24h)
→ Criar nova conversa com nova sessão de 24h
```

**Código:**
- Cria nova conversa com `status: 'BOT_QUEUE'`
- Nova sessão de 24 horas
- Workflow reiniciado do início

---

### **CENÁRIO 2: Conversa FECHADA + Sessão Ainda Ativa (<24h)**
**Ação:** **Reabrir** a conversa existente

```
Paciente envia mensagem → Conversa está FECHADA → Sessão ainda ativa (<24h)
→ Reabrir conversa: voltar para BOT_QUEUE, resetar sessão
```

**Código:**
- Atualiza conversa existente:
  - `status: 'BOT_QUEUE'` (volta para fila)
  - `assignedToId: null` (remove atribuição)
  - `sessionStartTime: now` (resetar início)
  - `sessionExpiryTime: now + 24h` (resetar expiração)
  - `sessionStatus: 'active'` (ativar sessão)
  - `workflowContext: {}` (resetar contexto)

---

### **CENÁRIO 3: Conversa NÃO FECHADA + Sessão Expirada**
**Ação:** Fechar conversa antiga e criar **NOVA conversa**

```
Paciente envia mensagem → Conversa está ativa → Sessão expirou (>24h)
→ Fechar conversa antiga → Criar nova conversa
```

**Código:**
- Fecha conversa antiga: `status: 'FECHADA'`, `sessionStatus: 'expired'`
- Cria nova conversa com nova sessão de 24h

---

### **CENÁRIO 4: Conversa NÃO FECHADA + Sessão Ativa**
**Ação:** Atualizar atividade e resetar timer

```
Paciente envia mensagem → Conversa está ativa → Sessão ainda ativa
→ Atualizar lastUserActivity → Resetar sessionExpiryTime (+24h)
```

**Código:**
- Atualiza `lastUserActivity: now`
- Reseta `sessionExpiryTime: now + 24h`
- Mantém `sessionStatus: 'active'`

---

## 🔍 Verificações Implementadas

### 1. Verificação de Status
```typescript
const isClosed = conversation.status === 'FECHADA'
```

### 2. Verificação de Sessão
```typescript
const sessionExpired = conversation.sessionExpiryTime && 
  new Date(conversation.sessionExpiryTime) < now
```

### 3. Lógica de Decisão
```typescript
if (isClosed && sessionExpired) {
  // CASO 1: Criar nova conversa
} else if (isClosed && !sessionExpired) {
  // CASO 2: Reabrir conversa
} else if (!isClosed && sessionExpired) {
  // CASO 3: Fechar e criar nova
} else {
  // CASO 4: Atualizar atividade
}
```

---

## 📊 Fluxo Visual

```
Mensagem Recebida
    │
    ├─ Conversa existe?
    │   │
    │   ├─ NÃO → Criar nova conversa (BOT_QUEUE, sessão 24h)
    │   │
    │   └─ SIM → Verificar status e sessão
    │       │
    │       ├─ FECHADA + Sessão Expirada (>24h)
    │       │   └─ Criar NOVA conversa
    │       │
    │       ├─ FECHADA + Sessão Ativa (<24h)
    │       │   └─ Reabrir conversa (BOT_QUEUE, resetar sessão)
    │       │
    │       ├─ ATIVA + Sessão Expirada (>24h)
    │       │   └─ Fechar antiga + Criar NOVA conversa
    │       │
    │       └─ ATIVA + Sessão Ativa
    │           └─ Atualizar atividade (resetar timer)
```

---

## ✅ Garantias

1. **Conversas FECHADAS dentro de 24h são reabertas** (não criam nova conversa)
2. **Conversas FECHADAS após 24h criam nova conversa** (nova sessão)
3. **Timer sempre reseta** quando paciente envia mensagem
4. **Workflow reinicia** quando conversa é reaberta ou nova é criada
5. **Eventos Socket.IO** são emitidos para atualizar frontend em tempo real

---

## 🧪 Como Testar

### Teste 1: Reabertura dentro de 24h
1. Encerre uma conversa manualmente
2. Aguarde alguns minutos (não 24h)
3. Envie mensagem do paciente
4. **Esperado:** Conversa reaberta (mesma ID), volta para BOT_QUEUE

### Teste 2: Nova conversa após 24h
1. Encerre uma conversa manualmente
2. Modifique `sessionExpiryTime` no banco para uma data passada (>24h)
3. Envie mensagem do paciente
4. **Esperado:** Nova conversa criada (nova ID), status BOT_QUEUE

### Teste 3: Reset de timer
1. Tenha uma conversa ativa
2. Envie mensagem do paciente
3. Verifique `sessionExpiryTime` no banco
4. **Esperado:** Timer resetado para +24h a partir de agora

---

## 📝 Logs Importantes

- `🔄 Conversa FECHADA com sessão expirada (>24h) - Criando nova conversa`
- `🔄 Conversa FECHADA mas sessão ainda ativa (<24h) - Reabrindo conversa`
- `🔄 Conversa ativa com sessão expirada - Fechando e criando nova conversa`
- `⏰ Sessão resetada para {id} - Nova expiração: {timestamp}`
- `✅ Conversa reaberta: {id} - Nova expiração: {timestamp}`

---

## 🔧 Arquivos Modificados

- `api/routes/conversations.ts` - Função `processIncomingMessage()`
  - Linhas ~971-1095: Lógica de verificação de status e sessão

---

## ⚠️ Observações

1. **Sessão expirada** = `sessionExpiryTime < now`
2. **Conversa FECHADA** = `status === 'FECHADA'`
3. **Timer sempre reseta** quando paciente envia mensagem (exceto se criar nova conversa)
4. **Workflow sempre reinicia** quando conversa é reaberta ou nova é criada
