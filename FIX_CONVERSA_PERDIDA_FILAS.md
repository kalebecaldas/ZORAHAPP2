# 🔧 Fix: Conversa Perdida nas Filas

## 🐛 Problema Identificado

Uma conversa se perdeu nas filas e não aparece em nenhuma fila. Pelas mensagens, ela não chegou a sair do bot.

**Causa Raiz:**
- O sistema estava usando o status `'AGUARDANDO'` quando o bot transferia para a fila principal
- O frontend só filtrava por `'PRINCIPAL'`
- Conversas com status `'AGUARDANDO'` não apareciam em nenhuma fila

---

## 🔍 Análise

### Status Possíveis no Sistema:
1. **BOT_QUEUE** - Conversa sendo atendida pelo bot
2. **PRINCIPAL** - Conversa aguardando atendimento humano (fila principal)
3. **AGUARDANDO** - Status equivalente a PRINCIPAL (usado pelo bot ao transferir)
4. **EM_ATENDIMENTO** - Conversa atribuída a um atendente
5. **FECHADA** - Conversa encerrada

### Filas no Frontend:
1. **BOT_QUEUE** - Filtra: `status === 'BOT_QUEUE'`
2. **PRINCIPAL** - Filtra: `status === 'PRINCIPAL' && !assignedToId` ❌ **Não incluía 'AGUARDANDO'**
3. **EM_ATENDIMENTO** - Filtra: `status === 'EM_ATENDIMENTO' && assignedToId !== null`
4. **MINHAS_CONVERSAS** - Filtra: `assignedToId === user.id`
5. **ENCERRADOS** - Filtra: `status === 'FECHADA'`

**Problema:** Conversas com status `'AGUARDANDO'` não apareciam em nenhuma fila!

---

## ✅ Correções Implementadas

### 1. **Backend: Padronizar Status para 'PRINCIPAL'**
**Arquivo:** `api/routes/conversations.ts` (linhas 1803, 1995)

**Antes:**
```typescript
status: decision.queue === 'AGUARDANDO' ? 'AGUARDANDO' : 'PRINCIPAL',
```

**Depois:**
```typescript
status: 'PRINCIPAL', // ✅ Sempre usar 'PRINCIPAL' (padronizar)
```

### 2. **Backend: API de Listagem Tratar 'AGUARDANDO' como 'PRINCIPAL'**
**Arquivo:** `api/routes/conversations.ts` (linhas 150-160)

**Antes:**
```typescript
if (s === 'HUMAN') {
  where.status = { in: ['PRINCIPAL', 'EM_ATENDIMENTO'] }
}
```

**Depois:**
```typescript
if (s === 'HUMAN') {
  where.status = { in: ['PRINCIPAL', 'AGUARDANDO', 'EM_ATENDIMENTO'] }
}
if (s === 'PRINCIPAL') {
  // ✅ Tratar 'AGUARDANDO' como equivalente a 'PRINCIPAL'
  where.status = { in: ['PRINCIPAL', 'AGUARDANDO'] }
}
```

### 3. **Frontend: Filtrar 'AGUARDANDO' na Fila PRINCIPAL**
**Arquivo:** `src/pages/ConversationsNew.tsx` (linhas 317-318, 345-346)

**Antes:**
```typescript
case 'PRINCIPAL': 
  if (c.status !== 'PRINCIPAL' || c.assignedToId !== null) return false;
```

**Depois:**
```typescript
case 'PRINCIPAL': 
  // ✅ Incluir tanto 'PRINCIPAL' quanto 'AGUARDANDO' (são equivalentes)
  if ((c.status !== 'PRINCIPAL' && c.status !== 'AGUARDANDO') || c.assignedToId !== null) return false;
```

**Antes:**
```typescript
case 'PRINCIPAL': return c.status === 'PRINCIPAL' && !c.assignedToId;
```

**Depois:**
```typescript
case 'PRINCIPAL': 
  // ✅ Incluir tanto 'PRINCIPAL' quanto 'AGUARDANDO' (são equivalentes)
  return (c.status === 'PRINCIPAL' || c.status === 'AGUARDANDO') && !c.assignedToId;
```

---

## 📊 Resultado

### Antes (com problema):
```
1. Bot transfere → status = 'AGUARDANDO' ❌
2. Frontend filtra → status === 'PRINCIPAL' ❌
3. Conversa não aparece em nenhuma fila ❌
```

### Depois (corrigido):
```
1. Bot transfere → status = 'PRINCIPAL' ✅
2. Frontend filtra → status === 'PRINCIPAL' || status === 'AGUARDANDO' ✅
3. Conversa aparece na fila PRINCIPAL ✅
```

---

## 🔄 Migração de Dados Existentes

Se houver conversas com status `'AGUARDANDO'` no banco, elas agora:
- ✅ Aparecerão na fila PRINCIPAL (frontend corrigido)
- ✅ Serão tratadas como 'PRINCIPAL' pelo backend
- ✅ Podem ser migradas para 'PRINCIPAL' se necessário

**Script de migração (opcional):**
```bash
# Via script TypeScript (recomendado)
npx ts-node scripts/migrate_aguardando_to_principal.ts

# Ou via SQL direto
UPDATE "Conversation" 
SET status = 'PRINCIPAL' 
WHERE status = 'AGUARDANDO';
```

**Nota:** A migração é opcional. As conversas com 'AGUARDANDO' já aparecem na fila PRINCIPAL graças às correções no frontend. A migração apenas padroniza o status no banco de dados.

---

## ✅ Funcionalidades Confirmadas

1. ✅ **Conversas não se perdem mais** - Todas aparecem em alguma fila
2. ✅ **Status padronizado** - Backend sempre usa 'PRINCIPAL'
3. ✅ **Compatibilidade** - Frontend trata 'AGUARDANDO' como 'PRINCIPAL'
4. ✅ **API corrigida** - Endpoint de listagem inclui 'AGUARDANDO'
5. ✅ **Contadores corretos** - Incluem conversas com 'AGUARDANDO'

---

## 🎉 Conclusão

**Problema resolvido!**

Agora:
- ✅ Todas as conversas aparecem em alguma fila
- ✅ Status padronizado para 'PRINCIPAL'
- ✅ Compatibilidade com conversas antigas com 'AGUARDANDO'
- ✅ Conversas não se perdem mais nas filas

**Status:** ✅ **CORRIGIDO**
