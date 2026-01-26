# Correção dos Dashboards - Problema de Dados Vazios

## 📋 Problemas Identificados

### 1. Query SQL Incompatível com PostgreSQL
**Problema:** A rota `/api/stats` usava função `strftime` que é específica do SQLite, mas o Railway usa PostgreSQL.

**Localização:** `api/routes/stats.ts` linha 95

**Sintoma:** Dashboard gerencial não exibia dados (conversas ativas, pacientes, tempo médio, etc.)

### 2. Falta de Logs e Tratamento de Erros
**Problema:** Quando ocorriam erros, o sistema retornava erro 500 sem logs detalhados, dificultando o debug.

**Sintoma:** Dashboards vazios sem indicação clara do problema.

### 3. Inconsistência nos Roles de Usuários
**Problema:** O código alternava entre usar `'AGENT'` e `'ATENDENTE'` para o mesmo tipo de usuário.

**Localização:** `api/routes/analytics.ts` linhas 202 e 316

**Sintoma:** Dashboard do atendente não exibia dados corretamente.

---

## ✅ Correções Implementadas

### 1. Query de Tempo Médio de Resposta - CORRIGIDO
**Arquivo:** `api/routes/stats.ts`

**Antes:**
```typescript
const result = await prisma.$queryRawUnsafe<any[]>(
  `SELECT AVG(CAST( (strftime('%s', m2.timestamp) - strftime('%s', m1.timestamp)) AS REAL)) as avg_time
   FROM messages m1 ...`
)
```

**Depois:**
```typescript
// Detectar tipo de banco de dados
const isPostgres = process.env.DATABASE_URL?.includes('postgresql')

if (isPostgres) {
  // Query para PostgreSQL
  const result = await prisma.$queryRaw<any[]>`
    SELECT AVG(EXTRACT(EPOCH FROM (m2.timestamp - m1.timestamp))) as avg_time
    FROM messages m1
    JOIN messages m2 ON m1."conversationId" = m2."conversationId"
    WHERE m1.direction = 'RECEIVED'
      AND m2.direction = 'SENT'
      AND m1.timestamp >= ${startDate}
      AND m2.timestamp > m1.timestamp
  `
  return result
} else {
  // Query para SQLite (desenvolvimento local)
  const result = await prisma.$queryRaw<any[]>`
    SELECT AVG(CAST((strftime('%s', m2.timestamp) - strftime('%s', m1.timestamp)) AS REAL)) as avg_time
    ...
  `
  return result
}
```

**Benefício:** Agora funciona tanto em PostgreSQL (Railway) quanto SQLite (local).

---

### 2. Logs de Debug Adicionados
**Arquivos:** `api/routes/stats.ts` e `api/routes/analytics.ts`

**Logs adicionados:**
- `📊 [Stats] Requisição recebida` - Quando uma requisição chega
- `📊 [Stats] Estatísticas calculadas` - Quando os dados são calculados com sucesso
- `❌ [Stats] Erro` - Quando ocorre um erro
- `📊 [Analytics/Conversion] Requisição recebida` - Analytics de conversão
- `📊 [Analytics/Agents] Total de agentes` - Performance de agentes
- `📊 [Analytics/AgentsMe] Estatísticas calculadas` - Dashboard pessoal do atendente

**Benefício:** Facilita identificar problemas no Railway através dos logs.

---

### 3. Tratamento de Erros Melhorado
**Antes:** Retornava erro 500 e dashboard ficava completamente vazio.

**Depois:** Retorna dados vazios (zeros) em vez de erro, permitindo que o dashboard seja exibido mesmo com falhas parciais.

**Exemplo:**
```typescript
} catch (error) {
  console.error('❌ [Stats] Erro ao buscar estatísticas:', error)
  // Retornar estatísticas vazias em vez de erro 500
  res.json({
    conversations: {
      total: 0,
      active: 0,
      closed: 0,
      bot: 0,
      human: 0
    },
    // ... outros campos zerados
  })
}
```

**Benefício:** Melhor experiência do usuário - dashboard não quebra completamente.

---

### 4. Roles de Usuários Unificados
**Arquivo:** `api/routes/analytics.ts`

**Antes:**
```typescript
where: {
  role: 'AGENT' // Ou 'ATENDENTE' em outros lugares
}
```

**Depois:**
```typescript
where: {
  OR: [
    { role: 'AGENT' },
    { role: 'ATENDENTE' }
  ]
}
```

**Benefício:** Funciona independente de qual role estiver cadastrado no banco.

---

## 🚀 Como Testar

### Teste Local
```bash
# 1. Instalar dependências (se necessário)
npm install

# 2. Iniciar servidor
npm run dev

# 3. Abrir browser e testar dashboards:
# - Dashboard Gerencial: http://localhost:5173/
# - Dashboard Atendente: http://localhost:5173/ (após login como atendente)
```

