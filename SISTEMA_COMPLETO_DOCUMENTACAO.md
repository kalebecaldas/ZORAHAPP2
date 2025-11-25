# 📚 Documentação Completa do Sistema ZORAHAPP2

## 🎯 Visão Geral

O **ZORAHAPP2** é um sistema completo de automação de atendimento via WhatsApp Business API para clínicas de saúde. Ele combina **Inteligência Artificial (OpenAI GPT-4o)**, **workflows visuais**, **gestão de pacientes**, **agendamentos** e **dashboard em tempo real** para criar uma solução de atendimento automatizado e inteligente.

---

## 🏗️ Arquitetura do Sistema

### Stack Tecnológica

#### Backend
- **Node.js** + **Express.js** - Servidor HTTP REST API
- **TypeScript** - Tipagem estática
- **Prisma ORM** - Acesso ao banco de dados
- **PostgreSQL** - Banco de dados relacional
- **Socket.io** - Comunicação em tempo real (WebSockets)
- **OpenAI API** (GPT-4o) - Inteligência Artificial
- **JWT** - Autenticação e autorização
- **Zod** - Validação de schemas
- **Winston** - Sistema de logs estruturado
- **Helmet** - Segurança HTTP
- **CORS** - Políticas de origem cruzada
- **Rate Limiting** - Proteção contra abuso

#### Frontend
- **React 18** - Framework UI
- **TypeScript** - Tipagem estática
- **Vite** - Build tool e dev server
- **Tailwind CSS** - Estilização utilitária
- **React Router** - Roteamento SPA
- **Zustand** - Gerenciamento de estado global
- **React Flow** (@xyflow/react) - Editor visual de workflows
- **Socket.io Client** - Conexão WebSocket
- **Axios** - Cliente HTTP
- **Recharts** - Gráficos e visualizações
- **Lucide React** - Biblioteca de ícones
- **Sonner** - Notificações toast
- **Date-fns** - Manipulação de datas

---

## 📊 Estrutura do Banco de Dados (Prisma Schema)

### Modelos Principais

#### 1. **User** (Usuários do Sistema)
```typescript
- id: String (cuid)
- email: String (unique)
- name: String
- password: String (bcrypt hashed)
- role: String (default: "ATENDENTE")
- isMasterFrozen: Boolean
- lastLoginAt: DateTime?
- createdAt, updatedAt
```

**Função**: Gerencia agentes, atendentes e administradores do sistema.

#### 2. **Patient** (Pacientes)
```typescript
- id: String (cuid)
- phone: String (unique)
- name: String
- cpf: String? (unique)
- email: String?
- birthDate: DateTime?
- address: String?
- emergencyContact: String?
- insuranceCompany: String?
- insuranceNumber: String?
- preferences: Json?
- createdAt, updatedAt
```

**Função**: Armazena informações completas dos pacientes cadastrados.

#### 3. **Conversation** (Conversas)
```typescript
- id: String (cuid)
- phone: String
- status: String (BOT_QUEUE, HUMAN_QUEUE, EM_ATENDIMENTO, FECHADA)
- assignedToId: String? (FK -> User)
- patientId: String? (FK -> Patient)
- lastMessage: String
- lastTimestamp: DateTime
- workflowId: String?
- currentWorkflowNode: String?
- workflowContext: Json?
- awaitingInput: Boolean
- sessionStartTime: DateTime?
- sessionExpiryTime: DateTime?
- sessionStatus: String
- lastUserActivity: DateTime?
- channel: String (whatsapp, instagram, messenger)
- channelMetadata: Json?
- createdAt, updatedAt
```

**Função**: Gerencia conversas em tempo real, estados de workflow, sessões e múltiplos canais.

#### 4. **Message** (Mensagens)
```typescript
- id: String (cuid)
- conversationId: String (FK -> Conversation)
- phoneNumber: String
- messageText: String
- messageType: String (TEXT, IMAGE, DOCUMENT, AUDIO, VIDEO)
- mediaUrl: String?
- metadata: Json?
- direction: String (RECEIVED, SENT)
- from: String (PATIENT, AGENT, BOT, SYSTEM)
- timestamp: DateTime
- createdAt: DateTime
```

**Função**: Armazena todas as mensagens trocadas nas conversas.

#### 5. **Workflow** (Workflows)
```typescript
- id: String (cuid)
- name: String
- description: String?
- type: String (CONVERSATION)
- config: Json (nodes, edges, connections)
- isActive: Boolean
- createdAt, updatedAt
```

