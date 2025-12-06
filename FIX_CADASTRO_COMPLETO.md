# ✅ FIX: CADASTRO DE PACIENTES FUNCIONANDO

## **PROBLEMA IDENTIFICADO:**

O código para salvar o paciente **JÁ EXISTIA** em `conversations.ts` (linhas 1257-1339), mas **não estava sendo executado** porque `routeToHuman()` não passava os dados coletados (`entities`).

---

## **SOLUÇÃO APLICADA:**

### **Arquivo:** `api/services/intelligentRouter.ts`

**Linha 165:** Adicionado `initialData: aiResponse.entities`

```typescript
private routeToHuman(aiResponse: ConversationalResponse): RouteDecision {
    return {
        type: 'TRANSFER_TO_HUMAN',
        response: aiResponse.message,
        queue,
        reason,
        initialData: aiResponse.entities // ✅ AGORA passa os dados!
    };
}
```

---

## **FLUXO COMPLETO:**

1. **Bot coleta dados:** nome, CPF, email, nascimento, convênio
2. **Bot responde:** "Cadastro completo, Denis! ✅"
3. **Bot chama:** `action: 'transfer_human'`
4. **intelligentRouter:** Cria decisão com `initialData: entities`
5. **conversations.ts (linha 1258):** Verifica se `initialData` existe
6. **conversations.ts (linha 1295):** **CRIA/ATUALIZA paciente no banco!**
7. **conversations.ts (linha 1329):** Vincula conversa ao paciente
8. **Transfere para fila PRINCIPAL**

---

## **DADOS SALVOS:**

Quando o bot coleta:
- ✅ **nome** → `patient.name`
- ✅ **cpf** → `patient.cpf`
- ✅ **email** → `patient.email`
- ✅ **nascimento** → `patient.birthDate`
- ✅ **convenio** → `patient.insuranceCompany`
- ✅ **numero_convenio** → `patient.insuranceNumber`

---

## **PRÓXIMOS PASSOS:**

1. ✅ **Testar com nova conversa**
2. ✅ **Verificar logs no backend:**
   - "📝 Salvando cadastro do paciente"
   - "✅ Paciente criado: [id] - [nome]"
   - "🔗 Conversa vinculada ao paciente [id]"

3. ✅ **Verificar resultados:**
   - Paciente aparece na página "Pacientes"
   - Dados aparecem no ChatHeader
   - Conversa está vinculada ao paciente

---

## **PARA CRIAR O CARD:**

Próximo passo: Criar mensagem SYSTEM com card interno mostrando:
- Dados do paciente
- Intenção (ex: "agendar fisioterapia")
- Detalhes coletados (procedimento, data, horário, unidade)

**Quer que eu implemente o card agora?**
