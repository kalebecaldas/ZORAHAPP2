# 📦 Scripts de Migração e Seed para Railway

## 📋 Arquivos Criados

### 1. `scripts/railway_migrate_and_seed.ts`
Script TypeScript completo que:
- ✅ Cria `SystemSettings` se não existir
- ✅ Popula `ResponseRule` (templates de resposta)
- ✅ Popula `ProcedureRule` (regras por procedimento)
- ✅ Popula `InsuranceRule` (regras por convênio)
- ✅ É **idempotente** (pode executar múltiplas vezes)
- ✅ **Preserva dados existentes** (não sobrescreve)

### 2. `scripts/railway_migrate.sql`
Script SQL alternativo para criar as tabelas diretamente:
- ✅ Cria `system_settings`
- ✅ Cria `ResponseRule`
- ✅ Cria `ProcedureRule`
- ✅ Cria `InsuranceRule`
- ✅ Cria índices necessários
- ✅ Usa `CREATE TABLE IF NOT EXISTS` (idempotente)

## 🚀 Como Usar

### Opção 1: Deploy Automático (Recomendado)

```bash
npm run deploy:prod
```

Este comando já está configurado para executar tudo automaticamente.

### Opção 2: Executar Apenas Migração e Seed

```bash
npm run railway:migrate
```

### Opção 3: Executar SQL Diretamente

```bash
npm run railway:migrate:sql
```

Ou via Railway CLI:

```bash
railway run psql < scripts/railway_migrate.sql
```

## 📊 O que é Criado/Populado

### SystemSettings
- `inactivityTimeoutMinutes: 20`
- `closingMessage: "Obrigado pelo contato! Estamos à disposição. 😊"`
- `autoAssignEnabled: true`
- `maxConversationsPerAgent: 5`

### ResponseRules (Templates)
- `VALOR_PARTICULAR` - Template para valores particulares
- `CONVENIO_PROCEDIMENTOS` - Template para informações de convênio
- `LISTAR_PROCEDIMENTOS_CONVENIO` - Template para listar procedimentos
- `INFORMACAO` - Template para informações gerais
- `AGENDAR` - Template para agendamento
- `LOCALIZACAO` - Template para localização
- `HORARIO` - Template para horários

### ProcedureRules
- Uma regra para cada procedimento existente no banco
- `evaluationIncludesFirstSession: true` por padrão
- Preços de avaliação detectados dinamicamente
- Mensagens customizadas baseadas no nome do procedimento

### InsuranceRules
- Uma regra para cada convênio existente no banco
- Greetings personalizados baseados no tipo de convênio
- Configuração de visibilidade de valores
- Suporte para convênios com desconto

## ⚠️ Importante

- **Não deleta dados existentes** - apenas cria se não existir
- **Pode ser executado múltiplas vezes** sem problemas
- **Preserva configurações** já feitas manualmente
- **Requer que procedimentos e convênios já existam** no banco

## 🔍 Verificação

Após executar, verifique:

```bash
# Verificar regras criadas
npx tsx scripts/verify_rules.ts

# Verificar configuração do sistema
npx tsx -e "
import prisma from './api/prisma/client.js';
(async () => {
  const settings = await prisma.systemSettings.findFirst();
  console.log('SystemSettings:', settings);
  const rules = await prisma.procedureRule.count();
  console.log('ProcedureRules:', rules);
  await prisma.\$disconnect();
})();
"
```

## 📝 Notas

- O script TypeScript é preferível pois tem mais validações
- O script SQL pode ser útil para ambientes onde TypeScript não está disponível
- Ambos são idempotentes e seguros para executar em produção
