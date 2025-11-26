# 🔄 Migração para N8N - Análise Completa

## 📋 Contexto Atual

### Sistema Existente:
- **Workflow Engine Customizado** (TypeScript)
- **Nodes**: START, MESSAGE, CONDITION, ACTION, GPT_RESPONSE, DATA_COLLECTION, TRANSFER_HUMAN, END
- **Banco de Dados**: Prisma (SQLite local / PostgreSQL Railway)
- **Frontend**: React (fila de atendimento em tempo real)
- **Backend API**: Express + Socket.io
- **WhatsApp**: Integração via webhooks
- **Dados Clínicos**: `clinicData.json` (procedimentos, convênios, unidades)

### Fluxo Atual:
```
WhatsApp → Webhook → API Express → Workflow Engine → 
GPT/Actions → Prisma DB → Socket.io → Frontend (Fila)
```

---

## 🎯 Arquitetura com N8N

### Opção 1: N8N como Engine Principal (Substituição Total)

```
WhatsApp → N8N Webhook → N8N Workflow → 
N8N AI Agent → N8N HTTP Requests (API Express) → 
Prisma DB → Socket.io → Frontend (Fila)
```

**Vantagens:**
- ✅ Visual workflow builder (mais fácil de editar)
- ✅ Nodes pré-construídos (HTTP, OpenAI, webhooks)
- ✅ Versionamento de workflows
- ✅ Retry automático em caso de falha
- ✅ Pode usar prompts para criar workflows (N8N AI)

**Desvantagens:**
- ❌ Perde o editor customizado atual
- ❌ Requer refatoração significativa
- ❌ N8N precisa estar sempre rodando (infraestrutura adicional)
- ❌ Menos controle sobre lógica complexa
- ❌ Curva de aprendizado

**Arquitetura Detalhada:**

```
┌─────────────────────────────────────────────────────────────┐
│                        WhatsApp                              │
└────────────────────────┬────────────────────────────────────┘
                         │ Webhook
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                     N8N WORKFLOW                             │
│                                                               │
│  1. Webhook Trigger                                          │
│     ↓                                                         │
│  2. Extract Message Data                                     │
│     ↓                                                         │
│  3. HTTP Request: GET /api/conversations/:phone              │
│     (buscar conversa e contexto)                             │
│     ↓                                                         │
│  4. Decision Node: Workflow State                            │
│     ├─ Início → Clinic Selection                             │
│     ├─ Coletando dados → Continue Collection                 │
│     └─ GPT → Call OpenAI                                     │
│     ↓                                                         │
│  5. OpenAI Node (GPT-4)                                      │
│     - System Prompt com clinicData.json                      │
│     - Contexto da conversa                                   │
│     ↓                                                         │
│  6. Decision Node: Intent Classification                     │
│     ├─ Valores → Format Prices                               │
│     ├─ Convênios → Format Insurance                          │
│     ├─ Agendar → Start Collection                            │
│     └─ Humano → Transfer to Queue                            │
│     ↓                                                         │
│  7. HTTP Request: POST /api/workflows/execute                │
│     (executar ações: criar paciente, buscar procedimentos)   │
│     ↓                                                         │
│  8. HTTP Request: POST /api/conversations/:id/messages       │
│     (salvar mensagem no banco)                               │
│     ↓                                                         │
│  9. HTTP Request: POST /api/whatsapp/send                    │
│     (enviar resposta via WhatsApp)                           │
│     ↓                                                         │
│ 10. HTTP Request: POST /api/queue/transfer                   │
│     (se necessário, transferir para humano)                  │
└─────────────────────────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                    API EXPRESS (Backend)                     │
│                                                               │
│  • /api/conversations (gerenciar conversas)                 │
│  • /api/patients (CRUD pacientes)                           │
│  • /api/workflows/execute (executar actions)                │
│  • /api/queue (gerenciar fila de atendimento)               │
│  • Socket.io (notificações em tempo real)                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                   PRISMA + PostgreSQL                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                 FRONTEND (React + Socket.io)                 │
│                                                               │
│  • Fila de Atendimento                                       │
│  • Conversas em Tempo Real                                   │
│  • Workflow Editor (desativado ou removido)                 │
└─────────────────────────────────────────────────────────────┘
```

---

### Opção 2: N8N como Assistente (Híbrido)

