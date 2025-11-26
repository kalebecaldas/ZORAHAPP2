# 🔄 Como Sincronizar Workflow Local para Railway

## 📋 Resumo

Este guia explica como fazer upload do workflow exato que está no seu ambiente local (com todos os 31 nós e configurações) para o Railway.

## 🚀 Método Rápido (Recomendado)

### ⚠️ IMPORTANTE: Processo em 2 Passos

O script funciona em **2 passos** porque precisa ler do banco local primeiro e depois atualizar o Railway.

### Passo 1: Preparar Workflow Localmente

```bash
# Execute LOCALMENTE (sem railway run)
npm run sync:workflow:railway
```

Isso vai:
- ✅ Ler o workflow do banco local
- ✅ Salvar em `workflow_to_sync.json`
- ✅ Mostrar instruções para o próximo passo

### Passo 2: Fazer Upload para Railway

```bash
# Execute com railway run para usar as variáveis do Railway
railway run npm run sync:workflow:railway:upload
```

Isso vai:
- ✅ Ler o arquivo `workflow_to_sync.json`
- ✅ Atualizar o workflow no Railway
- ✅ Fazer backup do workflow atual
- ✅ Limpar o arquivo temporário

### Passo 0: Instalar Railway CLI (se ainda não tiver)

```bash
npm install -g @railway/cli
railway login
railway link
```

## 📝 O que o Script Faz

1. ✅ **Lê o workflow local ativo** (com todos os 31 nós e configurações)
2. ✅ **Faz backup do workflow atual no Railway** (salva em arquivo JSON)
3. ✅ **Atualiza o workflow no Railway** com os dados exatos do local
4. ✅ **Mantém o mesmo ID e status** (ativo/inativo)
5. ✅ **Preserva todas as configurações** (nós, conexões, mensagens, etc.)

## 🔍 Verificação

Após executar o script, você verá algo como:

```
🔄 Sincronizando workflow local para Railway...

📥 Lendo workflow local...
✅ Workflow local encontrado:
   ID: cmidioe4q0000xg3s8bwjl2rg
   Nome: Sistema Completo v2 - Refatorado
   Nós: 31
   Conexões: 35
   Ativo: true

📤 Procurando workflow no Railway...
✅ Workflow encontrado no Railway: cmidioe4q0000xg3s8bwjl2rg

💾 Backup do workflow Railway salvo em: workflow_railway_backup_XXXXX.json

🔄 Atualizando workflow no Railway...
✅ Workflow cmidioe4q0000xg3s8bwjl2rg atualizado com sucesso!

📊 Resultado final:
   ID: cmidioe4q0000xg3s8bwjl2rg
   Nome: Sistema Completo v2 - Refatorado
   Nós: 31
   Conexões: 35
   Ativo: true

✅ Sincronização concluída com sucesso!
```

## 🛠️ Método Alternativo (Via Railway Dashboard)

Se preferir usar o Railway Dashboard:

1. Acesse o Railway Dashboard
2. Vá em seu serviço
3. Clique em **"Shell"** (terminal)
4. Execute:
   ```bash
   npm run sync:workflow:railway
   ```

## ⚠️ Importante

- **Backup Automático**: O script sempre faz backup do workflow atual no Railway antes de atualizar
- **Mesmo ID**: O workflow no Railway terá o mesmo ID do local
- **Status Preservado**: O status ativo/inativo é mantido
- **Todas as Configurações**: Todos os nós, conexões, mensagens e configurações são copiados

## 🔄 Quando Usar

Use este script quando:
- ✅ Quiser sincronizar o workflow local exato para o Railway
- ✅ Fizer alterações no workflow local e quiser aplicar no Railway
- ✅ Precisar restaurar o workflow do Railway para o estado local
- ✅ Quiser garantir que Railway e Local estão idênticos

## 📦 Arquivos Criados

O script cria um arquivo de backup:
- `workflow_railway_backup_XXXXX.json` - Backup do workflow antes da atualização

Você pode deletar esses arquivos após confirmar que tudo está funcionando.

## 🐛 Troubleshooting

### Erro: "Nenhum workflow ativo encontrado localmente"
- Verifique se há um workflow ativo no banco local
- Execute: `npx tsx -e "import { PrismaClient } from '@prisma/client'; const p = new PrismaClient(); p.workflow.findMany({ where: { isActive: true } }).then(r => console.log(r)).finally(() => p.\$disconnect())"`

### Erro: "Cannot connect to database"
- Verifique se as variáveis de ambiente do Railway estão configuradas
- Use `railway run` ou `railway shell` para garantir que as variáveis estão disponíveis

### Erro: "Workflow not found"
- O script tentará criar um novo workflow se não encontrar
- Verifique os logs para mais detalhes

## ✅ Checklist Pós-Sincronização

Após sincronizar, verifique:

- [ ] Workflow aparece no editor do Railway
- [ ] Número de nós está correto (31 nós)
- [ ] Número de conexões está correto (35 conexões)
- [ ] Status ativo/inativo está correto
- [ ] Todas as mensagens e configurações estão presentes
- [ ] Teste o workflow para garantir que funciona

---

**Status**: ✅ Script criado e testado
**Próximo**: Execute `railway run npm run sync:workflow:railway` para sincronizar

