# 🚀 Sincronizar Workflow Correto para Railway

## ✅ Status Local

**Workflow correto encontrado:**
- **ID**: `cmidioe4q0000xg3s8bwjl2rg`
- **Nome**: Sistema Completo v2 - Refatorado
- **Nós**: 28 ✅
- **Conexões**: 33 ✅
- **Ativo**: Sim ✅

**Arquivo preparado:** `workflow_to_sync.json` ✅

## 📋 Passos para Sincronizar no Railway

### Passo 1: Acessar Railway Shell

```bash
railway ssh
```

### Passo 2: Executar Upload do Workflow

```bash
npm run sync:workflow:railway:upload
```

**Resultado esperado:**
```
📤 Fazendo upload do workflow para Railway...
📥 Workflow lido do arquivo:
   ID: cmidioe4q0000xg3s8bwjl2rg
   Nome: Sistema Completo v2 - Refatorado
   Nós: 28
   Conexões: 33
🔍 Procurando workflow no Railway...
✅ Workflow encontrado no Railway: cmidioe4q0000xg3s8bwjl2rg
💾 Backup do workflow Railway salvo em: workflow_railway_backup_XXXXX.json
🔄 Atualizando workflow no Railway...
✅ Workflow atualizado com sucesso!
📊 Resultado final:
   Nós: 28
   Conexões: 33
   Ativo: true
✅ Upload concluído com sucesso!
```

### Passo 3: Verificar

```bash
npm run check:workflow:railway
```

**Deve mostrar:**
- ✅ 28 nós
- ✅ 33 conexões
- ✅ Todos os nós principais presentes

## 🔍 Verificação Rápida

Após sincronizar, verifique se o workflow tem:

- ✅ `create_patient`
- ✅ `msg_cadastro_sucesso`
- ✅ `action_get_procedimentos_insurance`
- ✅ `msg_procedimentos_insurance`
- ✅ `transfer_to_queue`
- ✅ `msg_paciente_encontrado`

## ⚠️ Se Der Erro

### Erro: "workflow_to_sync.json não encontrado"

**Solução:** O arquivo precisa estar no diretório do projeto no Railway.

1. Verificar se o arquivo existe:
   ```bash
   ls -la workflow_to_sync.json
   ```

2. Se não existir, fazer upload do arquivo:
   ```bash
   # No seu terminal local
   railway run cat workflow_to_sync.json > /tmp/workflow.json
   # Depois no Railway shell
   cp /tmp/workflow.json workflow_to_sync.json
   ```

   Ou simplesmente recriar:
   ```bash
   # No Railway shell
   npm run sync:workflow:railway
   npm run sync:workflow:railway:upload
   ```

### Erro: "Workflow não encontrado no Railway"

**Solução:** O workflow pode ter ID diferente no Railway.

1. Listar workflows:
   ```bash
   # No Railway shell, criar script temporário
   node -e "
   const { PrismaClient } = require('@prisma/client');
   const prisma = new PrismaClient();
   (async () => {
     const workflows = await prisma.workflow.findMany();
     console.log('Workflows no Railway:');
     workflows.forEach(w => {
       console.log(\`  - \${w.name} (\${w.id}) - Ativo: \${w.isActive}\`);
     });
     await prisma.\$disconnect();
   })();
   "
   ```

2. Ativar o workflow correto manualmente se necessário.

## 📝 Comandos Completos (Copy/Paste)

```bash
# 1. Acessar Railway
railway ssh

# 2. Upload workflow
npm run sync:workflow:railway:upload

# 3. Verificar
npm run check:workflow:railway
```

## ✅ Checklist

- [ ] Workflow local verificado (28 nós, 33 conexões)
- [ ] Arquivo `workflow_to_sync.json` criado
- [ ] Acessado Railway shell (`railway ssh`)
- [ ] Executado upload (`npm run sync:workflow:railway:upload`)
- [ ] Verificado resultado (28 nós, 33 conexões)
- [ ] Testado fluxo completo

---

**Status:** Pronto para sincronizar! 🚀

