# 🚀 Migração da Inteligência do Bot para N8N

## 📋 Visão Geral

Este documento descreve a migração completa da inteligência do bot ZoraH do sistema atual (Node.js + OpenAI) para N8N, mantendo todas as funcionalidades e melhorando a manutenibilidade.

---

## 🎯 Objetivos da Migração

### ✅ Benefícios:
1. **Visual Workflow Editor** - Editar fluxos visualmente no N8N
2. **Manutenção Simplificada** - Sem necessidade de deploy para alterar lógica
3. **Escalabilidade** - N8N gerencia filas e retries automaticamente
4. **Monitoramento** - Dashboard nativo de execuções e erros
5. **Versionamento** - Histórico de mudanças nos workflows
6. **Testes A/B** - Fácil criar variações de fluxos

### 🎨 O que Permanece no Sistema:
- API REST (endpoints)
- Banco de dados (Prisma)
- WhatsApp Service
- Autenticação
- Frontend (React)
- Webhooks de entrada

### 🔄 O que Migra para N8N:
- **Toda lógica de IA** (GPT, classificação, intenções)
- **Fluxos conversacionais**
- **Coleta de dados**
- **Agendamentos**
- **Validações**
- **Notificações**

---

## 📁 Estrutura de Workflows

### 1️⃣ **Main Bot Intelligence** (`1_main_bot_intelligence.json`)
**Workflow principal** que recebe todas as mensagens e roteia para sub-workflows.

**Responsabilidades:**
- ✅ Receber mensagens via webhook
- ✅ Carregar contexto da conversa
- ✅ Classificar intenção (GPT)
- ✅ Rotear para workflow específico
- ✅ Enviar resposta de volta ao sistema

**Fluxo:**
```
Webhook → Extrair Dados → Carregar Contexto → GPT Classifier
   ↓
├─→ INFORMACAO → Responder Informação
├─→ AGENDAR → Workflow de Agendamento
├─→ CANCELAR → Workflow de Cancelamento
├─→ RECLAMACAO → Transferir Humano
└─→ CONVERSA_LIVRE → GPT Conversacional
   ↓
Formatar Resposta → Enviar ao Sistema → Webhook Response
```

**Eventos que Dispara:**
- `received_message` (Webhook do sistema)
- `started_chat` (se primeira mensagem)
- `agent_entered` (se transferir para humano)

---

### 2️⃣ **Patient Registration** (`2_patient_registration.json`)
Coleta completa de dados do paciente de forma conversacional.

**Dados Coletados:**
- Nome completo
- CPF (com validação)
- Data de nascimento
- Telefone celular
- E-mail
- CEP (busca automática no ViaCEP)
- Número e complemento
- Convênio (opcional)

**Fluxo:**
```
Start → GPT Coleta Campo → Valida Campo → CEP? → ViaCEP
   ↓
Armazena Campo → Todos Coletados? → Cria Paciente → Sucesso
   ↓
Evento: created_patient (Webhook)
```

**Validações:**
- CPF: formato 000.000.000-00
- E-mail: formato válido
- Data: DD/MM/AAAA
- CEP: formato 00000-000 + verificação ViaCEP

---

### 3️⃣ **Appointment Scheduling** (`3_appointment_scheduling.json`)
Agendamento completo com verificação de disponibilidade.

**Etapas:**
1. **Selecionar Procedimento** (filtrado por convênio)
2. **Selecionar Unidade** (SEMPRE perguntar antes de valores!)
3. **Selecionar Data**
4. **Selecionar Turno** (Manhã/Tarde/Noite)
5. **Verificar Disponibilidade**
6. **Criar Agendamento** (se disponível)
7. **Enviar Notificações** (SMS + Email + WhatsApp)

**Fluxo:**
```
Start → GPT Assistente → Filtrar Procedimentos → Verificar Disponibilidade
   ↓                            ↓
   ↓                      Alternativas?
   ↓                            ↓
Criar Agendamento → Notificações (SMS/Email/WhatsApp) → Sucesso
   ↓
Evento: appointment_created (Webhook)
```

