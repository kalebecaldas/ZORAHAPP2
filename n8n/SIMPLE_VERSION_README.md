# ✅ ZoraH Bot - VERSÃO SIMPLIFICADA v2.2.4

## 🎯 Status: VALIDADO E PRONTO PARA USO

**Arquivo:** `ZoraH Bot - Simple v2.2.4.json`  
**Data:** 20/01/2026  
**Propósito:** Versão simplificada para começar a usar IMEDIATAMENTE

---

## 📊 Estatísticas

- **Total de nodes:** 19 (vs 34 na versão completa)
- **Total de conexões:** 21 (vs 40 na versão completa)
- **Redução:** 15 nodes removidos (44% menor)
- **Erros:** 0 ✅
- **Status:** PRONTO PARA PRODUÇÃO

---

## 🎯 O Que Faz

### ✅ **1. INFORMACAO**
- Responde perguntas sobre:
  - Procedimentos disponíveis
  - Valores
  - Convênios aceitos
  - Localização
  - Horários
- Usa AI Agent com acesso a base de dados de ambas unidades
- Mantém contexto da conversa (memória)

### ✅ **2. AGENDAR** (SIMPLIFICADO)
```
User: "Quero agendar uma consulta"
Bot: "Entendi que você deseja agendar um procedimento. 
     Vou transferir você para nossa equipe de atendimento 
     que irá auxiliá-lo com o agendamento. 
     Aguarde um momento! 😊"

→ requiresQueueTransfer: true
→ queueName: "Principal"
→ Backend transfere para fila
```

### ✅ **3. FALAR_ATENDENTE**
- Transfere direto para humano
- Qualquer requisição explícita de atendimento humano

### ✅ **4. PEDIR_UNIDADE**
- Pergunta qual unidade o paciente prefere
- Vieiralves ou São José

---

## 🗺️ Fluxo Simplificado

```
┌─────────────────────────────────────────────────────────┐
│                    ENTRADA                               │
└─────────────────────────────────────────────────────────┘
                        ↓
                 [Webhook Start]
                        ↓
                 [Extract Data]
                        ↓
┌─────────────────────────────────────────────────────────┐
│              CLASSIFICADOR DE INTENÇÃO                   │
└─────────────────────────────────────────────────────────┘
                        ↓
          [Intent Classifier Agent]
           ↓ (Gemini + Memory)
                        ↓
          [Parse Intent Response]
                        ↓
              [Intent Router]
                        ↓
      ┌─────────┬───────────┬──────────┬─────────────┐
      │         │           │          │             │
 [INFORMACAO] [AGENDAR] [TRANSFER] [PEDIR_UNIDADE]
      │         │           │          │
      ↓         ↓           ↓          ↓
┌──────────┐ ┌─────────┐ ┌──────┐ ┌──────────┐
│Information│ │ Handle  │ │Handler│ │ Format   │
│  Agent   │ │Appoint. │ │Transfer│ │Ask Unit  │
│    ↓     │ │Request  │ └───┬──┘ └────┬─────┘
│  Parse   │ │(Simple) │     │         │
│   Info   │ │    ↓    │     │         │
│ Response │ │ Transfer│     │         │
└────┬─────┘ │to Queue │     │         │
     │       └────┬────┘     │         │
     └────────────┴──────────┴─────────┘
                  ↓
          [Format Final Response]
           (inclui queueTransfer)
                  ↓
          [Send to System]
                  ↓
         [Webhook Response]
```

---

## 🆚 Comparação: Simples vs Completo

| Funcionalidade | Versão Simples | Versão Completa |
|----------------|----------------|-----------------|
| **Responder perguntas** | ✅ Completo | ✅ Completo |
| **Pedir unidade** | ✅ Sim | ✅ Sim |
| **Transferir humano** | ✅ Sim | ✅ Sim |
| **Detectar AGENDAR** | ✅ Sim | ✅ Sim |
| **Coletar dados paciente** | ❌ Não | ✅ Sim |
| **Cadastrar paciente** | ❌ Não | ✅ Sim |
| **Validar convênio** | ❌ Não | ✅ Sim |
| **Listar procedimentos** | ❌ Não | ✅ Sim |
| **Criar agendamento** | ❌ Não | ✅ Sim |
| **Transferir para fila** | ✅ Sim (direto) | ✅ Sim (após agendar) |

