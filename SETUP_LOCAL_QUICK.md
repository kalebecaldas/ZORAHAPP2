# ⚡ Setup Local Rápido

## ✅ **Status Atual**

- ✅ PostgreSQL instalado e rodando
- ✅ Banco `zorahapp` criado
- ✅ Arquivo `.env` configurado
- ✅ Prisma Client gerado
- ⚠️ Migrações precisam ser ajustadas (SQLite → PostgreSQL)

---

## 🚀 **Próximos Passos**

### **1. Clonar Dados do Railway**

```bash
# 1. Obter DATABASE_URL do Railway
# Acesse: https://railway.app/project/seu-projeto → Variables → DATABASE_URL

# 2. Exportar variável
export RAILWAY_DATABASE_URL="postgresql://user:password@host:port/database"

# 3. Clonar banco
./scripts/clone_database_simple.sh
```

Isso vai:
- ✅ Fazer dump do Railway
- ✅ Importar dados no banco local
- ✅ Manter todas as tabelas e dados

---

### **2. Ajustar Migrações (se necessário)**

Se as migrações derem erro porque foram feitas para SQLite:

**Opção A: Usar dados clonados (recomendado)**
```bash
# Se você clonou o banco do Railway, ele já tem todas as tabelas
# Não precisa rodar migrações!
```

**Opção B: Recriar migrações para PostgreSQL**
```bash
# 1. Fazer backup do banco atual (se tiver dados importantes)
pg_dump zorahapp > backup_before_migrate.sql

# 2. Resetar migrações
rm -rf prisma/migrations

# 3. Criar nova migração inicial
npx prisma migrate dev --name init_postgresql

# 4. Se já clonou dados do Railway, pode pular este passo
```

---

### **3. Verificar Conexão**

```bash
# Testar conexão
psql postgresql://kalebecaldas@localhost:5432/zorahapp -c "SELECT COUNT(*) FROM \"User\";"

# Ou via Prisma Studio (interface visual)
npx prisma studio
```

---

### **4. Iniciar Servidor**

```bash
# Instalar dependências (se necessário)
npm install

# Iniciar servidor
npm run dev
```

---

## 📋 **Checklist**

- [ ] PostgreSQL rodando (`pg_isready`)
- [ ] Banco `zorahapp` criado
- [ ] Arquivo `.env` configurado
- [ ] `RAILWAY_DATABASE_URL` exportada
- [ ] Dados clonados do Railway (`./scripts/clone_database_simple.sh`)
- [ ] Prisma Client gerado (`npx prisma generate`)
- [ ] Conexão testada (`npx prisma studio`)
- [ ] Servidor rodando (`npm run dev`)

---

## 🔧 **Comandos Úteis**

```bash
# Ver banco local
psql -l | grep zorahapp

# Conectar ao banco
psql zorahapp

# Ver tabelas
psql zorahapp -c "\dt"

# Contar registros
psql zorahapp -c "SELECT COUNT(*) FROM \"User\";"
psql zorahapp -c "SELECT COUNT(*) FROM \"Patient\";"
psql zorahapp -c "SELECT COUNT(*) FROM \"Workflow\";"

# Fazer backup local
pg_dump zorahapp > backup_local.sql

# Restaurar backup
psql zorahapp < backup_local.sql
```

---

## 🐛 **Problemas Comuns**

### **Erro: "migration_lock.toml" com SQLite**

**Solução:** Se você clonou o banco do Railway, ele já tem todas as tabelas. Não precisa rodar migrações!

### **Erro: "role postgres does not exist"**

**Solução:** Use seu usuário atual:
```bash
DATABASE_URL="postgresql://$(whoami)@localhost:5432/zorahapp"
```

### **Erro: "database does not exist"**

**Solução:**
```bash
createdb zorahapp
```

---

## 🎯 **Resumo**

1. **Clone os dados do Railway** (isso já cria todas as tabelas)
2. **Configure o `.env`** (já feito ✅)
3. **Gere Prisma Client** (já feito ✅)
4. **Inicie o servidor** (`npm run dev`)

**Não precisa rodar migrações se você clonou o banco do Railway!** 🎉

