# Revisão de Lógica do Workflow - Correções Aplicadas

## 🔍 Problemas Identificados e Corrigidos

### 1. **Mapeamento Incorreto de Portas do GPT Classifier** ✅ CORRIGIDO

**Problema:**
- O código estava usando porta 4 para agendamento, mas o workflow tem porta 5 para agendamento
- O código estava usando porta 5 para humano, mas o workflow tem porta 6 para humano
- O prompt do GPT estava pedindo apenas 5 opções (1-5), mas o workflow tem 6 portas (1-6)

**Correção:**
- ✅ Atualizado mapeamento de portas para corresponder ao workflow:
  - Porta 1: Valores → `branch_valores`
  - Porta 2: Convênios → `info_convenios`
  - Porta 3: Localização → `info_localizacao`
  - Porta 4: Explicação de procedimento → `info_procedimento_explicacao`
  - Porta 5: Agendar → `check_patient`
  - Porta 6: Falar com humano → `transfer_human`
- ✅ Atualizado prompt do GPT para incluir todas as 6 opções
- ✅ Removido mapeamento incorreto que convertia porta 4→5 e 5→6
- ✅ Corrigido `service_selection` para usar portas corretas (5 para agendamento, 6 para humano)

**Arquivos modificados:**
- `src/services/workflowEngine.ts`:
  - `executeGPTResponseNode()`: Corrigido mapeamento de portas e prompt
  - `executeConditionNode()`: Corrigido `service_selection` para usar portas corretas
  - Mensagem genérica atualizada para incluir todas as 6 opções

### 2. **Mensagens Hard-Coded em `clinic_selection`** ✅ CORRIGIDO

**Problema:**
- O código estava usando `TemplateService.getInterpolatedTemplate()` com fallbacks hard-coded para mensagens de unidade
- Mensagens não vinham dos nodes do workflow (`unidade_vieiralves` e `unidade_sao_jose`)

**Correção:**
- ✅ Modificado `clinic_selection` para buscar mensagens dos nodes `unidade_vieiralves` e `unidade_sao_jose`
- ✅ Usa `interpolateMessage()` para processar placeholders
- ✅ Mantém fallback mínimo apenas se os nodes não existirem

**Arquivos modificados:**
- `src/services/workflowEngine.ts`:
  - `executeConditionNode()`: `clinic_selection` agora busca mensagens dos nodes do workflow

### 3. **Template Hard-Coded para Agendamento** ✅ CORRIGIDO

**Problema:**
- Mensagem "Vamos agendar sua consulta..." estava usando `TemplateService.getInterpolatedTemplate('scheduling_start')` com fallback hard-coded

**Correção:**
- ✅ Removido uso de template hard-coded
- ✅ Mantido fallback mínimo apenas se necessário
- ✅ O workflow deve ter um node MESSAGE antes de `check_patient` para enviar essa mensagem

**Arquivos modificados:**
- `src/services/workflowEngine.ts`:
  - `executeGPTResponseNode()`: Removido `TemplateService.getInterpolatedTemplate('scheduling_start')`

### 4. **System Prompt Padrão Desatualizado** ✅ CORRIGIDO

**Problema:**
- O `systemPrompt` padrão era genérico e não correspondia ao workflow real (que tem 6 portas)

**Correção:**
- ✅ Atualizado `systemPrompt` padrão para corresponder exatamente ao workflow:
  - 1) VALORES
  - 2) CONVÊNIOS
  - 3) LOCALIZAÇÃO
  - 4) PROCEDIMENTO
  - 5) AGENDAR
  - 6) ATENDENTE

**Arquivos modificados:**
- `src/services/workflowEngine.ts`:
  - `executeGPTResponseNode()`: Atualizado `systemPrompt` padrão

## 🔍 Verificações Realizadas

### Workflow no Banco de Dados
- ✅ Verificado que o workflow tem 6 portas corretamente mapeadas
- ✅ Verificado que os nodes `unidade_vieiralves` e `unidade_sao_jose` têm mensagens configuradas
- ✅ Verificado que o `gpt_classifier` tem `systemPrompt` correto no banco

### Código Frontend
- ✅ Verificado que `WorkflowEditorBeta.tsx` carrega edges corretamente
- ✅ Verificado que `workflowUtils.ts` mapeia portas corretamente para ReactFlow
- ✅ Verificado que não há problemas de renderização de edges

## 📋 Checklist de Validação

- [x] Portas do GPT classifier correspondem ao workflow (1-6)
- [x] Prompt do GPT inclui todas as 6 opções
- [x] Mapeamento de intenções usa portas corretas
- [x] Mensagens de unidade vêm dos nodes do workflow
- [x] Mensagens de agendamento não usam templates hard-coded
- [x] System prompt padrão corresponde ao workflow
- [x] Mensagens genéricas incluem todas as 6 opções

## 🚀 Próximos Passos Recomendados

1. **Testar fluxo completo de agendamento:**
   - Verificar se "quero agendar" vai para porta 5 corretamente
   - Verificar se `check_patient` é executado
   - Verificar se coleta de dados funciona

2. **Verificar outros templates hard-coded:**
   - Há ainda muitos usos de `TemplateService.getInterpolatedTemplate()` como fallback
   - Idealmente, todos os prompts deveriam vir dos nodes do workflow
   - Mas isso pode ser feito gradualmente conforme necessário

3. **Validar todas as portas do workflow:**
   - Garantir que todas as 6 portas do GPT classifier estão sendo usadas corretamente
   - Verificar se não há portas órfãs ou não utilizadas

4. **Documentar mapeamento de portas:**
   - Criar documentação clara sobre qual porta corresponde a qual intenção
   - Isso facilita manutenção futura

## 📝 Notas

- Os templates hard-coded restantes (`TemplateService.getInterpolatedTemplate()`) são usados principalmente como fallback quando os nodes do workflow não têm mensagens configuradas. Isso é aceitável, mas idealmente todos os textos deveriam vir do workflow editor.

- O `systemPrompt` do workflow no banco de dados já está correto e será usado em vez do padrão se estiver configurado.

- A correção principal foi garantir que o mapeamento de portas corresponde exatamente ao workflow, especialmente para agendamento (porta 5) e humano (porta 6).

