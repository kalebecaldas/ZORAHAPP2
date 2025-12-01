# Como Configurar Instagram para Receber Mensagens

Este guia explica como configurar o sistema para receber mensagens do Instagram.

## 📋 Pré-requisitos

1. Conta Instagram Business ou Creator
2. App criado no [Meta for Developers](https://developers.facebook.com/)
3. Acesso ao painel do Instagram App

## 🔧 Passo 1: Configurar App no Meta for Developers

1. Acesse [Meta for Developers](https://developers.facebook.com/)
2. Vá em **Meus Apps** > Seu App do Instagram
3. Certifique-se de que o app está em modo **Desenvolvimento** ou **Publicado**

## 🔑 Passo 2: Obter Credenciais

Você precisará das seguintes informações:

- **Instagram App ID**: Encontrado na página inicial do app
- **Instagram App Secret**: Encontrado em **Configurações** > **Básico**
- **Access Token**: Gerado na seção "Gere tokens de acesso"

### Como obter o Access Token:

1. No painel do app, vá em **Ferramentas** > **Gere tokens de acesso**
2. Selecione sua conta do Instagram Business
3. Copie o token gerado

## 🌐 Passo 3: Configurar Webhook

### 3.1. URL do Webhook

A URL do webhook deve ser:
```
https://seu-dominio.railway.app/webhook/instagram
```

### 3.2. Verificar Token

1. No painel do Instagram App, vá em **Webhooks**
2. Clique em **Configurar** ou **Editar**
3. Configure:
   - **URL de callback**: `https://seu-dominio.railway.app/webhook/instagram`
   - **Verificar token**: Use um token seguro (ex: `zoraH_instagram_2024_secure_token`)
   - Clique em **Verificar e salvar**

### 3.3. Assinar Eventos

Certifique-se de assinar os seguintes eventos:
- ✅ `messages` - Mensagens recebidas
- ✅ `messaging_postbacks` - Cliques em botões
- ✅ `messaging_optins` - Opt-ins
- ✅ `messaging_referrals` - Referências

## 🔐 Passo 4: Configurar Variáveis de Ambiente

Adicione as seguintes variáveis no Railway (ou `.env` local):

```env
# Instagram Configuration
INSTAGRAM_APP_ID=seu_app_id_aqui
INSTAGRAM_ACCESS_TOKEN=seu_access_token_aqui
INSTAGRAM_WEBHOOK_VERIFY_TOKEN=seu_verify_token_aqui
```

### No Railway:

1. Vá em **Variables** no seu projeto
2. Adicione cada variável:
   - `INSTAGRAM_APP_ID`: ID do seu app Instagram
   - `INSTAGRAM_ACCESS_TOKEN`: Token de acesso gerado
   - `INSTAGRAM_WEBHOOK_VERIFY_TOKEN`: Token usado na configuração do webhook

## ✅ Passo 5: Verificar Configuração

### 5.1. Testar Webhook

Após configurar, o Instagram enviará uma requisição GET para verificar o webhook. O sistema deve responder com o `challenge` recebido.

### 5.2. Testar Recebimento de Mensagens

1. Envie uma mensagem para sua conta Instagram Business
2. Verifique os logs do Railway para ver se a mensagem foi recebida
3. A mensagem deve aparecer no sistema de conversas

## 📱 Passo 6: Enviar Mensagens

O sistema detecta automaticamente se é Instagram ou WhatsApp baseado no formato do ID:

- **Instagram**: IDs numéricos longos (ex: `1234567890123456`)
- **WhatsApp**: Números de telefone (ex: `5511999999999`)

Para enviar mensagens via Instagram, use o mesmo endpoint `/api/conversations/send` com o ID do usuário do Instagram.

## 🔍 Troubleshooting

### Webhook não está sendo verificado

1. Verifique se a URL está correta e acessível
2. Verifique se o `INSTAGRAM_WEBHOOK_VERIFY_TOKEN` está correto
3. Verifique os logs do Railway

### Mensagens não estão chegando

1. Verifique se o app está em modo **Publicado** (webhooks só funcionam em produção)
2. Verifique se os eventos estão assinados corretamente
3. Verifique os logs do Railway para erros

### Erro 401 ao enviar mensagens

1. Verifique se o `INSTAGRAM_ACCESS_TOKEN` está válido
2. Tokens expiram - gere um novo se necessário
3. Verifique se o token tem as permissões necessárias

## 📚 Recursos Adicionais

- [Documentação da API do Instagram](https://developers.facebook.com/docs/instagram-api)
- [Guia de Webhooks do Instagram](https://developers.facebook.com/docs/instagram-api/guides/webhooks)
- [Permissões do Instagram](https://developers.facebook.com/docs/instagram-api/reference)

## 🔄 Atualizar Token Expirado

Se o token expirar:

1. Vá em **Ferramentas** > **Gere tokens de acesso**
2. Gere um novo token
3. Atualize a variável `INSTAGRAM_ACCESS_TOKEN` no Railway
4. Reinicie o serviço

