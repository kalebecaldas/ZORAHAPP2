# 🐛 BUG: CADASTRO NÃO ESTÁ SALVANDO

## **PROBLEMA IDENTIFICADO:**

O bot está coletando os dados do paciente (Nome, CPF, Email) mas **NÃO está salvando no banco de dados**.

### **Evidência:**
- ✅ Bot coletou: Nome (Denis Oliveira), CPF (99928218190), Email (denis@gmail.com)
- ❌ Dados NÃO aparecem na página de Pacientes
- ❌ Dados NÃO aparecem no ChatHeader
- ❌ Conversa foi transferida mas paciente não foi criado/atualizado

---

## **CAUSA RAIZ:**

O `memoryService.ts` salva apenas o **nome** nas memórias, mas **não salva CPF, email, birthDate, etc** nos campos corretos do Patient.

### **Código atual (memoryService.ts linha 130-139):**
```typescript
await prisma.patient.update({
    where: { id: patient.id },
    data: {
        name: newMemories.nome || patient.name,  // ✅ Salva nome
        preferences: {                            // ❌ Salva resto em preferences (errado!)
            ...existingPrefs,
            memories: mergedMemories
        }
    }
})
```

**Problema:** CPF, email, birthDate estão sendo salvos em `preferences.memories` em vez dos campos corretos!

---

## **SOLUÇÃO:**

### **Opção 1: Atualizar memoryService (RÁPIDO)**

Modificar `saveMemories()` para salvar nos campos corretos:

```typescript
await prisma.patient.update({
    where: { id: patient.id },
    data: {
        name: newMemories.nome || patient.name,
        cpf: newMemories.cpf || patient.cpf,
        email: newMemories.email || patient.email,
        birthDate: newMemories.nascimento ? parseDate(newMemories.nascimento) : patient.birthDate,
        insuranceCompany: newMemories.convenio || patient.insuranceCompany,
        insuranceNumber: newMemories.numero_convenio || patient.insuranceNumber,
        preferences: {
            ...existingPrefs,
            memories: mergedMemories
        }
    }
})
```

### **Opção 2: Implementar PLANO_CADASTRO_PACIENTE.md (COMPLETO)**

Seguir o plano já documentado:
1. Atualizar prompt da IA para coletar dados estruturados
2. Criar função de upsert no backend
3. Salvar dados nos campos corretos
4. Atualizar card de dados

---

## **RECOMENDAÇÃO:**

**Opção 1** é mais rápida (15 min) mas pode ter problemas de extração.

**Opção 2** é mais robusta (2-3h) mas garante que tudo funcione corretamente.

**Sugestão:** Fazer Opção 1 AGORA para resolver o bug imediato, depois implementar Opção 2 quando tiver tempo.

---

## **PRÓXIMOS PASSOS:**

1. ✅ Atualizar `memoryService.saveMemories()` para salvar nos campos corretos
2. ✅ Atualizar `extractMemories()` para extrair CPF, email, nascimento
3. ✅ Testar com novo paciente
4. ✅ Verificar se dados aparecem no ChatHeader

---

**Quer que eu implemente a Opção 1 agora?**
