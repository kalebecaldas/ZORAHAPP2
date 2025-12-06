# 🔍 DEBUG COMPLETO: RASTREANDO O PROBLEMA

## **VOCÊ TEM RAZÃO!**

Se o bot não salva o paciente, é porque `initialData` está vazio, o que significa que **TODO o fluxo falha**.

---

## **LOGS ADICIONADOS EM 3 PONTOS:**

### **1. Após IA processar (conversations.ts:1248)**
```typescript
console.log(`🔍 DEBUG: decision completa =`, JSON.stringify(decision, null, 2))
```

**Ver:** Se a IA está retornando entities

---

### **2. No routeToHuman (intelligentRouter.ts:159)**
```typescript
console.log(`🔍 DEBUG routeToHuman: aiResponse.entities =`, aiResponse.entities);
console.log(`🔍 DEBUG routeToHuman: entities keys =`, Object.keys(aiResponse.entities));
```

**Ver:** Se entities chegam até o router

---

### **3. Antes de salvar paciente (conversations.ts:1375)**
```typescript
console.log(`🔍 DEBUG: decision.initialData =`, decision.initialData);
console.log(`🔍 DEBUG: initialData keys =`, Object.keys(decision.initialData));
```

**Ver:** Se initialData chega até o código de salvar

---

## **TESTE AGORA:**

1. **Inicie NOVA conversa** (número diferente)
2. **Complete cadastro completo:**
   ```
   User: "quero agendar"
   Bot: "Qual seu nome?"
   User: "João Silva"
   Bot: "Qual seu CPF?"
   User: "12345678900"
   Bot: "Qual seu email?"
   User: "joao@email.com"
   Bot: "Cadastro completo! ✅"
   ```

3. **Veja TODOS os logs no terminal backend**

---

## **LOGS ESPERADOS (SE FUNCIONAR):**

```bash
🤖 Processando mensagem com Roteador Inteligente...
📊 Decisão do roteador: TRANSFER_TO_HUMAN
🔍 DEBUG: decision completa = {
  "type": "TRANSFER_TO_HUMAN",
  "response": "Cadastro completo, João! ✅",
  "queue": "PRINCIPAL",
  "reason": "Agendamento",
  "initialData": {
    "nome": "João Silva",
    "cpf": "12345678900",
    "email": "joao@email.com",
    "nascimento": "01/01/1990",
    "convenio": "SulAmérica"
  }
}

🔍 DEBUG routeToHuman: aiResponse.entities = {
  nome: "João Silva",
  cpf: "12345678900",
  email: "joao@email.com",
  ...
}
🔍 DEBUG routeToHuman: entities keys = ['nome', 'cpf', 'email', ...]

👤 Transferindo para fila: PRINCIPAL
📝 Salvando cadastro do paciente: { nome: 'João Silva', cpf: '12345678900', ... }
✅ Paciente criado: [id] - João Silva
🔗 Conversa vinculada ao paciente [id]

🔍 DEBUG: decision.initialData = { nome: 'João Silva', cpf: '12345678900', ... }
🔍 DEBUG: initialData keys = ['nome', 'cpf', 'email', ...]
📋 Criando card de dados do paciente...
✅ Card de dados do paciente criado: João Silva
```

---

## **LOGS ESPERADOS (SE FALHAR):**

### **Se IA não retorna entities:**
```bash
🔍 DEBUG: decision completa = {
  "type": "TRANSFER_TO_HUMAN",
  "response": "...",
  "queue": "PRINCIPAL",
  "initialData": {}  // ❌ VAZIO!
}
```

**CAUSA:** Prompt da IA não está configurado para coletar dados

---

### **Se routeToHuman não recebe entities:**
```bash
🔍 DEBUG routeToHuman: aiResponse.entities = undefined
```

**CAUSA:** IA não está retornando entities

---

### **Se initialData não chega:**
```bash
🔍 DEBUG: decision.initialData = undefined
```

**CAUSA:** routeToHuman não está passando entities

---

## **IDENTIFICANDO O PROBLEMA:**

Os logs vão mostrar EXATAMENTE onde o fluxo quebra:

1. **Se quebra no LOG 1:** IA não está coletando dados
2. **Se quebra no LOG 2:** Router não está recebendo entities
3. **Se quebra no LOG 3:** initialData não está sendo passada

---

## **FAÇA O TESTE E ME MOSTRE OS LOGS!**

Assim vou saber EXATAMENTE onde está o problema e como resolver.

**Aguardando logs do NOVO testeSemana completo do cadastro!**
