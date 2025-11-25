# 🔧 Correção de Rotas API - Erros 404

## 📋 **Problemas Identificados**

### **1. `/api/conversations/5592999999999?limit=200` - 404**

**Causa:**
- A rota existe: `GET /api/conversations/:phone`
- Mas requer autenticação (`listAuth`)
- Ou a conversa não existe no banco de dados

**Solução:**
- Adicionar token de autenticação no header
- Ou criar a conversa primeiro no banco
- Ou verificar se o telefone está no formato correto

**Teste:**
```bash
# Com autenticação
curl -H "Authorization: Bearer SEU_TOKEN" \
  "http://localhost:3001/api/conversations/5592999999999?limit=200"

# Verificar se conversa existe
curl "http://localhost:3001/api/conversations"
```

---

### **2. `/webhook` - 404/Forbidden**

**Causa:**
- A rota existe: `GET /webhook`
- Mas retorna "Forbidden" porque precisa de parâmetros específicos do Meta:
  - `hub.mode=subscribe`
  - `hub.verify_token=SEU_TOKEN`
  - `hub.challenge` (retornado pelo Meta)

**Solução:**
- Esta rota é para verificação do Meta/Facebook
- Não deve ser acessada diretamente pelo navegador
- É chamada automaticamente pelo Meta quando você configura o webhook

**Teste (verificação Meta):**
```bash
curl "http://localhost:3001/webhook?hub.mode=subscribe&hub.verify_token=SEU_TOKEN&hub.challenge=123"
```

---

### **3. `/api/test` - 404**

**Causa:**
- A rota `/api/test` não existe como GET
- A rota correta é: `POST /api/test/test-bot`

**Solução:**
- Usar a rota correta: `/api/test/test-bot` (POST)
- Ou adicionar uma rota GET em `/api/test` se necessário

**Teste:**
```bash
# Rota correta
curl -X POST "http://localhost:3001/api/test/test-bot" \
  -H "Content-Type: application/json" \
  -d '{"phone": "5592999999999", "message": "Olá"}'
```

---

## ✅ **Rotas Disponíveis**

### **Conversations:**
- `GET /api/conversations` - Lista todas (requer auth)
- `GET /api/conversations/:phone` - Busca por telefone (requer auth)
- `POST /api/conversations` - Cria nova conversa (requer auth)

### **Webhook:**
- `GET /webhook` - Verificação Meta (requer parâmetros específicos)
- `POST /webhook` - Recebe mensagens do WhatsApp

### **Test:**
- `POST /api/test/test-bot` - Testa bot com mensagem simulada

---

## 🔧 **Correções Necessárias no Frontend**

### **1. Adicionar Autenticação**

Se o frontend está tentando acessar `/api/conversations` sem autenticação:

```typescript
// Adicionar token no header
axios.get('/api/conversations/5592999999999', {
  headers: {
    'Authorization': `Bearer ${token}`
  },
  params: { limit: 200 }
})
```

### **2. Corrigir Rota de Test**

Se está tentando acessar `/api/test`:

```typescript
// Usar rota correta
axios.post('/api/test/test-bot', {
  phone: '5592999999999',
  message: 'Olá'
})
```

### **3. Remover Chamada ao Webhook**

O `/webhook` não deve ser chamado pelo frontend. É apenas para o Meta/Facebook.

---

## 🧪 **Testar Rotas**

```bash
# Health check (não requer auth)
curl http://localhost:3001/api/health

# Listar conversas (requer auth)
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3001/api/conversations

# Testar bot (não requer auth)
curl -X POST http://localhost:3001/api/test/test-bot \
  -H "Content-Type: application/json" \
  -d '{"phone": "5592999999999", "message": "Olá"}'
```

---

## 📝 **Próximos Passos**

1. ✅ Verificar se o frontend está enviando token de autenticação
2. ✅ Corrigir chamadas para `/api/test` → `/api/test/test-bot`
3. ✅ Remover chamadas desnecessárias ao `/webhook` do frontend
4. ✅ Verificar se as conversas existem no banco antes de buscar

---

**Status:** ✅ Problemas identificados e soluções documentadas

