# 🚀 Instruções Rápidas - Sincronizar Workflow para Railway

## ✅ Railway CLI Instalado!

O Railway CLI foi instalado com sucesso. Agora você pode usar comandos do Railway, mas **para sincronizar o workflow, use o Railway Shell do Dashboard**.

## 📋 Processo de Sincronização (2 Passos)

### Passo 1: Preparar Localmente ✅

```bash
npm run sync:workflow:railway
```

**Resultado esperado:**
```
✅ Workflow local encontrado:
   ID: cmidioe4q0000xg3s8bwjl2rg
   Nome: Sistema Completo v2 - Refatorado
   Nós: 31
   Conexões: 35
💾 Workflow local salvo em: workflow_to_sync.json
```

### Passo 2: Fazer Upload via Railway SSH

**⚠️ IMPORTANTE**: Use `railway ssh` para acessar o container!

1. **Fazer Login** (se ainda não fez):
   ```bash
   railway login
   ```

2. **Conectar ao Projeto** (se ainda não fez):
   ```bash
   railway link
   ```

3. **Acessar o Shell do Container**:
   ```bash
   railway ssh
   ```

4. **Dentro do Container, Execute**:
   ```bash
   npm run sync:workflow:railway:upload
   ```

## 🔍 Por que usar `railway ssh`?

- `railway ssh` conecta **DENTRO do container Railway**
- O hostname `postgres.railway.internal` funciona dentro do container
- Você executa comandos diretamente no ambiente Railway
- É a forma oficial de acessar o shell do container

## ✅ Verificação

Após executar no Railway Shell do Dashboard, você deve ver:

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

## 🎯 Resumo

1. ✅ **Local**: `npm run sync:workflow:railway` (prepara arquivo)
2. ✅ **Railway SSH**: `railway ssh` → `npm run sync:workflow:railway:upload` (faz upload)
3. ✅ **Verificar**: Workflow atualizado no editor (31 nós, 35 conexões)

---

**Lembrete**: Use `railway ssh` para acessar o container Railway!

