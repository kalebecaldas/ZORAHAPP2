# 🎯 Fix: GPT Detecta e Responde sobre Procedimentos Específicos

## 🐛 Problemas Identificados

### Problema 1: Lista Genérica Desnecessária
**Antes:**
```
USER: "qual valor da acupuntura?"
BOT: "Entendi que você quer saber sobre valores! 💰

Nossos principais procedimentos:
- Fisioterapia Ortopédica (R$ 90,00)
- Fisioterapia Neurológica (R$ 100,00)
- Fisioterapia Respiratória (R$ 100,00)
- Acupuntura (R$ 180,00)
- Fisioterapia Pélvica (R$ 220,00)

Qual procedimento te interessa?

💉 **Acupuntura** ..." ❌ (Lista desnecessária)
```

**Depois (corrigido):**
```
USER: "qual valor da acupuntura?"
BOT: "📋 **Acupuntura**

💰 **Valor (Particular):** R$ 180,00

Gostaria de saber mais detalhes ou ver outros procedimentos?" ✅
```

### Problema 2: Não Reconhecia "RPG"
**Antes:**
```
USER: "e o rpg?"
BOT: "Você quer saber sobre procedimentos! 📝

Oferecemos:
- Fisioterapia Ortopédica (R$ 90,00)
- Fisioterapia Neurológica (R$ 100,00)
..." ❌ (Não reconheceu "rpg")
```

**Depois (corrigido):**
```
USER: "e o rpg?"
BOT: "📋 **RPG (Reeducação Postural Global)**

📝 Procedimento de reeducação postural para correção de postura...

💰 **Valor:** R$ 120,00

Quer saber mais alguma coisa?" ✅
```

## ✅ Solução Implementada

### 1. Função de Detecção de Procedimentos

Criada função `detectProcedureInMessage()` que:
- ✅ Detecta procedimentos mencionados na mensagem do usuário
- ✅ Suporta variações e erros de digitação
- ✅ Remove acentos para matching flexível
- ✅ Retorna o objeto completo do procedimento com id, nome, descrição, preço

**Palavras-chave suportadas:**
```typescript
{
  'acupuntura': ['acupuntura', 'acupuntur', 'agulha', 'agulhamento'],
  'rpg': ['rpg', 'reeducacao postural', 'reeducação postural', 'postura global'],
  'fisioterapia-ortopedica': ['ortopedica', 'ortopédica', 'ortopedic', 'orto'],
  'fisioterapia-neurologica': ['neurologica', 'neurológica', 'neurologic', 'neuro'],
  // ... e outros procedimentos
}
```

### 2. Respostas Específicas por Procedimento

**Quando procedimento é detectado:**
- ✅ Responde APENAS sobre aquele procedimento
- ✅ Inclui nome, descrição, preço
- ✅ Pergunta se quer saber mais

**Quando procedimento NÃO é detectado:**
- ✅ Mostra lista geral de procedimentos
- ✅ Pergunta qual procedimento interessa

### 3. Salvar no Contexto

O procedimento detectado é salvo no contexto:
```typescript
context.userData.lastMentionedProcedure = "Acupuntura"
context.userData.lastMentionedProcedureId = "acupuntura"
```

**Isso permite:**
- Próximos nós usarem essa informação
- APIs de preço/agendamento já saberem o procedimento
- Fluxo mais natural e direto

## 📊 Comparação: Antes vs Depois

### Caso 1: Pergunta Específica sobre Valor

**ANTES:**
```
USER: "qual valor da acupuntura?"

GPT classifica → Porta 1 (VALORES)
Brief curto → Fallback genérico ❌
Lista TODOS os procedimentos ❌

BOT: "Entendi que você quer saber sobre valores! 💰
     Nossos principais procedimentos:
     - Fisioterapia Ortopédica (R$ 90,00)
     - Fisioterapia Neurológica (R$ 100,00)
     - Fisioterapia Respiratória (R$ 100,00)
     - Acupuntura (R$ 180,00)
     - Fisioterapia Pélvica (R$ 220,00)
     Qual procedimento te interessa?"
```

**DEPOIS:**
```
USER: "qual valor da acupuntura?"

GPT classifica → Porta 1 (VALORES)
detectProcedureInMessage() → Encontra "acupuntura" ✅
Gera resposta específica ✅

BOT: "📋 **Acupuntura**
     💰 **Valor (Particular):** R$ 180,00
     Gostaria de saber mais detalhes ou ver outros procedimentos?"
```

### Caso 2: Pergunta de Follow-up ("e o rpg?")

**ANTES:**
```
USER: "e o rpg?"

GPT classifica → Porta 4 (PROCEDIMENTO)
Não detecta "rpg" ❌
Brief curto → Fallback genérico ❌

BOT: "Você quer saber sobre procedimentos! 📝
     Oferecemos:
     - Fisioterapia Ortopédica (R$ 90,00)
     - Fisioterapia Neurológica (R$ 100,00)
     ..."
```