**Função**: Define workflows visuais com nós e conexões para automação.

#### 6. **Appointment** (Agendamentos)
```typescript
- id: String (cuid)
- patientId: String (FK -> Patient)
- patientName: String
- patientPhone: String
- procedure: String
- date: DateTime
- time: String
- notes: String?
- status: String (SCHEDULED, CONFIRMED, CANCELLED, COMPLETED)
- createdAt, updatedAt
```

**Função**: Gerencia agendamentos de procedimentos.

#### 7. **Clinic** (Clínicas)
```typescript
- id: String (cuid)
- code: String (unique)
- name: String
- displayName: String
- address: String
- neighborhood: String
- city: String
- state: String
- zipCode: String
- phone: String
- email: String?
- openingHours: Json
- coordinates: Json?
- specialties: Json
- parkingAvailable: Boolean
- accessibility: Json
- isActive: Boolean
- createdAt, updatedAt
```

**Função**: Informações das unidades/clínicas (multi-clínica).

#### 8. **Procedure** (Procedimentos)
```typescript
- id: String (cuid)
- code: String (unique)
- name: String
- description: String
- importantInfo: String?
- basePrice: Float
- requiresEvaluation: Boolean
- duration: Int
- categories: Json
- createdAt, updatedAt
```

**Função**: Catálogo de procedimentos disponíveis.

#### 9. **InsuranceCompany** (Convênios)
```typescript
- id: String (cuid)
- code: String (unique)
- name: String
- displayName: String
- discount: Boolean
- discountPercentage: Float?
- isParticular: Boolean
- isActive: Boolean
- notes: String?
- createdAt, updatedAt
```

**Função**: Cadastro de convênios e seguros aceitos.

#### 10. **ClinicInsuranceProcedure** (Tabela de Preços)
```typescript
- id: String (cuid)
- clinicId: String (FK -> Clinic)
- insuranceCode: String (FK -> InsuranceCompany)
- procedureCode: String (FK -> Procedure)
- price: Float
- hasPackage: Boolean
- packageInfo: String?
- isActive: Boolean
- createdAt, updatedAt
```

**Função**: Tabela de preços específica por clínica, convênio e procedimento.

#### 11. **Template** (Templates de Mensagem)
```typescript
- id: String (cuid)
- key: String (unique)
- category: String
- title: String
- description: String?
- content: String
- variables: Json
- example: String?
- isActive: Boolean
- createdAt, updatedAt
```

**Função**: Templates reutilizáveis para mensagens padronizadas.

#### 12. **AILearningData** (Aprendizado da IA)
```typescript
- id: String (cuid)
- phone: String
- intent: String?
- sentiment: String?
- style: String?
- context: Json?
- createdAt: DateTime
```

**Função**: Dados coletados para melhorar o aprendizado da IA.

#### 13. **AuditLog** (Logs de Auditoria)
```typescript
- id: String (cuid)
- actorId: String (FK -> User)
- targetUserId: String? (FK -> User)
- action: String
- details: Json?
- createdAt: DateTime
```

**Função**: Rastreamento de ações dos usuários para auditoria.

---

## 🔄 Fluxo de Funcionamento

### 1. **Recepção de Mensagem WhatsApp**

```
WhatsApp Business API → Webhook (/api/webhook/whatsapp)
                     ↓
                processIncomingMessage()
                     ↓
           Busca/Cria Patient no banco
                     ↓
           Busca/Cria Conversation
                     ↓
       Verifica se tem Workflow ativo
                     ↓
         ┌─────────────────────┐
         │  Workflow Engine    │
         │  (WorkflowEngine)   │
         └─────────────────────┘
                     ↓
       ┌─────────────┴─────────────┐
       ↓                           ↓
  Executa Nó                  Processa IA
  (START, MESSAGE,           (AIService ou
   CONDITION, GPT_RESPONSE,   IntelligentBot)
   ACTION, etc.)
       ↓                           ↓
  ┌───────────────────────────────────┐
  │   Envia Resposta via WhatsApp     │
  │   (WhatsAppService)               │
  └───────────────────────────────────┘
```

### 2. **Sistema de Workflows**

O sistema utiliza um **Workflow Engine** que executa workflows visuais definidos através de nós conectados:

#### Tipos de Nós:

