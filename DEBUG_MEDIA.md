# Debug de Mídia - Correções Aplicadas

## Problemas Identificados

### 1. **Botão de Anexar (📎) não funciona**
**Causa**: O botão pode estar desabilitado se:
- O usuário não assumiu a conversa
- O status da conversa não é 'EM_ATENDIMENTO'
- A propriedade `canWrite` está `false`

**Correções aplicadas:**
- ✅ Adicionado `type="button"` para evitar submit acidental
- ✅ Adicionado `e.preventDefault()` e `e.stopPropagation()`
- ✅ Adicionado `console.log` para debug
- ✅ Adicionado `title` para mostrar mensagem quando desabilitado
- ✅ Alterado `accept` para usar `image/*,audio/*` ao invés de extensões específicas

### 2. **Erro ao baixar mídia do WhatsApp**
Mensagens de erro:
- `[IMAGE] Erro ao baixar imagem`
- `[AUDIO] Erro ao baixar áudio`

**Correções aplicadas:**
- ✅ Adicionados logs detalhados em `getMediaUrl()`
- ✅ Adicionados logs detalhados em `downloadMedia()`
- ✅ Logs incluem: Media ID, URL, tamanho do arquivo, status HTTP

## Como Testar

### Teste 1: Botão de Anexar
1. Certifique-se de que você **assumiu a conversa** (deve mostrar "Com você" no header)
2. Verifique no console se aparece: `📎 Clique no botão de anexar`
3. Se o botão estiver desabilitado, passe o mouse e veja a mensagem de erro

### Teste 2: Receber Mídia do WhatsApp
1. Envie uma **imagem** do WhatsApp real
2. Verifique os logs no terminal:
   ```
   📷 Baixando imagem: {mediaId}
   🔍 Buscando URL da mídia: {mediaId}
   ✅ URL da mídia obtida: {url}
   📥 Baixando mídia de: {url}
   ✅ Mídia baixada: {size} bytes
   ✅ Imagem salva: {filename}
   ```
3. Se der erro, verifique:
   - `META_ACCESS_TOKEN` está correto?
   - `META_PHONE_NUMBER_ID` está correto?
   - O token tem permissões para `whatsapp_business_messaging`?

### Teste 3: Enviar Áudio
1. Clique no botão do **microfone** (🎤)
2. Grave por alguns segundos
3. Clique em **parar** (⏹️)
4. Clique em **enviar** (✈️)
5. Verifique os logs no terminal

## Logs Úteis

### Frontend (Console do navegador - F12)
```javascript
📎 Clique no botão de anexar { canWrite: true, fileInputRef: true }
📁 Arquivos selecionados: 2
```

### Backend (Terminal)
```
📷 Baixando imagem: 123456789
🔍 Buscando URL da mídia: 123456789
✅ URL da mídia obtida: https://...
📥 Baixando mídia de: https://...
✅ Mídia baixada: 45678 bytes
✅ Imagem salva: 1732221234567-msgid.jpg
```

## Próximos Passos

Se ainda houver erros após essas correções:

1. **Erro de autenticação do Meta**:
   - Verifique se o token não expirou
   - Regenere o token em https://developers.facebook.com

2. **Erro de permissões**:
   - Verifique se o app tem permissão `whatsapp_business_management`
   - Verifique se o app está em modo de produção (não sandbox)

3. **Erro de webhook**:
   - Certifique-se de que o ngrok está rodando
   - Verifique se o webhook está configurado corretamente no Meta

## Variáveis de Ambiente Necessárias

```env
META_ACCESS_TOKEN=EAAZCZBwK3EFPo...     # Token de acesso permanente
META_PHONE_NUMBER_ID=854784721056833    # ID do número do WhatsApp
META_WEBHOOK_VERIFY_TOKEN=zorah-...     # Token de verificação
APP_URL=http://localhost:4002           # URL base (ou URL do Railway)
```

