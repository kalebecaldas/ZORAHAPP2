# 🔄 Correção do Loop GPT no Workflow Editor

## ✅ **Problema Resolvido**

O workflow não estava voltando ao GPT classifier após responder mensagens, causando problemas em perguntas de follow-up como "e o da fisioterapia?".

---

## 🔧 **Soluções Implementadas**

### **1. Correção no Código (`api/routes/conversations.ts`)**

Quando o usuário envia uma nova mensagem após uma resposta do bot:
- ✅ Sistema detecta automaticamente
- ✅ Volta ao GPT classifier para reclassificar a intenção
- ✅ Mantém contexto útil (clínica selecionada)
- ✅ Limpa tópico anterior para nova classificação

### **2. Endpoint para Ajustar Workflow**

**Endpoint:** `POST /api/workflows/:id/fix-gpt-loop`

**O que faz:**
- ✅ Verifica se existe nó GPT classifier no workflow
- ✅ Cria nó GPT classifier se não existir
- ✅ Conecta todos os nós MESSAGE de volta ao GPT classifier
- ✅ Garante que o fluxo sempre volte ao GPT após respostas

---

## 🚀 **Como Usar**

### **Opção 1: Via API (Recomendado)**

```bash
curl -X POST http://localhost:3001/api/workflows/cmibu88ho0000jizqbv1g3vj0/fix-gpt-loop
```

### **Opção 2: Via Script**

```bash
npx tsx scripts/fix_workflow_gpt_loop.ts
```

### **Opção 3: Manualmente no Editor**

1. Acesse: https://zorahapp2-production.up.railway.app/workflows/editor/cmibu88ho0000jizqbv1g3vj0
2. Verifique se existe um nó `GPT_RESPONSE` com ID `gpt_classifier`
3. Se não existir, crie um:
   - Tipo: `GPT_RESPONSE`
   - ID: `gpt_classifier`
   - System Prompt: "Você é um classificador de intenção simples. Analise a mensagem do usuário e classifique em uma das opções: 1) valores de procedimentos, 2) convênios, 3) localização, 4) agendamento, 5) falar com atendente. Responda apenas com o número da intenção (1-5)."
4. Conecte todos os nós MESSAGE de volta ao `gpt_classifier`:
   - De cada nó MESSAGE → Para `gpt_classifier`
   - Porta: `output` → `input`

---

## 📋 **Estrutura Esperada**

```
START
  ↓
[Seleção de Clínica]
  ↓
gpt_classifier (GPT_RESPONSE) ←──┐
  ├─→ [Valores] ────────────────┘
  ├─→ [Convênios] ───────────────┘
  ├─→ [Localização] ──────────────┘
  ├─→ [Agendamento]
  └─→ [Transferir Humano]
```

**Todos os nós de resposta devem voltar ao `gpt_classifier`!**

---

## ✅ **Verificação**

Após executar o endpoint, verifique:

1. ✅ Nó `gpt_classifier` existe no workflow
2. ✅ Todos os nós MESSAGE têm conexão de volta ao `gpt_classifier`
3. ✅ O GPT classifier tem conexões de saída para os diferentes caminhos (1-5)

---

## 🧪 **Teste**

1. Envie: "qual valor da acupuntura?"
   - Deve responder valores ✅

2. Envie: "e o da fisioterapia?"
   - Deve voltar ao GPT classifier ✅
   - Deve responder valores da fisioterapia ✅
   - **NÃO** deve responder localização ❌

---

## 📝 **Notas**

- A correção no código (`advanceWorkflow`) funciona mesmo sem ajustar o workflow
- Mas é recomendado ajustar o workflow também para garantir consistência visual
- O endpoint pode ser executado quantas vezes necessário sem problemas

---

**Status:** ✅ Correções aplicadas no código e endpoint criado

