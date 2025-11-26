# 🚀 Como Sincronizar Workflow Usando Railway Shell

## ⚠️ Problema

O `railway run` localmente não consegue acessar o hostname interno `postgres.railway.internal:5432` porque esse hostname só funciona DENTRO do ambiente Railway.

## ✅ Solução: Usar Railway Shell Diretamente

### Opção 1: Via Railway Dashboard (Recomendado)

1. **Acesse o Railway Dashboard**
   - Vá em: https://railway.app
   - Selecione seu projeto

2. **Abra o Shell do Serviço**
   - Clique no serviço (não no banco de dados)
   - Clique em **"Shell"** ou **"Terminal"**
   - Isso abre um terminal DENTRO do ambiente Railway

3. **Execute o Script de Upload**
   ```bash
   npm run sync:workflow:railway:upload
   ```

### Opção 2: Via Railway CLI Shell

```bash
# Abrir shell interativo do Railway
railway shell

# Dentro do shell, execute:
npm run sync:workflow:railway:upload
```

## 📋 Processo Completo

### Passo 1: Preparar Localmente (já feito ✅)

```bash
# Execute LOCALMENTE (sem railway run)
npm run sync:workflow:railway
```

Isso cria o arquivo `workflow_to_sync.json` com o workflow local.

### Passo 2: Fazer Upload no Railway

**Via Dashboard:**
1. Acesse Railway Dashboard
2. Clique no serviço
3. Clique em "Shell"
4. Execute: `npm run sync:workflow:railway:upload`

**Via CLI:**
```bash
railway shell
npm run sync:workflow:railway:upload
```

## 🔍 Verificar se Funcionou

Após executar no Railway Shell, você deve ver:

```
📤 Fazendo upload do workflow para Railway...
📥 Workflow lido do arquivo:
   ID: cmidioe4q0000xg3s8bwjl2rg
   Nome: Sistema Completo v2 - Refatorado
   Nós: 31
   Conexões: 35
🔍 Procurando workflow no Railway...
✅ Workflow encontrado no Railway: cmidioe4q0000xg3s8bwjl2rg
💾 Backup do workflow Railway salvo em: workflow_railway_backup_XXXXX.json
🔄 Atualizando workflow no Railway...
✅ Workflow atualizado com sucesso!
📊 Resultado final:
   Nós: 31
   Conexões: 35
   Ativo: true
✅ Upload concluído com sucesso!
```

## 🐛 Troubleshooting

### Erro: "Can't reach database server"
- ✅ **Solução**: Use Railway Shell (Dashboard ou `railway shell`)
- ❌ **Não use**: `railway run` localmente

### Erro: "Arquivo workflow_to_sync.json não encontrado"
- Execute primeiro: `npm run sync:workflow:railway` (localmente)
- O arquivo será commitado e estará disponível no Railway após deploy

### Erro: "Workflow not found"
- O script tentará criar um novo workflow
- Verifique os logs para mais detalhes

## 📝 Resumo

1. ✅ **Local**: `npm run sync:workflow:railway` (prepara arquivo)
2. ✅ **Railway Shell**: `npm run sync:workflow:railway:upload` (faz upload)
3. ✅ **Verificar**: Workflow atualizado no editor

---

**Importante**: Use Railway Shell (Dashboard ou `railway shell`), não `railway run` localmente!

