# ✅ NOVO FLUXO: CADASTRO + TRANSFERÊNCIA

## **🎯 IMPLEMENTADO:**

Novo fluxo simplificado de agendamento:

### **Fluxo Anterior** ❌:
```
User: "quero agendar"
Bot: "Qual procedimento?"
Bot: "Qual unidade?"
Bot: "Qual data?"
Bot: "Qual horário?"
Bot: "Convênio?"
Bot: "Nome?"
Bot: "CPF?"
→ Transfere
```

### **Novo Fluxo** ✅:
```
User: "quero agendar"

Bot verifica: Paciente cadastrado?

SE NÃO:
  Bot: "Qual seu nome?"
  Bot: "Qual seu CPF?"
  Bot: "Qual seu email?"
  Bot: "Data de nascimento?"
  Bot: "Tem convênio?"
  Bot: "Qual convênio?"
  Bot: "Número da carteirinha?"

Bot: "Cadastro completo, Kalebe! ✅

Com seu convênio SulAmérica, você tem cobertura para:
Fisioterapia, Acupuntura, RPG, Pilates e Ortopedista.

Em breve um atendente vai te atender. 😊
Enquanto aguarda, já vá pensando: quais procedimentos 
deseja, qual dia/turno prefere, e qual unidade."

→ Transfere para fila
→ Atendente pergunta: procedimentos, data, horário, unidade
```

---

## **📊 DADOS COLETADOS:**

1. ✅ Nome completo
2. ✅ CPF
3. ✅ Email
4. ✅ Data de nascimento
5. ✅ Convênio (se tiver)
6. ✅ Número da carteirinha (se tiver)

---

## **💡 BENEFÍCIOS:**

### **Para o Paciente:**
- ✅ Cadastro completo de uma vez
- ✅ Sabe quais procedimentos pode fazer
- ✅ Já pensa no que quer enquanto aguarda

### **Para a Clínica:**
- ✅ Banco de dados completo
- ✅ Paciente chega cadastrado ao atendente
- ✅ Menos retrabalho

### **Para o Atendente:**
- ✅ Recebe paciente JÁ CADASTRADO
- ✅ Só precisa perguntar: procedimentos, data, horário, unidade
- ✅ Mais rápido e eficiente

---

## **🔄 PRÓXIMOS PASSOS (Backend):**

Ainda falta implementar no backend:

### **1. Criar/Atualizar Paciente**
```typescript
// Em conversations.ts, quando action === 'transfer_human'

const cadastro = {
  name: entities.nome,
  cpf: entities.cpf,
  email: entities.email,
  birthDate: parseDate(entities.nascimento),
  insuranceCompany: entities.convenio,
  insuranceNumber: entities.numero_convenio
}

const patient = await prisma.patient.upsert({
  where: { phone },
  create: { phone, ...cadastro },
  update: cadastro
})
```

### **2. Atualizar Card**
```typescript
// Mostrar apenas dados do paciente, não procedimentos

const cardMessage = `📋 Paciente Cadastrado:

👤 ${patient.name}
📱 ${patient.phone}
🆔 CPF: ${formatCPF(patient.cpf)}
📧 ${patient.email}
🎂 ${formatDate(patient.birthDate)}
${patient.insuranceCompany ? `
💳 Convênio: ${patient.insuranceCompany}
🔢 Carteirinha: ${patient.insuranceNumber}
` : '💰 Particular'}

Aguardando definição de procedimento, data e horário.`
```

---

## **📝 ARQUIVO MODIFICADO:**

`api/services/aiConfigurationService.ts` - Linha ~285-323

**Mudança:** Novo fluxo de cadastro antes de transferir

---

## **🧪 TESTE:**

```
Input: "quero agendar"

Esperado:
1. Bot pergunta nome
2. Bot pergunta CPF
3. Bot pergunta email
4. Bot pergunta nascimento
5. Bot pergunta convênio
6. Bot lista procedimentos cobertos
7. Bot diz "aguarde atendente"
8. Bot transfere (action: transfer_human)
9. Card mostra dados do paciente
10. Atendente pergunta: procedimentos, data, horário
```

---

**Status:** ✅ **PROMPT IMPLEMENTADO!**

**Falta:** Backend (criar paciente + card) - Quer que eu implemente? 🚀