```
WhatsApp → API Express → 
├─ N8N (AI Agent para respostas complexas)
└─ Workflow Engine Atual (para fluxo simples)
→ Prisma DB → Socket.io → Frontend
```

**Vantagens:**
- ✅ Mantém sistema atual funcionando
- ✅ Usa N8N apenas para partes complexas (GPT, integrações)
- ✅ Migração gradual
- ✅ Menos risco

**Desvantagens:**
- ❌ Dois sistemas para manter
- ❌ Complexidade adicional
- ❌ Duplicação de lógica

---

## 🛠️ Implementação N8N (Opção 1)

### Passo 1: Setup N8N

```bash
# Docker Compose
version: '3.8'
services:
  n8n:
    image: n8nio/n8n
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=admin
      - N8N_HOST=0.0.0.0
      - N8N_PORT=5678
      - N8N_PROTOCOL=https
      - NODE_ENV=production
      - WEBHOOK_URL=https://your-n8n-domain.com/
    volumes:
      - n8n_data:/home/node/.n8n
volumes:
  n8n_data:
```

### Passo 2: Criar Workflow N8N

**Nodes Necessários:**

1. **Webhook Trigger**
   - URL: `/webhook/whatsapp`
   - Method: POST
   - Response Mode: Return Response

2. **Function Node: Parse WhatsApp Data**
   ```javascript
   const phone = $json.body.from;
   const message = $json.body.message;
   const timestamp = $json.body.timestamp;
   
   return {
     phone,
     message,
     timestamp
   };
   ```

3. **HTTP Request: Get Conversation**
   - Method: GET
   - URL: `https://your-api.com/api/conversations/{{ $json.phone }}`
   - Authentication: Bearer Token

4. **Function Node: Prepare GPT Context**
   ```javascript
   const clinicData = {
     procedures: [...], // dados do clinicData.json
     insurances: [...],
     units: [...]
   };
   
   const conversation = $json.conversation;
   const context = conversation.workflowContext || {};
   
   return {
     clinicData,
     conversation,
     context,
     currentNode: context.currentNode,
     collectedData: context.collectedData || {}
   };
   ```

5. **OpenAI Node: GPT-4**
   - Model: gpt-4
   - System Prompt:
     ```
     Você é um assistente de uma clínica de fisioterapia.
     
     Dados da clínica: {{ $json.clinicData }}
     
     Contexto da conversa: {{ $json.context }}
     
     Seu objetivo é:
     1. Responder perguntas sobre valores, convênios, procedimentos
     2. Coletar dados para agendamento (nome, CPF, data nascimento, email, convênio)
     3. Classificar intenção do usuário
     ```
   - User Message: `{{ $json.message }}`

6. **Switch Node: Intent Classification**
   - Baseado na resposta do GPT, classificar intenção:
     - `valores` → Format Prices
     - `convenios` → Format Insurance
     - `agendar` → Start Collection
     - `humano` → Transfer to Queue

7. **HTTP Request: Execute Action**
   - Method: POST
   - URL: `https://your-api.com/api/workflows/execute`
   - Body:
     ```json
     {
       "action": "{{ $json.action }}",
       "context": "{{ $json.context }}"
     }
     ```

8. **HTTP Request: Save Message**
   - Method: POST
   - URL: `https://your-api.com/api/conversations/{{ $json.conversationId }}/messages`
   - Body:
     ```json
     {
       "from": "bot",
       "content": "{{ $json.response }}",
       "timestamp": "{{ $json.timestamp }}"
     }
     ```

9. **HTTP Request: Send WhatsApp**
   - Method: POST
   - URL: `https://your-api.com/api/whatsapp/send`
   - Body:
     ```json
     {
       "to": "{{ $json.phone }}",
       "message": "{{ $json.response }}"
     }
     ```

10. **HTTP Request: Transfer to Queue** (condicional)
    - Method: POST
    - URL: `https://your-api.com/api/queue/transfer`
    - Body:
      ```json
      {
        "conversationId": "{{ $json.conversationId }}",
        "reason": "{{ $json.reason }}"
      }
      ```

### Passo 3: Adaptar Backend API

**Criar endpoints para N8N:**