---

### 4️⃣ **Information Provider** (`4_information_provider.json`)
Responde perguntas sobre procedimentos, valores, convênios e localização.

**Tipos de Informação:**
- 💰 Valores (sempre pergunta unidade primeiro!)
- 🩺 Procedimentos disponíveis
- 🏥 Localização e horários
- 📋 Convênios aceitos
- ❓ Explicações sobre tratamentos

**Fluxo:**
```
Start → Detectar Tipo → Cache? → GPT Resposta → Atualizar Cache
   ↓
Salvar Interação → Response
```

**Otimizações:**
- ✅ Cache de respostas (Redis/N8N Memory)
- ✅ Fallbacks simples (sem GPT)
- ✅ Monitoramento de custos

---

### 5️⃣ **Cancellation & Rescheduling** (`5_cancellation_rescheduling.json`)
Gerencia cancelamentos e reagendamentos.

**Fluxo de Cancelamento:**
```
Start → Buscar Agendamento → Confirmar Cancelamento? → Cancelar
   ↓
Notificar Paciente → Disponibilizar Horário → Response
   ↓
Evento: closed_chat (Webhook)
```

**Fluxo de Reagendamento:**
```
Start → Buscar Agendamento → Nova Data? → Verificar Disponibilidade
   ↓
Atualizar Agendamento → Notificações → Response
```

---

### 6️⃣ **Human Transfer** (`6_human_transfer.json`)
Transfere conversa para atendente humano com contexto completo.

**Quando Transferir:**
- Paciente pede explicitamente
- Reclamação detectada
- Múltiplas tentativas sem sucesso
- Situação complexa identificada
- Baixa confiança na resposta (<0.6)

**Fluxo:**
```
Start → Preparar Resumo (GPT) → Atualizar Fila → Notificar Agente
   ↓
Enviar Contexto Completo → Response
   ↓
Evento: agent_entered (Webhook)
```

**Resumo Inclui:**
- 📋 Histórico da conversa
- 🎯 Intenção identificada
- 📊 Dados coletados
- ⚠️ Motivo da transferência
- 📝 Sugestões para o agente

---

## 🔗 Integração com o Sistema

### **Webhook de Entrada** (Sistema → N8N)

**Endpoint N8N:**
```
POST https://n8n.zorahapp.com.br/webhook/zorahbot
```

**Payload:**
```json
{
  "message": "Olá, quero agendar uma consulta",
  "phone": "5592999999999",
  "conversationId": "conv-123",
  "patient": {
    "id": "patient-456",
    "name": "João Silva",
    "insuranceCompany": "Bradesco",
    "registrationComplete": true
  },
  "context": {
    "history": [...],
    "currentIntent": "AGENDAR",
    "workflowContext": {...}
  }
}
```

### **Webhook de Saída** (N8N → Sistema)

**Endpoint Sistema:**
```
POST https://zorahapp.com.br/webhook/n8n-response
```

**Payload:**
```json
{
  "conversationId": "conv-123",
  "message": "Claro! Vou te ajudar a agendar. Você tem algum convênio?",
  "intent": "AGENDAR",
  "action": "continue | transfer_human | close_chat",
  "entities": {
    "procedimento": "Fisioterapia",
    "clinica": "Vieiralves"
  },
  "context": {
    "updated": true,
    "timestamp": "2025-12-29T20:00:00.000Z"
  },
  "appointment": {...},
  "success": true
}
```

---

## ⚙️ Configuração N8N

### **1. Variáveis de Ambiente**

```env
# API do Sistema
ZORAHAPP_API_URL=https://zorahapp.com.br
ZORAHAPP_API_TOKEN=your-jwt-token-here

# OpenAI
OPENAI_API_KEY=sk-...

# Notificações
SMS_API_URL=https://sms-provider.com/api
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_USER=noreply@zorahapp.com.br
EMAIL_SMTP_PASS=password

# WhatsApp (Evolution API)
WHATSAPP_API_URL=https://evolution.zorahapp.com.br
WHATSAPP_INSTANCE=zorahbot
```

