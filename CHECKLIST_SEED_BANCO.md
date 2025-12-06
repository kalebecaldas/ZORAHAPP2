# 📋 Checklist: Seed do Banco de Dados para Railway

## ✅ O que JÁ está no Deploy Automático

O script `deploy:prod` já executa automaticamente:

1. ✅ `prisma db push` - Atualiza schema do banco
2. ✅ `seed_complete.ts` - Seed completo (inclui IA)
3. ✅ `import_workflow_definitivo.ts` - Importa workflow
4. ✅ `api/server.ts` - Inicia servidor

**Você NÃO precisa fazer nada manualmente!** 🎉

---

## 🔍 O que o Seed Completo Faz

### 1. Configuração da IA (`seed_ai_configuration.ts`)
- ✅ Cria configuração ativa da IA
- ✅ Cria exemplos de conversas (few-shot learning)
- ✅ Cria regras de transferência
- ✅ **CRÍTICO**: Sem isso, o bot não funciona!

### 2. Verifica Dados de Clínica
- ⚠️ Verifica se há procedimentos, convênios e clínicas
- ⚠️ Se não houver, avisa mas não bloqueia
- 💡 Sistema tem fallback automático em `coverage.ts`

### 3. Verifica Templates
- ⚠️ Verifica se há templates
- ⚠️ Se não houver, avisa mas não bloqueia

### 4. Verifica Workflow
- ⚠️ Verifica se há workflow ativo
- ✅ O `import_workflow_definitivo.ts` cria se não existir

### 5. Configurações do Sistema
- ✅ Cria `SystemSettings` padrão se não existir

---

## ⚠️ O que PODE estar Faltando

### Dados de Clínica (Opcional, mas Recomendado)

Se você quiser que o bot tenha acesso completo a:
- Procedimentos com preços
- Convênios aceitos
- Clínicas (Vieiralves, São José)

Execute **manualmente** no Railway Shell (após o deploy):

```bash
# 1. Migrar dados básicos (clínicas, procedimentos, convênios)
npx tsx scripts/migrate_clinic_data_to_db.ts

# 2. Popular relações (quais procedimentos cada clínica oferece)
npx tsx scripts/populate_clinic_relations.ts

# 3. Popular preços de convênios
npx tsx scripts/populate_insurance_prices.ts
```

**Mas atenção**: O sistema tem **fallback automático** em `api/routes/coverage.ts` que popula dados básicos se não existirem. Então **não é obrigatório**!

---

## 🚀 Deploy no Railway - Passo a Passo

### Opção 1: Deploy Automático (Recomendado)

1. **Fazer commit e push**:
   ```bash
   git add .
   git commit -m "feat: sistema completo com seed automático"
   git push origin main
   ```

2. **Railway fará deploy automaticamente**
   - Executará `deploy:prod`
   - Seed será executado automaticamente
   - Sistema estará pronto!

3. **Verificar logs no Railway**:
   - Deve aparecer: "✅ Seed completo finalizado!"
   - Deve aparecer: "✅ Configuração da IA seedada"
   - Deve aparecer: "✅ Workflow ativo presente"

### Opção 2: Deploy Manual (Se necessário)

Se o deploy automático falhar, execute no Railway Shell:

```bash
# 1. Atualizar schema
npx prisma db push

# 2. Seed completo
npm run seed:complete

# 3. Importar workflow
npx tsx scripts/import_workflow_definitivo.ts

# 4. Verificar configuração
npm run verify:ai-config
```

---

## ✅ Verificação Pós-Deploy

### 1. Verificar Configuração da IA

```bash
npm run verify:ai-config
```

Deve mostrar:
- ✅ Configuração ativa encontrada
- ✅ Exemplos de conversas: X
- ✅ Regras de transferência: X
- ✅ OPENAI_API_KEY configurada
- ✅ Dados da clínica presentes (ou aviso se faltar)

### 2. Testar o Bot

Envie uma mensagem de teste e verifique os logs:

```
🤖 Gerando resposta conversacional para: "..."
🔍 CONTEXTO COMPLETO: {...}
✅ Resposta gerada: {...}
```

### 3. Verificar Banco de Dados

No Railway Shell:

```bash
npx tsx -e "
import prisma from './api/prisma/client.js';
(async () => {
  const ai = await prisma.aIConfiguration.findFirst({ where: { isActive: true } });
  const wf = await prisma.workflow.findFirst({ where: { isActive: true } });
  const proc = await prisma.procedure.count();
  const ins = await prisma.insuranceCompany.count();
  console.log('IA Config:', ai ? '✅' : '❌');
  console.log('Workflow:', wf ? '✅' : '❌');
  console.log('Procedimentos:', proc);
  console.log('Convênios:', ins);
  await prisma.\$disconnect();
})()
"
```

---

## 🎯 Resumo: O que é OBRIGATÓRIO vs OPCIONAL

### ✅ OBRIGATÓRIO (já está no deploy)
- ✅ Schema do banco (`prisma db push`)
- ✅ Configuração da IA (`seed_ai_configuration.ts`)
- ✅ Workflow (`import_workflow_definitivo.ts`)
- ✅ SystemSettings (criado automaticamente)

### ⚠️ OPCIONAL (mas recomendado)
- ⚠️ Dados de clínica completos (tem fallback automático)
- ⚠️ Templates (não crítico para funcionamento)
- ⚠️ Preços detalhados de convênios

---

## 🔧 Troubleshooting

### Problema: Bot não responde

**Solução**:
1. Verificar `OPENAI_API_KEY` no Railway
2. Verificar logs: deve aparecer "🤖 Gerando resposta conversacional"
3. Executar `npm run verify:ai-config`

### Problema: Bot não encontra procedimentos

**Solução**:
1. Executar `npx tsx scripts/migrate_clinic_data_to_db.ts`
2. Ou verificar se fallback está funcionando em `coverage.ts`

### Problema: Workflow não funciona

**Solução**:
1. Verificar se workflow está ativo: `npx tsx scripts/check_active_workflow.ts`
2. Reimportar: `npx tsx scripts/import_workflow_definitivo.ts`

---

## 📝 Conclusão

**O sistema ESTÁ PRONTO para deploy!** 🎉

O seed completo já está incluído no `deploy:prod`, então você só precisa:

1. ✅ Fazer commit e push
2. ✅ Railway fará deploy automático
3. ✅ Seed será executado automaticamente
4. ✅ Sistema estará funcionando!

**Dados de clínica são opcionais** - o sistema tem fallback automático que popula dados básicos se necessário.
