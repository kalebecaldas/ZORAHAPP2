# 🔍 Depuração: Fluxo Completo do Bot

## 📋 Fluxo de Processamento de Mensagem

Quando uma mensagem chega, o sistema segue este caminho:

### 1. **Entrada da Mensagem** (`api/routes/webhook.ts` ou `api/routes/conversations.ts`)
```
Mensagem recebida → processIncomingMessage()
```

### 2. **Verificação de Status** (`api/routes/conversations.ts:1688`)
```typescript
if (!shouldProcessWithBot) {
  // Se status não é BOT_QUEUE, não processa com bot
  return workflowLogs
}
```

### 3. **Roteamento Inteligente** (`api/routes/conversations.ts:1698`)
```typescript
const decision = await intelligentRouter.route(text, conversation.id, phone)
```

### 4. **Geração de Resposta da IA** (`api/services/intelligentRouter.ts:63`)
```typescript
const aiResponse = await ai.generateResponse(message, conversationId, phone)
```

### 5. **Construção do Prompt** (`api/services/conversationalAI.ts:102`)
```typescript
const systemPrompt = await this.buildRichSystemPrompt(context, clinicData)
```

### 6. **Chamada à OpenAI** (`api/services/conversationalAI.ts:130`)
```typescript
const completion = await this.openai.chat.completions.create({...})
```

### 7. **Validação e Correção** (`api/services/conversationalAI.ts:160`)
```typescript
// ✅ VALIDAÇÃO: Se INTENT é AGENDAR mas ACTION não é collect_data, corrigir
if (response.intent === 'AGENDAR' && response.action === 'continue') {
  response.action = 'collect_data'
}
```

### 8. **Decisão de Roteamento** (`api/services/intelligentRouter.ts:132`)
```typescript
switch (aiResponse.action) {
  case 'collect_data': // Bot continua coletando dados
  case 'transfer_human': // Bot transfere para humano
  case 'continue': // Bot continua conversando
}
```

### 9. **Envio da Resposta** (`api/routes/conversations.ts:2007`)
```typescript
case 'AI_CONVERSATION':
  await whatsappService.sendTextMessage(phone, decision.response)
```

---

## 🔍 Logs de Depuração Adicionados

Agora o sistema tem logs detalhados em cada etapa:

### **Logs no IntelligentRouter:**
- `🔍 [DEBUG] Iniciando geração de resposta`
- `📊 [DEBUG] Resposta completa da IA`
- `🎯 [DEBUG] ACTION recebido`
- `🔍 [DEBUG makeRoutingDecision] ACTION recebido`
- `🔍 [DEBUG makeRoutingDecision] INTENT recebido`
- `🔍 [DEBUG makeRoutingDecision] Paciente existe?`

### **Logs no ConversationalAI:**
- `📋 [DEBUG] Resposta JSON completa`
- `⚠️ [DEBUG] INTENT=AGENDAR mas ACTION=continue. CORRIGINDO`
- `🎯 [DEBUG] ACTION final após validação`
- `🎯 [DEBUG] INTENT final após validação`

---

## ✅ Validações Implementadas

### 1. **Validação de ACTION**
- Se ACTION não é válido → corrige para "continue"
- Se INTENT é "AGENDAR" mas ACTION é "continue" → corrige para "collect_data"

### 2. **Validação de Palavras-chave**
- Se mensagem contém "agendar", "marcar", "fazer" mas INTENT não é "AGENDAR" → corrige INTENT e ACTION

### 3. **Prompt Reforçado**
- Instruções explícitas sobre fazer cadastro PRIMEIRO
- Checklist antes de responder
- Exemplos claros do que fazer e não fazer

---

## 🧪 Como Testar

1. **Envie uma mensagem de agendamento:**
   ```
   "quero agendar fisioterapia"
   ```

2. **Verifique os logs no terminal:**
   - Procure por `[DEBUG]` para ver o fluxo completo
   - Verifique se `ACTION` está correto (`collect_data` para agendamento)
   - Verifique se `INTENT` está correto (`AGENDAR`)

3. **Verifique a resposta do bot:**
   - Deve perguntar o **NOME COMPLETO** primeiro
   - **NÃO** deve perguntar procedimento, unidade, data ou horário antes do cadastro

---

## 🐛 Problemas Comuns

### Problema: Bot pergunta procedimento antes do nome
**Causa:** IA retornou `action: "continue"` ao invés de `action: "collect_data"`
**Solução:** Validação automática corrige, mas verifique logs para confirmar

### Problema: Bot não detecta intenção de agendar
**Causa:** Palavras-chave não detectadas ou INTENT incorreto
**Solução:** Validação por palavras-chave corrige automaticamente

### Problema: Bot transfere antes de coletar dados
**Causa:** IA retornou `action: "transfer_human"` antes de coletar todos os dados
**Solução:** Verificar se prompt está sendo respeitado (ver logs)

---

## 📊 Onde Ver os Logs

Todos os logs aparecem no **terminal onde o servidor está rodando** (`npm run dev`).

Procure por:
- `🔍 [DEBUG]` - Logs de depuração detalhados
- `⚠️ [DEBUG]` - Avisos de correção automática
- `📊 Decisão da IA` - Resposta completa da IA
- `🎯 [DEBUG]` - Validações e correções

---

## 🎯 Próximos Passos

1. **Teste enviando uma mensagem de agendamento**
2. **Copie os logs completos do terminal**
3. **Envie os logs para análise** se ainda houver problemas

Os logs vão mostrar exatamente onde o fluxo está quebrando!