```typescript
// api/routes/n8n.ts
import { Router } from 'express';

const router = Router();

// Executar actions do workflow
router.post('/workflows/execute', async (req, res) => {
  const { action, context } = req.body;
  
  switch (action) {
    case 'create_patient':
      // Criar paciente no Prisma
      const patient = await prisma.patient.create({...});
      return res.json({ patient });
      
    case 'get_procedures_by_insurance':
      // Buscar procedimentos
      const procedures = getProceduresForInsurance(context.insurance);
      return res.json({ procedures });
      
    case 'transfer_to_queue':
      // Transferir para fila
      await transferToHuman(context.conversationId, context.reason);
      return res.json({ success: true });
      
    default:
      return res.status(400).json({ error: 'Invalid action' });
  }
});

// Buscar conversa e contexto
router.get('/conversations/:phone', async (req, res) => {
  const { phone } = req.params;
  
  const conversation = await prisma.conversation.findFirst({
    where: { phone },
    include: { messages: true }
  });
  
  return res.json({ conversation });
});

export default router;
```

### Passo 4: Manter Frontend Funcionando

**O frontend NÃO precisa mudar!**

- Socket.io continua funcionando
- API endpoints continuam os mesmos
- Fila de atendimento continua funcionando
- Apenas o Workflow Editor pode ser desativado

**Exemplo de como Socket.io continua:**

```typescript
// api/services/socketService.ts
export const notifyQueueUpdate = (conversationId: string) => {
  io.emit('queue:update', { conversationId });
};

export const notifyNewMessage = (conversationId: string, message: any) => {
  io.emit('conversation:message', { conversationId, message });
};
```

---

## 📊 Comparação: Atual vs N8N

| Aspecto | Sistema Atual | Com N8N |
|---------|--------------|---------|
| **Edição de Workflow** | Editor customizado React | N8N Visual Builder |
| **Complexidade** | Alta (código TypeScript) | Média (visual + código) |
| **Manutenção** | Código customizado | Nodes pré-construídos |
| **Infraestrutura** | 1 serviço (API) | 2 serviços (API + N8N) |
| **Custos** | Baixo | Médio (hosting N8N) |
| **Flexibilidade** | Total controle | Limitado aos nodes |
| **Tempo de Dev** | Alto | Médio |
| **Debug** | Logs + código | N8N UI + logs |
| **Escalabilidade** | Boa | Boa |
| **Tempo Real (Fila)** | ✅ Socket.io | ✅ Socket.io (mantém) |

---

## 🎯 Recomendação

### Para Produção Imediata: **NÃO MIGRE AINDA**

**Motivos:**
1. Sistema atual está funcionando
2. Migração requer refatoração significativa
3. Risco de downtime durante migração
4. Curva de aprendizado do N8N
5. Infraestrutura adicional (custos)

### Para Futuro: **Migração Gradual (Opção 2 - Híbrido)**

**Plano:**

**Fase 1 (1-2 semanas):**
- Setup N8N em paralelo
- Criar workflow simples de teste
- Validar integração com API atual

**Fase 2 (2-3 semanas):**
- Migrar apenas GPT para N8N
- Manter workflow engine para coleta de dados
- Testar em ambiente de staging

**Fase 3 (3-4 semanas):**
- Migrar actions (create_patient, get_procedures)
- Manter transferência de fila na API
- Testes completos

**Fase 4 (1-2 semanas):**
- Migração completa para N8N
- Desativar workflow engine antigo
- Deploy em produção

---

## 💡 Usando N8N com Prompts

**N8N AI (versões recentes) permite criar workflows via prompts:**

```
Prompt: "Crie um workflow que:
1. Recebe mensagem do WhatsApp
2. Consulta histórico da conversa em uma API
3. Envia para GPT-4 com contexto da clínica
4. Classifica a intenção do usuário
5. Se for agendar, coleta dados (nome, CPF, email, convênio)
6. Cria paciente no banco de dados via API
7. Envia lista de procedimentos do convênio
8. Transfere para fila de atendimento humano
9. Envia resposta via WhatsApp"
```

**N8N irá gerar:**
- Nodes conectados
- HTTP Requests configurados
- Function nodes com lógica
- Switch nodes para decisões

**Você precisará ajustar:**
- URLs da API
- Autenticação
- Formato dos dados
- Lógica específica

---

## 📝 Checklist de Migração

### Preparação:
- [ ] Setup N8N em Docker/Railway
- [ ] Criar endpoints na API para N8N
- [ ] Documentar fluxo atual completo
- [ ] Criar ambiente de staging

### Desenvolvimento:
- [ ] Criar workflow N8N básico
- [ ] Integrar com GPT-4
- [ ] Implementar coleta de dados
- [ ] Implementar criação de paciente
- [ ] Implementar busca de procedimentos
- [ ] Implementar transferência de fila

