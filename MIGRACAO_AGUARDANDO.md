# 🔄 Como Migrar Conversas de AGUARDANDO para PRINCIPAL

## 📋 Opções de Migração

### Opção 1: Via SQL Direto (Mais Rápido) ✅ **RECOMENDADO**

Execute diretamente no banco de dados do Railway:

```bash
# 1. Conectar ao banco via Railway CLI
railway connect

# 2. Executar o SQL
# Copie e cole o conteúdo de scripts/migrate_aguardando_to_principal.sql
```

Ou via interface do Railway:
1. Vá em **Database** → **Connect**
2. Execute o SQL do arquivo `scripts/migrate_aguardando_to_principal.sql`

**SQL para executar:**
```sql
-- Verificar quantas conversas têm status AGUARDANDO
SELECT COUNT(*) as total_aguardando 
FROM "Conversation" 
WHERE status = 'AGUARDANDO';

-- Migrar todas as conversas de AGUARDANDO para PRINCIPAL
UPDATE "Conversation" 
SET status = 'PRINCIPAL' 
WHERE status = 'AGUARDANDO';

-- Verificar se a migração foi bem-sucedida
SELECT COUNT(*) as total_aguardando_restante 
FROM "Conversation" 
WHERE status = 'AGUARDANDO';
```

---

### Opção 2: Via Script TypeScript (Após Deploy)

**IMPORTANTE:** O arquivo precisa estar no Railway primeiro!

```bash
# 1. Fazer commit e push do script
git add scripts/migrate_aguardando_to_principal.ts
git commit -m "Add migration script for AGUARDANDO to PRINCIPAL"
git push

# 2. Aguardar deploy no Railway

# 3. Conectar via SSH
railway ssh

# 4. Executar o script (comando COMPLETO)
npx ts-node scripts/migrate_aguardando_to_principal.ts
```

**⚠️ Erro comum:** O comando foi cortado. Use o nome completo:
- ❌ `migrate_aguardando_to_prin` (cortado)
- ✅ `migrate_aguardando_to_principal` (completo)

---

## ✅ Verificação

Após a migração, verifique:

```sql
-- Deve retornar 0
SELECT COUNT(*) FROM "Conversation" WHERE status = 'AGUARDANDO';

-- Deve mostrar todas as conversas na fila PRINCIPAL
SELECT COUNT(*) FROM "Conversation" WHERE status = 'PRINCIPAL';
```

---

## 📝 Nota Importante

**A migração é OPCIONAL!**

As conversas com status `'AGUARDANDO'` já aparecem na fila PRINCIPAL graças às correções no frontend. A migração apenas padroniza o status no banco de dados para facilitar manutenção futura.

---

## 🎯 Recomendação

**Use a Opção 1 (SQL direto)** - É mais rápida e não requer deploy!

