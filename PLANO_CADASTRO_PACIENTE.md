# 🎯 PLANO: CADASTRO COMPLETO DO PACIENTE

## **📋 OBJETIVO:**

Mudar o fluxo de agendamento para:
1. ✅ **Primeiro:** Coletar CADASTRO COMPLETO do paciente
2. ✅ **Criar/Atualizar** paciente no banco
3. ✅ **Depois:** Transferir para fila pedindo apenas procedimentos
4. ✅ **Card:** Mostrar apenas dados do paciente (não procedimentos)

---

## **📊 CAMPOS DO CADASTRO:**

### **Já temos no schema Patient:**
```prisma
model Patient {
  phone            String    @unique  ← JÁ TEMOS (WhatsApp)
  name             String               ← COLETAR
  cpf              String?   @unique    ← COLETAR
  email            String?              ← COLETAR
  birthDate        DateTime?            ← COLETAR
  insuranceCompany String?              ← COLETAR
  insuranceNumber  String?              ← COLETAR
  address          String?              ← OPCIONAL
  emergencyContact String?              ← OPCIONAL
}
```

### **Ordem de coleta:**
1. ✅ **Nome** (obrigatório)
2. ✅ **CPF** (obrigatório)
3. ✅ **Email** (importante)
4. ✅ **Data de Nascimento** (importante)
5. ✅ **Convênio** (se tiver)
6. ✅ **Número do Convênio** (se tiver convênio)

---

## **🔄 NOVO FLUXO DE AGENDAMENTO:**

### **Cenário 1: Paciente NOVO**
```
User: "quero agendar"

Bot verifica: Paciente existe? NÃO

Bot: "Olá! Para agendar, primeiro preciso fazer seu cadastro. 📋
     
     Qual seu nome completo?"

User: "Kalebe do Carmo Caldas"
Bot: "Qual seu CPF?"

User: "01130399214"
Bot: "Qual seu email?"

User: "kalebe@email.com"
Bot: "Qual sua data de nascimento? (dd/mm/aaaa)"

User: "15/03/1990"
Bot: "Você tem convênio médico?"

User: "SulAmérica"
Bot: "Qual o número da sua carteirinha?"

User: "123456789"
Bot: "Cadastro completo! ✅
     
     Dados cadastrados:
     • Nome: Kalebe do Carmo Caldas
     • CPF: 011.303.992-14
     • Email: kalebe@email.com
     • Nascimento: 15/03/1990
     • Convênio: SulAmérica (123456789)
     
     Agora, qual procedimento você gostaria de agendar?"

→ CRIA paciente no banco
→ TRANSFERE para fila
→ Card mostra dados do paciente
→ Atendente pergunta: procedimento, data, horário, unidade
```

### **Cenário 2: Paciente JÁ CADASTRADO**
```
User: "quero agendar"

Bot verifica: Paciente existe? SIM

Bot: "Olá, Kalebe! 😊
     
     Vi que você já tem cadastro conosco.
     Qual procedimento gostaria de agendar?"

→ PULA cadastro
→ TRANSFERE direto para fila
→ Card mostra dados existentes
→ Atendente pergunta: procedimento, data, horário, unidade
```

### **Cenário 3: Cadastro INCOMPLETO**
```
User: "quero agendar"

Bot verifica: Paciente existe mas falta dados (ex: sem CPF)

Bot: "Olá, Kalebe! 😊
     
     Vi que faltam alguns dados no seu cadastro.
     Vamos completar rapidamente?
     
     Qual seu CPF?"

→ COMPLETA dados faltantes
→ ATUALIZA paciente
→ TRANSFERE para fila
```

---

## **💻 IMPLEMENTAÇÃO:**

### **Passo 1: Atualizar Prompt da IA**

Arquivo: `api/services/aiConfigurationService.ts`

```typescript
## 🚨 NOVA REGRA: CADASTRO ANTES DE AGENDAR

Quando detectar intent AGENDAR:

1. **PRIMEIRO:** Verifique se paciente está cadastrado
   - Se NÃO: Colete cadastro completo
   - Se SIM mas incompleto: Complete dados faltantes
   - Se SIM e completo: Pule para procedimentos

2. **Dados do cadastro (nesta ordem):**
   a) Nome completo
   b) CPF
   c) Email
   d) Data de nascimento
   e) Tem convênio? (sim/não)
   f) Se sim: Nome do convênio
   g) Se sim: Número da carteirinha

3. **Após cadastro completo:**
   - Resuma dados cadastrados
   - Pergunte qual procedimento deseja agendar
   - Use action: "transfer_human"

4. **Entities para cadastro:**
{
  "nome": "...",
  "cpf": "...",
  "email": "...",
  "nascimento": "...",
  "convenio": "...",
  "numero_convenio": "..."
}
```

