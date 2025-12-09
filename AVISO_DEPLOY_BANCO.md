# ⚠️ AVISO: Deploy no Railway MODIFICA o Banco de Dados

## 🔴 O que acontece durante o deploy

Quando você roda `railway up` ou faz push para o repositório, o Railway executa:

```bash
npm start
```

Que executa:

```bash
npm run deploy:prod
```

Que executa:

```bash
npx prisma db push && npx tsx scripts/seed_complete.ts && npx tsx scripts/import_workflow_definitivo.ts && npx tsx api/server.ts
```

---

## ⚠️ OPERAÇÕES NO BANCO DE DADOS

### 1. `npx prisma db push`
**⚠️ MODIFICA O BANCO!**

- Atualiza o **schema do banco** para corresponder ao `schema.prisma`
- **Pode adicionar/remover colunas**
- **Pode alterar tipos de dados**
- **Pode criar/remover tabelas**
- **NÃO preserva dados** se houver mudanças incompatíveis

### 2. `npx tsx scripts/seed_complete.ts`
**⚠️ PODE MODIFICAR O BANCO!**

- Verifica se configuração da IA existe, se não, cria
- Verifica dados de clínica (não cria se já existir)
- Cria configurações padrão do sistema se não existir
- **Usa `upsert`** - não duplica dados, mas pode atualizar

### 3. `npx tsx scripts/import_workflow_definitivo.ts`
**⚠️ MODIFICA O BANCO!**

- Importa/atualiza workflows no banco
- Pode criar ou atualizar workflows

---

## ✅ O QUE É SEGURO

- **Dados existentes** (conversas, mensagens, pacientes) **NÃO são deletados**
- **Seed usa `upsert`** - não duplica dados
- **Schema changes** são aplicados de forma incremental

---

## ⚠️ O QUE PODE SER PERIGOSO

### `prisma db push` vs `prisma migrate deploy`

**Atualmente está usando:**
```bash
npx prisma db push
```

**Problemas:**
- Não cria histórico de migrações
- Pode causar problemas se houver mudanças incompatíveis
- Não é recomendado para produção

**Recomendado para produção:**
```bash
npx prisma migrate deploy
```

**Vantagens:**
- Usa histórico de migrações
- Mais seguro para produção
- Permite rollback

---

## 🔧 RECOMENDAÇÃO

### Opção 1: Manter como está (se schema não mudou)
Se você **NÃO modificou** o `schema.prisma`, o `db push` não fará alterações no banco.

### Opção 2: Usar Migrations (Recomendado)
Se você **modificou** o `schema.prisma`, deveria:

1. **Criar migration localmente:**
```bash
npx prisma migrate dev --name nome_da_mudanca
```

2. **Alterar `deploy:prod` para:**
```json
"deploy:prod": "npx prisma migrate deploy && npx tsx scripts/seed_complete.ts && npx tsx scripts/import_workflow_definitivo.ts && npx tsx api/server.ts"
```

3. **Commitar a migration:**
```bash
git add prisma/migrations/
git commit -m "feat: adicionar migration para [mudança]"
```

---

## 📋 CHECKLIST ANTES DO DEPLOY

- [ ] Verificar se `schema.prisma` foi modificado
- [ ] Se sim, criar migration localmente primeiro
- [ ] Testar migration localmente
- [ ] Verificar se `seed_complete.ts` não vai duplicar dados
- [ ] Fazer backup do banco (se possível)

---

## 🛡️ COMO PROTEGER DADOS

### 1. Fazer Backup Antes do Deploy
```bash
# Via Railway Shell
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

### 2. Usar Migrations em vez de `db push`
```bash
# Localmente
npx prisma migrate dev --name nome_mudanca

# No deploy
npx prisma migrate deploy
```

### 3. Verificar Mudanças no Schema
```bash
# Ver o que será alterado (sem aplicar)
npx prisma db push --preview-feature
```

---

## ✅ CONCLUSÃO

**SIM, o banco será modificado durante o deploy:**

1. ✅ **Schema será atualizado** (se `schema.prisma` mudou)
2. ✅ **Seeds serão executados** (mas não duplicam dados)
3. ✅ **Workflows serão importados/atualizados**

**MAS:**
- ✅ Dados existentes **NÃO são deletados**
- ✅ Seeds usam `upsert` (não duplicam)
- ✅ Apenas **estrutura** e **dados iniciais** são modificados

**RECOMENDAÇÃO:**
- Se você **não modificou** o `schema.prisma`, está seguro
- Se você **modificou** o `schema.prisma`, considere usar migrations
