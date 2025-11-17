# 📚 Documentação da API

Documentação completa dos endpoints da API do Sistema de Clínica com WhatsApp AI.

## 🔐 Autenticação

A API usa autenticação JWT (JSON Web Token). Inclua o token no header de cada requisição:

```http
Authorization: Bearer <seu-token-jwt>
```

### Obter Token

#### POST /api/auth/register
Registra um novo usuário no sistema.

**Request:**
```json
{
  "name": "João Silva",
  "email": "joao@clinica.com",
  "password": "senha123",
  "role": "AGENT"  // opcional, default: "AGENT"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "joao@clinica.com",
    "name": "João Silva",
    "role": "AGENT"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Erros:**
- `400`: Dados inválidos
- `409`: Email já cadastrado

#### POST /api/auth/login
Autentica um usuário existente.

**Request:**
```json
{
  "email": "joao@clinica.com",
  "password": "senha123"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "joao@clinica.com",
    "name": "João Silva",
    "role": "AGENT"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Erros:**
- `401`: Credenciais inválidas
- `400`: Dados inválidos

## 💬 Conversas

### GET /api/conversations
Lista todas as conversas com filtros opcionais.

**Query Parameters:**
- `status` (opcional): `BOT`, `HUMAN`, `CLOSED`
- `patientId` (opcional): ID do paciente
- `agentId` (opcional): ID do agente
- `page` (opcional): Número da página (default: 1)
- `limit` (opcional): Itens por página (default: 20)

**Response (200):**
```json
{
  "conversations": [
    {
      "id": "conv_123",
      "patientId": "patient_456",
      "patient": {
        "id": "patient_456",
        "name": "Maria Santos",
        "phone": "+5511999999999",
        "insuranceCompany": "Unimed"
      },
      "status": "HUMAN",
      "priority": "HIGH",
      "lastMessage": "Gostaria de marcar uma consulta",
      "lastMessageAt": "2023-11-14T15:30:00Z",
      "agentId": "agent_789",
      "agent": {
        "id": "agent_789",
        "name": "Dr. João Silva"
      },
      "createdAt": "2023-11-14T14:00:00Z",
      "updatedAt": "2023-11-14T15:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

### POST /api/conversations
Cria uma nova conversa.

**Request:**
```json
{
  "patientId": "patient_456",
  "initialMessage": "Olá, gostaria de marcar uma consulta"
}
```

**Response (201):**
```json
{
  "id": "conv_123",
  "patientId": "patient_456",
  "status": "BOT",
  "priority": "MEDIUM",
  "createdAt": "2023-11-14T14:00:00Z"
}
```

### GET /api/conversations/:id
Obtém detalhes de uma conversa específica.

**Response (200):**
```json
{
  "id": "conv_123",
  "patientId": "patient_456",
  "patient": {
    "id": "patient_456",
    "name": "Maria Santos",
    "phone": "+5511999999999",
    "email": "maria@email.com",
    "insuranceCompany": "Unimed",
    "insuranceNumber": "123456789"
  },
  "status": "HUMAN",
  "priority": "HIGH",
  "agentId": "agent_789",
  "agent": {
    "id": "agent_789",
    "name": "Dr. João Silva",
    "email": "joao@clinica.com"
  },
  "messages": [
    {
      "id": "msg_001",
      "messageText": "Olá, gostaria de marcar uma consulta",
      "messageType": "TEXT",
      "sender": "PATIENT",
      "status": "DELIVERED",
      "createdAt": "2023-11-14T14:00:00Z"
    }
  ],
  "createdAt": "2023-11-14T14:00:00Z",
  "updatedAt": "2023-11-14T15:30:00Z"
}
```

### PATCH /api/conversations/:id/status
Atualiza o status de uma conversa.

**Request:**
```json
{
  "status": "HUMAN",
  "agentId": "agent_789"  // opcional
}
```

**Response (200):**
```json
{
  "id": "conv_123",
  "status": "HUMAN",
  "agentId": "agent_789",
  "updatedAt": "2023-11-14T15:30:00Z"
}
```

**Status válidos:**
- `BOT`: Atendimento automatizado
- `HUMAN`: Aguardando atendente humano
- `PRINCIPAL`: Em atendimento com humano
- `CLOSED`: Conversa finalizada

### POST /api/conversations/:id/messages
Envia uma mensagem em uma conversa.

**Request:**
```json
{
  "messageText": "Claro! Qual dia seria melhor para você?",
  "messageType": "TEXT",  // TEXT, IMAGE, TEMPLATE
  "sender": "AGENT"       // PATIENT, AGENT, SYSTEM
}
```

**Response (201):**
```json
{
  "id": "msg_002",
  "conversationId": "conv_123",
  "messageText": "Claro! Qual dia seria melhor para você?",
  "messageType": "TEXT",
  "sender": "AGENT",
  "status": "PENDING",
  "createdAt": "2023-11-14T15:31:00Z"
}
```

## 👥 Pacientes

### GET /api/patients
Lista todos os pacientes.

**Query Parameters:**
- `search` (opcional): Busca por nome, telefone ou email
- `insurance` (opcional): Filtrar por convênio
- `page` (opcional): Número da página
- `limit` (opcional): Itens por página

**Response (200):**
```json
{
  "patients": [
    {
      "id": "patient_456",
      "name": "Maria Santos",
      "phone": "+5511999999999",
      "email": "maria@email.com",
      "dateOfBirth": "1990-05-15",
      "insuranceCompany": "Unimed",
      "insuranceNumber": "123456789",
      "notes": "Paciente alérgica a penicilina",
      "createdAt": "2023-11-01T10:00:00Z",
      "updatedAt": "2023-11-10T14:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "pages": 8
  }
}
```

### POST /api/patients
Cria um novo paciente.

**Request:**
```json
{
  "name": "João Silva",
  "phone": "+5511988888888",
  "email": "joao@email.com",
  "dateOfBirth": "1985-03-20",
  "insuranceCompany": "Amil",
  "insuranceNumber": "987654321",
  "notes": "Histórico de hipertensão"
}
```

**Response (201):**
```json
{
  "id": "patient_789",
  "name": "João Silva",
  "phone": "+5511988888888",
  "email": "joao@email.com",
  "dateOfBirth": "1985-03-20",
  "insuranceCompany": "Amil",
  "insuranceNumber": "987654321",
  "notes": "Histórico de hipertensão",
  "createdAt": "2023-11-14T16:00:00Z"
}
```

### GET /api/patients/:id
Obtém detalhes de um paciente.

**Response (200):**
```json
{
  "id": "patient_456",
  "name": "Maria Santos",
  "phone": "+5511999999999",
  "email": "maria@email.com",
  "dateOfBirth": "1990-05-15",
  "insuranceCompany": "Unimed",
  "insuranceNumber": "123456789",
  "notes": "Paciente alérgica a penicilina",
  "conversations": [
    {
      "id": "conv_123",
      "status": "CLOSED",
      "lastMessage": "Consulta marcada para amanhã",
      "createdAt": "2023-11-10T10:00:00Z"
    }
  ],
  "createdAt": "2023-11-01T10:00:00Z",
  "updatedAt": "2023-11-10T14:30:00Z"
}
```

### PUT /api/patients/:id
Atualiza um paciente.

**Request:**
```json
{
  "name": "Maria Santos Silva",
  "phone": "+5511999999999",
  "email": "maria.santos@email.com",
  "insuranceCompany": "Bradesco Saúde",
  "notes": "Paciente alérgica a penicilina e aspirina"
}
```

**Response (200):**
```json
{
  "id": "patient_456",
  "name": "Maria Santos Silva",
  "phone": "+5511999999999",
  "email": "maria.santos@email.com",
  "insuranceCompany": "Bradesco Saúde",
  "notes": "Paciente alérgica a penicilina e aspirina",
  "updatedAt": "2023-11-14T16:30:00Z"
}
```

### DELETE /api/patients/:id
Remove um paciente.

**Response (204):** No content

## 🔧 Workflows

### GET /api/workflows
Lista todos os workflows.

**Response (200):**
```json
{
  "workflows": [
    {
      "id": "wf_001",
      "name": "Agendamento de Consulta",
      "description": "Fluxo automatizado para agendamento",
      "isActive": true,
      "nodes": [
        {
          "id": "node_1",
          "type": "START",
          "content": { "text": "Início do atendimento" },
          "position": { "x": 100, "y": 100 }
        },
        {
          "id": "node_2",
          "type": "MESSAGE",
          "content": { 
            "text": "Olá! Bem-vindo à nossa clínica. Como posso ajudar você hoje?" 
          },
          "position": { "x": 300, "y": 100 }
        }
      ],
      "createdAt": "2023-11-01T10:00:00Z",
      "updatedAt": "2023-11-10T14:30:00Z"
    }
  ]
}
```

### POST /api/workflows
Cria um novo workflow.

**Request:**
```json
{
  "name": "Triagem Inicial",
  "description": "Fluxo de triagem para novos pacientes",
  "isActive": true,
  "nodes": [
    {
      "id": "start",
      "type": "START",
      "content": { "text": "Início" },
      "position": { "x": 100, "y": 100 },
      "connections": ["message1"]
    },
    {
      "id": "message1",
      "type": "MESSAGE",
      "content": { 
        "text": "Você é paciente novo ou já tem cadastro?" 
      },
      "position": { "x": 300, "y": 100 },
      "connections": ["condition1"]
    },
    {
      "id": "condition1",
      "type": "CONDITION",
      "content": { 
        "condition": "patient.isNew",
        "options": ["new", "existing"]
      },
      "position": { "x": 500, "y": 100 },
      "connections": ["new_patient", "existing_patient"]
    }
  ]
}
```

**Response (201):**
```json
{
  "id": "wf_002",
  "name": "Triagem Inicial",
  "description": "Fluxo de triagem para novos pacientes",
  "isActive": true,
  "nodes": [...],
  "createdAt": "2023-11-14T16:00:00Z"
}
```

### GET /api/workflows/:id
Obtém detalhes de um workflow.

**Response (200):**
```json
{
  "id": "wf_001",
  "name": "Agendamento de Consulta",
  "description": "Fluxo automatizado para agendamento",
  "isActive": true,
  "nodes": [...],
  "executionStats": {
    "totalExecutions": 156,
    "successfulExecutions": 142,
    "failedExecutions": 14,
    "averageExecutionTime": 2.5
  },
  "createdAt": "2023-11-01T10:00:00Z",
  "updatedAt": "2023-11-10T14:30:00Z"
}
```

### POST /api/workflows/:id/test
Testa um workflow com dados simulados.

**Request:**
```json
{
  "patientData": {
    "name": "Teste Silva",
    "phone": "+5511999999999",
    "isNew": true
  },
  "message": "Quero marcar uma consulta"
}
```

**Response (200):**
```json
{
  "success": true,
  "executionPath": ["start", "message1", "condition1", "new_patient"],
  "outputs": {
    "finalMessage": "Perfeito! Vou te ajudar com o cadastro.",
    "nextAction": "COLLECT_PATIENT_DATA"
  },
  "executionTime": 1.2
}
```

## 📊 Estatísticas

### GET /api/stats/dashboard
Obtém estatísticas gerais do dashboard.

**Response (200):**
```json
{
  "totalConversations": 1247,
  "activeConversations": 23,
  "pendingConversations": 8,
  "closedConversationsToday": 45,
  "averageResponseTime": 2.5,
  "satisfactionRate": 4.2,
  "topIntents": [
    { "intent": "agendamento", "count": 456 },
    { "intent": "precos", "count": 234 },
    { "intent": "informacoes", "count": 189 }
  ],
  "hourlyStats": [
    { "hour": 8, "conversations": 23 },
    { "hour": 9, "conversations": 45 },
    { "hour": 10, "conversations": 67 }
  ]
}
```

### GET /api/stats/conversations
Estatísticas detalhadas de conversas.

**Query Parameters:**
- `startDate` (opcional): Data inicial (ISO 8601)
- `endDate` (opcional): Data final (ISO 8601)
- `agentId` (opcional): Filtrar por agente

**Response (200):**
```json
{
  "totalConversations": 1247,
  "conversationsByStatus": {
    "BOT": 234,
    "HUMAN": 456,
    "PRINCIPAL": 189,
    "CLOSED": 368
  },
  "conversationsByDay": [
    {
      "date": "2023-11-10",
      "total": 89,
      "bot": 45,
      "human": 44
    }
  ],
  "averageResolutionTime": 4.5,
  "averageMessagesPerConversation": 8.2
}
```

### GET /api/stats/agents
Estatísticas de desempenho dos agentes.

**Response (200):**
```json
{
  "agents": [
    {
      "id": "agent_001",
      "name": "Dr. João Silva",
      "totalConversations": 156,
      "resolvedConversations": 142,
      "averageResponseTime": 1.8,
      "averageRating": 4.5,
      "status": "ONLINE"
    }
  ],
  "ranking": {
    "bestResponseTime": "agent_001",
    "mostConversations": "agent_002",
    "bestRating": "agent_001"
  }
}
```

### GET /api/stats/patients
Estatísticas de pacientes.

**Response (200):**
```json
{
  "totalPatients": 892,
  "newPatientsThisMonth": 67,
  "patientsByInsurance": [
    { "company": "Unimed", "count": 234 },
    { "company": "Amil", "count": 189 },
    { "company": "Bradesco", "count": 156 }
  ],
  "returningPatients": 456,
  "averageConversationsPerPatient": 2.3
}
```

## ⚙️ Configurações

### GET /api/settings
Obtém as configurações atuais do sistema.

**Response (200):**
```json
{
  "clinic": {
    "name": "Clínica Exemplo",
    "phone": "+5511999999999",
    "email": "contato@clinica.com",
    "address": "Rua Exemplo, 123 - São Paulo, SP"
  },
  "whatsapp": {
    "phoneNumberId": "123456789012345",
    "businessAccountId": "123456789012345",
    "webhookVerifyToken": "webhook-token-seguro"
  },
  "openai": {
    "model": "gpt-3.5-turbo",
    "maxTokens": 500,
    "temperature": 0.7
  },
  "businessHours": {
    "monday": { "open": "08:00", "close": "18:00" },
    "tuesday": { "open": "08:00", "close": "18:00" },
    "wednesday": { "open": "08:00", "close": "18:00" },
    "thursday": { "open": "08:00", "close": "18:00" },
    "friday": { "open": "08:00", "close": "18:00" },
    "saturday": { "open": "08:00", "close": "12:00" },
    "sunday": null
  }
}
```

### PUT /api/settings
Atualiza as configurações do sistema.

**Request:**
```json
{
  "clinic": {
    "name": "Clínica Exemplo Atualizada",
    "phone": "+5511988888888",
    "email": "novo@clinica.com"
  },
  "openai": {
    "model": "gpt-4",
    "maxTokens": 1000,
    "temperature": 0.5
  }
}
```

**Response (200):**
```json
{
  "message": "Configurações atualizadas com sucesso",
  "settings": { ... }
}
```

### POST /api/settings/test-whatsapp
Testa a conexão com WhatsApp Business API.

**Response (200):**
```json
{
  "success": true,
  "message": "Conexão WhatsApp testada com sucesso",
  "accountInfo": {
    "phone_number": "+5511999999999",
    "display_phone_number": "(11) 99999-9999",
    "quality_rating": "GREEN"
  }
}
```

### POST /api/settings/test-openai
Testa a conexão com OpenAI.

**Response (200):**
```json
{
  "success": true,
  "message": "Conexão OpenAI testada com sucesso",
  "modelInfo": {
    "model": "gpt-3.5-turbo",
    "available": true
  }
}
```

## 👥 Usuários

### GET /api/users
Lista todos os usuários (apenas ADMIN).

**Response (200):**
```json
{
  "users": [
    {
      "id": "user_001",
      "name": "Dr. João Silva",
      "email": "joao@clinica.com",
      "role": "ADMIN",
      "isActive": true,
      "lastLoginAt": "2023-11-14T14:30:00Z",
      "createdAt": "2023-11-01T10:00:00Z"
    }
  ]
}
```

### POST /api/users
Cria um novo usuário (apenas ADMIN).

**Request:**
```json
{
  "name": "Dra. Ana Costa",
  "email": "ana@clinica.com",
  "password": "senha123",
  "role": "AGENT"
}
```

### PUT /api/users/:id
Atualiza um usuário.

**Request:**
```json
{
  "name": "Dra. Ana Costa Silva",
  "role": "ADMIN",
  "isActive": true
}
```

## 🔄 Webhooks

### POST /api/webhook/whatsapp
Webhook para receber eventos do WhatsApp Business API.

**Headers:**
```http
X-Hub-Signature-256: sha256=<signature>
```

**Request Body (Exemplos):**

**Nova Mensagem:**
```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "1234567890",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "5511999999999",
              "phone_number_id": "123456789012345"
            },
            "contacts": [
              {
                "profile": {
                  "name": "Maria Santos"
                },
                "wa_id": "5511999999999"
              }
            ],
            "messages": [
              {
                "from": "5511999999999",
                "id": "wamid.1234567890",
                "timestamp": "1699981234",
                "text": {
                  "body": "Olá, gostaria de marcar uma consulta"
                },
                "type": "text"
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
```

**Status da Mensagem:**
```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "1234567890",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "5511999999999",
              "phone_number_id": "123456789012345"
            },
            "statuses": [
              {
                "id": "wamid.1234567890",
                "status": "delivered",
                "timestamp": "1699981234",
                "recipient_id": "5511999999999"
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Webhook processado com sucesso"
}
```

## 🚨 Códigos de Erro

### 400 Bad Request
```json
{
  "error": "Dados inválidos",
  "details": [
    {
      "field": "email",
      "message": "Email inválido"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "error": "Token inválido ou expirado"
}
```

### 403 Forbidden
```json
{
  "error": "Acesso negado. Permissões insuficientes."
}
```

### 404 Not Found
```json
{
  "error": "Recurso não encontrado"
}
```

### 409 Conflict
```json
{
  "error": "Email já cadastrado"
}
```

### 429 Too Many Requests
```json
{
  "error": "Muitas requisições. Tente novamente mais tarde."
}
```

### 500 Internal Server Error
```json
{
  "error": "Erro interno do servidor"
}
```

## 📋 Rate Limiting

A API implementa rate limiting para prevenir abuso:

- **Autenticação**: 5 requisições por minuto
- **Conversas**: 100 requisições por minuto
- **Mensagens**: 50 requisições por minuto
- **Webhooks**: 10 requisições por segundo

Headers de rate limit:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1699981234
```

## 🔍 Debugging

### GET /api/health
Verifica a saúde da aplicação.

**Response (200):**
```json
{
  "status": "healthy",
  "timestamp": "2023-11-14T16:00:00Z",
  "uptime": 3600,
  "database": "connected",
  "redis": "connected",
  "whatsapp": "connected",
  "openai": "connected"
}
```

### GET /api/debug/logs
Obtém logs recentes (apenas ADMIN).

**Query Parameters:**
- `level` (opcional): ERROR, WARN, INFO, DEBUG
- `limit` (opcional): Número de logs (max: 1000)

**Response (200):**
```json
{
  "logs": [
    {
      "timestamp": "2023-11-14T15:59:59Z",
      "level": "INFO",
      "message": "Webhook WhatsApp processado",
      "metadata": {
        "phone": "+5511999999999",
        "messageType": "text"
      }
    }
  ]
}
```