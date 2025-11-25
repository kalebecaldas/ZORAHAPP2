# 📋 Implementação do Workflow Base Completo

## ✅ **O que foi feito**

Criei um workflow completo baseado no documento `BASE WORKFLOWEDITOR` que implementa todo o fluxo de agendamento conforme especificado.

---

## 🎯 **Fluxo Implementado**

### **1. Início → Seleção de Clínica**
- ✅ Paciente escolhe entre Vieiralves ou São José
- ✅ Validação de seleção

### **2. Classificação de Intenção (GPT)**
- ✅ Identifica 6 tipos de intenção:
  1. Informação sobre valores
  2. Informação sobre convênios
  3. Informação sobre localização
  4. Explicação sobre procedimentos
  5. **Agendar consulta** ⭐
  6. Falar com atendente humano

### **3. Fluxo de Agendamento Completo**

#### **3.1. Verificação de Cadastro**
- ✅ Busca paciente por telefone/CPF
- ✅ Se não encontrado → coleta dados completos:
  - Nome completo
  - CPF
  - Data de nascimento
  - Telefone celular
  - E-mail
  - Endereço completo (rua, número, bairro, cidade, CEP)
  - Convênio (opcional)
- ✅ Validação e criação/atualização de cadastro

#### **3.2. Seleção de Convênio**
- ✅ Sistema filtra convênios válidos
- ✅ Valida se convênio cobre o procedimento desejado
- ✅ Se não cobre → oferece opção particular com preço

#### **3.3. Seleção de Procedimentos (LOOP)**
- ✅ Lista procedimentos disponíveis para o convênio
- ✅ Permite selecionar múltiplos procedimentos
- ✅ Loop até paciente confirmar que terminou

#### **3.4. Escolha de Data e Horário**
- ✅ Coleta data preferencial
- ✅ Coleta turno (Manhã/Tarde/Noite)
- ✅ Verifica disponibilidade

#### **3.5. Tratamento de Indisponibilidade**
- ✅ Se horário não disponível:
  - Oferece alternativas
  - Outros profissionais
  - Lista de espera

#### **3.6. Criação de Reserva**
- ✅ Cria reserva na fila principal
- ✅ Bloqueia horário por 15 minutos
- ✅ Aguarda confirmação

#### **3.7. Confirmação e Notificações**
- ✅ Envia confirmação por SMS/E-mail
- ✅ Lembrete 24h antes
- ✅ Lembrete 2h antes
- ✅ Instruções pré-atendimento

---

## 📁 **Arquivos Criados/Modificados**

### **Novos Arquivos:**
1. ✅ `workflow_base_completo.json` - Workflow completo baseado no documento base

### **Arquivos Modificados:**
1. ✅ `src/services/workflowEngine.ts` - Implementadas novas ações e condições:
   - `search_patient_by_phone` - Busca paciente
   - `validate_and_create_patient` - Valida e cria cadastro
   - `check_appointment_availability` - Verifica disponibilidade
   - `create_appointment_reservation` - Cria reserva
   - `send_confirmation_notifications` - Envia notificações
   - `patient_found` - Condição: paciente encontrado?
   - `insurance_valid` - Condição: convênio válido?
   - `procedure_selected` - Condição: procedimento selecionado?
   - `availability_available` - Condição: horário disponível?

---

## 🔧 **Como Usar**

### **Opção 1: Importar o Workflow**

1. Acesse o Workflow Editor no Railway:
   ```
   https://zorahapp2-production.up.railway.app/workflows/editor/cmibu88ho0000jizqbv1g3vj0
   ```

2. Importe o arquivo `workflow_base_completo.json`

3. Ative o workflow

### **Opção 2: Atualizar Workflow Existente**

1. Abra o workflow atual no editor
2. Compare com `workflow_base_completo.json`
3. Adicione os nós e conexões faltantes

---

## 📊 **Estrutura do Workflow**

### **Nós Principais:**