1. **START** - Nó inicial do workflow
2. **MESSAGE** - Envia mensagem estática
3. **GPT_RESPONSE** - Resposta gerada por IA (GPT-4o)
4. **CONDITION** - Ramificação condicional
5. **ACTION** - Chamada HTTP para API externa
6. **DATA_COLLECTION** - Coleta dados do paciente
7. **APPOINTMENT_BOOKING** - Fluxo de agendamento
8. **TRANSFER_HUMAN** - Transfere para atendente humano
9. **DELAY** - Aguarda tempo determinado
10. **END** - Finaliza workflow

#### Execução do Workflow:

```typescript
// WorkflowEngine executa nodes sequencialmente
const engine = new WorkflowEngine(nodes, workflowId, phone, message, connections)
engine.setCurrentNodeId(startNodeId)
const result = await engine.executeNextNode()

// O engine mantém contexto entre execuções
context = {
  userData: {}, // Dados coletados do usuário
  currentNodeId: string,
  workflowId: string,
  conversationId: string
}
```

### 3. **Integração com IA**

O sistema possui **dois serviços de IA**:

#### A. **AIService** (`api/services/ai.ts`)
- Usa GPT-4o para gerar respostas
- Classifica intenções (agendamento, preço, informação)
- Analisa sentimento (positivo, negativo, neutro)
- Contexto inclui dados da clínica, paciente e histórico

#### B. **IntelligentBotService** (`api/services/intelligentBot.ts`)
- Versão mais avançada com análise profunda
- Análise de contexto clínico (procedimentos, convênios)
- Sugestões de ações (continuar, transferir, agendar)
- Aprendizado contínuo

**Fluxo de Resposta IA:**

```
Mensagem do Paciente
        ↓
  Build System Prompt
  (inclui: dados clínica, 
   histórico, paciente)
        ↓
  OpenAI GPT-4o API
        ↓
  Parse Response
  (intent, sentiment, response)
        ↓
  Salva em AILearningData
        ↓
  Retorna para Workflow
```

### 4. **Sistema de Filas**

O sistema gerencia conversas em diferentes filas:

- **BOT_QUEUE**: Atendimento automatizado inicial
- **HUMAN_QUEUE**: Aguardando atendente humano
- **EM_ATENDIMENTO**: Em atendimento com humano
- **FECHADA**: Conversa finalizada

**Transições:**
```
BOT_QUEUE → (workflow transfer) → HUMAN_QUEUE
HUMAN_QUEUE → (atendente pega) → EM_ATENDIMENTO
EM_ATENDIMENTO → (finaliza) → FECHADA
```

### 5. **Comunicação em Tempo Real (Socket.io)**

O sistema usa **Socket.io** para atualizações em tempo real:

- **Novas mensagens** aparecem instantaneamente
- **Status de conversas** atualiza sem refresh
- **Notificações** para novos atendimentos
- **Estatísticas** atualizadas ao vivo

**Eventos Socket.io:**
```typescript
// Servidor emite:
- 'message:new' - Nova mensagem
- 'conversation:updated' - Conversa atualizada
- 'conversation:new' - Nova conversa
- 'stats:updated' - Estatísticas atualizadas

// Cliente escuta e atualiza UI
```

---

## 🔌 API Endpoints Principais

### Autenticação
- `POST /api/auth/register` - Registrar usuário
- `POST /api/auth/login` - Login (retorna JWT)
- `GET /api/auth/me` - Usuário atual

### Conversas
- `GET /api/conversations` - Listar conversas (com filtros)
- `GET /api/conversations/:id` - Detalhes da conversa
- `POST /api/conversations/:id/messages` - Enviar mensagem
- `PATCH /api/conversations/:id/status` - Atualizar status
- `GET /api/conversations/:id/messages` - Listar mensagens

### Pacientes
- `GET /api/patients` - Listar pacientes
- `POST /api/patients` - Criar paciente
- `GET /api/patients/:id` - Detalhes do paciente
- `PUT /api/patients/:id` - Atualizar paciente
- `DELETE /api/patients/:id` - Deletar paciente

### Workflows
- `GET /api/workflows` - Listar workflows
- `POST /api/workflows` - Criar workflow
- `GET /api/workflows/:id` - Detalhes do workflow
- `PUT /api/workflows/:id` - Atualizar workflow
- `DELETE /api/workflows/:id` - Deletar workflow
- `POST /api/workflows/:id/test` - Testar workflow

### Clínicas e Procedimentos
- `GET /api/clinic` - Informações da clínica
- `GET /api/coverage` - Cobertura de convênios/procedimentos
- `POST /api/appointments` - Criar agendamento

