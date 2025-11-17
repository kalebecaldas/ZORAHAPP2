# 🚀 Guia de Deploy em Produção

Este guia fornece instruções detalhadas para fazer o deploy do sistema de clínica com WhatsApp AI em produção.

## 📋 Checklist de Preparação

### ✅ Requisitos Mínimos
- **Servidor**: 2 vCPUs, 4GB RAM, 50GB SSD
- **Banco de Dados**: PostgreSQL 14+ ou Supabase
- **Node.js**: Versão 18 ou superior
- **Process Manager**: PM2 ou systemd
- **Proxy Reverso**: Nginx ou Apache
- **SSL**: Certificado SSL/TLS válido

### 🔐 Credenciais Necessárias
- [ ] Conta WhatsApp Business API verificada
- [ ] Chave API OpenAI com créditos
- [ ] Domínio próprio com SSL
- [ ] Conta em serviço de hospedagem (Vercel, Railway, etc.)

## 🛠️ Configuração do Ambiente

### 1. Variáveis de Ambiente de Produção
```bash
# .env.production
NODE_ENV="production"
PORT=3002

# Banco de Dados
DATABASE_URL="postgresql://usuario:senha@host:5432/clinic_db"

# JWT
JWT_SECRET="sua-chave-super-secreta-com-minimo-32-caracteres"
JWT_EXPIRES_IN="7d"

# OpenAI
OPENAI_API_KEY="sk-sua-chave-openai-producao"
OPENAI_MODEL="gpt-3.5-turbo"

# WhatsApp Business API
WHATSAPP_ACCESS_TOKEN="EAArUOc8Hca0BPZBe4K..."  # Seu token real
WHATSAPP_PHONE_NUMBER_ID="123456789012345"
WHATSAPP_BUSINESS_ACCOUNT_ID="123456789012345"
WHATSAPP_WEBHOOK_VERIFY_TOKEN="webhook-verify-token-seguro"

# URLs de Produção
FRONTEND_URL="https://sua-clinica.com"
API_URL="https://api.sua-clinica.com"
WEBHOOK_URL="https://api.sua-clinica.com/api/webhook/whatsapp"

# Segurança
CORS_ORIGIN="https://sua-clinica.com"
RATE_LIMIT_WINDOW_MS="900000"  # 15 minutos
RATE_LIMIT_MAX_REQUESTS="100"
```

### 2. Configuração do Banco de Dados

#### PostgreSQL
```sql
-- Criar banco de dados
CREATE DATABASE clinic_db;

-- Criar usuário com permissões limitadas
CREATE USER clinic_user WITH PASSWORD 'senha-segura';
GRANT ALL PRIVILEGES ON DATABASE clinic_db TO clinic_user;

-- Conceder permissões específicas (após migrations)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO clinic_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO clinic_user;
```

#### Migrações
```bash
# Executar migrations em produção
npx prisma migrate deploy

# Verificar status
npx prisma migrate status
```

## 🚀 Deploy na Vercel (Recomendado)

### 1. Prepare o Projeto
```bash
# Build do frontend
npm run build

# Build do backend
npm run build:api

# Teste localmente
npm run preview
```

### 2. Configure o vercel.json
```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/index.js",
      "use": "@vercel/node"
    },
    {
      "src": "dist/**",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/index.js"
    },
    {
      "src": "/(.*)",
      "dest": "/dist/$1"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### 3. Deploy na Vercel
```bash
# Instale a CLI da Vercel
npm i -g vercel

# Faça login
vercel login

# Deploy
vercel --prod
```

### 4. Configure as Variáveis na Vercel
```bash
# No dashboard da Vercel ou via CLI
vercel env add DATABASE_URL production
vercel env add JWT_SECRET production
vercel env add OPENAI_API_KEY production
vercel env add WHATSAPP_ACCESS_TOKEN production
# ... adicione todas as variáveis
```

## 🚂 Deploy na Railway

### 1. Conecte seu Repositório
- Acesse https://railway.app
- Conecte seu GitHub
- Crie um novo projeto a partir do repositório

### 2. Configure os Serviços
```bash
# Service: PostgreSQL Database
# Railway criará automaticamente

# Service: Web Application
# Configure o build e start commands
```

### 3. Environment Variables
Configure as variáveis no dashboard da Railway ou use o CLI:
```bash
railway login
railway init
railway variables set NODE_ENV=production
railway variables set DATABASE_URL=postgresql://...
# ... configure todas as variáveis
```

### 4. Deploy
```bash
# Deploy automático a cada push para main
# Ou deploy manual:
railway up
```

## 🔧 Deploy com Docker

### Dockerfile
```dockerfile
# Backend
FROM node:18-alpine AS backend
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY api ./api
COPY prisma ./prisma
RUN npx prisma generate
EXPOSE 3002
CMD ["npm", "run", "start:api"]

