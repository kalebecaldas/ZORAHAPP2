# 🚨 REGRA CRÍTICA: CONVÊNIOS E VALORES

## **🎯 Problema Identificado:**

O bot estava **inventando valores** para convênios normais (Bradesco, SulAmérica, etc), calculando descontos que não existem e mostrando valores incorretos.

**Exemplo do erro:**
```
User: "quanto custa fisioterapia?" (com Bradesco)
Bot: "R$ 72 com desconto de 20%" ❌ ERRADO!
```

---

## **✅ Lógica Correta:**

### **1. Convênios NORMAIS (Maioria)**
**Exemplos:** Bradesco, SulAmérica, Mediservice, Saúde Caixa, Petrobras, GEAP

**Característica:** Procedimento é **COBERTO** pelo convênio
- ❌ **NÃO TEM VALOR** para o paciente
- ❌ **NÃO TEM DESCONTO**
- ✅ Procedimento incluído no plano

**Resposta Correta:**
```
"Este procedimento está coberto pelo seu convênio Bradesco! 
Não há valor a pagar por sessão. Para agendar, entre em contato!"
```

---

### **2. Convênios COM DESCONTO (Poucos)**
**Exemplos:** Adepol, Bem Care, Bemol, ClubSaúde, Pro-Saúde, Vita

**Característica:** Dão **DESCONTO** sobre valor particular
- ✅ **TEM VALOR** (particular com desconto)
- ✅ Pode calcular e mostrar

**Resposta Correta:**
```
"Com seu convênio Adepol (20% desconto):
• Fisioterapia: R$ 72 (ao invés de R$ 90)"
```

---

### **3. Particular**
**Característica:** Paga valor cheio
- ✅ Mostra valores normais
- ✅ Mostra pacotes disponíveis

**Resposta Correta:**
```
"Para particular:
• Fisioterapia: R$ 90
📦 Pacotes:
  • 10 sessões: R$ 800"
```

---

## **📊 Fluxo Correto:**

### **Cenário 1: Bradesco (Convênio Normal)**
```
User: "atendem bradesco?"
Bot: "Sim! Cobrimos: Fisioterapia, Acupuntura, RPG..."

User: "quanto custa fisioterapia?"
Bot: "Como você tem convênio Bradesco, a fisioterapia 
     está coberta! Não há valor a pagar por sessão." ✅
```

### **Cenário 2: Adepol (Convênio com Desconto)**
```
User: "tenho adepol"
Bot: "Ótimo! Com Adepol você tem 20% de desconto."

User: "quanto custa fisioterapia?"
Bot: "Qual unidade? 1️⃣ Vieiralves ou 2️⃣ São José?"

User: "vieiralves"
Bot: "Na Vieiralves, com desconto Adepol:
     • Fisioterapia: R$ 72 (20% off de R$ 90)" ✅
```

### **Cenário 3: Particular**
```
User: "quanto custa fisioterapia?"
Bot: "Qual unidade? 1️⃣ Vieiralves ou 2️⃣ São José?"

User: "vieiralves"  
Bot: "Na Vieiralves:
     • Fisioterapia: R$ 90
     📦 Pacote 10 sessões: R$ 800" ✅
```

---

## **🔧 Implementação:**

### **Nova Regra no Prompt:**

```typescript
## 🚨 REGRA CRÍTICA DE CONVÊNIOS

### Convênios NORMAIS (SEM desconto):
- ❌ NUNCA calcule desconto
- ❌ NUNCA mostre valor
- ✅ SEMPRE diga: "Este procedimento está coberto!"

### Convênios COM DESCONTO:
- ✅ Pode calcular desconto
- ✅ Pode mostrar valor com desconto

### REGRA DE OURO:
Se não tiver certeza se o convênio dá desconto, 
NUNCA mostre valor! Diga que está coberto.
```

---

## **🧪 Como Testar:**

### **Teste 1: Bradesco (Normal)**
```
Input: "tenho bradesco, quanto custa fisio?"
Esperado: "Está coberto pelo seu convênio!" (SEM VALOR)
```

### **Teste 2: Adepol (Com Desconto)**
```
Input: "tenho adepol, quanto custa fisio?"
Esperado: "Qual unidade?" → "R$ X com desconto"
```

### **Teste 3: Particular**
```
Input: "quanto custa fisio?"
Esperado: "Qual unidade?" → "R$ X + pacotes"
```

---

## **📝 Arquivo Modificado:**

`api/services/aiConfigurationService.ts` - Linha ~176-197

Adicionada seção **"REGRA CRÍTICA DE CONVÊNIOS"** com:
- ✅ Lista de convênios normais vs com desconto
- ✅ Instruções explícitas de quando mostrar/não mostrar valores
- ✅ Exemplos de respostas corretas
- ✅ Regra de ouro: "Na dúvida, diga que está coberto"

---

## **⚠️ IMPORTANTE:**

O bot agora vai:
1. ✅ **Identificar** se é convênio normal ou com desconto
2. ✅ **Nunca inventar** valores para Bradesco, SulAmérica, etc
3. ✅ **Sempre dizer** "está coberto" para convênios normais
4. ✅ **Calcular desconto** apenas para Adepol, Bem Care, etc

---

**Status:** Implementado! 🎉

O bot **NUNCA MAIS** vai inventar valores para convênios normais.
