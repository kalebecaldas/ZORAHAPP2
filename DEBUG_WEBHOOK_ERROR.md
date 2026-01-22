# 🐛 DEBUG: Erro ao Criar Webhook + Verificar Categoria de Encerramento

## Problema 1: Erro 400 ao Criar Webhook

### Possíveis Causas:

1. **Nome ou URL faltando**
   - Frontend não está enviando `name` ou `url`

2. **URL inválida**
   - URL precisa ser completa: `https://exemplo.com/webhook`
   - Não pode ser apenas `exemplo.com`

3. **Eventos inválidos**
   - Eventos válidos: `first_message`, `appointment_created`, `conversation_closed`, `patient_registered`

4. **Problema de autenticação**
   - Token expirado ou inválido

---

## 🔍 Como Debugar

### 1. Ver Logs do Backend

No terminal do servidor, procure por:
```
📝 Criando webhook: [nome] -> [url]
```

Ou erros como:
```
Erro ao criar webhook: [mensagem]
```

### 2. Testar Manualmente via cURL

```bash
curl -X POST https://zorahapp2-production.up.railway.app/api/webhooks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "name": "Test Webhook",
    "url": "https://webhook.site/seu-id",
    "events": ["conversation_closed"],
    "description": "Teste"
  }'
```

### 3. Verificar Payload do Frontend

No console do navegador:
```javascript
// Antes de enviar
console.log('Payload:', payload)
```

---

## Problema 2: Categoria de Encerramento

### Verificar se está sendo enviada:

1. **Frontend** (`ConversationsNew.tsx`):
```typescript
await api.post('/api/conversations/actions', {
  action: 'close',
  conversationId: conversation.id,
  phone: conversation.phone,
  category: closeCategory // ✅ Deve enviar categoria
});
```

2. **Backend** (`conversations.ts`):
```typescript
await WebhookService.trigger('conversation_closed', {
  category: req.body.category || 'OUTROS', // ✅ Deve incluir categoria
  // ...
});
```

---

## 🧪 Teste Rápido

### Testar Webhook de Encerramento:

1. **Assumir uma conversa**
2. **Clicar em "Encerrar Conversa"**
3. **Selecionar categoria** (ex: "Agendamento")
4. **Clicar em "Encerrar"**
5. **Verificar logs** do backend:

```
📤 Webhook consolidado disparado com 3 eventos para 5585999887766
```

6. **Verificar payload** no webhook.site:

```json
{
  "event": "conversation_closed",
  "data": {
    "category": "AGENDAMENTO", // ✅ Deve aparecer
    "events": [...],
    "metrics": {...}
  }
}
```

---

## 🔧 Correção Temporária

### Se erro persistir, adicionar logs:

```typescript
// api/routes/webhooks.ts linha 71
router.post('/', async (req: Request, res: Response) => {
  try {
    console.log('📥 Recebendo requisição para criar webhook:', req.body) // ✅ ADICIONAR
    
    const { name, description, url, events, metadata } = req.body
    
    // Validações...
```

---

## 📋 Checklist de Verificação

### Webhook Creation:
- [ ] Nome está sendo enviado?
- [ ] URL está completa (https://...)?
- [ ] Eventos são válidos?
- [ ] Token de autenticação válido?
- [ ] Logs do backend mostram erro?

### Categoria de Encerramento:
- [ ] Dropdown aparece no modal?
- [ ] Categoria é obrigatória?
- [ ] Categoria é enviada no POST?
- [ ] Backend recebe categoria?
- [ ] Webhook recebe categoria?

---

## 🚀 Próximos Passos

1. **Ver logs do Railway** para identificar erro exato
2. **Testar manualmente** com cURL
3. **Adicionar logs** temporários se necessário
4. **Testar categoria** de encerramento

---

Precisa dos logs do Railway para identificar o erro exato!
