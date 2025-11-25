# 🔧 Correção do Problema de Contexto no Workflow

## 📋 **Problema Identificado**

Quando o usuário fazia perguntas sequenciais sobre procedimentos, o bot perdia o contexto:

```
USER: qual valor da acupuntura?
BOT: 💉 Acupuntura - R$ 180,00/sessão ✅

USER: e o da fisioterapia?
BOT: 📍 Localização das Nossas Unidades ❌ (ERRADO!)
```

## 🔍 **Diagnóstico**

### O que estava acontecendo:

1. ✅ Usuário pergunta sobre **acupuntura** → Bot responde corretamente com **preços**
2. ✅ Workflow salva o próximo nó (`gpt_classifier`) no banco de dados
3. ✅ Usuário pergunta "e o da fisioterapia?"
4. ✅ Workflow carrega e volta para `gpt_classifier`
5. ❌ **GPT classifica incorretamente** como "localização" ao invés de "preços"

### Por que o GPT errava?

- O GPT **não recebia o histórico da conversa** no prompt
- Perguntas de **follow-up** (ex: "e o da fisioterapia?") **não mantinham o tópico** anterior
- Faltava detecção de contexto conversacional

## ✅ **Solução Implementada**

### 1. **Rastreamento de Tópico** (`lastTopic`)

Adicionei um sistema de rastreamento do tópico atual da conversa:

```typescript
// Salva o tópico quando detectado
this.context.userData.lastTopic = 'price'; // ou 'insurance', 'location', 'scheduling'
```

### 2. **Detecção de Follow-Up Questions**

Criado detector de perguntas de continuação:

```typescript
// Detecta padrões como "e o da...", "e a...", "e do..."
const isFollowUp = /^(e\s+)?((o|a)\s+)?(do|da|de|dos|das)\s+/.test(normalized.trim());
```

### 3. **Manutenção de Contexto em Follow-Ups**

Quando uma pergunta é follow-up + menciona procedimento, mantém o tópico anterior:

```typescript
if (isFollowUp && hasProcIntent && lastTopic) {
  console.log(`🔧 GPT_RESPONSE - Detected follow-up question, maintaining topic: ${lastTopic}`);
  if (lastTopic === 'price') {
    nextNodeId = connections.find(c => c.port === '1')?.targetId;
    // Mantém no fluxo de preços!
  }
}
```

### 4. **Histórico no Prompt do GPT**

O GPT agora recebe o histórico da conversa para melhor classificação:

```typescript
const historyContext = this.context.conversationHistory
  .slice(-4) // Últimas 4 mensagens
  .map(h => `${h.role === 'user' ? 'Usuário' : 'Bot'}: ${h.content}`)
  .join('\n');

const contextInfo = lastTopic 
  ? `\n\nContexto: O usuário estava perguntando sobre ${lastTopic === 'price' ? 'valores/preços' : ...}` 
  : '';

const prompt = `${systemPrompt}\n\nHistórico recente:\n${historyContext}${contextInfo}\n\n...`;
```

### 5. **Atualização de Tópico Após Classificação GPT**

O sistema atualiza o tópico baseado na classificação:

```typescript
if (port === '1') this.context.userData.lastTopic = 'price';
else if (port === '2') this.context.userData.lastTopic = 'insurance';
else if (port === '3') this.context.userData.lastTopic = 'location';
// ...
```

## 🎯 **Resultado Esperado**

Agora o fluxo funciona corretamente:

```
USER: qual valor da acupuntura?
BOT: 💉 Acupuntura - R$ 180,00/sessão ✅
(lastTopic = 'price')

USER: e o da fisioterapia?
(isFollowUp = true, mantém lastTopic = 'price')
BOT: 💰 Fisioterapia - R$ 150,00/sessão ✅
(lastTopic = 'price')

USER: qual o horário?
(não é follow-up, detecta intent 'location')
BOT: 📍 Horários de Atendimento ✅
(lastTopic = 'location')
```

## 📁 **Arquivos Modificados**

- `src/services/workflowEngine.ts` - Função `executeGPTResponseNode()`
  - Linhas ~521-650: Lógica completa de classificação com contexto
  - **Modelo atualizado:** gpt-3.5-turbo → **gpt-4o** (melhor precisão)

## 🧪 **Como Testar**

1. Inicie uma conversa e escolha uma unidade
2. Pergunte: "qual valor da acupuntura?"
3. Após a resposta, pergunte: "e o da fisioterapia?"
4. O bot deve responder com os **preços da fisioterapia**, não com localização

## 📝 **Notas Técnicas**

- O `lastTopic` é salvo em `context.userData` e persiste no banco via `workflowContext`
- O workflow JSON já tinha as conexões corretas (`tmpl_prices` → `gpt_classifier`)
- O problema era puramente na lógica de classificação do GPT
- A solução é **backward-compatible** e não quebra fluxos existentes

## 🚀 **Upgrade GPT-4o**

Além das correções de contexto, o sistema foi atualizado para usar **GPT-4o**:

- **Modelo anterior:** gpt-3.5-turbo
- **Modelo atual:** gpt-4o
- **Benefício:** Classificação de intenções muito mais precisa
- **Impacto:** Redução significativa de erros em follow-up questions
- **Documentação:** Ver `GPT4O_UPGRADE.md` para detalhes completos

---

**Data da Correção:** 24/11/2025  
**Desenvolvedor:** AI Assistant  
**Versão:** 2.0.0 (com GPT-4o)

