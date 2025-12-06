# 🔥 PLANO DE FIX DEFINITIVO - BOT COM LOOP

## 🎯 **PROBLEMAS IDENTIFICADOS:**

1. ❌ Bot diz "acupuntura" quando usuário disse "fisiot

erapia"
2. ❌ Bot pergunta novamente qual unidade após usuário responder
3. ❌ Não mantém contexto entre mensagens
4. ❌ Possível problema com histórico vazio ou mal formatado

---

## 🔍 **DIAGNÓSTICO:**

### **Possíveis Causas:**

1. **Histórico vazio**: `context.history.recent` pode estar retornando array vazio
2. **Cache de mensagens**: Mensagens não sendo recuperadas do banco corretamente
3. **Ordem do histórico**: Histórico pode estar invertido
4. **Prompt confuso**: IA recebendo instruções conflitantes

---

## ✅ **SOLUÇÃO PASSO A PASSO:**

### **PASSO 1: Verificar Logs**

No terminal do backend, procure por:
```
📜 Histórico de X mensagens incluído no contexto
📜 Histórico completo: [...]
```

**SE histórico está vazio (0 mensagens):**
- Problema está no `conversationContextService`
- Mensagens não estão sendo salvas ou recuperadas

**SE histórico tem mensagens mas bot ainda erra:**
- Problema está no prompt ou na IA interpretando mal

---

### **PASSO 2: Verificar Banco de Dados**

Rode no Prisma Studio ou diretamente:
```sql
SELECT * FROM "Message" WHERE "conversationId" = 'SEU_ID' ORDER BY "timestamp" DESC LIMIT 20;
```

Veja se as mensagens estão sendo salvas com:
- `from`: 'BOT' ou 'PATIENT'
- `messageText`: Texto correto
- `direction`: 'SENT' ou 'RECEIVED'

---

### **PASSO 3: Fix Temporário - System Prompt Mais Forte**

Vou adicionar instruções **MUITO MAIS FORTES** no prompt:

```typescript
## ⚠️ REGRAS CRÍTICAS DE CONTEXTO (LEIA COM ATENÇÃO!)

**VOCÊ ESTÁ FALHANDO EM MANTER O CONTEXTO!**

**REGRA #1**: SEMPRE leia o histórico COMPLETO antes de responder
**REGRA #2**: SE algo foi dito, NUNCA pergunte novamente
**REGRA #3**: SE o paciente disse "fisioterapia", não mencione "acupuntura"
**REGRA #4**: SE o paciente disse "Vieiralves", NÃO pergunte qual unidade

**EXEMPLO DO QUE NÃO FAZER:**
❌ Usuário: "fisioterapia"
❌ Bot: "Qual procedimento?" (NÃO! Ele JÁ disse!)

**EXEMPLO CORRETO:**
✅ Usuário: "fisioterapia"
✅ Bot: "Ótimo! Fisioterapia confirmada. Qual unidade?"

**SEMPRE confirme o que foi dito antes de avançar!**
```

---

### **PASSO 4: Adicionar Validação de Entidades**

Modificar a IA para SEMPRE extrair entidades e confirmar:

```typescript
// Após gerar resposta
if (response.entities.procedimento) {
    console.log(`✅ Procedimento detectado: ${response.entities.procedimento}`)
}
if (response.entities.clinica) {
    console.log(`✅ Clínica detectada: ${response.entities.clinica}`)
}
```

---

### **PASSO 5: Forçar Lembrança no Prompt**

Adicionar ao system prompt:

```
**INFORMAÇÕES JÁ COLETADAS NESTA CONVERSA:**
${context.history.recent.map(m => `- ${m.role}: ${m.content}`).join('\n')}

**NUNCA pergunte novamente algo que já está acima!**
```

---

## 🚀 **AÇÃO IMEDIATA:**

Vou implementar:
1. Logs mais detalhados
2. Prompt MUITO mais forte
3. Validação de entidades
4. Resumo de informações coletadas

**Teste novamente após o servidor reiniciar!**

---

## 📊 **O QUE ESPERAR:**

Após o fix, o bot deve:
- ✅ Lembrar que disse "fisioterapia"
- ✅ Lembrar que disse "Vieiralves"
- ✅ Não repetir perguntas
- ✅ Confirmar informações antes de avançar
- ✅ Avançar linearmente (procedimento → unidade → data → horário)

---

**Implementando agora...**