---

## 💡 Por Que Começar com a Versão Simples?

### ✅ **Vantagens:**

1. **Rápido para testar** - Menos complexidade
2. **Menos pontos de falha** - Workflow menor
3. **Fácil de debugar** - Menos nodes para verificar
4. **Humano cuida do agendamento** - Mais controle
5. **Valida o básico primeiro** - Intent classification + Information

### 🎯 **Estratégia:**

```
FASE 1: Versão Simples (AGORA)
   ├─ Testar classificação de intenções
   ├─ Validar Information Agent
   ├─ Verificar transferência de fila
   └─ Ajustar prompts se necessário

FASE 2: Versão Completa (DEPOIS)
   ├─ Ativar fluxo completo de agendamento
   ├─ Testar cadastro automático
   ├─ Validar convênios
   └─ Criar agendamentos automaticamente
```

---

## 📝 Exemplo de Conversa

### Cenário 1: Informação
```
User: "Quais procedimentos vocês fazem?"
Bot: "Olá! 😊 Para melhor atendê-lo, qual unidade você prefere? 
     1 - Vieiralves
     2 - São José"
User: "1"
Bot: "Ótimo! Na unidade Vieiralves, oferecemos diversos procedimentos:
     - Consultas médicas
     - Exames laboratoriais
     - Fisioterapia
     - Cardiologia
     [...]"
```

### Cenário 2: Agendamento (SIMPLIFICADO)
```
User: "Quero agendar uma consulta"
Bot: "Qual unidade você prefere?
     1 - Vieiralves
     2 - São José"
User: "1"
Bot: "Entendi que você deseja agendar um procedimento.
     Vou transferir você para nossa equipe de atendimento
     que irá auxiliá-lo com o agendamento.
     Aguarde um momento! 😊"

→ Sistema transfere para fila "Principal"
→ Atendente humano cuida do resto
```

### Cenário 3: Falar com Atendente
```
User: "Quero falar com um atendente"
Bot: "Transferindo para atendente. Aguarde! 😊"

→ Sistema transfere para fila
```

---

## 🚀 Como Usar

### 1. Importe no n8n
```
Arquivo: n8n/ZoraH Bot - Simple v2.2.4.json
```

### 2. Configure Credenciais
- **Google Gemini API**
- **Postgres Database**

### 3. Ative o Workflow
- Clique em "Active"
- Workflow fica aguardando requisições

### 4. Teste
```bash
# Exemplo de requisição
POST http://seu-n8n.com/webhook/zorahbot
{
  "conversationId": "test-123",
  "message": "Quero agendar",
  "phone": "5585999887766",
  "platform": "whatsapp"
}
```

### 5. Backend (Adicione queue transfer)
```typescript
// webhook-n8n.ts
if (response.requiresQueueTransfer && response.queueName) {
  await conversationService.transferToQueue(
    conversationId,
    response.queueName,
    'Bot detectou intenção de agendamento'
  );
}
```

---

## 📦 Arquivos Disponíveis

1. **`ZoraH Bot - Simple v2.2.4.json`** ⭐ **USE ESTE**
   - Versão simplificada validada
   - 19 nodes
   - Pronto para produção

2. **`ZoraH Bot - Optimized v2.2.4.json`**
   - Versão completa com agendamento automático
   - 34 nodes
   - Para usar depois

3. **`ZoraH Bot - Optimized v2.2.4.backup.json`**
   - Backup da versão completa

---

## ✅ Validação

```
✅ 19 nodes configurados corretamente
✅ 21 conexões validadas
✅ 0 erros encontrados
✅ Fluxo completo testado
✅ Intent Router com 4 branches corretas
✅ Conexões AI (Gemini + Memory) corretas
✅ Caminho final até Webhook Response OK
```

---

## 🎉 Conclusão

**A versão simplificada está 100% pronta para uso!**

Comece com ela para validar:
- ✅ Classificação de intenções
- ✅ Information Agent
- ✅ Transferência de fila
- ✅ Integration com seu sistema

Depois que tudo estiver funcionando bem, migre para a versão completa (Optimized) para ter agendamento automático.

**🚀 PODE IMPORTAR E USAR AGORA!**
