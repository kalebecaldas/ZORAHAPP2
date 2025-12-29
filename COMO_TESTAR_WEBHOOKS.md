# 🧪 Como Testar Webhooks

Este guia mostra como testar o sistema de webhooks na prática.

---

## 🎯 Opção 1: Webhook.site (Mais Fácil)

### **Passo a Passo:**

1. **Acesse** [webhook.site](https://webhook.site)
   - Uma URL única será gerada automaticamente
   - Exemplo: `https://webhook.site/abc123-def456-...`

2. **Copie a URL** que apareceu

3. **Atualize o Webhook:**
   - Vá em **Configuração da IA** → **Webhooks**
   - Clique no webhook que deseja testar
   - Edite a URL e cole a URL do webhook.site
   - Salve

4. **Dispare um Evento:**
   - Envie uma mensagem pelo WhatsApp (para `received_message`)
   - Crie um novo paciente (para `created_patient`)
   - etc.

5. **Veja a Requisição:**
   - Volte para webhook.site
   - A requisição aparecerá automaticamente!
   - Você verá:
     - Headers enviados (`X-Webhook-Token`, `X-Event-Type`)
     - Body com os dados do evento
     - Status code da resposta

---

## 🤖 Opção 2: Script Automático

Use o script para atualizar todas as URLs de uma vez:

```bash
# 1. Pegue sua URL do webhook.site
# Exemplo: https://webhook.site/abc123-def456-...

# 2. Edite o script
nano scripts/update_webhook_urls.ts

# 3. Substitua YOUR_UNIQUE_ID pela sua URL completa

# 4. Execute
npx tsx scripts/update_webhook_urls.ts
```

---

## 🔍 Opção 3: Logs da Interface

Use a própria interface do sistema:

1. **Dispare um evento** (ex: envie mensagem via WhatsApp)

2. **Veja os logs:**
   - Configuração da IA → Webhooks
   - Clique no ícone 👁️ "Ver Logs" do webhook
   - Veja todas as tentativas:
     - ✅ Sucesso (status 200)
     - ❌ Falha (status 4xx/5xx)
     - Tempo de resposta
     - Erro (se houver)

3. **Veja Estatísticas:**
   - Clique no ícone 📊 "Estatísticas"
   - Taxa de sucesso
   - Tempo médio de resposta
   - Total de requisições

---

## 🧪 Opção 4: Testar Manualmente

Use o botão "Testar" na interface:

1. **Configuração da IA** → **Webhooks**
2. Clique no ícone 🧪 **"Testar"**
3. Um payload de exemplo será enviado
4. Veja o resultado:
   - ✅ Sucesso: Webhook respondeu corretamente
   - ❌ Falha: Erro de conexão ou timeout

---

## 📝 Estrutura do Payload

Quando um webhook é disparado, enviamos:

### **Headers:**
```http
Content-Type: application/json
X-Webhook-Token: whk_abc123...
X-Event-Type: received_message
X-Webhook-ID: webhook-id-here
User-Agent: ZorahApp-Webhook/1.0
```

### **Body:**
```json
{
  "event": "received_message",
  "timestamp": "2025-12-29T18:30:00.000Z",
  "data": {
    "conversationId": "conv-123",
    "phone": "5592999999999",
    "message": "Olá!",
    "patientId": "patient-456",
    "patientName": "João Silva",
    "source": "whatsapp",
    "metadata": {
      "isNewConversation": true,
      "hasPatient": true
    }
  }
}
```

---

## 🔧 URLs Reais para Produção

Quando for para produção, substitua as URLs de exemplo por suas URLs reais:

### **Google Ads:**
```
https://www.google-analytics.com/mp/collect?measurement_id=YOUR_ID&api_secret=YOUR_SECRET
```

### **Slack:**
```
https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX
```

### **CRM (Exemplo):**
```
https://api.seu-crm.com/webhooks/leads
```

### **Seu Próprio Servidor:**
```
https://api.sua-clinica.com.br/webhooks/zorahapp
```

---

## ⚠️ Segurança

**SEMPRE valide o token** nos seus endpoints:

```javascript
// Node.js/Express
app.post('/webhook/zorahapp', (req, res) => {
  const receivedToken = req.headers['x-webhook-token']
  const expectedToken = 'whk_abc123...' // Token do sistema
  
  if (receivedToken !== expectedToken) {
    return res.status(401).json({ error: 'Token inválido' })
  }
  
  // Processar webhook...
  const { event, data } = req.body
  console.log(`Evento recebido: ${event}`, data)
  
  res.json({ success: true })
})
```

---

## 🐛 Troubleshooting

### **Webhook não dispara:**
- Verifique se o webhook está **ativo** (🟢)
- Confirme que o evento está **selecionado**
- Veja os logs do servidor: `npm run up`

### **Timeout (Sem resposta):**
- URL incorreta ou fora do ar
- Firewall bloqueando requisições
- Servidor destino muito lento (>10s)

### **Erro 401/403:**
- Token inválido ou não enviado
- Verifique autenticação no endpoint destino

### **Erro 500:**
- Erro no processamento do endpoint destino
- Veja os logs do servidor destino

---

## 📚 Documentação Completa

Acesse: `/api/docs/webhooks` (direto no navegador)

Ou leia: `WEBHOOKS_API.md`

---

**Dúvidas?** Entre em contato ou consulte os logs do sistema! 🚀
