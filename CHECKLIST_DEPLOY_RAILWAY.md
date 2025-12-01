# Checklist de Deploy para Railway

## ✅ Antes do Deploy

### 1. Variáveis de Ambiente no Railway
Verifique se todas as variáveis do Instagram estão configuradas no Railway:
- ✅ `INSTAGRAM_APP_ID`
- ✅ `INSTAGRAM_APP_SECRET`
- ✅ `INSTAGRAM_WEBHOOK_VERIFY_TOKEN` (deve ser o mesmo configurado no painel do Instagram)
- ✅ `INSTAGRAM_PAGE_ID`
- ✅ `INSTAGRAM_ACCESS_TOKEN` (token válido para envio de mensagens)

### 2. Webhook do Instagram
- ✅ URL do webhook configurada no painel do Instagram: `https://seu-app.railway.app/api/instagram-webhook`
- ✅ Token de verificação (`INSTAGRAM_WEBHOOK_VERIFY_TOKEN`) deve ser idêntico no `.env` do Railway e no painel do Instagram

### 3. Arquivos para Commit
Todos os arquivos modificados estão prontos para commit:
- ✅ Correções de mensagens (direction/sender)
- ✅ Correções de channel (Instagram/WhatsApp)
- ✅ Correções de criação de usuários
- ✅ Script de fix de channels

## 🚀 Deploy

### 1. Fazer Commit
```bash
git add .
git commit -m "feat: correções de mensagens, channels e criação de usuários

- Corrigido mapeamento de sender usando direction como fonte principal
- Adicionado suporte para channel Instagram/WhatsApp nas tags
- Corrigido erro de criação de usuários (hashPassword)
- Adicionado script para corrigir channels de conversas existentes
- Melhorado tratamento de erros e logs"
```

### 2. Push para GitHub
```bash
git push origin main
```

### 3. Railway fará deploy automaticamente
- O Railway detectará o push e iniciará o deploy
- O comando `npm start` executará:
  - `npx prisma db push` (atualizar schema)
  - `npx tsx scripts/import_workflow_definitivo.ts` (importar workflow)
  - `npx tsx api/server.ts` (iniciar servidor)

## 🔧 Após o Deploy

### 1. Corrigir Channels de Conversas Existentes
Execute o script para atualizar conversas antigas que foram criadas com `channel: 'whatsapp'` mas são do Instagram:

**Opção A: Via Railway Dashboard Shell**
1. Acesse o Railway Dashboard
2. Vá em "Deployments" > Selecione o serviço > "Shell"
3. Execute:
```bash
npm run fix:conversation-channels
```

**Opção B: Via Railway CLI (se configurado)**
```bash
railway run npm run fix:conversation-channels
```

### 2. Verificar Logs
- Verifique os logs do Railway para confirmar que o deploy foi bem-sucedido
- Verifique se não há erros relacionados ao Instagram

### 3. Testar Funcionalidades
- ✅ Criar novo usuário (deve funcionar agora)
- ✅ Enviar mensagem do Instagram (deve aparecer com ícone rosa)
- ✅ Enviar mensagem do WhatsApp (deve aparecer com ícone verde)
- ✅ Verificar se as mensagens aparecem do lado correto (bot à direita, paciente à esquerda)

## ⚠️ Possíveis Problemas

### Se o webhook do Instagram não funcionar:
1. Verifique se `INSTAGRAM_WEBHOOK_VERIFY_TOKEN` está idêntico no Railway e no painel do Instagram
2. Verifique se a URL do webhook está correta: `https://seu-app.railway.app/api/instagram-webhook`
3. Reinicie o serviço no Railway após atualizar variáveis

### Se as conversas ainda mostrarem ícone errado:
- Execute o script `fix:conversation-channels` no Railway
- Verifique se novas mensagens do Instagram estão sendo criadas com `channel: 'instagram'`

### Se houver erro ao criar usuário:
- Verifique os logs do Railway
- Confirme que `bcryptjs` está instalado (já está no package.json)

## 📝 Notas Importantes

- O script `fix_conversation_channels.ts` precisa ser executado **apenas uma vez** após o deploy para corrigir conversas antigas
- Novas conversas serão criadas automaticamente com o channel correto
- As variáveis de ambiente do Instagram devem ser configuradas no Railway Dashboard, não no código

