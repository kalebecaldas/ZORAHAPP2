# 🐛 DEBUG: CARD NÃO RENDERIZA

## **PROBLEMA:**

O card não está aparecendo no chat APESAR de todo o código estar correto.

---

## **POSSÍVEIS CAUSAS:**

### **1. initialData está vazio**
O `routeToHuman()` não está passando os dados ou a IA não está retornando entities.

### **2. Mensagem SYSTEM não foi criada**
O código que cria a mensagem pode não estar sendo executado.

### **3. Frontend não está renderizando SYSTEM**
Problema no componente SystemMessage ou PatientDataCard.

---

## **DEBUG ADICIONADO:**

Adicionei logs em `conversations.ts` linha 1375:

```typescript
console.log(`🔍 DEBUG: decision.initialData =`, decision.initialData);
console.log(`🔍 DEBUG: initialData keys =`, decision.initialData ? Object.keys(decision.initialData) : 'undefined');
```

---

## **TESTE:**

1. **Inicie NOVA conversa** (número diferente)
2. **Complete cadastro**
3. **Veja os logs no terminal do backend:**

### **Logs Esperados:**
```
📝 Salvando cadastro do paciente: { nome: 'Denis', cpf: '...', email: '...' }
✅ Paciente criado: [id] - Denis Oliveira
🔗 Conversa vinculada ao paciente [id]
🔍 DEBUG: decision.initialData = { nome: 'Denis', cpf: '...', email: '...' }
🔍 DEBUG: initialData keys = ['nome', 'cpf', 'email', ...]
📋 Criando card de dados do paciente...
✅ Card de dados do paciente criado: Denis Oliveira
```

### **Se aparecer:**
```
🔍 DEBUG: decision.initialData = undefined
```
**PROBLEMA:** routeToHuman() não está passando entities!

### **Se aparecer:**
```
🔍 DEBUG: decision.initialData = {}
```
**PROBLEMA:** IA não está retornando entities!

---

## **SOLUÇÃO ALTERNATIVA:**

Se o problema persistir, podemos criar o card MANUALMENTE para testar o frontend:

### **Opção 1: SQL direto**
Execute `debug_system_messages.sql` para criar mensagem SYSTEM manualmente.

### **Opção 2: Endpoint de teste**
Criar endpoint `/api/test/create-card/:conversationId` para forçar criação do card.

---

## **PRÓXIMOS PASSOS:**

1. ✅ Teste com NOVA conversa
2. ✅ Veja logs do backend
3. ✅ Me mostre os logs  
4. ✅ Vou identificar onde falha

---

**Aguardando teste com nova conversa para ver os logs!**
