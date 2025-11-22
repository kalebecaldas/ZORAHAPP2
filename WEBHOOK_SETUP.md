# 🔗 Configuração do Webhook WhatsApp - Meta Business

## ✅ Status Atual

- ✅ Webhook implementado e funcionando
- ✅ Ngrok rodando (para testes locais)
- ✅ Servidor na porta 3001

## 📋 Informações para Configurar no Meta

### 1. URL do Callback (Callback URL)

```
https://d25bc88e5144.ngrok-free.app/webhook
```

**⚠️ IMPORTANTE:** Esta URL do ngrok muda a cada vez que você reinicia o ngrok. Para produção, você precisará de uma URL fixa (após deploy no Railway).

### 2. Token de Verificação (Verify Token)

Você precisa criar um token seguro e configurar no seu `.env`:

```env
META_WEBHOOK_VERIFY_TOKEN=seu-token-super-secreto-aqui
```

**Exemplo de token seguro:**
```
zorah-clinic-webhook-2024-abc123xyz
```

### 3. Passos para Configurar no Meta

1. **Na tela que você está vendo:**
   - **URL de callback:** Cole: `https://d25bc88e5144.ngrok-free.app/webhook`
   - **Verificar token:** Cole o token que você definiu no `.env` (ou crie um agora)
   - **Toggle "Anexar certificado":** Deixe desligado (não precisa)

2. **Clique em "Verificar e salvar"**

3. **Se aparecer "Webhook verificado" ✅:**
   - Vá para a seção "Assinar eventos" (abaixo)
   - Marque os eventos:
     - ✅ `messages` - Para receber mensagens
     - ✅ `message_status` - Para receber status de entrega

4. **Clique em "Salvar"**

## 🔧 Configuração das Variáveis de Ambiente

Crie ou edite o arquivo `.env` na raiz do projeto:

```env
# Meta WhatsApp Business API
META_ACCESS_TOKEN=seu-access-token-do-meta
META_PHONE_NUMBER_ID=seu-phone-number-id
META_WEBHOOK_VERIFY_TOKEN=seu-token-super-secreto-aqui

# Outras variáveis necessárias
JWT_SECRET=sua-chave-secreta-minimo-32-caracteres
OPENAI_API_KEY=sk-sua-chave-openai
NODE_ENV=development
PORT=3001
```

## 🧪 Testando o Webhook

### 1. Verificar se o servidor está rodando:
```bash
curl http://localhost:3001/api/health
```

Deve retornar: `{"success":true,"message":"ok",...}`

### 2. Testar verificação do webhook:
```bash
curl "http://localhost:3001/webhook?hub.mode=subscribe&hub.verify_token=SEU_TOKEN&hub.challenge=test123"
```

Se retornar `test123`, está funcionando! ✅

### 3. Enviar mensagem de teste:
- Envie uma mensagem do WhatsApp para o número configurado
- Verifique os logs do servidor
- A mensagem deve aparecer no sistema

## 📝 Checklist

- [ ] Token de verificação criado e adicionado no `.env`
- [ ] URL do callback configurada no Meta
- [ ] Token de verificação configurado no Meta
- [ ] Webhook verificado com sucesso
- [ ] Eventos assinados (`messages` e `message_status`)
- [ ] Mensagem de teste enviada e recebida

## 🚨 Problemas Comuns

### Webhook não verifica
- ✅ Verifique se o servidor está rodando: `npm run up`
- ✅ Verifique se o ngrok está rodando: `curl http://localhost:4040/api/tunnels`
- ✅ Confirme se o token no Meta é igual ao do `.env`
- ✅ Verifique os logs do servidor

### Mensagens não chegam
- ✅ Verifique se os eventos estão assinados no Meta
- ✅ Verifique os logs do servidor
- ✅ Confirme se o Access Token está válido

### URL do ngrok mudou
- ✅ Pare o ngrok atual
- ✅ Execute: `ngrok http 3001`
- ✅ Atualize a URL no Meta

## 🔄 Para Produção (Railway)

Quando fizer deploy no Railway:

1. **Atualize a URL do webhook no Meta:**
   ```
   https://seu-app.railway.app/webhook
   ```

2. **Configure as variáveis de ambiente no Railway:**
   - Vá em Settings → Variables
   - Adicione todas as variáveis do `.env`

3. **Teste novamente o webhook**

## 📞 Suporte

Se tiver problemas:
1. Verifique os logs do servidor
2. Verifique os logs do ngrok: `http://localhost:4040`
3. Teste a verificação manualmente (curl acima)

