# 🔄 Como Sincronizar Workflow via Git

## 📋 Resumo

**Com Git, você NÃO precisa mais usar scripts de sincronização manual!**

O workflow está salvo no banco de dados (Prisma), então quando você faz deploy via Git:
- ✅ O código é atualizado (incluindo correções de auto-advance, etc.)
- ✅ O workflow no banco **permanece o mesmo** (não é sobrescrito)
- ✅ Você só precisa sincronizar se **editar o workflow no editor**

## 🎯 Quando Usar Scripts de Sincronização

### ❌ NÃO precisa sincronizar quando:
- Fazer push de código (correções, features)
- Deploy automático via Git
- Atualizar lógica do workflow engine
- Corrigir bugs no código

### ✅ Precisa sincronizar quando:
- Editar workflow no editor (adicionar/remover nós)
- Mudar conexões entre nós
- Alterar configurações de nós (mensagens, actions, etc.)
- Fazer mudanças manuais no workflow

## 🔄 Fluxo de Trabalho Recomendado

### Cenário 1: Editar Workflow no Editor

```bash
# 1. Editar workflow no editor (frontend)
# 2. Salvar workflow (isso atualiza o banco LOCAL)

# 3. Preparar para sincronizar com Railway
npm run sync:workflow:railway

# 4. Acessar Railway shell
railway ssh

# 5. Fazer upload do workflow
npm run sync:workflow:railway:upload
```

### Cenário 2: Atualizar Código (sem mudar workflow)

```bash
# 1. Fazer mudanças no código
# 2. Commit e push
git add -A
git commit -m "fix: correção no workflow engine"
git push origin main

# 3. Railway faz deploy automático
# ✅ Pronto! Não precisa sincronizar workflow
```

## 🧹 Limpar Workflows Antigos

### Script de Limpeza

```bash
# Ver quais workflows serão deletados (sem deletar)
npm run cleanup:workflows

# Deletar workflows antigos (mantém apenas o ativo)
npm run cleanup:workflows -- --yes
```

**O que o script faz:**
- ✅ Mantém apenas o workflow **ativo**
- ✅ Deleta todos os outros workflows
- ✅ Cria backup antes de deletar (opcional)
- ✅ Mostra lista do que será deletado

**⚠️ ATENÇÃO:** Esta operação é **IRREVERSÍVEL**!

### Exemplo de Uso

```bash
# Local
npm run cleanup:workflows -- --yes

# Railway (após deploy)
railway ssh
npm run cleanup:workflows -- --yes
```

## 📊 Comparação: Git vs Scripts

| Ação | Git Push | Script Sync |
|------|----------|-------------|
| **Atualizar código** | ✅ Sim | ❌ Não |
| **Corrigir bugs** | ✅ Sim | ❌ Não |
| **Editar workflow** | ❌ Não | ✅ Sim |
| **Adicionar nós** | ❌ Não | ✅ Sim |
| **Mudar conexões** | ❌ Não | ✅ Sim |

## 🎯 Workflow Recomendado

### 1. Desenvolvimento Normal (Código)

```bash
# Fazer mudanças no código
git add -A
git commit -m "feat: nova feature"
git push origin main

# Railway faz deploy automático
# ✅ Workflow no banco permanece igual
```

### 2. Editar Workflow (Estrutura)

```bash
# 1. Editar no editor local
# 2. Salvar (atualiza banco local)

# 3. Preparar sync
npm run sync:workflow:railway

# 4. Deploy código (se necessário)
git push origin main

# 5. Sync workflow no Railway
railway ssh
npm run sync:workflow:railway:upload
```

### 3. Limpeza Periódica

```bash
# Limpar workflows antigos (local)
npm run cleanup:workflows -- --yes

# Limpar workflows antigos (Railway)
railway ssh
npm run cleanup:workflows -- --yes
```

## 🔍 Verificar Status

### Verificar Workflow Local

```bash
npm run check:workflow:railway
```

### Verificar Workflow Railway

```bash
railway ssh
npm run check:workflow:railway
```

## 📝 Resumo Rápido

**Para código:** Use Git (push automático) ✅

**Para workflow:** Use scripts de sincronização ✅

**Para limpar:** Use script de cleanup ✅

---

**Dica:** Mantenha apenas 1 workflow ativo. Use o script de cleanup para remover os antigos!