### Testes:
- [ ] Testar fluxo completo em staging
- [ ] Testar casos extremos
- [ ] Testar performance
- [ ] Testar failover

### Deploy:
- [ ] Deploy N8N em produção
- [ ] Configurar webhooks
- [ ] Monitorar logs
- [ ] Rollback plan pronto

---

## 🔗 Recursos

- **N8N Docs**: https://docs.n8n.io/
- **N8N OpenAI Node**: https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.openai/
- **N8N HTTP Request**: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/
- **N8N Webhook**: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/

---

## 💰 Custos Estimados

> **Nota**: Valores em USD (Dólar). Conversão aproximada: 1 USD = 5 BRL (R$)

### N8N Self-Hosted (Railway):

**Opção 1: Railway Hobby Plan**
- **Custo**: $5 USD/mês (~R$ 25/mês)
- **Recursos**: 8 GB RAM, 8 vCPUs
- **Adequado para**: Cargas leves a moderadas
- **Vantagem**: Mais barato, controle total

**Opção 2: Railway Pro Plan**
- **Custo**: $20 USD/mês (~R$ 100/mês)
- **Recursos**: Mais recursos, melhor performance
- **Adequado para**: Produção com alto volume

**Custo adicional**: N8N em si é **GRATUITO** (open source), você paga apenas o hosting.

### N8N Cloud (Hospedagem Gerenciada):

**Starter Plan**
- **Custo**: €20/mês (~$24 USD ou ~R$ 120/mês)
- **Execuções**: 2.500 workflows/mês
- **Inclui**: Usuários e workflows ilimitados

**Pro Plan**
- **Custo**: €50/mês (~$60 USD ou ~R$ 300/mês)
- **Execuções**: 10.000 workflows/mês
- **Inclui**: Suporte prioritário, recursos avançados

**Business Plan**
- **Custo**: €667/mês (~$800 USD ou ~R$ 4.000/mês)
- **Execuções**: 40.000 workflows/mês
- **Inclui**: Suporte dedicado, SLA garantido

### Comparação de Custos:

| Opção | USD/mês | BRL/mês (R$) | Execuções | Manutenção |
|-------|---------|--------------|-----------|------------|
| **Self-hosted (Railway Hobby)** | $5 | ~R$ 25 | Ilimitadas* | Você faz |
| **Self-hosted (Railway Pro)** | $20 | ~R$ 100 | Ilimitadas* | Você faz |
| **N8N Cloud Starter** | $24 | ~R$ 120 | 2.500 | N8N faz |
| **N8N Cloud Pro** | $60 | ~R$ 300 | 10.000 | N8N faz |

*Limitadas apenas pelos recursos do servidor

### Total Estimado para seu caso:

**Cenário 1: Self-hosted (Recomendado para começar)**
- Railway Hobby: **R$ 25/mês**
- N8N: **GRATUITO** (open source)
- **Total**: **+R$ 25/mês**

**Cenário 2: N8N Cloud (Mais fácil, mas mais caro)**
- N8N Cloud Starter: **R$ 120/mês**
- **Total**: **+R$ 120/mês**

### 💡 Recomendação de Custo:

Para começar: **Self-hosted no Railway (R$ 25/mês)**
- Mais barato
- Controle total
- Você já usa Railway

Se crescer muito: **N8N Cloud Pro (R$ 300/mês)**
- Mais fácil de gerenciar
- Suporte incluído
- Escalabilidade automática

---

## 🎯 Conclusão

**Para seu caso específico:**

1. **Curto Prazo (agora)**: Mantenha o sistema atual
   - Está funcionando
   - Menor risco
   - Foco em melhorias incrementais

2. **Médio Prazo (3-6 meses)**: Considere migração híbrida
   - Use N8N para GPT e integrações complexas
   - Mantenha workflow engine para lógica simples

3. **Longo Prazo (6-12 meses)**: Avalie migração completa
   - Se N8N provar valor no híbrido
   - Se equipe dominar a ferramenta
   - Se custos compensarem

**Minha recomendação: NÃO MIGRE AGORA. Foque em:**
- Estabilizar sistema atual no Railway
- Documentar workflows
- Criar testes automatizados
- Depois avaliar N8N

Quer que eu crie um POC (Proof of Concept) do workflow N8N para você testar?

