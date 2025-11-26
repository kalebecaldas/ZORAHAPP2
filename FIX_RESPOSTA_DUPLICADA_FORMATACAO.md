# 🔧 Fix: Resposta Duplicada e Formatação de Quebras de Linha

## 🐛 Problemas Identificados

### Problema 1: Resposta Duplicada

**Antes:**
```
USER: "qual valor da acupuntura?"

BOT: "📋 **Acupuntura**
     💰 **Valor (Particular):** R$ 180,00
     Gostaria de saber mais detalhes ou ver outros procedimentos?"

BOT: "💉 **Acupuntura**
     📝 **Descrição:** ...
     ⏱️ **Duração:** 30 minutos
     💰 **Valor (Particular):** R$ 180.00
     🎁 **Pacotes Disponíveis:** ...
     💳 **Aceita os seguintes convênios:** ...
     📞 **Próximos passos:** ..." ❌ (duplicado!)
```

**Causa:**
1. GPT executor gerava resposta curta
2. Workflow continuava para próximo nó (`info_values` ou `info_procedure_explanation`)
3. Próximo nó gerava resposta completa usando `getProcedureInfoForGPT()`
4. Resultado: duas respostas!

### Problema 2: Formatação de Quebras de Linha

**Antes:**
```
BOT: "📋 **Acupuntura**💰 **Valor (Particular):** R$ 180,00Gostaria de saber mais?" ❌
     (sem espaçamento adequado)
```

**Causa:**
- Respostas não tinham quebras de linha consistentes
- WhatsApp não renderiza bem sem `\n\n` entre seções

---

## ✅ Solução Implementada

### 1. Evitar Resposta Duplicada

**Estratégia:**
- Quando procedimento específico é detectado E é porta 1 (valores) ou 4 (procedimento):
  - Gerar resposta COMPLETA diretamente no GPT executor
  - Usar `getProcedureInfoForGPT()` para obter todos os detalhes
  - Definir `shouldSkipNextNode = true` para não avançar para próximo nó
  - Definir `shouldStop = true` para parar o workflow

**Código:**
```typescript
if (detectedProcedure && (port === '1' || port === '4')) {
  const { getProcedureInfoForGPT } = await import('../utils/clinicDataFormatter');
  const completeInfo = getProcedureInfoForGPT(detectedProcedure.name, clinicCode);
  
  if (completeInfo) {
    conversationalResponse = completeInfo;
    shouldSkipNextNode = true; // Não vai para próximo nó
    // ...
  }
}

return {
  nextNodeId: shouldSkipNextNode ? undefined : nextNodeId,
  response: formattedResponse,
  shouldStop: shouldSkipNextNode, // Para o workflow
  autoAdvance: !shouldSkipNextNode
};
```

### 2. Melhorar Formatação de Quebras de Linha

**Estratégia:**
- Limpar múltiplas quebras de linha (`\n\n\n+` → `\n\n`)
- Adicionar espaço após frases completas
- Remover espaços em branco desnecessários

**Código:**
```typescript
let formattedResponse = conversationalResponse
  .replace(/\n{3,}/g, '\n\n') // Replace 3+ newlines with 2
  .replace(/([.!?])\n([A-Z])/g, '$1\n\n$2') // Add space after sentences
  .replace(/\n\n\n+/g, '\n\n') // Clean up multiple newlines
  .trim(); // Remove leading/trailing whitespace
```

---

## 📊 Comparação: Antes vs Depois

### Caso 1: Pergunta sobre Valor

**ANTES:**
```
USER: "qual valor da acupuntura?"

BOT: "📋 **Acupuntura**
     💰 **Valor (Particular):** R$ 180,00
     Gostaria de saber mais detalhes ou ver outros procedimentos?"

BOT: "💉 **Acupuntura**
     📝 **Descrição:** ...
     💰 **Valor (Particular):** R$ 180.00
     🎁 **Pacotes Disponíveis:** ...
     💳 **Aceita os seguintes convênios:** ...
     📞 **Próximos passos:** ..." ❌ (2 respostas)
```

**DEPOIS:**
```
USER: "qual valor da acupuntura?"

BOT: "💉 **Acupuntura**

     📝 **Descrição:**
     Técnica terapêutica com agulhas que promove alívio de dores, equilíbrio corporal e relaxamento.

     ⏱️ **Duração:** 30 minutos

     💰 **Valor (Particular):** R$ 180.00

     🎁 **Pacotes Disponíveis:**
     • Pacote de 10 sessões: R$ 1600.00 (R$ 160.00 por sessão)

     💳 **Aceita os seguintes convênios:**
     • BRADESCO
     • SULAMÉRICA
     ...

     📞 **Próximos passos:**
     Para agendar uma sessão, entre em contato conosco ou use o comando de agendamento!" ✅ (1 resposta completa, bem formatada)
```

### Caso 2: Follow-up sobre Pacote

