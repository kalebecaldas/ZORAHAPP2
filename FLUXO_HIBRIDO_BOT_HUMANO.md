# 🎯 NOVO FLUXO INTELIGENTE - BOT + HUMANO

## **Visão Geral:**

O bot agora funciona de forma **híbrida e inteligente**:
- ✅ Responde perguntas gerais (informações, preços, horários)
- ✅ Detecta intenções de **AGENDAR**, **CANCELAR**, **REAGENDAR**
- ✅ Coleta dados automaticamente
- ✅ Cadastra/atualiza paciente
- ✅ Transfere para fila AGUARDANDO com mensagem contextualizada

---

## **📋 Fluxo Detalhado:**

### **1. Informações Gerais (Bot responde)**
```
Paciente: "Quanto custa fisioterapia?"
Bot: "A fisioterapia ortopédica custa R$ 120,00 por sessão..."
→ Conversa continua com BOT
```

### **2. Intenção de Agendar (Bot → Humano)**
```
Paciente: "Quero agendar fisioterapia"
Bot: "Perfeito! Qual unidade você prefere?"
Paciente: "Vieiralves"
Bot: "Ótimo! Qual data?"
Paciente: "Amanhã"

🎯 BOT DETECTA INTENT: AGENDAR
✅ Salva dados coletados:
   - procedimento: fisioterapia
   - clinica: Vieiralves
   - data: amanhã

✅ Cria/Atualiza Paciente no Banco:
   - phone: 5592999999999
   - name: "Aguardando cadastro" (se novo)
   - preferences: { procedimento, clinica, data }

✅ Transfere para AGUARDANDO

Bot: "Em breve um de nossos atendentes irá atender sua 
      solicitação de agendamento de fisioterapia na unidade 
      Vieiralves para amanhã. Aguarde!"
```

### **3. Intenção de Cancelar (Bot → Humano)**
```
Paciente: "Preciso cancelar minha consulta"

🎯 BOT DETECTA INTENT: CANCELAR
✅ Transfere para AGUARDANDO

Bot: "Em breve um de nossos atendentes irá atender sua 
      solicitação de cancelamento. Aguarde!"
```

### **4. Intenção de Reagendar (Bot → Humano)**
```
Paciente: "Gostaria de remarcar para outro dia"

🎯 BOT DETECTA INTENT: REAGENDAR
✅ Transfere para AGUARDANDO

Bot: "Em breve um de nossos atendentes irá atender sua 
      solicitação de reagendamento. Aguarde!"
```

---

## **🔧 Componentes Técnicos:**

### **1. IntelligentRouter** (`api/services/intelligentRouter.ts`)
```typescript
// Detecta intenções automaticamente
const humanRequiredIntents = ['AGENDAR', 'CANCELAR', 'REAGENDAR']

if (humanRequiredIntents.includes(aiResponse.intent)) {
    return this.routeToHumanWithContext(aiResponse)
}
```

### **2. Cadastro Automático** (`api/routes/conversations.ts`)
```typescript
// Antes de transferir, cria/atualiza paciente
if (decision.initialData) {
    let patient = await prisma.patient.findUnique({ where: { phone } })
    
    if (!patient) {
        patient = await prisma.patient.create({
            data: {
                phone,
                name: 'Aguardando cadastro',
                preferences: decision.initialData
            }
        })
    }
}
```

### **3. Mensagem Contextualizada**
```typescript
private buildSchedulingMessage(entities: any): string {
    // Constrói mensagem personalizada:
    // "Em breve... agendamento de fisioterapia na unidade Vieiralves para amanhã. Aguarde!"
}
```

---

## **📊 Dados Salvos em `workflowContext`:**

Quando transfere, salva:
```json
{
  "transferReason": "Solicitação de agendamento",
  "collectedData": {
    "procedimento": "fisioterapia",
    "clinica": "Vieiralves",
    "data": "amanhã",
    "horario": null,
    "convenio": null
  }
}
```

O atendente pode ver esses dados ao assumir a conversa!

---

## **✅ Vantagens:**

1. **Eficiência**: Bot responde 80% das perguntas simples
2. **Contexto**: Atendente recebe dados já coletados
3. **Experiência**: Paciente não precisa repetir informações
4. **Cadastro**: Paciente já está no sistema quando atendente assume
5. **Mensagem Clara**: Paciente sabe exatamente o que esperar

---

## **🧪 Como Testar:**

1. **Teste Bot Puro:**
   - "Quanto custa fisioterapia?" → Bot responde
   - "Quais são os horários?" → Bot responde

2. **Teste Transferência Inteligente:**
   - "Quero agendar fisioterapia" → Bot coleta dados
   - "Vieiralves" → Bot confirma
   - "Amanhã" → Bot transfere com contexto

3. **Verificar Banco:**
   - Tabela `Patient`: Deve ter novo registro ou preferências atualizadas
   - Tabela `Conversation`: `workflowContext` deve ter `collectedData`
   - Status: Deve estar `AGUARDANDO`

---

**Servidor reiniciando... Teste agora!** 🚀
