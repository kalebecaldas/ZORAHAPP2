# 🗄️ Como Clonar o Banco de Dados do Railway para Local

Este guia mostra como clonar o banco de dados do Railway e rodar localmente.

---

## 📋 **Pré-requisitos**

1. ✅ PostgreSQL instalado localmente
2. ✅ Acesso ao projeto Railway
3. ✅ `DATABASE_URL` do Railway

---

## 🚀 **Passo a Passo**

### **1. Instalar PostgreSQL Localmente**

#### **Opção A: Via Homebrew (macOS)**

```bash
# Instalar PostgreSQL
brew install postgresql@14

# Iniciar serviço
brew services start postgresql@14

# Verificar se está rodando
pg_isready
```

#### **Opção B: Via Docker**

```bash
# Rodar PostgreSQL em container
docker run -d \
  --name postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=zorahapp \
  -p 5432:5432 \
  postgres:14

# Verificar se está rodando
docker ps
```

---

### **2. Configurar Banco Local**

Execute o script de setup:

```bash
# Dar permissão de execução
chmod +x scripts/setup_local_db.sh

# Executar setup
./scripts/setup_local_db.sh
```

Este script irá:
- ✅ Verificar se PostgreSQL está rodando
- ✅ Criar banco de dados `zorahapp`
- ✅ Criar arquivo `.env` com configurações padrão

---

### **3. Obter DATABASE_URL do Railway**

#### **Via Railway Dashboard:**

1. Acesse: https://railway.app/project/seu-projeto
2. Vá em **"Variables"** ou **"Settings"**
3. Copie o valor de `DATABASE_URL`
4. Formato: `postgresql://user:password@host:port/database`

#### **Via Railway CLI:**

```bash
# Instalar Railway CLI (se não tiver)
npm i -g @railway/cli

# Login
railway login

# Link ao projeto
railway link

# Ver variáveis
railway variables
```

---

### **4. Clonar Banco do Railway**

#### **Opção A: Via Script Automático (Recomendado)**

```bash
# 1. Configurar variável de ambiente
export RAILWAY_DATABASE_URL="postgresql://user:password@host:port/database"

# 2. Dar permissão de execução
chmod +x scripts/clone_database.sh

# 3. Executar clone
./scripts/clone_database.sh
```

O script irá:
- ✅ Fazer dump do banco Railway
- ✅ Criar arquivo `.sql` com os dados
- ✅ Importar dados no banco local
- ✅ Configurar `.env` automaticamente

#### **Opção B: Manual**

```bash
# 1. Fazer dump do Railway
pg_dump "postgresql://user:password@host:port/database" > railway_dump.sql

# 2. Criar banco local (se não existir)
createdb zorahapp

# 3. Importar dump
psql zorahapp < railway_dump.sql
```

---

### **5. Configurar .env Local**

Edite o arquivo `.env` criado:

```env
# Database Local
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/zorahapp"

# Railway Database (para referência)
RAILWAY_DATABASE_URL="postgresql://..."

# Server
PORT=4001
NODE_ENV=development

# OpenAI
OPENAI_API_KEY="sua-chave-aqui"
OPENAI_MODEL="gpt-4o"

# JWT
JWT_SECRET="seu-secret-aqui"
```

---

### **6. Executar Migrações**

```bash
# Gerar Prisma Client
npx prisma generate

# Aplicar migrações (se necessário)
npx prisma migrate deploy

# Ou resetar banco (CUIDADO: apaga dados locais)
npx prisma migrate reset
```

---

### **7. Verificar Conexão**

```bash
# Via Prisma Studio (interface visual)
npx prisma studio

# Ou via psql
psql postgresql://postgres:postgres@localhost:5432/zorahapp
```

---

## 🔄 **Sincronizar Dados Novamente**

Se precisar atualizar os dados locais com o Railway:

```bash
# Exportar variável novamente
export RAILWAY_DATABASE_URL="postgresql://..."

# Executar clone novamente
./scripts/clone_database.sh
```

**⚠️ ATENÇÃO:** Isso vai **sobrescrever** os dados locais!

---

## 🐛 **Troubleshooting**

### **Erro: "psql: command not found"**

PostgreSQL não está instalado ou não está no PATH.

**Solução:**
```bash
# macOS
brew install postgresql@14
export PATH="/opt/homebrew/opt/postgresql@14/bin:$PATH"
```

### **Erro: "connection refused"**

PostgreSQL não está rodando.

**Solução:**
```bash
# Verificar status
pg_isready

# Iniciar serviço
brew services start postgresql@14
# ou
docker start postgres
```

### **Erro: "database does not exist"**

Banco local não foi criado.

**Solução:**
```bash
# Criar banco manualmente
createdb zorahapp

# Ou executar setup
./scripts/setup_local_db.sh
```

### **Erro: "permission denied"**

Problema de permissões.

**Solução:**
```bash
# Dar permissão aos scripts
chmod +x scripts/*.sh

# Verificar permissões do PostgreSQL
psql -U postgres -c "ALTER USER postgres WITH SUPERUSER;"
```

### **Erro: "password authentication failed"**

Credenciais incorretas.

**Solução:**
- Verifique o `.env`
- Confirme usuário/senha do PostgreSQL local
- Para resetar senha: `psql -U postgres -c "ALTER USER postgres PASSWORD 'nova_senha';"`

---

## 📊 **Verificar Dados Importados**

```bash
# Conectar ao banco
psql postgresql://postgres:postgres@localhost:5432/zorahapp

# Ver tabelas
\dt

# Contar registros
SELECT COUNT(*) FROM "Patient";
SELECT COUNT(*) FROM "Procedure";
SELECT COUNT(*) FROM "Workflow";

# Sair
\q
```

---

## 🔐 **Segurança**

⚠️ **IMPORTANTE:**

1. **Nunca commite** o arquivo `.env` no git
2. **Nunca compartilhe** a `RAILWAY_DATABASE_URL` publicamente
3. Use variáveis de ambiente para credenciais
4. O arquivo `.env` já está no `.gitignore`

---

## 📝 **Comandos Úteis**

```bash
# Ver status do PostgreSQL
pg_isready

# Listar bancos de dados
psql -U postgres -c "\l"

# Conectar ao banco
psql postgresql://postgres:postgres@localhost:5432/zorahapp

# Fazer backup local
pg_dump zorahapp > backup_local.sql

# Restaurar backup local
psql zorahapp < backup_local.sql

# Ver tamanho do banco
psql -U postgres -c "SELECT pg_size_pretty(pg_database_size('zorahapp'));"
```

---

## ✅ **Checklist**

- [ ] PostgreSQL instalado e rodando
- [ ] Banco local criado (`zorahapp`)
- [ ] Arquivo `.env` configurado
- [ ] `RAILWAY_DATABASE_URL` obtida
- [ ] Dump do Railway feito
- [ ] Dados importados localmente
- [ ] Prisma Client gerado (`npx prisma generate`)
- [ ] Migrações aplicadas (`npx prisma migrate deploy`)
- [ ] Servidor rodando (`npm run dev`)

---

## 🎯 **Próximos Passos**

Após clonar o banco:

1. ✅ Testar conexão local
2. ✅ Verificar dados importados
3. ✅ Rodar servidor localmente
4. ✅ Testar endpoints da API
5. ✅ Desenvolver novas features

---

**Criado em:** 24/11/2025  
**Status:** ✅ Pronto para usar