### Webhook
- `GET /api/webhook/whatsapp` - Verificação (Meta)
- `POST /api/webhook/whatsapp` - Receber mensagens

### Estatísticas
- `GET /api/stats/dashboard` - Estatísticas do dashboard
- `GET /api/stats/conversations` - Estatísticas de conversas
- `GET /api/stats/agents` - Performance de agentes

### Configurações
- `GET /api/settings` - Configurações do sistema
- `PUT /api/settings` - Atualizar configurações
- `POST /api/settings/test-whatsapp` - Testar WhatsApp
- `POST /api/settings/test-openai` - Testar OpenAI

---

## 🎨 Interface do Usuário (Frontend)

### Páginas Principais

1. **Login** (`/login`)
   - Autenticação JWT
   - Redireciona para dashboard

2. **Dashboard** (`/dashboard`)
   - Visão geral em tempo real
   - Estatísticas de conversas
   - Gráficos de desempenho
   - Conversas recentes

3. **Conversas** (`/conversations`)
   - Lista de conversas ativas
   - Visualizador de conversa
   - Chat em tempo real
   - Transferência entre filas

4. **Pacientes** (`/patients`)
   - Lista de pacientes
   - Busca e filtros
   - Detalhes do paciente
   - Histórico de conversas

5. **Workflows** (`/workflows`)
   - Lista de workflows
   - Criar/editar/deletar
   - Ativar/desativar

6. **Editor de Workflow** (`/workflows/editor/:id`)
   - Editor visual com React Flow
   - Drag & drop de nós
   - Configuração de conexões
   - Teste de workflow

7. **Estatísticas** (`/stats`)
   - Gráficos detalhados
   - Métricas de performance
   - Relatórios

8. **Configurações** (`/settings`)
   - Configurar WhatsApp
   - Configurar OpenAI
   - Dados da clínica
   - Horários de funcionamento

9. **Usuários** (`/users`)
   - Gerenciar usuários (ADMIN)
   - Criar/editar/deletar
   - Permissões

10. **Teste de Chat** (`/test`)
    - Simular conversas
    - Testar workflows
    - Debug de mensagens

### Componentes Principais

- **WorkflowEditorBeta** - Editor visual de workflows
- **CustomNode** - Componentes de nós personalizados
- **ConversationViewer** - Visualizador de conversa
- **MessageList** - Lista de mensagens
- **ConversationQueueManager** - Gerenciador de filas
- **Sidebar** - Navegação lateral

---

## 🤖 Sistema de Workflows - Detalhamento

### Estrutura de um Workflow

```json
{
  "id": "workflow_123",
  "name": "Atendimento Inicial",
  "type": "CONVERSATION",
  "isActive": true,
  "config": {
    "nodes": [
      {
        "id": "start_1",
        "type": "START",
        "position": { "x": 100, "y": 100 },
        "data": {}
      },
      {
        "id": "gpt_1",
        "type": "GPT_RESPONSE",
        "position": { "x": 300, "y": 100 },
        "data": {
          "systemPrompt": "Você é um assistente...",
          "ports": {
            "outputs": ["1", "2", "3", "4", "5"]
          }
        }
      },
      {
        "id": "message_1",
        "type": "MESSAGE",
        "position": { "x": 500, "y": 100 },
        "data": {
          "message": "Olá! Como posso ajudar?"
        }
      }
    ],
    "edges": [
      {
        "id": "e1",
        "source": "start_1",
        "target": "gpt_1",
        "data": {}
      },
      {
        "id": "e2",
        "source": "gpt_1",
        "target": "message_1",
        "data": {
          "port": "1",
          "condition": "intent === 'saudacao'"
        }
      }
    ],
    "connections": [
      {
        "sourceId": "gpt_1",
        "targetId": "message_1",
        "port": "1",
        "condition": "intent === 'saudacao'"
      }
    ]
  }
}
```

### Execução de Workflow

1. **Recebe mensagem** → Identifica workflow ativo
2. **Carrega contexto** → Busca `workflowContext` da conversa
3. **Identifica nó atual** → `currentWorkflowNode` ou START
4. **Executa nó** → Chama método específico do tipo
5. **Processa resultado** → Determina próximo nó
6. **Atualiza contexto** → Salva estado em `workflowContext`
7. **Envia resposta** → Via WhatsApp Service
8. **Aguarda próxima mensagem** → Se `awaitingInput = true`

### Nós Especiais

