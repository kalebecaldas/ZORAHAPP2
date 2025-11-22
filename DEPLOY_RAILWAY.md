# Guia de Deploy no Railway com Uploads

Este guia explica como configurar o projeto no Railway para suportar uploads de arquivos persistentes.

## 1. Configuração Básica

1. Conecte seu repositório GitHub ao Railway.
2. O Railway deve detectar automaticamente o `package.json` e usar `npm run build` e `npm start`.

## 2. Variáveis de Ambiente

Adicione as seguintes variáveis no painel do Railway:

```env
# URL da aplicação (usada para gerar links de mídia)
APP_URL=https://sua-app.railway.app

# Porta (o Railway define isso automaticamente, mas bom ter fallback)
PORT=3001

# Banco de Dados (se usar Postgres/MySQL gerenciado pelo Railway, isso é automático)
DATABASE_URL=...

# WhatsApp API
META_ACCESS_TOKEN=...
META_PHONE_NUMBER_ID=...

# JWT Secret
JWT_SECRET=...
```

## 3. Persistência de Arquivos (Uploads)

O Railway usa sistema de arquivos efêmero, ou seja, arquivos salvos em disco são perdidos a cada deploy/restart. Para manter os uploads, você tem duas opções:

### Opção A: Volume Persistente (Mais Simples)
1. No painel do serviço no Railway, vá em **Volumes**.
2. Clique em **Add Volume**.
3. Monte o volume no caminho `/app/uploads`.
   - **Mount Path**: `/app/uploads`
4. Isso garantirá que tudo salvo na pasta `uploads` persista entre deploys.

### Opção B: S3 / Cloudinary (Recomendado para Escala)
Para usar armazenamento externo, seria necessário alterar o código para subir arquivos para um serviço de storage.
*Atualmente o sistema está configurado para armazenamento local.*

## 4. Build Command
Certifique-se de que o comando de build inclua a geração do cliente Prisma:
```bash
npm install && npx prisma generate && npm run build
```

## 5. Start Command
```bash
npm start
```

## 6. Verificação de Saúde
Configure o Health Check Path para:
`/api/health`