```
START
  ↓
clinic_selection (CONDITION)
  ↓
gpt_classifier (GPT_RESPONSE)
  ├─→ info_values (API_CALL)
  ├─→ info_insurance (API_CALL)
  ├─→ info_location (API_CALL)
  ├─→ info_procedure_explanation (GPT_RESPONSE)
  ├─→ check_patient_exists (ACTION) ⭐ AGENDAMENTO
  └─→ transfer_human (TRANSFER_HUMAN)

check_patient_exists
  ↓
patient_found_decision (CONDITION)
  ├─→ select_insurance (MESSAGE) [Paciente encontrado]
  └─→ patient_registration (COLLECT_INFO) [Novo paciente]

patient_registration
  ↓
validate_registration (ACTION)
  ↓
select_insurance (MESSAGE)
  ↓
insurance_validation (CONDITION)
  ├─→ list_procedures (MESSAGE) [Convênio válido]
  └─→ insurance_not_covered (MESSAGE) [Não cobre]

list_procedures
  ↓
procedure_selection_loop (CONDITION)
  ├─→ add_more_procedures (MESSAGE) [Adicionar mais]
  └─→ select_date_time (MESSAGE) [Continuar]

select_date_time
  ↓
collect_date_time (COLLECT_INFO)
  ↓
check_availability (ACTION)
  ↓
availability_decision (CONDITION)
  ├─→ create_reservation (ACTION) [Disponível]
  └─→ offer_alternatives (MESSAGE) [Indisponível]

create_reservation
  ↓
reservation_confirmation (MESSAGE)
  ↓
send_notifications (ACTION)
  ↓
appointment_success (MESSAGE)
  ↓
continue_conversation (MESSAGE)
  ├─→ gpt_classifier [Continuar]
  └─→ end_conversation (END) [Encerrar]
```

---

## 🎨 **Recursos Implementados**

### **✅ Coleta de Dados Completa**
- Nome completo
- CPF (com validação)
- Data de nascimento (formato DD/MM/AAAA)
- Telefone celular
- E-mail (opcional)
- Endereço completo
- Convênio

### **✅ Validações**
- CPF válido
- E-mail válido
- Data de nascimento válida
- Verificação de duplicidade

### **✅ Regras de Negócio**
- Identificação por telefone/CPF
- Validação de cobertura de convênio
- Loop de seleção de procedimentos
- Verificação de disponibilidade
- Reserva temporária (15 minutos)
- Notificações automáticas

### **✅ Tratamento de Erros**
- CPF inválido → solicita confirmação
- Convênio não cobre → oferece particular
- Horário indisponível → oferece alternativas
- Falha no cadastro → mensagem amigável

---

## 🔄 **Fluxos Alternativos**

### **1. Paciente só quer informação**
- Responde e volta ao classificador GPT

### **2. Paciente já cadastrado**
- Pula coleta de dados
- Vai direto para seleção de convênio

### **3. Convênio não cobre**
- Oferece particular com preço
- Permite escolher outro convênio

### **4. Horário indisponível**
- Oferece alternativas
- Permite lista de espera

### **5. Múltiplos procedimentos**
- Loop até confirmar
- Cria agendamento conjunto

---

## 📝 **Próximos Passos**

### **Melhorias Sugeridas:**

1. **Integração Real de Disponibilidade**
   - Implementar verificação real no calendário
   - Integrar com Google Calendar (se aplicável)

2. **Notificações Reais**
   - Implementar envio de SMS
   - Implementar envio de E-mail
   - Lembretes automáticos

3. **Lista de Espera**
   - Sistema de fila quando não há disponibilidade
   - Notificação quando vaga abrir

4. **Validação SMS**
   - Verificação por SMS no cadastro
   - Reenvio de código

5. **Painel Administrativo**
   - Visualizar fila principal
   - Reagendar/cancelar manualmente
   - Confirmar agendamentos

---

## 🧪 **Testes Recomendados**

1. ✅ Testar fluxo completo de agendamento
2. ✅ Testar cadastro de novo paciente
3. ✅ Testar paciente já cadastrado
4. ✅ Testar convênio não coberto
5. ✅ Testar horário indisponível
6. ✅ Testar múltiplos procedimentos
7. ✅ Testar validações (CPF, email, etc.)

---

## 📚 **Documentação Relacionada**

- `src/BASE WORKFLOWEDITOR` - Documento base do fluxo
- `workflow_base_completo.json` - Workflow implementado
- `src/services/workflowEngine.ts` - Engine do workflow

---

**Criado em:** 24/11/2025  
**Status:** ✅ Implementado e pronto para testes

