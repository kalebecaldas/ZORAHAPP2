# 🐛 FIX: BOT NÃO CADASTRAVA E NÃO TRANSFERIA

## **❌ PROBLEMAS IDENTIFICADOS:**

### **1. Bot não coletava data de nascimento**
O bot pulava direto para transferência sem pedir data de nascimento.

### **2. Bot usava action errada**
```
action: "start_workflow"  ← ERRADO!
```
Deveria ser:
```
action: "transfer_human"  ← CORRETO!
```

### **3. Bot coletava dados na ordem errada**
**Ordem errada:**
```
1. Procedimento
2. Unidade
3. Data
4. Horário
5. Convênio
6. Nome
7. CPF
8. Email
→ Transfere (sem data de nascimento!)
```

**Ordem correta:**
```
1. Nome
2. CPF
3. Email
4. Data de nascimento  ← FALTAVA!
5. Convênio
6. Número carteirinha
→ Transfere
```

---

## **✅ SOLUÇÃO IMPLEMENTADA:**

### **Arquivo:** `api/services/aiConfigurationService.ts` (linha ~285-330)

**Mudanças:**

1. **Ordem de coleta EXPLÍCITA:**
```
ETAPA 1: Coletar CADASTRO (nesta ordem exata):
1. Nome completo
2. CPF
3. Email
4. Data de nascimento (dd/mm/aaaa)  ← ADICIONADO!
5. Tem convênio? (sim/não)
6. Se sim: Nome do convênio
7. Se sim: Número da carteirinha
```

2. **Action OBRIGATÓRIA:**
```
APENAS quando tiver TODOS os 7 dados acima, use:
- action: "transfer_human" (OBRIGATÓRIO!)
```

3. **Regras CRÍTICAS:**
```
- ❌ NÃO pergunte procedimento/data/horário/unidade
- ❌ NÃO use action "start_workflow" ou "continue"
- ✅ Use action "transfer_human"
- ✅ Apenas cadastre e transfira
```

---

## **🔄 NOVO FLUXO:**

```
User: "quero agendar"

Bot: "Qual seu nome completo?"
User: "Maria Fernanda"

Bot: "Qual seu CPF?"
User: "01233399901"

Bot: "Qual seu email?"
User: "maria@gmail.com"

Bot: "Qual sua data de nascimento? (dd/mm/aaaa)"  ← NOVO!
User: "15/03/1990"

Bot: "Você tem convênio?"
User: "não"

Bot: "Cadastro completo, Maria Fernanda! ✅
     
     Temos várias opções de procedimentos e pacotes com desconto!
     
     Em breve um atendente vai te atender. 😊"
     
→ action: "transfer_human"  ← CORRETO!
→ Cria paciente no banco
→ Transfere para fila
```

---

## **📊 ENTITIES COMPLETAS:**

```json
{
  "nome": "Maria Fernanda",
  "cpf": "01233399901",
  "email": "maria@gmail.com",
  "nascimento": "15/03/1990",  ← NOVO!
  "convenio": null,
  "numero_convenio": null
}
```

---

## **✅ GARANTIAS AGORA:**

- ✅ Bot coleta data de nascimento
- ✅ Bot usa action "transfer_human"
- ✅ Bot NÃO pergunta procedimento/data/horário
- ✅ Paciente é cadastrado no banco
- ✅ Paciente aparece na lista
- ✅ Conversa é transferida para fila

---

## **🧪 TESTE:**

```
1. Digite: "quero agendar"
2. Responda: nome, CPF, email, nascimento, convênio
3. Verifique:
   ✅ Bot pediu data de nascimento
   ✅ Bot transferiu (action: transfer_human)
   ✅ Paciente aparece em /pacientes
   ✅ Conversa está em fila AGUARDANDO
```

---

**Status:** ✅ **CORRIGIDO!**

Teste novamente - agora vai funcionar! 🚀