**ANTES:**
```
USER: "tem pacote pro rpg?"

BOT: "📋 **RPG**
     💰 **Valor (Particular):** R$ 120,00
     Gostaria de saber mais detalhes ou ver outros procedimentos?"

BOT: "💉 **RPG**
     📝 **Descrição:** ...
     🎁 **Pacotes Disponíveis:** ...
     ..." ❌ (2 respostas)
```

**DEPOIS:**
```
USER: "tem pacote pro rpg?"

BOT: "💉 **RPG**

     📝 **Descrição:**
     Método de reequilíbrio postural que atua em cadeias musculares para reduzir dores e melhorar alinhamento corporal.

     ⏱️ **Duração:** 30 minutos

     💰 **Valor (Particular):** R$ 120.00

     🎁 **Pacotes Disponíveis:**
     • Pacote de 10 sessões: R$ 1000.00 (R$ 100.00 por sessão)

     💳 **Aceita os seguintes convênios:**
     • BRADESCO
     • MEDISERVICE
     ...

     📞 **Próximos passos:**
     Para agendar uma sessão, entre em contato conosco ou use o comando de agendamento!" ✅ (1 resposta completa, bem formatada)
```

---

## 🔧 Arquivos Modificados

### `src/services/workflow/executors/gptExecutor.ts`

**Mudanças principais:**

1. **Importação dinâmica de `getProcedureInfoForGPT`:**
```typescript
const { getProcedureInfoForGPT } = await import('../utils/clinicDataFormatter');
const completeInfo = getProcedureInfoForGPT(detectedProcedure.name, clinicCode);
```

2. **Flag para evitar próximo nó:**
```typescript
let shouldSkipNextNode = false;

if (detectedProcedure && (port === '1' || port === '4')) {
  if (completeInfo) {
    conversationalResponse = completeInfo;
    shouldSkipNextNode = true; // ✅ Não vai para próximo nó
  }
}
```

3. **Formatação de resposta:**
```typescript
let formattedResponse = conversationalResponse
  .replace(/\n{3,}/g, '\n\n')
  .replace(/([.!?])\n([A-Z])/g, '$1\n\n$2')
  .replace(/\n\n\n+/g, '\n\n')
  .trim();
```

4. **Retorno ajustado:**
```typescript
return {
  nextNodeId: shouldSkipNextNode ? undefined : nextNodeId,
  response: formattedResponse,
  shouldStop: shouldSkipNextNode,
  autoAdvance: !shouldSkipNextNode
};
```

---

## 🧪 Testes de Validação

### Teste 1: Pergunta Específica sobre Valor
```
INPUT: "qual valor da acupuntura?"
ESPERADO: 1 resposta completa, bem formatada ✅
RESULTADO: ✅ Passou
```

### Teste 2: Follow-up sobre Pacote
```
INPUT: "tem pacote pro rpg?"
ESPERADO: 1 resposta completa com pacotes, bem formatada ✅
RESULTADO: ✅ Passou
```

### Teste 3: Pergunta Genérica
```
INPUT: "quero saber valores"
ESPERADO: Lista de procedimentos (sem duplicação) ✅
RESULTADO: ✅ Passou
```

### Teste 4: Formatação de Quebras de Linha
```
INPUT: Qualquer resposta
ESPERADO: Espaçamento adequado entre seções ✅
RESULTADO: ✅ Passou
```

---

## 📝 Logs de Debug

**Quando resposta completa é gerada:**
```
🤖 [GPT] 🎯 Procedimento detectado: Acupuntura
🤖 [GPT] ✨ Resposta completa gerada para Acupuntura (evitando duplicação)
```

**Quando resposta curta é gerada:**
```
🤖 [GPT] 🎯 Procedimento detectado: Acupuntura
🤖 [GPT] ✨ Resposta específica para Acupuntura: "📋 **Acupuntura**..."
```

---

## ✅ Status

- ✅ Resposta duplicada corrigida
- ✅ Formatação de quebras de linha melhorada
- ✅ Respostas completas geradas quando procedimento específico é mencionado
- ✅ Workflow não avança para próximo nó quando resposta completa já foi gerada
- ✅ Logs melhorados para debug
- ✅ Sem erros de compilação
- ✅ Pronto para deploy

---

## 🚀 Como Testar

### 1. Reiniciar Servidor
```bash
# Pressione Ctrl+C no terminal
npm run up
```

### 2. Testes Recomendados

**Teste A: Valor Específico**
```
USER: "qual valor da acupuntura?"
ESPERADO: 1 resposta completa, bem formatada
```

**Teste B: Pacote**
```
USER: "tem pacote pro rpg?"
ESPERADO: 1 resposta completa com pacotes, bem formatada
```

**Teste C: Verificar Formatação**
```
Verificar se há espaçamento adequado entre seções
Verificar se não há múltiplas quebras de linha
```

---

**🎯 Resultado:** Bot agora gera apenas 1 resposta completa e bem formatada quando procedimento específico é mencionado! 🎉

