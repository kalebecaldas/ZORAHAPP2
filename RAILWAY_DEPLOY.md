# 🚀 Guia de Deploy para Railway

Este guia explica como fazer o deploy das novas funcionalidades para o Railway.

## 📋 Pré-requisitos

- Conta no Railway configurada
- Variáveis de ambiente configuradas no Railway
- Acesso ao banco de dados PostgreSQL do Railway

## 🔧 Passos para Deploy

### Opção 1: Deploy Automático (Recomendado)

O script `deploy:prod` já está configurado para executar tudo automaticamente:

```bash
npm run deploy:prod
```

Este comando executa na ordem:
1. `npx prisma db push` - Aplica mudanças do schema
2. `npx tsx scripts/railway_migrate_and_seed.ts` - Cria tabelas e popula dados iniciais
3. `npx tsx scripts/seed_complete.ts` - Seed completo do sistema
4. `npx tsx scripts/import_workflow_definitivo.ts` - Importa workflows
5. `npx tsx api/server.ts` - Inicia o servidor

### Opção 2: Deploy Manual (Passo a Passo)

Se preferir executar manualmente:

#### 1. Aplicar Schema do Prisma

```bash
npx prisma db push
```

#### 2. Executar Migração e Seed

```bash
npm run railway:migrate
```

Ou usando SQL diretamente:

```bash
npm run railway:migrate:sql
```

#### 3. Seed Completo (se necessário)

```bash
npm run seed:complete
```

#### 4. Importar Workflows

```bash
npx tsx scripts/import_workflow_definitivo.ts
```

## 📦 O que o Script de Migração Faz

O script `railway_migrate_and_seed.ts` é **idempotente** (pode ser executado múltiplas vezes sem problemas) e:

1. **Cria SystemSettings** se não existir
   - `inactivityTimeoutMinutes: 20`
   - `closingMessage: "Obrigado pelo contato! Estamos à disposição. 😊"`
   - `autoAssignEnabled: true`
   - `maxConversationsPerAgent: 5`

2. **Popula ResponseRules** (templates de resposta)
   - Templates para `VALOR_PARTICULAR`
   - Templates para `CONVENIO_PROCEDIMENTOS`
   - Templates para `AGENDAR`

3. **Popula ProcedureRules** (regras por procedimento)
   - Cria regra para cada procedimento existente
   - Define `evaluationIncludesFirstSession: true` como padrão
   - Preserva regras existentes

4. **Popula InsuranceRules** (regras por convênio)
   - Cria regra para cada convênio existente
   - Define greetings personalizados
   - Configura visibilidade de valores

## 🔍 Verificação Pós-Deploy

Após o deploy, verifique se tudo está funcionando:

```bash
# Verificar regras criadas
npx tsx scripts/verify_rules.ts

# Verificar configuração da IA
npm run verify:ai-config
```

## ⚠️ Importante

- O script **preserva dados existentes** - não sobrescreve configurações já feitas
- Se uma tabela/regra já existe, o script apenas atualiza se necessário
- O script pode ser executado múltiplas vezes sem problemas

## 🐛 Troubleshooting

### Erro: "Table already exists"
- Normal se executar múltiplas vezes
- O script verifica antes de criar

### Erro: "Foreign key constraint"
- Certifique-se de que procedimentos e convênios já existem
- Execute `seed_clinic_data.ts` primeiro se necessário

### Erro: "Connection refused"
- Verifique a variável `DATABASE_URL` no Railway
- Certifique-se de que o banco está acessível

## 📝 Notas

- O script SQL (`railway_migrate.sql`) pode ser usado diretamente no Railway CLI ou interface
- Para ambientes de produção, recomenda-se executar o script TypeScript (`railway_migrate_and_seed.ts`) que tem mais validações
