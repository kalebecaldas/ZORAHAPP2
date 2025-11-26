# 🔍 Análise do Workflow Engine - Como o Bot Responde

## 📊 Fluxo de Processamento de Mensagens

### 1. Entrada da Mensagem (`processIncomingMessage`)

```typescript
// api/routes/conversations.ts linha 885-915
if (conversation.workflowId && shouldProcessWithBot) {
  // ✅ USA WORKFLOW DO BANCO
  const logs = await advanceWorkflow(conversation, text)
} else if (shouldProcessWithBot) {
  // ❌ FALLBACK HARDCODED (só se não tiver workflowId)
  const handled = await handleAppointmentFlow(conversation, patient, text)
  if (!handled) {
    await processWithAI() // ou sendAutoResponse()
  }
}
```

### 2. Quando USA Workflow (Comportamento Correto ✅)

**Condição**: `conversation.workflowId` existe E `status === 'BOT_QUEUE'`

**Fluxo**:
1. `advanceWorkflow()` carrega o workflow do banco (`Workflow.config.nodes`)
2. Cria `WorkflowEngine` com os nodes do banco
3. Executa o nó atual (ex: `gpt_classifier`)
4. GPT classifica a intenção:
   - "qual valor da acupuntura?" → Porta 1 (VALORES) ou Porta 4 (PROCEDIMENTO)
5. Navega para o nó correspondente:
   - Porta 1 → `branch_valores` → `explicacao_acupuntura` (resposta completa)
   - Porta 4 → `branch_procedimentos` → `explicacao_acupuntura` (resposta completa)
6. O nó `explicacao_acupuntura` tem a mensagem completa:
   ```
   💉 **Acupuntura**
   📖 **O que é:** Técnica milenar...
   💰 **Valores:**
   • Particular: R$ 180,00/sessão
   • Avaliação: R$ 200,00 (obrigatória)
   • Convênios: R$ 140-160,00/sessão
   • Pacote 10 sessões com desconto especial
   ```

### 3. Quando USA Fallback Hardcoded (Comportamento Simples ❌)

**Condição**: `!conversation.workflowId` OU workflow não encontrado

**Fluxo**:
1. `handleAppointmentFlow()` verifica palavras-chave hardcoded:
   ```typescript
   if (lower.includes('acupuntura')) {
     // Só retorna valores básicos de particular
     msg = `ℹ️ ${proc.description}\n💰 Valores Particular: R$ ${price}\nInforme convênio...`
   }
   ```
2. Resposta limitada (sem pacotes, sem detalhes completos)

## 🎯 Resposta Completa vs Simples

### ✅ Resposta Completa (Workflow do Banco)
```
💉 **Acupuntura**

📖 **O que é:**
Técnica milenar da medicina chinesa...

✨ **Benefícios:**
• Alívio de dores crônicas
• Redução de enxaquecas
...

💰 **Valores:**
• Particular: R$ 180,00/sessão
• Avaliação: R$ 200,00 (obrigatória)
• Convênios: R$ 140-160,00/sessão
• Pacote 10 sessões com desconto especial

⏱️ Duração: 45 minutos
⚠️ Requer avaliação prévia

📅 Quer agendar?
```

### ❌ Resposta Simples (Fallback Hardcoded)
```
ℹ️ Acupuntura

💰 Valores Particular por unidade:
• Unidade Vieiralves: R$ 180.00
• Unidade São José: R$ 180.00

Informe seu convênio e unidade para confirmar o valor.
```

## 🔧 Como Garantir que o Workflow seja Usado

### 1. Verificar se Conversa tem workflowId

```typescript
// Quando cria nova conversa (linha 750-763)
const wf = await getDefaultWorkflow()
if (wf) {
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      workflowId: wf.id,  // ✅ CRÍTICO: setar workflowId
      currentWorkflowNode: startNode?.id || 'start',
      workflowContext: {},
      awaitingInput: false
    }
  })
}
```

### 2. Verificar se Workflow Existe no Banco

```typescript
// getDefaultWorkflow() (linha 1815-1831)
async function getDefaultWorkflow() {
  // 1. Tenta pegar do AuditLog DEFAULT_WORKFLOW
  // 2. Senão, pega workflow isActive=true com nó clinic_selection
  // 3. Senão, pega último isActive=true
  return actives[0] || null
}
```

### 3. Garantir que Workflow está no Railway

O script `deploy:prod` já faz:
```bash
npx prisma db push && npx tsx scripts/import_workflow_definitivo.ts && npx tsx api/server.ts
```

Isso deve:
- Criar tabelas no Postgres
- Importar `workflow_completo_definitivo.json` como `isActive=true`
- Iniciar servidor

## 🐛 Problemas Comuns

### Problema 1: Conversa sem workflowId
**Sintoma**: Bot responde "Não entendi..."
**Causa**: Conversa criada sem `workflowId` setado
**Solução**: Verificar se `getDefaultWorkflow()` está retornando workflow e se está sendo setado na criação da conversa

### Problema 2: Workflow não encontrado no banco
**Sintoma**: `advanceWorkflow()` retorna logs "⚠️ Workflow não encontrado"
**Causa**: Workflow não foi importado ou foi desativado
**Solução**: Rodar `import_workflow_definitivo.ts` no Railway

### Problema 3: Workflow sem nó explicacao_acupuntura
**Sintoma**: Resposta incompleta mesmo com workflow
**Causa**: Workflow no banco não tem o nó `explicacao_acupuntura` configurado
**Solução**: Verificar se `workflow_completo_definitivo.json` tem esse nó e reimportar

## ✅ Checklist para Railway Funcionar Igual ao Local

- [ ] `workflow_completo_definitivo.json` está na raiz do projeto (commitado)
- [ ] Script `deploy:prod` roda `import_workflow_definitivo.ts` no deploy
- [ ] Workflow é importado como `isActive=true` no Railway
- [ ] `getDefaultWorkflow()` encontra o workflow ativo
- [ ] Conversas novas recebem `workflowId` na criação
- [ ] `advanceWorkflow()` é chamado (não cai no fallback)
- [ ] Nó `explicacao_acupuntura` existe no workflow importado

## 📝 Conclusão

**O comportamento correto (resposta completa) vem do WORKFLOW DO BANCO**, não do código hardcoded.

O código hardcoded (`handleAppointmentFlow`) é apenas um **fallback** quando não há workflow disponível.

Para garantir que Railway funcione igual ao local:
1. ✅ Workflow deve estar no banco do Railway (`isActive=true`)
2. ✅ Conversas devem ter `workflowId` setado
3. ✅ `advanceWorkflow()` deve ser chamado (não o fallback)