### **2. Credenciais no N8N**

**OpenAI API:**
- Type: OpenAI
- API Key: `sk-...`

**ZorahApp API:**
- Type: HTTP Header Auth
- Header Name: `Authorization`
- Header Value: `Bearer {{ZORAHAPP_API_TOKEN}}`

**SMS Provider:**
- Type: HTTP Header Auth
- API Key: conforme provider

---

## 📊 Monitoramento e Logs

### **Dashboard N8N:**
- ✅ Execuções por hora
- ❌ Taxa de erro
- ⏱️ Tempo médio de resposta
- 💰 Uso de OpenAI (tokens)
- 📈 Intenções mais frequentes

### **Eventos de Webhook (Sistema):**
Todos os eventos importantes disparam webhooks configurados:

- `received_message` - Nova mensagem recebida
- `started_chat` - Conversa iniciada
- `agent_entered` - Agente assumiu
- `closed_chat` - Conversa finalizada
- `created_patient` - Paciente cadastrado
- `left_queue` - Saiu da fila
- `appointment_created` - Agendamento criado

---

## 🚀 Plano de Migração

### **Fase 1: Preparação** (1 semana)
1. ✅ Criar workflows no N8N
2. ✅ Configurar variáveis de ambiente
3. ✅ Configurar credenciais
4. ✅ Testar cada workflow isoladamente

### **Fase 2: Integração** (1 semana)
1. ✅ Criar endpoint de webhook no sistema
2. ✅ Implementar webhook de resposta
3. ✅ Atualizar serviço de conversas
4. ✅ Testes integrados (A/B testing)

### **Fase 3: Migração Gradual** (2 semanas)
1. ✅ 10% do tráfego para N8N
2. ✅ Monitorar métricas
3. ✅ 50% do tráfego
4. ✅ Monitorar e ajustar
5. ✅ 100% do tráfego
6. ✅ Deprecar código antigo

### **Fase 4: Otimização** (contínua)
1. ✅ Análise de performance
2. ✅ Otimização de prompts
3. ✅ Redução de custos GPT
4. ✅ Melhorias de UX

---

## 🔧 Código de Integração

### **Arquivo: `api/services/n8nBotService.ts`**

```typescript
import axios from 'axios'

export class N8NBotService {
  private n8nWebhookUrl: string
  
  constructor() {
    this.n8nWebhookUrl = process.env.N8N_WEBHOOK_URL || 'https://n8n.zorahapp.com.br/webhook/zorahbot'
  }
  
  /**
   * Envia mensagem para N8N processar
   */
  async processMessage(data: {
    message: string
    phone: string
    conversationId: string
    patient?: any
    context?: any
  }): Promise<any> {
    try {
      console.log(`📤 Enviando mensagem para N8N: ${data.message}`)
      
      const response = await axios.post(this.n8nWebhookUrl, data, {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'X-Source': 'ZorahApp'
        }
      })
      
      console.log(`✅ Resposta recebida do N8N`)
      return response.data
      
    } catch (error: any) {
      console.error(`❌ Erro ao processar via N8N:`, error.message)
      
      // Fallback para sistema antigo
      console.log(`🔄 Usando fallback do sistema antigo...`)
      const { intelligentBotService } = await import('./intelligentBot.js')
      return intelligentBotService.processMessage(
        data.message,
        data.phone,
        data.conversationId,
        data.context
      )
    }
  }
}

export const n8nBotService = new N8NBotService()
```

### **Arquivo: `api/routes/webhook-n8n.ts`**