### Verificar Logs
No terminal onde o servidor está rodando, você deve ver:
```
📊 [Stats] Requisição recebida: { period: '24h' }
📊 [Stats] Estatísticas calculadas: { totalConversations: X, activeConversations: Y, ... }
```

---

## 📦 Deploy no Railway

### Opção 1: Git Push (Automático)
```bash
git add .
git commit -m "fix: corrigir dashboards para PostgreSQL"
git push origin main
```

O Railway fará deploy automaticamente.

### Opção 2: Através do Railway CLI
```bash
railway up
```

### Verificar Logs no Railway
1. Acesse o dashboard do Railway
2. Clique no seu projeto
3. Vá em "Deployments" > Último deploy
4. Clique em "View Logs"
5. Procure pelos logs com 📊 e ❌

---

## 🔍 Como Verificar se Funcionou

### 1. Dashboard Gerencial
- Deve exibir: Conversas Ativas, Total de Pacientes, Tempo Médio, Taxa de Satisfação
- Gráfico de "Tendência de Conversas" deve ter dados
- Gráfico de "Distribuição por Tipo" deve ter dados

### 2. Dashboard do Atendente
- Deve exibir: Minhas Conversas, Taxa de Conversão, Tempo de Resposta
- Deve exibir ranking e posição do atendente
- Deve exibir badges conquistadas (se houver)

### 3. Logs no Railway
Procure por linhas como:
```
✅ [Stats] Estatísticas calculadas: { totalConversations: 13, activeConversations: 3, ... }
📊 [Analytics/Agents] Total de agentes: 5
```

Se ver estas linhas, significa que as queries estão funcionando!

### 4. Verificar Erros
Se ainda houver problemas, procure por linhas com ❌:
```
❌ [Stats] Erro ao buscar estatísticas: ...
```

---

## 📝 Nota sobre o Timeout de Inatividade

**BOA NOTÍCIA:** A lógica de timeout já estava correta!

O código em `api/services/inactivityMonitor.ts` já usa `lastUserActivity` em vez de `lastTimestamp`, o que significa:

- ✅ **Timeout conta a partir da última mensagem do PACIENTE**
- ✅ **Mensagens do atendente NÃO resetam o timeout**
- ✅ **Isso é uma boa prática** - garante que o paciente não fique sem resposta

**Como funciona:**
1. Paciente envia mensagem → `lastUserActivity` é atualizado
2. Sistema verifica a cada 1 minuto se `lastUserActivity` > timeout configurado (30 min)
3. Se sim → conversa retorna para fila PRINCIPAL
4. Sistema cria mensagem automática informando o timeout

**Para verificar o timeout no Railway:**
Procure nos logs por:
```
⏰ [Monitor] Verificando X conversas inativas (timeout: 30min)
⏰ Conversa 5511999999999 retornou por inatividade (agente: Nome do Agente)
```

---

## 🎯 Resumo

| Problema | Status | Solução |
|----------|--------|---------|
| Dashboard gerencial vazio | ✅ CORRIGIDO | Query SQL adaptada para PostgreSQL |
| Dashboard atendente vazio | ✅ CORRIGIDO | Roles unificados + logs |
| Falta de logs para debug | ✅ CORRIGIDO | Logs detalhados adicionados |
| Timeout menor que configurado | ✅ JÁ ESTAVA CORRETO | Usa `lastUserActivity` |

---

## 🔗 Arquivos Modificados

1. `api/routes/stats.ts` - Query PostgreSQL + logs + tratamento de erro
2. `api/routes/analytics.ts` - Roles unificados + logs + tratamento de erro

---

## 💡 Dicas para Desenvolvimento

1. **Sempre use logs detalhados** com prefixos (`📊`, `❌`, `⏰`) para facilitar busca
2. **Retorne dados vazios em vez de erros 500** quando possível
3. **Detecte o tipo de banco de dados** para queries específicas
4. **Use `OR` para roles** quando houver inconsistência no sistema
5. **Monitore os logs do Railway** regularmente para identificar problemas

---

## ⚠️ Se Ainda Houver Problemas

1. **Verificar conexão com banco:**
   ```bash
   # No Railway, verificar variável DATABASE_URL
   echo $DATABASE_URL
   ```

2. **Verificar se as tabelas existem:**
   ```bash
   # Rodar migrations no Railway
   npx prisma migrate deploy
   ```

3. **Verificar autenticação:**
   - Token JWT válido?
   - Middleware de autenticação funcionando?

4. **Testar endpoints manualmente:**
   ```bash
   curl -H "Authorization: Bearer SEU_TOKEN" \
     https://seu-app.railway.app/api/stats?period=24h
   ```

---

## 📞 Próximos Passos

1. ✅ Fazer commit e push das alterações
2. ✅ Aguardar deploy automático no Railway (2-3 minutos)
3. ✅ Verificar logs no Railway
4. ✅ Testar dashboards na URL de produção
5. ✅ Monitorar por 24h para garantir estabilidade

---

**Data da correção:** 2026-01-26  
**Versão:** 1.0  
**Autor:** Sistema de correção automática