### **Passo 2: Criar/Atualizar Paciente no Banco**

Arquivo: `api/routes/conversations.ts`

```typescript
// Quando action === 'transfer_human' e intent === 'AGENDAR'

// 1. Extrair dados do cadastro das entities
const cadastro = {
  name: entities.nome,
  cpf: entities.cpf,
  email: entities.email,
  birthDate: parseDate(entities.nascimento),
  insuranceCompany: entities.convenio,
  insuranceNumber: entities.numero_convenio
}

// 2. Criar ou atualizar paciente
const patient = await prisma.patient.upsert({
  where: { phone },
  create: {
    phone,
    ...cadastro
  },
  update: cadastro
})

// 3. Vincular conversa ao paciente
await prisma.conversation.update({
  where: { id: conversationId },
  data: { patientId: patient.id }
})

// 4. Transferir para fila
// (código existente)
```

### **Passo 3: Atualizar Card de Dados**

Arquivo: `api/routes/conversations.ts` (função que cria card)

```typescript
// ANTES: Mostrava procedimento, unidade, data, horário
// DEPOIS: Mostra apenas dados do paciente

const cardMessage = `📋 Dados do Paciente:

👤 Nome: ${patient.name}
📱 Telefone: ${patient.phone}
🆔 CPF: ${formatCPF(patient.cpf)}
📧 Email: ${patient.email}
🎂 Nascimento: ${formatDate(patient.birthDate)}
${patient.insuranceCompany ? `
💳 Convênio: ${patient.insuranceCompany}
🔢 Carteirinha: ${patient.insuranceNumber}
` : ''}

Aguardando atendente para definir procedimento, data e horário.`
```

---

## **🎁 BENEFÍCIOS:**

### **Para o Paciente:**
- ✅ Cadastro completo de uma vez
- ✅ Não precisa repetir dados depois
- ✅ Atendente já tem tudo para agendar

### **Para a Clínica:**
- ✅ Banco de dados completo
- ✅ Menos retrabalho
- ✅ Melhor gestão de pacientes
- ✅ Dados para marketing/relatórios

### **Para o Atendente:**
- ✅ Recebe paciente JÁ CADASTRADO
- ✅ Só precisa perguntar: procedimento, data, horário
- ✅ Mais rápido e eficiente

---

## **📝 CHECKLIST DE IMPLEMENTAÇÃO:**

### **Fase 1: Prompt da IA**
- [ ] Adicionar regra de cadastro antes de agendar
- [ ] Definir ordem de coleta de dados
- [ ] Adicionar validações (CPF, email, data)
- [ ] Testar fluxo de cadastro

### **Fase 2: Backend**
- [ ] Criar função de upsert do paciente
- [ ] Adicionar parse de data de nascimento
- [ ] Vincular conversa ao paciente
- [ ] Atualizar card de dados

### **Fase 3: Testes**
- [ ] Testar paciente novo
- [ ] Testar paciente existente
- [ ] Testar cadastro incompleto
- [ ] Testar validações

---

## **🧪 CASOS DE TESTE:**

### **Teste 1: Paciente Novo**
```
Input: "quero agendar"
Esperado:
- Bot pede nome
- Bot pede CPF
- Bot pede email
- Bot pede nascimento
- Bot pede convênio
- Bot cria paciente
- Bot transfere
- Card mostra dados do paciente
```

### **Teste 2: Paciente Existente**
```
Input: "quero agendar"
Esperado:
- Bot reconhece paciente
- Bot pula cadastro
- Bot pergunta procedimento
- Bot transfere
- Card mostra dados existentes
```

### **Teste 3: Cadastro Incompleto**
```
Cenário: Paciente tem nome mas não tem CPF
Input: "quero agendar"
Esperado:
- Bot pede dados faltantes
- Bot atualiza paciente
- Bot transfere
```

---

## **⏱️ ESTIMATIVA:**

- **Fase 1 (Prompt):** 1-2 horas
- **Fase 2 (Backend):** 2-3 horas
- **Fase 3 (Testes):** 1 hora

**Total:** 4-6 horas

---

**Quer que eu comece implementando agora?** 🚀

Posso fazer em etapas:
1. Primeiro o prompt (mais rápido)
2. Depois o backend
3. Por último os testes

Ou prefere que eu faça tudo de uma vez?
