# 🔍 DEBUG: CARD NÃO RENDERIZA (PARTE 2)

## **PROGRESSO:**

- ✅ Backend salva paciente corretamente
- ✅ Backend cria mensagem SYSTEM
- ✅ Frontend recebe mensagem SYSTEM ("Dados coletados pelo bot")
- ❌ **PatientDataCard NÃO renderiza**

---

## **LOG ADICIONADO NO FRONTEND:**

Arquivo: `src/components/chat/SystemMessage.tsx` linha 28-29

```typescript
console.log('🔍 SystemMessage props:', { type, content, metadata, hasPatientData: !!metadata?.patientData });
```

---

## **PRÓXIMO TESTE:**

1. **Recarregue a página** (F5) na conversa do Paulo Cezar
2. **Abra Console do navegador** (F12 → Console)
3. **Veja os logs** que aparecem
4. **Me mostre** o que aparece no console

---

## **LOGS ESPERADOS:**

### **Se metadata está correto:**
```javascript
🔍 SystemMessage props: {
  type: "PATIENT_DATA_CARD",
  content: "📋 Dados coletados pelo bot",
  metadata: { patientData: { name: "Paulo Cezar", phone: "...", ... } },
  hasPatientData: true
}
✅ Renderizando PatientDataCard com dados: { name: "Paulo Cezar", ... }
```

### **Se metadata está vazio:**
```javascript
🔍 SystemMessage props: {
  type: "PATIENT_DATA_CARD",
  content: "📋 Dados coletados pelo bot",
  metadata: undefined,  // ❌ PROBLEMA!
  hasPatientData: false
}
```

### **Se metadata não tem patientData:**
```javascript
🔍 SystemMessage props: {
  type: "PATIENT_DATA_CARD",
  content: "📋 Dados coletados pelo bot",
  metadata: {},  // ❌ VAZIO!
  hasPatientData: false
}
```

---

## **ISSO VAI REVELAR:**

- Se o metadata está chegando do backend
- Se patientData está preenchido
- Por que o PatientDataCard não renderiza

---

## **FAÇA:**

1. Recarregue página (F5)
2. Abra Console (F12)
3. Me mostre os logs
