# 🚀 Guia Rápido - Sistema de Webhooks

## ✅ O que foi implementado

Sistema completo de webhooks para notificar parceiros externos (Google Ads, CRMs, etc) sobre eventos em tempo real.

---

## 📋 Checklist de Deploy

### **Local (Já feito ✅)**
- [x] Tabelas criadas no banco local (`npx prisma db push`)
- [x] Prisma Client regenerado
- [x] Interface funcionando
- [x] Build passou

### **Railway (Próximo passo)**
- [ ] Executar migration via SSH:
  ```bash
  railway ssh
  npx prisma db push
  ```
- [ ] Verificar logs:
  ```bash
  railway logs --follow
  ```

---

## 🎯 Como Usar

### **1. Acessar Interface**
```
Login → Configuração da IA → Aba "Webhooks"
```

### **2. Criar Webhook**
```
1. Clicar em "Novo Webhook"
2. Preencher:
   - Nome: "Google Ads Partner"
   - URL: https://parceiro.com/webhook
   - Eventos: Marcar os desejados
3. Copiar TOKEN gerado
4. Enviar token para o parceiro
```

### **3. Documentação Pública**
```
URL: https://seu-dominio.com/webhooks-docs
(Não requer login - página pública)
```

---

## 📨 9 Eventos Disponíveis

| Evento | Quando Dispara | Útil Para |
|--------|----------------|-----------|
| `first_message` | Primeira mensagem de novo contato | Google Ads conversões |
| `message_received` | Cada mensagem recebida | Analytics, CRM |
| `conversation_started` | Nova conversa criada | Tracking de leads |
| `agent_joined` | Atendente assume conversa | Monitoramento de SLA |
| `conversation_closed` | Conversa encerrada | Fechamento de tickets |
| `patient_registered` | Novo paciente cadastrado | CRM, Newsletter |
| `appointment_created` | Agendamento criado | Calendário, Lembretes |
| `bot_transferred` | Bot transfere para humano | Analytics de bot |
| `message_sent` | Atendente envia mensagem | Auditoria, Logs |

---

## 🔐 Segurança

**Token Format:**
```
whk_a1b2c3d4e5f6789012345678901234567890abcdef...
```

**Header de Validação:**
```http
X-Webhook-Token: whk_a1b2c3d4...
```

**No código do parceiro:**
```javascript
const token = req.headers['x-webhook-token']
if (token !== process.env.ZORAHAPP_WEBHOOK_TOKEN) {
  return res.status(401).json({ error: 'Token inválido' })
}
```

---

## 📊 Monitoramento

### **Ver Estatísticas:**
- Taxa de sucesso
- Tempo médio de resposta
- Total de requisições
- Falhas registradas

### **Ver Logs:**
- Histórico completo
- Status code de cada envio
- Erros detalhados
- Tempo de resposta

### **Testar:**
- Botão "Testar" envia payload de teste
- Verifica se endpoint está respondendo
- Logs registram resultado

---

## 🔧 Troubleshooting

### **Erro: Tabela não existe**
```bash
# Executar migration:
npx prisma db push
```

### **Webhook não dispara**
1. Verificar se está **ativo**
2. Ver **logs** para erros
3. Testar manualmente
4. Verificar URL do parceiro

### **Erro 401 no parceiro**
- Token incorreto
- Header errado (deve ser `X-Webhook-Token`)

### **Timeout (10s)**
- Parceiro deve responder rápido (<10s)
- Processar em background
- Sistema faz retry automático (3x)

---

## 📚 Arquivos Criados

**Backend:**
- `api/services/webhookService.ts` - Lógica de webhooks
- `api/routes/webhooks.ts` - API endpoints
- `prisma/schema.prisma` - Models
- `prisma/migrations/add_webhooks.sql` - Migration

**Frontend:**
- `src/components/WebhooksManagement.tsx` - Interface de gerenciamento
- `src/pages/WebhooksDocs.tsx` - Página pública de documentação
- `src/App.tsx` - Rotas atualizadas

**Documentação:**
- `WEBHOOKS_API.md` - Documentação técnica completa
- `WEBHOOKS_GUIA_RAPIDO.md` - Este arquivo

**Integrações:**
- `api/routes/conversations.ts` - 7 disparos de webhook

---

## 🎉 Status Final

✅ **Sistema completo implementado**  
✅ **9 eventos disponíveis**  
✅ **Interface visual pronta**  
✅ **Documentação pública**  
✅ **API completa**  
✅ **Build passando**  
✅ **Commits organizados**  

---

## 📞 Próximos Passos

1. **Push para GitHub**
2. **Deploy no Railway**
3. **Executar migration**
4. **Criar webhook para parceiro**
5. **Testar com primeira mensagem real**

---

**Tudo pronto para produção! 🚀**

Data: 29/12/2025
