# 🛡️ Deploy Seguro no Railway - Sem Perda de Dados

## ✅ Garantias de Segurança

### 1. Prisma DB Push é Seguro
- ✅ **NÃO deleta** tabelas existentes
- ✅ **NÃO deleta** dados existentes
- ✅ **Apenas adiciona** novas tabelas/colunas
- ✅ **Apenas modifica** estrutura quando necessário
- ✅ Usa `--accept-data-loss=false` por padrão (proteção extra)

### 2. Script de Migração é Idempotente
- ✅ **Verifica antes de criar** - não duplica dados
- ✅ **Preserva dados existentes** - não sobrescreve
- ✅ **Pode executar múltiplas vezes** sem problemas
- ✅ **Não deleta nada** - apenas cria se não existir

### 3. Backup Automático
- ✅ Script de backup criado antes do deploy
- ✅ Salva todas as configurações importantes
- ✅ Permite restaurar se necessário

## 🚀 Processo Seguro de Deploy

### Opção 1: Script Automatizado (Recomendado)

```bash
# No Railway SSH
chmod +x scripts/railway_safe_deploy.sh
bash scripts/railway_safe_deploy.sh
```

Este script:
1. ✅ Cria backup completo
2. ✅ Aplica schema (seguro)
3. ✅ Executa migração (idempotente)
4. ✅ Verifica integridade

### Opção 2: Passo a Passo Manual

#### Passo 1: Backup (OBRIGATÓRIO)

```bash
# No Railway SSH
npx tsx scripts/railway_backup_before_deploy.ts
```

Isso cria um backup em `backups/backup-YYYY-MM-DD.json`

#### Passo 2: Aplicar Schema

```bash
# Prisma db push é SEGURO - não deleta dados
npx prisma db push
```

#### Passo 3: Migração e Seed

```bash
# Script idempotente - preserva dados existentes
npx tsx scripts/railway_migrate_and_seed.ts
```

#### Passo 4: Verificar

```bash
# Verificar se tudo está OK
npx tsx -e "
import prisma from './api/prisma/client.js';
(async () => {
  const settings = await prisma.systemSettings.findFirst();
  console.log('SystemSettings:', settings ? '✅ OK' : '❌ Não encontrado');
  const rules = await prisma.procedureRule.count();
  console.log('ProcedureRules:', rules);
  await prisma.\$disconnect();
})();
"
```

## 🔍 O que é Preservado

### ✅ Dados que NÃO são afetados:
- ✅ Todas as conversas existentes
- ✅ Todas as mensagens existentes
- ✅ Todos os pacientes existentes
- ✅ Todos os usuários existentes
- ✅ Todas as configurações da IA existentes
- ✅ Todos os workflows existentes
- ✅ Todos os procedimentos existentes
- ✅ Todos os convênios existentes
- ✅ Todas as clínicas existentes

### ✅ Dados que são Criados (se não existirem):
- ✅ SystemSettings (apenas se não existir)
- ✅ ResponseRules (apenas se não existir)
- ✅ ProcedureRules (apenas se não existir)
- ✅ InsuranceRules (apenas se não existir)

### ⚠️ Dados que podem ser Atualizados:
- ✅ SystemSettings: apenas se não existir (preserva se já existir)
- ✅ ProcedureRules: atualiza apenas `evaluationIncludesFirstSession` se necessário

## 🛡️ Proteções Implementadas

### 1. Prisma DB Push
```bash
npx prisma db push --accept-data-loss=false
```
- `--accept-data-loss=false` garante que dados não serão perdidos

### 2. Script de Migração
- Verifica `if (!existing)` antes de criar
- Usa `findFirst()` e `findUnique()` para verificar existência
- Não usa `deleteMany()` ou `updateMany()` sem condições

### 3. Backup Automático
- Backup completo antes de qualquer alteração
- Salva em `backups/backup-TIMESTAMP.json`
- Referência em `backups/latest-backup.json`

## 🔄 Restauração (Se Necessário)

Se algo der errado, você pode restaurar do backup:

```bash
# Via Railway SSH
npx tsx -e "
import prisma from './api/prisma/client.js';
import fs from 'fs';

const backup = JSON.parse(fs.readFileSync('backups/latest-backup.json', 'utf-8'));
const data = JSON.parse(fs.readFileSync(backup.file, 'utf-8'));

// Restaurar SystemSettings
if (data.tables.systemSettings.length > 0) {
  await prisma.systemSettings.deleteMany({});
  await prisma.systemSettings.createMany({
    data: data.tables.systemSettings
  });
  console.log('✅ SystemSettings restaurado');
}

// Restaurar ResponseRules
if (data.tables.responseRules.length > 0) {
  await prisma.responseRule.deleteMany({});
  await prisma.responseRule.createMany({
    data: data.tables.responseRules
  });
  console.log('✅ ResponseRules restaurado');
}

// ... (restaurar outras tabelas conforme necessário)

await prisma.\$disconnect();
"
```

## 📋 Checklist de Segurança

Antes do deploy:
- [ ] Backup criado (`railway_backup_before_deploy.ts`)
- [ ] Backup verificado (arquivo existe em `backups/`)
- [ ] Variáveis de ambiente configuradas no Railway
- [ ] Schema.prisma revisado (sem mudanças que deletem dados)

Durante o deploy:
- [ ] `prisma db push` executado com sucesso
- [ ] `railway_migrate_and_seed.ts` executado com sucesso
- [ ] Verificação de integridade passou

Após o deploy:
- [ ] Aplicação funcionando normalmente
- [ ] Dados existentes ainda presentes
- [ ] Novas funcionalidades funcionando
- [ ] Backup mantido em local seguro

## ⚠️ Importante

- **NUNCA** execute `prisma migrate reset` em produção (deleta tudo!)
- **SEMPRE** faça backup antes de mudanças no banco
- **USE** `prisma db push` em vez de `prisma migrate deploy` para mudanças incrementais
- **VERIFIQUE** o backup após criar

## 🆘 Em Caso de Problema

1. **NÃO entre em pânico** - os dados estão seguros
2. **Verifique o backup** - `backups/latest-backup.json`
3. **Restaure se necessário** - usando o script de restauração
4. **Verifique logs** - `railway logs` para ver o que aconteceu