#### GPT_RESPONSE Node
- Analisa mensagem do usuário
- Gera resposta com IA
- Classifica intenção
- Roteia para portas diferentes baseado na intenção:
  - Porta 1: Saudação/informações
  - Porta 2: Convênios
  - Porta 3: Localização
  - Porta 4: Procedimentos
  - Porta 5: Agendamento

#### CONDITION Node
- Avalia condições booleanas
- Roteia baseado em resultado
- Usa contexto (`userData`)

#### ACTION Node
- Faz requisição HTTP
- Pode chamar APIs externas
- Usado para integrações

---

## 📱 Integração WhatsApp Business API

### Configuração

```env
META_ACCESS_TOKEN=seu_token_aqui
META_PHONE_NUMBER_ID=seu_phone_id
META_WEBHOOK_VERIFY_TOKEN=token_verificacao
```

### Fluxo de Mensagens

1. **Webhook recebe mensagem** (`POST /api/webhook/whatsapp`)
2. **Valida assinatura** (se configurado)
3. **Extrai dados** (phone, text, messageId, type)
4. **Baixa mídia** (se for imagem/áudio/documento)
5. **Processa mensagem** → `processIncomingMessage()`
6. **Envia resposta** → Via `WhatsAppService.sendTextMessage()`

### Tipos de Mensagens Suportadas

- **TEXT** - Mensagens de texto
- **IMAGE** - Imagens (PNG, JPG)
- **AUDIO** - Áudios (OGG, M4A)
- **DOCUMENT** - Documentos (PDF, DOCX)
- **VIDEO** - Vídeos (MP4)

### WhatsAppService

```typescript
class WhatsAppService {
  sendTextMessage(phone: string, text: string)
  sendMediaMessage(phone: string, mediaUrl: string, type: string)
  getMediaUrl(mediaId: string)
  downloadMedia(mediaUrl: string)
  markAsRead(messageId: string)
}
```

---

## 🧠 Sistema de IA - Detalhamento

### System Prompt (Contexto)

O sistema constrói um prompt detalhado para a IA:

```
Você é um assistente virtual de uma clínica de saúde...

[Informações do Paciente]
- Nome, telefone, convênio

[Informações da Clínica]
- Nome, endereço, telefone
- Horários de funcionamento
- Procedimentos disponíveis e preços
- Convênios aceitos

[Histórico]
- Últimas mensagens da conversa

[Regras]
- Sempre verificar convênio antes de preços
- Alguns procedimentos requerem avaliação
- Oferecer agendamento após esclarecimentos
- Transferir para humano se necessário
```

### Classificação de Intenções

O sistema classifica intenções automaticamente:
- `agendamento` - Marcar consulta/procedimento
- `preco` - Informações sobre valores
- `informacao` - Dúvidas gerais
- `cancelamento` - Cancelar agendamento
- `reagendamento` - Remarcar
- `reclamacao` - Feedback negativo
- `saudacao` - Cumprimentos

### Análise de Sentimento

- `positive` - Positivo/satisfeito
- `negative` - Negativo/insatisfeito
- `neutral` - Neutro

---

## 🔐 Segurança

### Autenticação JWT

- Token gerado no login
- Incluído em header: `Authorization: Bearer <token>`
- Expiração configurável
- Refresh token (opcional)

### Middleware de Autenticação

```typescript
authMiddleware(req, res, next) {
  // Verifica token JWT
  // Extrai usuário
  // Adiciona req.user
}
```

### Rate Limiting

- API: 60 req/min
- Webhook: 10 req/min
- Auth: 5 req/min

### Validação

- **Zod schemas** para validação de dados
- Sanitização de inputs
- Validação de tipos TypeScript

---

## 📊 Sistema de Logs

### Winston Logger

- **application.log** - Logs gerais
- **error.log** - Apenas erros
- **audit.log** - Ações de usuários

### Níveis de Log

- `error` - Erros críticos
- `warn` - Avisos
- `info` - Informações gerais
- `debug` - Debug detalhado

---

## 🚀 Deploy e Configuração

### Variáveis de Ambiente

```env
# Banco de Dados
DATABASE_URL=postgresql://user:pass@host:5432/db

# JWT
JWT_SECRET=sua_chave_secreta_super_segura

# OpenAI
OPENAI_API_KEY=sk-...

# WhatsApp
META_ACCESS_TOKEN=...
META_PHONE_NUMBER_ID=...
META_WEBHOOK_VERIFY_TOKEN=...

# Servidor
PORT=3001
NODE_ENV=production
```

### Scripts Disponíveis

