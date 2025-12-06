# 🏥 REGRA: SEMPRE PERGUNTAR UNIDADE ANTES DE VALORES

## **🎯 Problema:**
Os valores dos procedimentos **variam por unidade** (Vieiralves vs São José), mas o bot estava informando valores genéricos sem perguntar a unidade.

## **✅ Solução Implementada:**

### **Nova Regra Crítica no Prompt:**

```
## ⚠️ REGRA CRÍTICA DE VALORES
**ATENÇÃO**: Os valores variam por unidade! 
- **NUNCA informe valores SEM antes perguntar a unidade**
- **SEMPRE pergunte**: "Qual unidade você prefere? 1️⃣ Vieiralves ou 2️⃣ São José?"
- **SÓ DEPOIS** de saber a unidade, informe os valores corretos
- Se o paciente perguntar "quanto custa?", responda: "Para te informar o valor correto, qual unidade você prefere? Temos Vieiralves e São José."
```

---

## **📊 Fluxo Correto:**

### **ANTES (Errado):**
```
User: "Quanto custa fisioterapia?"
Bot: "Fisioterapia Ortopédica: R$ 90" ❌ SEM PERGUNTAR UNIDADE
```

### **DEPOIS (Correto):**
```
User: "Quanto custa fisioterapia?"
Bot: "Para te informar o valor correto, qual unidade você prefere? 
     1️⃣ Vieiralves ou 2️⃣ São José?" ✅

User: "Vieiralves"
Bot: "Na unidade Vieiralves:
     • Fisioterapia Ortopédica: R$ 90
     • Pacotes disponíveis: ..." ✅
```

---

## **🔄 Ordem de Coleta Atualizada:**

1. ✅ **Procedimento** (ex: fisioterapia)
2. ✅ **UNIDADE** ⬅️ **OBRIGATÓRIO ANTES DE VALORES!**
3. ✅ **Data** preferida
4. ✅ **Horário** preferido
5. ✅ **Convênio**
6. ✅ Confirmação final

---

## **💡 Exemplos de Respostas:**

### **Exemplo 1: Pergunta Direta de Valor**
```
User: "qual valor do pilates?"
Bot: "Para te informar o valor correto do Pilates, qual unidade você prefere?
     1️⃣ Vieiralves
     2️⃣ São José"
```

### **Exemplo 2: Já Tem Procedimento**
```
User: "atendem fisioterapia?"
Bot: "Sim! Qual unidade você prefere?
     1️⃣ Vieiralves
     2️⃣ São José"
```

### **Exemplo 3: Já Tem Unidade no Histórico**
```
User: "fisioterapia"
Bot: "Qual unidade?"
User: "vieiralves"
Bot: "Ótimo! Na Vieiralves, a fisioterapia custa R$ X..."
User: "e pilates?"
Bot: "Na Vieiralves, o Pilates tem os seguintes pacotes: ..." ✅ NÃO REPETE PERGUNTA
```

---

## **🧪 Como Testar:**

### **Teste 1: Pergunta de Valor Sem Unidade**
```
Input: "quanto custa fisioterapia?"
Esperado: Bot pergunta unidade ANTES de informar valor
```

### **Teste 2: Já Tem Unidade**
```
Input: "vieiralves"
Input: "quanto custa pilates?"
Esperado: Bot informa valores de Vieiralves (não pergunta novamente)
```

### **Teste 3: Mudança de Unidade**
```
Input: "vieiralves"
Input: "fisioterapia"
Input: "na verdade, prefiro são josé"
Esperado: Bot atualiza para valores de São José
```

---

## **📝 Arquivo Modificado:**

`api/services/aiConfigurationService.ts` - Linha ~159-173

Adicionada seção **"REGRA CRÍTICA DE VALORES"** com instruções explícitas para:
- ✅ Sempre perguntar unidade antes de valores
- ✅ Usar formato "1️⃣ Vieiralves ou 2️⃣ São José"
- ✅ Só informar valores DEPOIS de saber a unidade

---

**Status:** Implementado e testável! 🎉

O bot agora vai **SEMPRE** perguntar a unidade antes de informar qualquer valor.
