# 🧪 Teste de Recebimento de Mensagens WhatsApp

## ✅ Status Atual

- ✅ Servidor rodando na porta 3001
- ✅ Webhook configurado e verificado no Meta
- ✅ Ngrok funcionando: `https://5dc7451bd627.ngrok-free.app/webhook`
- ✅ Sistema pronto para receber mensagens

## 📱 Como Testar

### 1. Envie uma mensagem do WhatsApp

Envie uma mensagem do seu número de WhatsApp para o número configurado no Meta Business.

**Exemplo de mensagens para testar:**
- `Olá`
- `Quero agendar`
- `Preciso de informações`

### 2. Monitore os Logs

**Opção 1: Terminal (recomendado)**
```bash
# Em um novo terminal, execute:
tail -f /tmp/server.log | grep -E "📥|📨|❌|⚠️|Webhook|mensagem"
```

**Opção 2: Script de monitoramento**
```bash
./scripts/monitor-webhook.sh
```

**Opção 3: Ver logs completos**
```bash
tail -f /tmp/server.log
```

### 3. O que você deve ver nos logs:

Quando uma mensagem chegar, você verá algo como:

```
📥 Webhook recebido: { ... }
📨 Processando mensagem de 5511999999999: Olá
```

### 4. Verificar no Sistema

Após receber a mensagem:
1. Acesse o sistema: `http://localhost:4002`
2. Vá em "Conversas"
3. A mensagem deve aparecer na lista
4. Clique na conversa para ver os detalhes

## 🔍 O que o Sistema Faz Quando Recebe uma Mensagem

1. **Recebe via Webhook** → `/webhook` (POST)
2. **Extrai dados** → telefone, texto, ID da mensagem
3. **Processa mensagem** → `processIncomingMessage()`
4. **Cria/Busca paciente** → no banco de dados
5. **Cria/Busca conversa** → associa ao paciente
6. **Salva mensagem** → no banco de dados
7. **Processa workflow** → bot responde automaticamente
8. **Atualiza em tempo real** → via Socket.IO

## 🐛 Troubleshooting

### Mensagem não aparece nos logs

1. **Verifique se o webhook está ativo:**
   ```bash
   curl -s "https://5dc7451bd627.ngrok-free.app/webhook?hub.mode=subscribe&hub.verify_token=zorah-clinic-webhook-2024-abc123&hub.challenge=test"
   ```
   Deve retornar: `test`

2. **Verifique os eventos assinados no Meta:**
   - Vá no dashboard do Meta
   - Verifique se `messages` está assinado
   - Verifique se `message_status` está assinado

3. **Verifique os logs do ngrok:**
   ```bash
   # Acesse: http://localhost:4040
   # Veja as requisições recebidas
   ```

### Mensagem aparece nos logs mas não no sistema

1. **Verifique o banco de dados:**
   ```bash
   npx prisma studio
   ```
   - Verifique a tabela `Message`
   - Verifique a tabela `Conversation`

2. **Verifique os logs de erro:**
   ```bash
   tail -f /tmp/server.log | grep -i error
   ```

### Webhook não recebe nada

1. **Teste manualmente o webhook:**
   ```bash
   curl -X POST https://5dc7451bd627.ngrok-free.app/webhook \
     -H "Content-Type: application/json" \
     -d '{
       "object": "whatsapp_business_account",
       "entry": [{
         "changes": [{
           "value": {
             "messages": [{
               "from": "5511999999999",
               "id": "test123",
               "timestamp": "1234567890",
               "text": {
                 "body": "Teste manual"
               },
               "type": "text"
             }]
           }
         }]
       }]
     }'
   ```

## ✅ Checklist de Teste

- [ ] Enviei uma mensagem do WhatsApp
- [ ] Vi os logs no servidor (📥 Webhook recebido)
- [ ] Vi a mensagem sendo processada (📨 Processando mensagem)
- [ ] Mensagem apareceu no sistema (página de Conversas)
- [ ] Bot respondeu automaticamente (se workflow configurado)

## 📞 Próximos Passos

Após confirmar que está recebendo mensagens:
1. ✅ Testar envio de mensagens (resposta do bot)
2. ✅ Configurar workflow completo
3. ✅ Fazer deploy no Railway
4. ✅ Atualizar URL do webhook para produção