**DEPOIS:**
```
USER: "e o rpg?"

GPT classifica → Porta 4 (PROCEDIMENTO)
detectProcedureInMessage() → Encontra "rpg" ✅
Gera resposta específica ✅

BOT: "📋 **RPG (Reeducação Postural Global)**
     📝 Procedimento de reeducação postural...
     💰 **Valor:** R$ 120,00
     Quer saber mais alguma coisa?"
```

## 🔧 Arquivos Modificados

### `src/services/workflow/executors/gptExecutor.ts`

**1. Adicionada função `detectProcedureInMessage()`:**
```typescript
function detectProcedureInMessage(message: string): Procedure | undefined {
  const normalized = message.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  
  const procedureKeywords: Record<string, string[]> = {
    'acupuntura': ['acupuntura', 'acupuntur', 'agulha'],
    'rpg': ['rpg', 'reeducacao postural', 'postura global'],
    // ... outros procedimentos
  };
  
  // Busca procedimento mencionado
  for (const procedure of allProcedures) {
    for (const keyword of keywords) {
      if (normalized.includes(keyword)) {
        return procedure;
      }
    }
  }
  
  return undefined;
}
```

**2. Modificado o fluxo de resposta:**
```typescript
// Detecta procedimento mencionado
const detectedProcedure = detectProcedureInMessage(userMessage);
if (detectedProcedure) {
  context.userData.lastMentionedProcedure = detectedProcedure.name;
  context.userData.lastMentionedProcedureId = detectedProcedure.id;
}

// Se brief for curto, gera resposta melhor
if (conversationalResponse.length < 50) {
  
  // Se procedimento específico foi mencionado
  if (detectedProcedure) {
    const price = clinicDataService.getPrice(detectedProcedure.id, clinicCode);
    
    if (port === '1') { // VALORES
      conversationalResponse = `📋 **${detectedProcedure.name}**
                                💰 **Valor:** ${price}
                                Gostaria de saber mais?`;
    } else if (port === '4') { // PROCEDIMENTO_INFO
      conversationalResponse = `📋 **${detectedProcedure.name}**
                                📝 ${detectedProcedure.description}
                                💰 **Valor:** ${price}
                                Quer saber mais?`;
    }
  } else {
    // Nenhum procedimento específico - lista geral
    conversationalResponse = `Oferecemos:\n${mainProcedures}\n\nQual te interessa?`;
  }
}
```

## 🧪 Testes de Validação

### Teste 1: Pergunta Direta sobre Acupuntura
```
INPUT: "qual valor da acupuntura?"
ESPERADO: Resposta apenas sobre acupuntura ✅
RESULTADO: ✅ Passou
```

### Teste 2: Follow-up sobre RPG
```
INPUT: "e o rpg?"
ESPERADO: Resposta apenas sobre RPG ✅
RESULTADO: ✅ Passou
```

### Teste 3: Pergunta Genérica
```
INPUT: "quero saber valores"
ESPERADO: Lista de todos os procedimentos ✅
RESULTADO: ✅ Passou
```

### Teste 4: Variações de Escrita
```
INPUT: "qual o preço da acupuntur?" (sem 'a')
ESPERADO: Detecta como acupuntura ✅
RESULTADO: ✅ Passou (keywords flexíveis)
```

## 📝 Palavras-chave Suportadas

| Procedimento | Palavras-chave |
|--------------|----------------|
| Acupuntura | acupuntura, acupuntur, agulha, agulhamento |
| RPG | rpg, reeducacao postural, reeducação postural, postura global |
| Fisioterapia Ortopédica | ortopedica, ortopédica, ortopedic, orto |
| Fisioterapia Neurológica | neurologica, neurológica, neurologic, neuro |
| Fisioterapia Respiratória | respiratoria, respiratória, respirator |
| Fisioterapia Pélvica | pelvica, pélvica, pelvic, assoalho pelvico |
| Pilates | pilates, pilate |
| Drenagem Linfática | drenagem, linfatica, linfática |
| Bandagem | bandagem, kinesio, kinesiotape |
| Dry Needling | dry needling, agulhamento seco |

## 🚀 Como Adicionar Novos Procedimentos

Para adicionar suporte a novos procedimentos:

1. **No `clinicData.json`:**
```json
{
  "id": "novo-procedimento",
  "name": "Nome do Procedimento",
  "description": "Descrição..."
}
```

2. **No `gptExecutor.ts`:**
```typescript
const procedureKeywords: Record<string, string[]> = {
  'novo-procedimento': ['keyword1', 'keyword2', 'variação'],
  // ...
};
```

## ✅ Status

- ✅ Detecção de procedimentos implementada
- ✅ Respostas específicas por procedimento
- ✅ Suporte a variações e erros de digitação
- ✅ Contexto salvo para próximos nós
- ✅ Logs melhorados para debug
- ✅ Sem erros de compilação
- ✅ Pronto para deploy

## 🔍 Logs de Debug

Quando um procedimento é detectado:
```
🎯 Detected procedure: "acupuntura" → Acupuntura
🤖 [GPT] 🎯 Procedimento detectado na mensagem: Acupuntura
🤖 [GPT] ✨ Resposta específica para Acupuntura: "📋 **Acupuntura**..."
```

---

**Resultado:** Bot agora responde especificamente sobre o procedimento mencionado, sem listas desnecessárias! 🎯

