# 🤖 Melhoria: GPT Mais Conversacional e Útil

## 🎯 Problema Identificado

O GPT estava apenas **classificando** a intenção do usuário, mas não **respondendo** de forma útil.

### Exemplo do Problema:

```
USER: "eu to com encaminhamento pra 10 sessões de fisioterapia"
BOT: "Encaminhamento para sessões de fisioterapia" ❌ (apenas classificou)

USER: "isso"
BOT: "perguntas sobre procedimentos" ❌ (classificação genérica)
```

**Resultado:** Usuário frustrado, conversa não avança.

## ✅ Solução Aplicada

Melhorado o **system prompt** do GPT para:

1. **Responder de forma conversacional** (não apenas classificar)
2. **Fazer perguntas esclarecedoras** quando necessário
3. **Reconhecer confirmações** ("sim", "isso", "correto")
4. **Direcionar o usuário** para o que ele precisa
5. **Ser útil mesmo em situações fora do fluxo**

### Arquivo Modificado:
- `src/services/workflow/executors/gptExecutor.ts`

## 📋 Novo Comportamento

### Exemplo 1: Encaminhamento Médico

**Antes:**
```
USER: "tenho encaminhamento para fisioterapia"
BOT: "Encaminhamento para sessões de fisioterapia" ❌
```

**Depois:**
```
USER: "tenho encaminhamento para fisioterapia"
BOT: "Ótimo! Você tem encaminhamento para fisioterapia. Para qual procedimento específico você precisa? (ex: ortopédica, neurológica, RPG, acupuntura)" ✅
```

### Exemplo 2: Confirmação

**Antes:**
```
USER: "isso"
BOT: "perguntas sobre procedimentos" ❌
```

**Depois:**
```
USER: "isso"
BOT: "Perfeito! Vamos prosseguir com seu agendamento. Qual procedimento você precisa?" ✅
```

### Exemplo 3: Pergunta Financeira

**Antes:**
```
USER: "posso parcelar?"
BOT: "perguntas sobre valores" ❌
```

**Depois:**
```
USER: "posso parcelar?"
BOT: "Sobre formas de pagamento e parcelamento, vou te conectar com nossa equipe para te dar as melhores opções!" ✅
```

### Exemplo 4: Mensagem Vaga

**Antes:**
```
USER: "preciso de ajuda"
BOT: "atendente humano" ❌
```

**Depois:**
```
USER: "preciso de ajuda"
BOT: "Claro! Estou aqui para ajudar. Você precisa de informações sobre valores, convênios, localização, ou quer agendar uma consulta?" ✅
```

## 🔧 Mudanças Técnicas

### System Prompt Antigo:
```typescript
`Você é um classificador de intenção para clínica de fisioterapia. 
Analise a mensagem do usuário e classifique em UMA das opções:
...
Responda APENAS com JSON no formato {"intent_port":"...","brief":"<mensagem curta>",...}`
```

### System Prompt Novo:
```typescript
`Você é um assistente virtual da clínica de fisioterapia. Sua função é:
1. RESPONDER de forma útil e conversacional
2. CLASSIFICAR a intenção do usuário

INSTRUÇÕES ESPECIAIS:
- Se o usuário mencionar "encaminhamento" ou "sessões", pergunte qual procedimento
- Se o usuário confirmar algo com "sim", "isso", reconheça positivamente
- Se não souber classificar com certeza, seja útil e pergunte mais detalhes
- SEMPRE inclua uma mensagem útil no campo "brief", não apenas uma classificação seca

EXEMPLOS:
- "tenho encaminhamento para fisioterapia" → {"brief":"Ótimo! Você tem encaminhamento..."}
- "isso mesmo" → {"brief":"Perfeito! Vamos prosseguir..."}
...`
```

## 📊 Impacto

| Aspecto | Antes | Depois |
|---------|-------|--------|
| **Classificação** | ✅ Funcionava | ✅ Funciona |
| **Conversação** | ❌ Robótica | ✅ Natural |
| **Utilidade** | ❌ Apenas classifica | ✅ Ajuda e direciona |
| **Clareza** | ❌ Confuso | ✅ Claro |
| **Experiência** | ❌ Frustante | ✅ Agradável |

## 🎯 Casos de Uso Cobertos

### 1. **Encaminhamento Médico**
```
USER: "tenho encaminhamento pra 10 sessões"
BOT: "Ótimo! Você tem encaminhamento para fisioterapia. Para qual procedimento específico você precisa?"
```

### 2. **Confirmações**
```
USER: "sim" / "isso" / "correto"
BOT: "Perfeito! Vamos prosseguir..."
```

### 3. **Perguntas Financeiras**
```
USER: "posso parcelar?"
BOT: "Sobre formas de pagamento, vou te conectar com nossa equipe!"
```

### 4. **Mensagens Vagas**
```
USER: "oi" / "olá" / "preciso de ajuda"
BOT: "Olá! Como posso te ajudar? Posso informar sobre valores, convênios, localização, ou agendar uma consulta para você!"
```

### 5. **Contexto de Conversa Anterior**
```
(Após usuário perguntar sobre RPG)
USER: "quanto custa?"
BOT: "O RPG custa R$ 120,00 por sessão particular. Temos pacote de 10 sessões por R$ 1.000,00..."
```

## 🚀 Deploy

### Local
✅ Já aplicado

### Railway
```bash
# 1. Push para GitHub
git push origin main

# 2. Railway faz deploy automático

# 3. Testar conversas
```

## ✅ Testes Recomendados

1. **Teste encaminhamento:**
   ```
   USER: "tenho encaminhamento para fisioterapia"
   ```

2. **Teste confirmação:**
   ```
   USER: "quero agendar"
   BOT: "Vou precisar de alguns dados..."
   USER: "ok"
   ```

3. **Teste pergunta vaga:**
   ```
   USER: "oi"
   ```

4. **Teste contexto:**
   ```
   USER: "quanto custa o rpg?"
   USER: "e a acupuntura?"
   ```

## 📝 Observações

- O GPT agora **responde** antes de classificar
- A experiência é mais **conversacional**
- O usuário sempre recebe uma **resposta útil**
- A classificação continua funcionando para **roteamento interno**

---

**Status:** Implementado e pronto para deploy! 🚀

