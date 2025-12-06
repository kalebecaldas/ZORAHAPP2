# 📋 CARD DE DADOS DO PACIENTE

## **Funcionalidade:**

Quando o bot transfere uma conversa para um atendente humano (casos de AGENDAR, CANCELAR, REAGENDAR), automaticamente cria um **card visual** no chat com todos os dados coletados.

---

## **🎨 Design do Card:**

### **Aparência:**
- ✅ Card bonito com gradiente azul/indigo
- ✅ Header com ícone e horário
- ✅ Dados organizados com ícones
- ✅ Botão "Copiar" ao lado de cada dado
- ✅ Footer com dica de uso

### **Dados Exibidos:**
1. **Nome** (se disponível)
2. **Telefone** ⭐ (sempre)
3. **CPF** (se disponível)
4. **Convênio** (se informado)
5. **Procedimento** (coletado pelo bot)
6. **Unidade** (ex: Vieiralves)
7. **Data Desejada** (ex: hoje, amanhã)
8. **Horário** (se informado)

---

## **⚡ Funcionalidade de Copiar:**

- Cada dado tem um botão de **copiar** 📋
- Ao clicar, copia para área de transferência
- Mostra ✅ verde quando copiado
- Toast de confirmação
- Volta ao ícone normal após 2 segundos

### **Uso:**
```
Atendente vê o card → Clica em "Copiar" ao lado do CPF → 
CPF é copiado → Cola no outro sistema → Economiza tempo!
```

---

## **📊 Fluxo Completo:**

```
1. Paciente: "Quero agendar fisioterapia"
2. Bot: "Qual unidade?"
3. Paciente: "Vieiralves"
4. Bot: "Qual data?"
5. Paciente: "Amanhã"

🎯 Bot detecta: AGEND AR
📝 Cadastra paciente automaticamente
💾 Salva dados coletados
📋 CRIA CARD NO CHAT ← NOVO!
👤 Transfere para AGUARDANDO

Atendente assume conversa →
Vê card com todos os dados →
Clica "Copiar" em cada campo →
Agenda no sistema rapidamente!
```

---

## **💻 Código:**

### **Backend:**
`api/routes/conversations.ts` - Linha ~1334
```typescript
// Cria card automaticamente ao transferir
if (decision.initialData && Object.keys(decision.initialData).length > 0) {
    await createSystemMessage(conversation.id, 'PATIENT_DATA_CARD', {
        patientData: {
            name: patient?.name,
            phone,
            cpf: patient?.cpf,
            convenio: patient?.insuranceCompany,
            procedimento: decision.initialData.procedimento,
            clinica: decision.initialData.clinica,
            data: decision.initialData.data,
            horario: decision.initialData.horario
        }
    })
}
```

### **Frontend:**
`src/components/chat/PatientDataCard.tsx`
- Card visual com dados organizados
- Função `copyToClipboard()` para copiar
- Estado para mostrar feedback visual
- Design responsivo e bonito

`src/components/chat/SystemMessage.tsx`
- Detecta tipo `PATIENT_DATA_CARD`
- Renderiza `PatientDataCard` ao invés de mensagem simples

---

## **✅ Benefícios:**

1. **Agilidade:** Atendente não precisa perguntar dados novamente
2. **Produtividade:** Botão copiar economiza tempo de digitação
3. **Precisão:** Dados coletados pelo bot, sem erros de transcrição
4. **UX:** Visual bonito e profissional
5. **Organização:** Todos os dados em um só lugar

---

## **🧪 Como Testar:**

1. **Inicie conversa:** "Quero agendar fisioterapia"
2. **Responda bot:** "Vieiralves" → "Amanhã"
3. **Bot transfere** automaticamente
4. **Veja o card** aparecer no chat
5. **Teste copiar:** Clique no botão ao lado de cada dado
6. **Verifique:** Dado deve estar na área de transferência

---

## **📸 Exemplo Visual:**

```
┌────────────────────────────────────┐
│ 📋 Dados Coletados        11:30    │
├────────────────────────────────────┤
│ 👤 Nome                       📋   │
│    Aguardando cadastro            │
│                                    │
│ 📞 Telefone                   📋   │
│    5592999999999                  │
│                                    │
│ ❤️  Procedimento               📋   │
│    Fisioterapia                   │
│                                    │
│ 📍 Unidade                     📋   │
│    Vieiralves                     │
│                                    │
│ 📅 Data Desejada               📋   │
│    Amanhã                         │
├────────────────────────────────────┤
│ 💡 Clique no ícone de copiar      │
│    para usar os dados             │
└────────────────────────────────────┘
```

---

**Funcionalidade 100% implementada!** 🎉
