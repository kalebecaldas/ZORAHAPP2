# 🚀 Comandos SSH para Railway

Este guia contém os comandos para executar via SSH no Railway.

## 📋 Pré-requisitos

1. Conectar via SSH ao Railway:
```bash
railway shell
```

Ou se já estiver conectado:
```bash
# Verificar se está no diretório correto
pwd
# Deve mostrar: /app ou similar
```

## 🔧 Comandos Disponíveis

### Opção 1: Migração e Seed Apenas (Recomendado para primeira vez)

```bash
# Aplicar schema do Prisma
npx prisma db push

# Executar migração e seed
npx tsx scripts/railway_migrate_and_seed.ts
```

### Opção 2: Usando Script Shell

```bash
# Tornar executável (se necessário)
chmod +x scripts/railway_migrate_and_seed.sh

# Executar
bash scripts/railway_migrate_and_seed.sh
```

### Opção 3: Deploy Completo

```bash
# Aplicar schema
npx prisma db push

# Migração e seed das novas tabelas
npx tsx scripts/railway_migrate_and_seed.ts

# Seed completo (se necessário)
npx tsx scripts/seed_complete.ts

# Importar workflows (se necessário)
npx tsx scripts/import_workflow_definitivo.ts
```

### Opção 4: Usando Script Shell Completo

```bash
# Tornar executável (se necessário)
chmod +x scripts/railway_deploy_complete.sh

# Executar
bash scripts/railway_deploy_complete.sh
```

## 🔍 Verificação

Após executar, verifique se tudo está funcionando:

```bash
# Verificar regras criadas
npx tsx scripts/verify_rules.ts

# Verificar configuração do sistema
npx tsx -e "
import prisma from './api/prisma/client.js';
(async () => {
  const settings = await prisma.systemSettings.findFirst();
  console.log('SystemSettings:', JSON.stringify(settings, null, 2));
  const procRules = await prisma.procedureRule.count();
  const insRules = await prisma.insuranceRule.count();
  const respRules = await prisma.responseRule.count();
  console.log('ProcedureRules:', procRules);
  console.log('InsuranceRules:', insRules);
  console.log('ResponseRules:', respRules);
  await prisma.\$disconnect();
})();
"
```

## 📝 Comandos Rápidos (Copy & Paste)

### Migração Rápida
```bash
npx prisma db push && npx tsx scripts/railway_migrate_and_seed.ts
```

### Verificação Rápida
```bash
npx tsx scripts/verify_rules.ts
```

## ⚠️ Troubleshooting

### Erro: "Cannot find module"
```bash
# Instalar dependências
npm install
```

### Erro: "DATABASE_URL not found"
```bash
# Verificar variáveis de ambiente
env | grep DATABASE_URL
```

### Erro: "Permission denied"
```bash
# Tornar scripts executáveis
chmod +x scripts/*.sh
```

### Erro: "Table already exists"
- Normal se executar múltiplas vezes
- O script verifica antes de criar

## 📦 O que Cada Comando Faz

### `npx prisma db push`
- Aplica mudanças do schema Prisma ao banco
- Cria/atualiza tabelas conforme necessário

### `npx tsx scripts/railway_migrate_and_seed.ts`
- Cria SystemSettings se não existir
- Popula ResponseRules (templates)
- Popula ProcedureRules (regras por procedimento)
- Popula InsuranceRules (regras por convênio)
- **Idempotente** - pode executar múltiplas vezes

### `npx tsx scripts/seed_complete.ts`
- Seed completo do sistema
- Configuração da IA
- Dados de clínica (se necessário)

### `npx tsx scripts/import_workflow_definitivo.ts`
- Importa workflows do sistema

## 🎯 Sequência Recomendada

1. **Primeira vez no Railway:**
```bash
npx prisma db push
npx tsx scripts/railway_migrate_and_seed.ts
npx tsx scripts/seed_complete.ts
npx tsx scripts/import_workflow_definitivo.ts
```

2. **Atualizações futuras (apenas novas tabelas):**
```bash
npx prisma db push
npx tsx scripts/railway_migrate_and_seed.ts
```

3. **Verificação:**
```bash
npx tsx scripts/verify_rules.ts
```