```typescript
import { Router } from 'express'
import prisma from '../prisma/client.js'
import { whatsAppService } from '../services/whatsapp.js'
import { WebhookService } from '../services/webhookService.js'

const router = Router()

/**
 * Webhook para receber respostas do N8N
 * POST /webhook/n8n-response
 */
router.post('/n8n-response', async (req, res) => {
  try {
    const {
      conversationId,
      message,
      intent,
      action,
      entities,
      context,
      appointment,
      success
    } = req.body
    
    console.log(`📥 Resposta recebida do N8N para conversa ${conversationId}`)
    
    // 1. Enviar mensagem ao paciente
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { patient: true }
    })
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversa não encontrada' })
    }
    
    await whatsAppService.sendMessage(conversation.phone, message)
    
    // 2. Salvar mensagem no histórico
    await prisma.message.create({
      data: {
        conversationId,
        from: 'bot',
        content: message,
        metadata: { intent, entities }
      }
    })
    
    // 3. Atualizar contexto da conversa
    if (context?.updated) {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          currentIntent: intent,
          workflowContext: entities
        }
      })
    }
    
    // 4. Disparar webhooks externos
    if (appointment) {
      await WebhookService.trigger('appointment_created', {
        conversationId,
        appointment,
        patient: conversation.patient
      })
    }
    
    // 5. Ações especiais
    if (action === 'transfer_human') {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { queue: 'PRINCIPAL', status: 'WAITING' }
      })
      
      await WebhookService.trigger('agent_entered', {
        conversationId,
        reason: 'N8N transfer'
      })
    }
    
    if (action === 'close_chat') {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { status: 'CLOSED' }
      })
      
      await WebhookService.trigger('closed_chat', {
        conversationId,
        closedBy: 'bot'
      })
    }
    
    res.json({ success: true, received: true })
    
  } catch (error: any) {
    console.error(`❌ Erro ao processar resposta N8N:`, error)
    res.status(500).json({ error: error.message })
  }
})

export default router
```

### **Integração em `conversations.ts`:**

```typescript
import { n8nBotService } from '../services/n8nBotService.js'

// Substituir chamada ao intelligentBotService por:
const response = await n8nBotService.processMessage({
  message: text,
  phone,
  conversationId: conversation.id,
  patient: patient || undefined,
  context: {
    history: messages,
    currentIntent: conversation.currentIntent,
    workflowContext: conversation.workflowContext
  }
})
```

---

## 📚 Documentação Adicional

- `n8n/workflows/` - Todos os workflows JSON
- `n8n/README.md` - Setup e configuração
- `n8n/VARIABLES.md` - Variáveis de ambiente
- `n8n/MONITORING.md` - Guia de monitoramento
- `n8n/TROUBLESHOOTING.md` - Resolução de problemas

---

## ✅ Checklist de Migração

### Preparação:
- [ ] N8N instalado e configurado
- [ ] Workflows importados
- [ ] Variáveis de ambiente configuradas
- [ ] Credenciais OpenAI configuradas
- [ ] Webhooks testados

### Integração:
- [ ] Endpoint `/webhook/n8n-response` implementado
- [ ] `n8nBotService.ts` criado
- [ ] Fallback para sistema antigo configurado
- [ ] Testes unitários passando
- [ ] Testes integrados passando

### Deploy:
- [ ] Deploy em staging
- [ ] Testes com usuários beta
- [ ] Métricas de performance OK
- [ ] Deploy gradual em produção
- [ ] Monitoramento ativo

### Pós-Migração:
- [ ] Deprecar código antigo
- [ ] Atualizar documentação
- [ ] Treinar equipe
- [ ] Otimizar workflows
- [ ] Análise de custos

---

**Status**: 🚧 Em construção  
**Última atualização**: 29/12/2025  
**Responsável**: Equipe ZoraH

---

## 🎯 Próximos Passos

1. **Importar workflows** no N8N
2. **Configurar credenciais** e variáveis
3. **Testar** cada workflow isoladamente
4. **Integrar** com o sistema (webhook endpoints)
5. **Testar A/B** com % pequena de usuários
6. **Migrar** gradualmente 100% do tráfego
7. **Otimizar** e monitorar continuamente

---

**Dúvidas?** Consulte a documentação completa em `/docs/n8n/`
