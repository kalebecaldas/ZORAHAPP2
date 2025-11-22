# Sistema de Envio e Recebimento de Mídia

## O que foi implementado

### 1. **Banco de Dados** ✅
- Adicionado campo `messageType` para tipos: TEXT, IMAGE, DOCUMENT, AUDIO
- Adicionado campo `mediaUrl` para armazenar URLs das mídias
- Adicionado campo `metadata` (JSON) para metadados adicionais

### 2. **Backend - Webhook** ✅
Quando uma mídia é recebida do WhatsApp:
- Baixa a imagem/documento/áudio da API do Meta
- Salva no diretório `uploads/`
- Cria URL local: `/api/conversations/files/{filename}`
- Armazena mensagem com tipo e URL no banco

### 3. **Backend - Envio de Mídia** ✅
Endpoint: `POST /api/conversations/:id/files`
- Aceita múltiplos arquivos
- Envia via WhatsApp Business API
- Salva localmente em `uploads/`
- Cria mensagens no banco com tipo correto
- Emite eventos Socket.IO em tempo real

### 4. **Frontend** ✅
- Exibição de imagens (clicável para abrir em nova aba)
- Player de áudio integrado
- Links para documentos
- Upload de arquivos via botão de clipe
- Gravação e envio de áudio via botão de microfone
- **Bug corrigido**: endpoint de envio de áudio agora usa conversation ID

### 5. **Tipos de Mídia Suportados**
- **Imagens**: JPG, PNG
- **Documentos**: PDF, DOCX
- **Áudio**: WebM (gravação), OGG (WhatsApp)

## Estrutura de Arquivos

```
uploads/              # Diretório de armazenamento de mídia
  ├── {timestamp}-{messageId}.jpg
  ├── {timestamp}-{messageId}.pdf
  └── {timestamp}-{messageId}.ogg
```

## Endpoints

### Receber Webhook
```
POST /api/webhook
```
Processa mensagens do WhatsApp incluindo mídia.

### Enviar Arquivos
```
POST /api/conversations/:id/files
Content-Type: multipart/form-data
Body: files[]
```

### Servir Arquivos
```
GET /api/conversations/files/:filename
```

## Variáveis de Ambiente

```env
APP_URL=http://localhost:4002         # URL base para links de mídia
META_ACCESS_TOKEN=...                 # Token Meta
META_PHONE_NUMBER_ID=...              # Phone Number ID Meta
```

## Railway Deploy

Para deploy no Railway, certifique-se de:
1. Configurar `APP_URL` com a URL do Railway (ex: `https://your-app.railway.app`)
2. Criar volume persistente para o diretório `uploads/` (ou usar S3/Cloudinary)
3. Configurar webhook do Meta apontando para `https://your-app.railway.app/api/webhook`

## Melhorias Futuras (Opcional)

- [ ] Upload para S3/Cloudinary ao invés de armazenamento local
- [ ] Compressão de imagens antes do envio
- [ ] Conversão de formatos de áudio
- [ ] Visualização de vídeos
- [ ] Thumbnails para documentos
- [ ] Preview de arquivos antes do envio