# Frontend
FROM node:18-alpine AS frontend
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production
FROM nginx:alpine
COPY --from=frontend /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### docker-compose.yml
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: clinic_db
      POSTGRES_USER: clinic_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    environment:
      - DATABASE_URL=postgresql://clinic_user:${DB_PASSWORD}@postgres:5432/clinic_db
      - NODE_ENV=production
    ports:
      - "3002:3002"
    depends_on:
      - postgres

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "80:80"
    depends_on:
      - backend

  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend

volumes:
  postgres_data:
```

## 🔒 Configuração de Segurança

### 1. Nginx Configuration
```nginx
# nginx.conf
server {
    listen 80;
    server_name sua-clinica.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name sua-clinica.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;

    # Frontend
    location / {
        proxy_pass http://frontend:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API
    location /api {
        proxy_pass http://backend:3002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Rate limiting
        limit_req zone=api burst=10 nodelay;
        
        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
    }

    # Webhook WhatsApp
    location /api/webhook/whatsapp {
        proxy_pass http://backend:3002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Allow only Meta IPs
        allow 31.13.66.0/24;
        allow 66.220.144.0/20;
        allow 69.63.176.0/20;
        allow 69.171.224.0/19;
        allow 74.119.76.0/22;
        allow 103.4.96.0/22;
        allow 173.252.64.0/18;
        allow 204.15.20.0/22;
        deny all;
    }
}
```

### 2. Rate Limiting
```bash
# /etc/nginx/nginx.conf
http {
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=webhook:10m rate=5r/s;
}
```

### 3. Firewall
```bash
# UFW (Ubuntu)
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw deny 3002/tcp   # Bloquear porta direta da API
ufw enable
```

## 📊 Monitoramento

### 1. PM2 para Node.js
```bash
# Instale o PM2 globalmente
npm install -g pm2

# Crie um ecosystem file
echo 'module.exports = {
  apps: [{
    name: "clinic-api",
    script: "./api/index.js",
    instances: "max",
    exec_mode: "cluster",
    env: {
      NODE_ENV: "production",
      PORT: 3002
    }
  }]
}' > ecosystem.config.js

# Inicie com PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 2. Logs e Monitoramento
```bash
# Monitore os logs
pm2 logs clinic-api

# Veja métricas
pm2 monit

# Configure logs rotativos
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### 3. Health Checks
```bash
# Verifique se a aplicação está respondendo
curl -f http://localhost:3002/api/health || exit 1

# Verifique o banco de dados
npx prisma migrate status
```

## 🔄 CI/CD Pipeline

### GitHub Actions
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: '18'
    - run: npm ci
    - run: npm test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Deploy to Vercel
      run: |
        npm i -g vercel
        vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
```

## 🚨 Troubleshooting

### Problemas Comuns

#### 1. WhatsApp Webhook Não Funciona
```bash
# Verifique o webhook
curl -X GET "https://api.sua-clinica.com/api/webhook/whatsapp?hub.verify_token=SEU_TOKEN&hub.challenge=TESTE"

# Verifique os logs
tail -f /var/log/nginx/error.log
```

#### 2. Banco de Dados Não Conecta
```bash
# Teste a conexão
npx prisma db pull

# Verifique as permissões
psql -h localhost -U clinic_user -d clinic_db -c "SELECT current_user;"
```

#### 3. Performance Lenta
```bash
# Verifique uso de CPU/Memória
htop

# Analise queries lentas
npx prisma studio

# Verifique índices
npx prisma migrate status
```

### Backup e Recovery
```bash
# Backup do banco de dados
pg_dump -h localhost -U clinic_user clinic_db > backup_$(date +%Y%m%d).sql

# Backup dos uploads
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz /caminho/para/uploads

# Restore
psql -h localhost -U clinic_user clinic_db < backup_20231114.sql
```

## 📞 Suporte

Se encontrar problemas durante o deploy:

1. **Verifique os logs**: Sempre comece verificando os logs da aplicação
2. **Teste localmente**: Certifique-se de que funciona em desenvolvimento
3. **Variáveis de ambiente**: Verifique se todas estão configuradas corretamente
4. **Network**: Confirme portas, firewalls e proxy reverso
5. **Documentação**: Consulte a documentação oficial de cada serviço

Para suporte adicional:
- 📧 Email: suporte@clinica.com
- 💬 WhatsApp: (11) 99999-9999
- 📚 Documentação: https://docs.clinica.com