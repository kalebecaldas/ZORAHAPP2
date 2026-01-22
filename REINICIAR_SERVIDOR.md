# ⚠️ REINICIAR SERVIDOR NECESSÁRIO

## 🎯 Situação

O código foi corrigido e está no GitHub, mas as mudanças **não aparecem** porque o servidor Node.js ainda está rodando com o código antigo.

---

## ✅ Código Atual (Correto)

```typescript
// api/routes/webhook-n8n.ts linha 218
messageText: `🤖 Bot transferiu conversa:

Motivo: ${entities?.transferReason || req.body.queueName || 'Paciente solicitou atendimento'}
Última intenção: ${intent}
Histórico: Paciente estava em conversa com bot N8N`,
```

**SEM `**` e com quebras de linha reais!** ✅

---

## 🔄 Como Aplicar as Mudanças

### Opção 1: Reiniciar Servidor (Recomendado)

No terminal onde está rodando `npm run up`:

1. **Pressionar `Ctrl + C`** para parar o servidor
2. **Executar novamente:** `npm run up`

```bash
# Terminal 1
Ctrl + C
npm run up
```

---

### Opção 2: Usar PM2 (Se estiver usando)

```bash
pm2 restart all
```

---

### Opção 3: Matar processo e reiniciar

```bash
# Encontrar processo
ps aux | grep "node.*api/server.js"

# Matar processo (substitua PID)
kill -9 PID

# Reiniciar
npm run up
```

---

## 🧪 Como Testar

Após reiniciar o servidor:

1. **Criar nova conversa** no WhatsApp
2. **Enviar:** "quero agendar"
3. **Bot detecta** intent AGENDAR
4. **Transfere** para fila principal
5. **Verificar mensagem** de sistema

### Resultado Esperado:

```
🤖 Bot transferiu conversa:

Motivo: Principal
Última intenção: AGENDAR
Histórico: Paciente estava em conversa com bot N8N
```

**SEM `**`!** ✅

---

## ⚠️ Importante

- Mensagens **antigas** (já criadas) continuarão com `**`
- Apenas **novas** mensagens terão a formatação corrigida
- Isso é normal - mensagens antigas ficam no banco como foram criadas

---

## 📋 Checklist

- [ ] Parar servidor (`Ctrl + C`)
- [ ] Reiniciar servidor (`npm run up`)
- [ ] Aguardar servidor iniciar
- [ ] Testar com nova conversa
- [ ] Verificar formatação correta

---

## 🚀 Próximos Passos

1. **Reiniciar servidor** agora
2. **Testar** com nova conversa
3. **Confirmar** que formatação está correta

---

**Precisa reiniciar o servidor para ver as mudanças!** 🔄
