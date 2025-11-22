# 🔴 PROBLEMA IDENTIFICADO: Token de Acesso Expirado

## ❌ Erro Atual
```
Error validating access token: Session has expired on Friday, 21-Nov-25 12:00:00 PST
```

O token `META_ACCESS_TOKEN` no arquivo `.env` expirou. Por isso:
- ✅ O webhook **recebe** as mensagens normalmente
- ❌ Mas **não consegue baixar** as imagens do WhatsApp
- ❌ As mensagens aparecem como "[IMAGE] Erro ao baixar imagem"

## 🔧 Como Resolver

### Opção 1: Gerar Novo Token Temporário (24h-60 dias)
1. Acesse: https://developers.facebook.com/apps
2. Selecione seu app
3. Vá em **WhatsApp > API Setup**
4. Role até **Temporary access token** ou **Access Token**
5. Clique em "Generate Token" ou copie o token atual (se ainda não expirou)
6. Cole no arquivo `.env` substituindo o valor de `META_ACCESS_TOKEN`

### Opção 2: Gerar Token Permanente (Recomendado para Produção)
1. Acesse: https://business.facebook.com/settings/system-users
2. Crie ou selecione um **System User**
3. Gere um **Permanent Token** com as permissões:
   - `whatsapp_business_management`
   - `whatsapp_business_messaging`
   - `business_management`
4. Cole no arquivo `.env`

### Opção 3: Renovar Token via API (Automatizado)
Se você tiver um token de longa duração mas quer estendê-lo:
```bash
curl -i -X GET "https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=YOUR_APP_ID&client_secret=YOUR_APP_SECRET&fb_exchange_token=YOUR_CURRENT_TOKEN"
```

## 📝 Após Renovar

1. **Atualize o `.env`**:
   ```env
   META_ACCESS_TOKEN=NOVO_TOKEN_AQUI
   ```

2. **Reinicie o servidor**:
   ```bash
   npm run kill-ports && npm run up
   ```

3. **Teste enviando uma nova imagem** pelo WhatsApp

4. **Verifique** se a imagem aparece corretamente no chat

## 🔍 Verificar Status do Token
```bash
curl "https://graph.facebook.com/v21.0/me?access_token=SEU_TOKEN"
```

Se retornar erro, o token está inválido.
Se retornar `{"id":"..."}`, o token está válido.

## ⚠️ Importante
- Tokens temporários expiram em 24h-60 dias
- Para produção no Railway, use **token permanente** de System User
- Nunca commite o token no Git (já está no `.gitignore`)
