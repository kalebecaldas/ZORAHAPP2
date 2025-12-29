# 🚀 Instruções para Executar Script via SSH no Railway

## 📋 Passo a Passo

### 1. Conectar via SSH ao Railway

```bash
railway shell
```

Ou se preferir conectar diretamente:

```bash
railway run bash
```

### 2. Navegar para o diretório do projeto (se necessário)

```bash
cd /app
# ou o caminho onde o projeto está no Railway
```

### 3. Executar o Script de Migração e Seed

```bash
npx tsx scripts/railway_migrate_and_seed.ts
```

### 4. Verificar se Funcionou

```bash
# Verificar SystemSettings
npx tsx -e "
import prisma from './api/prisma/client.js';
(async () => {
  const settings = await prisma.systemSettings.findFirst();
  console.log('✅ SystemSettings:', settings ? 'Criado' : 'Não encontrado');
  const rules = await prisma.procedureRule.count();
  console.log('✅ ProcedureRules:', rules);
  const insurances = await prisma.insuranceRule.count();
  console.log('✅ InsuranceRules:', insurances);
  const responses = await prisma.responseRule.count();
  console.log('✅ ResponseRules:', responses);
  await prisma.\$disconnect();
})();
"
```

## 🔄 Alternativa: Executar SQL Diretamente

Se preferir executar o SQL diretamente:

```bash
# Via Railway CLI
railway run psql < scripts/railway_migrate.sql

# Ou via SSH
psql $DATABASE_URL -f scripts/railway_migrate.sql
```

Depois execute o seed:

```bash
npx tsx scripts/railway_migrate_and_seed.ts
```

## ⚠️ Importante

- Certifique-se de que a variável `DATABASE_URL` está configurada no Railway
- O script é idempotente - pode executar múltiplas vezes sem problemas
- O script preserva dados existentes - não sobrescreve configurações

## 🐛 Troubleshooting

### Erro: "Cannot find module"
```bash
# Instalar dependências primeiro
npm install
```

### Erro: "DATABASE_URL not found"
```bash
# Verificar variáveis de ambiente
railway variables
```

### Erro: "Table already exists"
- Normal se executar múltiplas vezes
- O script verifica antes de criar

## 📝 Logs Esperados

Você deve ver algo como:

```
🚀 Iniciando migração e seed para Railway...

1️⃣ Verificando SystemSettings...
   ✅ SystemSettings criado

2️⃣ Populando ResponseRules...
   ✅ Criado template: VALOR_PARTICULAR
   ✅ Criado template: CONVENIO_PROCEDIMENTOS
   ...

3️⃣ Populando ProcedureRules...
   📋 Encontrados X procedimentos
   ✅ Criada regra para: Fisioterapia
   ...

4️⃣ Populando InsuranceRules...
   📋 Encontrados X convênios
   ✅ Criada regra para: Bradesco
   ...

✅ Migração e seed concluídos com sucesso!
```