```bash
npm run dev          # Desenvolvimento (client + server)
npm run client:dev   # Apenas frontend
npm run server:dev   # Apenas backend
npm run build        # Build produção
npm start            # Produção
npm test             # Testes
```

---

## 📈 Métricas e Monitoramento

### Dashboard em Tempo Real

- Total de conversas
- Conversas ativas
- Conversas pendentes
- Taxa de resolução
- Tempo médio de resposta
- Top intenções

### Estatísticas por Agente

- Total de atendimentos
- Taxa de resolução
- Tempo médio de resposta
- Avaliação média

---

## 🔄 Fluxos Especiais

### 1. Fluxo de Agendamento

```
Paciente solicita agendamento
        ↓
Workflow coleta: nome, telefone, convênio
        ↓
Mostra procedimentos disponíveis
        ↓
Paciente escolhe procedimento
        ↓
Mostra datas/horários disponíveis
        ↓
Paciente escolhe data/hora
        ↓
Confirma agendamento
        ↓
Cria Appointment no banco
        ↓
Envia confirmação via WhatsApp
```

### 2. Fluxo de Informação de Preços

```
Paciente pergunta preço
        ↓
Workflow identifica intenção (preço)
        ↓
Verifica convênio do paciente
        ↓
Busca preço na tabela (ClinicInsuranceProcedure)
        ↓
Informa preço específico ou particular
        ↓
Oferece agendamento
```

### 3. Fluxo de Transferência para Humano

```
Paciente solicita atendente
   OU
IA identifica necessidade (baixa confiança)
   OU
Workflow define TRANSFER_HUMAN
        ↓
Atualiza status: HUMAN_QUEUE
        ↓
Notifica atendentes via Socket.io
        ↓
Atendente pega conversa
        ↓
Status: EM_ATENDIMENTO
        ↓
Atendente responde manualmente
```

---

## 🎯 Casos de Uso Principais

1. **Atendimento Automatizado Inicial**
   - Bot recebe mensagem
   - Identifica intenção
   - Responde automaticamente
   - Coleta informações básicas

2. **Agendamento Inteligente**
   - Coleta dados do paciente
   - Mostra disponibilidade
   - Confirma agendamento
   - Envia lembretes

3. **Informações sobre Procedimentos**
   - Explica procedimentos
   - Informa preços por convênio
   - Mostra localizações
   - Oferece agendamento

4. **Transferência Inteligente**
   - Identifica quando transferir
   - Mantém contexto
   - Notifica atendentes
   - Preserva histórico

5. **Multi-Clínica**
   - Suporta múltiplas unidades
   - Procedimentos por unidade
   - Convênios por unidade
   - Preços diferenciados

---

## 🔧 Configurações Avançadas

### Dados da Clínica (`src/infor_clinic.txt`)

Arquivo que contém informações completas da clínica:
- Procedimentos disponíveis
- Preços (particular e convênios)
- Localizações
- Horários de funcionamento
- Convênios aceitos

Este arquivo é usado para construir o contexto da IA.

### Workflows Base

O sistema vem com workflows pré-configurados:
- `workflow_base_completo.json`
- `workflow_completo_definitivo.json`
- `workflow_dinamico_completo.json`

Estes workflows podem ser importados e customizados.

---

## 📝 Observações Importantes

1. **Estado Persistente**: Workflows mantêm estado entre mensagens através do campo `workflowContext` na tabela `Conversation`.

2. **Múltiplos Workflows**: Uma conversa pode ter apenas um workflow ativo por vez, mas pode ser trocado.

3. **Timeout de Sessão**: Conversas têm tempo de expiração configurável para sessões.

4. **Mídia**: Imagens, áudios e documentos são baixados e salvos localmente antes de processar.

5. **Fallback**: Se a IA falhar ou não tiver confiança, o sistema transfere automaticamente para humano.

6. **Multi-tenant**: O sistema suporta múltiplas clínicas através do modelo `Clinic`.

---

## 🎓 Conclusão

O **ZORAHAPP2** é um sistema completo e robusto que combina:
- ✅ Automação inteligente via workflows visuais
- ✅ Inteligência Artificial (GPT-4o) para respostas contextuais
- ✅ Gestão completa de pacientes e agendamentos
- ✅ Integração nativa com WhatsApp Business API
- ✅ Dashboard em tempo real
- ✅ Multi-clínica e multi-convênio
- ✅ Interface moderna e intuitiva

O sistema está pronto para produção e pode ser escalado conforme necessário.



