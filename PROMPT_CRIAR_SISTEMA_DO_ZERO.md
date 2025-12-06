# 🚀 Prompt para Criar Sistema ZORAHAPP2 do Zero

## 📋 Instruções Completas

Crie um sistema completo de automação de atendimento via WhatsApp Business API para clínicas de saúde, seguindo exatamente a especificação abaixo.

---

## 🎯 Visão Geral do Sistema

O sistema deve ser uma plataforma web full-stack que automatiza atendimentos de clínica via WhatsApp usando Inteligência Artificial (OpenAI GPT-4o) e workflows visuais. O sistema deve permitir:

1. **Receber mensagens do WhatsApp** via webhook da Meta
2. **Processar mensagens automaticamente** usando workflows visuais e IA
3. **Gerenciar pacientes, conversas e agendamentos**
4. **Dashboard em tempo real** para atendentes humanos
5. **Editor visual de workflows** para automação
6. **Multi-clínica e multi-convênio** com tabelas de preços específicas

---

## 🏗️ Arquitetura Técnica

### Stack Backend
- **Node.js 18+** com **Express.js**
- **TypeScript** (tipagem estrita)
- **Prisma ORM** + **PostgreSQL**
- **Socket.io** para tempo real
- **OpenAI API** (GPT-4o) para IA
- **JWT** para autenticação
- **Zod** para validação
- **Winston** para logs
- **Helmet** + **CORS** para segurança

### Stack Frontend
- **React 18** + **TypeScript**
- **Vite** como build tool
- **Tailwind CSS** para estilização
- **React Router** para roteamento
- **Zustand** para estado global
- **React Flow** (@xyflow/react) para editor de workflows
- **Socket.io Client** para WebSocket
- **Axios** para requisições HTTP
- **Recharts** para gráficos

---

## 📊 Modelo de Dados (Prisma Schema)

Crie o seguinte schema Prisma com todos os modelos e relacionamentos:

```prisma
// User: Usuários do sistema (agentes, admin)
model User {
  id        String    @id @default(cuid())
  email     String    @unique
  name      String
  password  String
  role      String    @default("ATENDENTE")
  isMasterFrozen Boolean @default(false)
  lastLoginAt DateTime?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  
  conversations Conversation[]
  auditLogs    AuditLog[]
}

// Patient: Pacientes da clínica
model Patient {
  id               String    @id @default(cuid())
  phone            String    @unique
  name             String
  cpf              String?   @unique
  email            String?
  birthDate        DateTime?
  address          String?
  emergencyContact String?
  insuranceCompany String?
  insuranceNumber  String?
  preferences      Json?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  
  conversations Conversation[]
  appointments  Appointment[]
  interactions  PatientInteraction[]
}

// Conversation: Conversas WhatsApp
model Conversation {
  id             String    @id @default(cuid())
  phone          String
  status         String    @default("BOT_QUEUE")
  assignedToId   String?
  patientId      String?
  lastMessage    String
  lastTimestamp  DateTime  @default(now())
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  workflowId     String?
  currentWorkflowNode String?
  workflowContext Json?
  awaitingInput  Boolean   @default(false)
  sessionStartTime  DateTime? 
  sessionExpiryTime DateTime?
  sessionStatus     String    @default("active")
  lastUserActivity  DateTime?
  channel           String    @default("whatsapp")
  channelMetadata   Json?
  
  assignedTo User?    @relation(fields: [assignedToId], references: [id])
  patient    Patient? @relation(fields: [patientId], references: [id])
  messages   Message[]
}

// Message: Mensagens individuais
model Message {
  id             String    @id @default(cuid())
  conversationId String
  phoneNumber    String
  messageText    String
  messageType    String    @default("TEXT")
  mediaUrl       String?
  metadata       Json?
  direction      String
  from           String
  timestamp      DateTime  @default(now())
  createdAt      DateTime  @default(now())
  
  conversation Conversation @relation(fields: [conversationId], references: [id])
}

// Workflow: Workflows visuais
model Workflow {
  id          String   @id @default(cuid())
  name        String
  description String?
  type        String   @default("CONVERSATION")
  config      Json
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

// Appointment: Agendamentos
model Appointment {
  id             String    @id @default(cuid())
  patientId      String
  patientName    String
  patientPhone   String
  procedure      String
  date           DateTime
  time           String
  notes          String?
  status         String    @default("SCHEDULED")
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  
  patient Patient @relation(fields: [patientId], references: [id])
}

// Clinic: Unidades/Clínicas
model Clinic {
  id        String   @id @default(cuid())
  code      String   @unique
  name      String
  displayName String
  address   String
  neighborhood String
  city      String
  state     String
  zipCode   String
  phone     String
  email     String?
  openingHours Json
  coordinates Json?
  specialties Json
  parkingAvailable Boolean @default(false)
  accessibility Json
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  clinicInsurances  ClinicInsurance[]
  clinicProcedures  ClinicInsuranceProcedure[]
}

// Procedure: Procedimentos
model Procedure {
  id          String   @id @default(cuid())
  code        String   @unique
  name        String
  description String
  importantInfo String?
  basePrice   Float
  requiresEvaluation Boolean @default(false)
  duration    Int
  categories  Json
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  clinicProcedures ClinicInsuranceProcedure[]
}

// InsuranceCompany: Convênios
model InsuranceCompany {
  id        String   @id @default(cuid())
  code      String   @unique
  name      String
  displayName String
  discount  Boolean  @default(false)
  discountPercentage Float? @default(0)
  isParticular Boolean @default(false)
  isActive  Boolean  @default(true)
  notes     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  clinicInsurances ClinicInsurance[]
  clinicProcedures ClinicInsuranceProcedure[]
}

// ClinicInsurance: Relação Clínica-Convênio
model ClinicInsurance {
  id            String   @id @default(cuid())
  clinicId      String
  insuranceCode String
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  clinic    Clinic           @relation(fields: [clinicId], references: [id])
  insurance InsuranceCompany @relation(fields: [insuranceCode], references: [code])

  @@unique([clinicId, insuranceCode])
}

// ClinicInsuranceProcedure: Tabela de Preços
model ClinicInsuranceProcedure {
  id            String   @id @default(cuid())
  clinicId      String
  insuranceCode String
  procedureCode String
  price         Float
  hasPackage    Boolean  @default(false)
  packageInfo   String?
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  clinic    Clinic           @relation(fields: [clinicId], references: [id])
  insurance InsuranceCompany @relation(fields: [insuranceCode], references: [code])
  procedure Procedure        @relation(fields: [procedureCode], references: [code])

  @@unique([clinicId, insuranceCode, procedureCode])
}

// Template: Templates de mensagem
model Template {
  id          String   @id @default(cuid())
  key         String   @unique
  category    String
  title       String
  description String?
  content     String
  variables   Json
  example     String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

// AILearningData: Dados para aprendizado da IA
model AILearningData {
  id        String   @id @default(cuid())
  phone     String
  intent    String?
  sentiment String?
  style     String?
  context   Json?
  createdAt DateTime @default(now())
}

// AuditLog: Logs de auditoria
model AuditLog {
  id          String   @id @default(cuid())
  actorId     String
  targetUserId String?
  action      String
  details     Json?
  createdAt   DateTime @default(now())

  actor User @relation(fields: [actorId], references: [id])
}

// PatientInteraction: Interações do paciente
model PatientInteraction {
  id          String   @id @default(cuid())
  patientId   String
  type        String
  description String?
  data        Json?
  createdAt   DateTime @default(now())

  patient Patient @relation(fields: [patientId], references: [id])
}
```

---

## 🔌 API Endpoints Essenciais

### Autenticação
- `POST /api/auth/register` - Registrar usuário
- `POST /api/auth/login` - Login (retorna JWT)
- Middleware `authMiddleware` para proteger rotas

### Webhook WhatsApp
- `GET /api/webhook/whatsapp` - Verificação Meta (hub.mode, hub.verify_token)
- `POST /api/webhook/whatsapp` - Receber mensagens
- Processar: TEXT, IMAGE, AUDIO, DOCUMENT, VIDEO
- Baixar mídia e salvar localmente

### Conversas
- `GET /api/conversations` - Listar (com filtros: status, patientId, agentId)
- `GET /api/conversations/:id` - Detalhes + mensagens
- `POST /api/conversations/:id/messages` - Enviar mensagem
- `PATCH /api/conversations/:id/status` - Atualizar status
- Função `processIncomingMessage()` para processar mensagens recebidas

### Pacientes
- `GET /api/patients` - Listar (busca por nome/telefone/email)
- `POST /api/patients` - Criar
- `GET /api/patients/:id` - Detalhes + histórico
- `PUT /api/patients/:id` - Atualizar
- `DELETE /api/patients/:id` - Deletar

### Workflows
- `GET /api/workflows` - Listar
- `POST /api/workflows` - Criar
- `GET /api/workflows/:id` - Detalhes
- `PUT /api/workflows/:id` - Atualizar
- `DELETE /api/workflows/:id` - Deletar
- `POST /api/workflows/:id/test` - Simular execução

### Clínicas e Cobertura
- `GET /api/clinic` - Informações da clínica
- `GET /api/coverage` - Cobertura convênios/procedimentos por clínica

### Estatísticas
- `GET /api/stats/dashboard` - Estatísticas gerais
- `GET /api/stats/conversations` - Estatísticas de conversas
- `GET /api/stats/agents` - Performance de agentes

### Configurações
- `GET /api/settings` - Obter configurações
- `PUT /api/settings` - Atualizar configurações
- `POST /api/settings/test-whatsapp` - Testar conexão WhatsApp
- `POST /api/settings/test-openai` - Testar conexão OpenAI

---

## 🤖 Serviços Essenciais

### 1. WhatsAppService (`api/services/whatsapp.ts`)

```typescript
class WhatsAppService {
  constructor(accessToken: string, phoneNumberId: string)
  
  async sendTextMessage(phone: string, text: string): Promise<void>
  async sendMediaMessage(phone: string, mediaUrl: string, type: string): Promise<void>
  async getMediaUrl(mediaId: string): Promise<string>
  async downloadMedia(mediaUrl: string): Promise<Buffer>
  async markAsRead(messageId: string): Promise<void>
}
```

**Endpoint Meta**: `https://graph.facebook.com/v18.0/{phoneNumberId}/messages`

### 2. AIService (`api/services/ai.ts`)

```typescript
class AIService {
  constructor(apiKey: string, model = 'gpt-4o', timeout = 20000)
  
  async generateResponse(message: string, context: AIContext): Promise<AIResponse>
  async classifyIntent(message: string): Promise<string>
  async analyzeSentiment(message: string): Promise<'positive' | 'negative' | 'neutral'>
  
  private buildSystemPrompt(context: AIContext): string
  private parseAIResponse(response: string): Partial<AIResponse>
}
```

**Contexto AIContext deve incluir**:
- Dados do paciente (nome, telefone, convênio)
- Histórico de mensagens (últimas 10)
- Dados da clínica (nome, endereço, telefone, procedimentos, preços, horários)

**System Prompt deve incluir**:
- Papel do assistente (assistente virtual de clínica)
- Informações do paciente
- Informações da clínica (procedimentos, preços, convênios, horários)
- Regras de negócio (verificar convênio antes de preço, etc.)
- Histórico da conversa

### 3. WorkflowEngine (`src/services/workflowEngine.ts`)

```typescript
class WorkflowEngine {
  constructor(nodes: WorkflowNode[], workflowId: string, phone: string, message: string, connections: Connection[])
  
  async executeNextNode(): Promise<NodeExecutionResult>
  setCurrentNodeId(nodeId: string): void
  setUserResponse(response: string): void
  getContext(): WorkflowExecutionContext
}
```

**Tipos de Nós Suportados**:
- `START` - Nó inicial
- `MESSAGE` - Mensagem estática
- `GPT_RESPONSE` - Resposta gerada por IA
- `CONDITION` - Ramificação condicional
- `ACTION` - Chamada HTTP externa
- `DATA_COLLECTION` - Coleta de dados
- `APPOINTMENT_BOOKING` - Agendamento
- `TRANSFER_HUMAN` - Transferir para humano
- `DELAY` - Aguardar tempo
- `END` - Finalizar

**Estrutura de Execução**:
- Mantém contexto (`workflowContext`) entre execuções
- Salva `currentWorkflowNode` na conversa
- Permite `awaitingInput` para aguardar resposta do usuário
- Suporta portas múltiplas (ex: GPT_RESPONSE com portas 1-5 para diferentes intenções)

---

## 🎨 Interface do Usuário (Frontend)

### Páginas Obrigatórias

1. **Login** (`/login`)
   - Formulário email/senha
   - Autenticação JWT
   - Redireciona para `/dashboard`

2. **Dashboard** (`/dashboard`)
   - Cards com estatísticas (total conversas, ativas, pendentes)
   - Gráficos (Recharts)
   - Lista de conversas recentes
   - Atualização em tempo real (Socket.io)

3. **Conversas** (`/conversations`)
   - Lista de conversas (filtros por status)
   - Visualizador de conversa individual
   - Envio de mensagens em tempo real
   - Indicadores de status (BOT_QUEUE, HUMAN_QUEUE, EM_ATENDIMENTO, FECHADA)

4. **Pacientes** (`/patients`)
   - Tabela de pacientes (busca e filtros)
   - Modal de detalhes do paciente
   - Histórico de conversas do paciente
   - Formulário criar/editar

5. **Workflows** (`/workflows`)
   - Lista de workflows
   - Botões criar/editar/deletar/ativar/desativar
   - Link para editor: `/workflows/editor/:id`

6. **Editor de Workflow** (`/workflows/editor/:id`)
   - **React Flow** para canvas visual
   - **Sidebar** com tipos de nós para arrastar
   - **Painel de propriedades** para configurar nó selecionado
   - **Conexões** entre nós (drag de handles)
   - **Botão salvar** workflow
   - **Botão testar** workflow

7. **Estatísticas** (`/stats`)
   - Gráficos detalhados
   - Métricas por período
   - Performance de agentes

8. **Configurações** (`/settings`)
   - Formulário dados da clínica
   - Configurar WhatsApp (token, phone ID, verify token)
   - Configurar OpenAI (API key)
   - Botões de teste para WhatsApp e OpenAI

9. **Usuários** (`/users`) - Apenas ADMIN
   - Lista de usuários
   - Criar/editar/deletar
   - Definir roles

### Componentes Principais

- **WorkflowEditorBeta** - Editor visual completo com React Flow
- **CustomNode** - Componentes personalizados de nós
- **ConversationViewer** - Visualizador de conversa com mensagens
- **MessageList** - Lista de mensagens (estilo chat)
- **Sidebar** - Navegação lateral fixa
- **ConversationQueueManager** - Gerenciador de filas

### Design System

- **Tailwind CSS** para estilização
- **Lucide React** para ícones
- **Cores principais**: Azul profissional, verde para sucesso, vermelho para erro
- **Layout responsivo** (mobile-first)
- **Dark mode** (opcional)

---

## 🔄 Fluxo Principal de Processamento

### Quando recebe mensagem do WhatsApp:

```typescript
1. Webhook recebe POST /api/webhook/whatsapp
2. Extrai: phone, text, messageId, type, media (se houver)
3. Baixa mídia se necessário (imagem/áudio/documento)
4. Chama processIncomingMessage(phone, text, messageId, type, mediaUrl)
5. processIncomingMessage:
   a. Busca ou cria Patient pelo phone
   b. Busca ou cria Conversation pelo phone
   c. Cria Message no banco (direction: RECEIVED, from: PATIENT)
   d. Verifica se conversation tem workflowId ativo
   e. Se tiver workflow:
      - Carrega Workflow do banco
      - Cria WorkflowEngine com nodes e connections
      - Restaura contexto (workflowContext, currentWorkflowNode)
      - Executa engine.executeNextNode()
      - Engine processa nó atual e determina resposta
      - Envia resposta via WhatsAppService
      - Atualiza conversation (workflowContext, currentWorkflowNode, awaitingInput)
   f. Se não tiver workflow ou workflow não responder:
      - Usa AIService para gerar resposta
      - Envia resposta via WhatsAppService
6. Retorna 200 OK para Meta
```

### Sistema de Filas:

- **BOT_QUEUE**: Conversa em atendimento automatizado
- **HUMAN_QUEUE**: Aguardando atendente humano
- **EM_ATENDIMENTO**: Atendente humano está respondendo
- **FECHADA**: Conversa finalizada

**Transições**:
- Bot → HUMAN_QUEUE: Quando workflow faz TRANSFER_HUMAN ou IA tem baixa confiança
- HUMAN_QUEUE → EM_ATENDIMENTO: Quando atendente pega conversa
- EM_ATENDIMENTO → FECHADA: Quando atendente fecha conversa

---

## 🧠 Sistema de IA - Especificações

### System Prompt Template:

```
Você é um assistente virtual inteligente de uma clínica de saúde especializada em [especialidades].

INFORMAÇÕES DO PACIENTE:
- Nome: {patient.name}
- Telefone: {patient.phone}
- Convênio: {patient.insuranceCompany || "Não informado"}

INFORMAÇÕES DA CLÍNICA:
- Nome: {clinic.name}
- Endereço: {clinic.address}
- Telefone: {clinic.phone}
- Horário: {clinic.openingHours}

PROCEDIMENTOS DISPONÍVEIS:
{procedures list com preços}

CONVÊNIOS ACEITOS:
{insurance companies list}

REGRAS FUNDAMENTAIS:
1. SEMPRE verifique o convênio do paciente antes de informar preços
2. Para alguns procedimentos é OBRIGATÓRIO fazer avaliação primeiro
3. SEMPRE ofereça agendamento após esclarecer dúvidas
4. Se não souber responder, transfira para um atendente humano
5. Para agendamento, peça: nome completo, telefone, convênio e disponibilidade

HISTÓRICO DA CONVERSA:
{últimas 10 mensagens}

Analise o sentimento e intenção do paciente e responda de forma apropriada e empática.
```

### Intenções Reconhecidas:

- `agendamento` - Marcar consulta/procedimento
- `preco` - Informações sobre valores
- `informacao` - Dúvidas gerais
- `cancelamento` - Cancelar agendamento
- `reagendamento` - Remarcar
- `reclamacao` - Feedback negativo
- `saudacao` - Cumprimentos
- `outro` - Outras intenções

---

## 🔐 Segurança

1. **Autenticação JWT**
   - Token no header: `Authorization: Bearer <token>`
   - Expiração: 24h (configurável)
   - Middleware `authMiddleware` em todas as rotas protegidas

2. **Validação**
   - **Zod schemas** para validação de request/response
   - Sanitização de inputs
   - Validação de tipos TypeScript

3. **Rate Limiting**
   - API: 60 requests/minuto
   - Webhook: 10 requests/minuto
   - Auth: 5 requests/minuto

4. **Segurança HTTP**
   - Helmet para headers de segurança
   - CORS configurado para origens permitidas
   - HTTPS em produção

5. **Senhas**
   - Bcrypt para hash (10 rounds)
   - Nunca retornar senha em responses

---

## 📡 Socket.io (Tempo Real)

### Eventos do Servidor:

```typescript
// Nova mensagem recebida
io.emit('message:new', { conversationId, message })

// Conversa atualizada
io.emit('conversation:updated', { conversationId, status, ... })

// Nova conversa criada
io.emit('conversation:new', { conversationId, phone, status })

// Estatísticas atualizadas
io.emit('stats:updated', { stats })
```

### Cliente React deve escutar:

```typescript
socket.on('message:new', (data) => {
  // Atualizar lista de mensagens na UI
})

socket.on('conversation:updated', (data) => {
  // Atualizar status da conversa
})

socket.on('stats:updated', (data) => {
  // Atualizar dashboard
})
```

---

## 📝 Variáveis de Ambiente

Criar arquivo `.env`:

```env
# Banco de Dados
DATABASE_URL=postgresql://user:password@localhost:5432/zorahapp

# JWT
JWT_SECRET=sua_chave_secreta_super_segura_aqui_minimo_32_caracteres

# OpenAI
OPENAI_API_KEY=sk-...

# WhatsApp Business API
META_ACCESS_TOKEN=...
META_PHONE_NUMBER_ID=...
META_WEBHOOK_VERIFY_TOKEN=token_aleatorio_para_verificacao

# Servidor
PORT=3001
NODE_ENV=development

# Frontend
VITE_API_URL=http://localhost:3001
```

---

## 🧪 Funcionalidades de Teste

1. **Página de Teste** (`/test`)
   - Simular mensagens do WhatsApp
   - Testar workflows sem enviar mensagem real
   - Ver logs de execução

2. **Teste de Workflow**
   - Endpoint `POST /api/workflows/:id/test`
   - Simula execução com dados mock
   - Retorna caminho de execução e respostas

3. **Teste de Conexões**
   - `POST /api/settings/test-whatsapp` - Verifica conexão WhatsApp
   - `POST /api/settings/test-openai` - Verifica conexão OpenAI

---

## 📦 Scripts NPM

```json
{
  "scripts": {
    "dev": "concurrently \"npm run client:dev\" \"npm run server:dev\"",
    "client:dev": "vite",
    "server:dev": "nodemon",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "lint": "eslint .",
    "check": "tsc --noEmit",
    "start": "node scripts/start-server.js",
    "start:prod": "npx prisma generate && npx prisma migrate deploy && npx tsx api/server.ts"
  }
}
```

---

## 🗄️ Migrações Prisma

```bash
# Gerar cliente Prisma
npx prisma generate

# Criar migração
npx prisma migrate dev --name init

# Aplicar migrações em produção
npx prisma migrate deploy
```

---

## 🚀 Checklist de Implementação

### Backend
- [ ] Configurar Express + TypeScript
- [ ] Configurar Prisma + PostgreSQL
- [ ] Criar todos os modelos do schema
- [ ] Implementar autenticação JWT
- [ ] Criar middleware de autenticação
- [ ] Implementar WhatsAppService
- [ ] Implementar webhook (GET + POST)
- [ ] Implementar AIService com OpenAI
- [ ] Criar rotas de conversas
- [ ] Criar rotas de pacientes
- [ ] Criar rotas de workflows
- [ ] Implementar processIncomingMessage()
- [ ] Implementar WorkflowEngine
- [ ] Configurar Socket.io
- [ ] Criar rotas de estatísticas
- [ ] Implementar validação com Zod
- [ ] Configurar Winston para logs
- [ ] Adicionar rate limiting
- [ ] Configurar CORS e Helmet

### Frontend
- [ ] Configurar Vite + React + TypeScript
- [ ] Configurar Tailwind CSS
- [ ] Configurar React Router
- [ ] Configurar Zustand para estado
- [ ] Configurar Axios com interceptors
- [ ] Criar página de Login
- [ ] Criar componente Sidebar
- [ ] Criar página Dashboard
- [ ] Criar página Conversas
- [ ] Criar componente ConversationViewer
- [ ] Criar página Pacientes
- [ ] Criar página Workflows
- [ ] Criar editor de workflow com React Flow
- [ ] Criar componente CustomNode
- [ ] Criar página Estatísticas com gráficos
- [ ] Criar página Configurações
- [ ] Criar página Usuários (ADMIN)
- [ ] Configurar Socket.io client
- [ ] Adicionar notificações toast (Sonner)
- [ ] Implementar tema/dark mode (opcional)

### Integrações
- [ ] Testar webhook Meta (GET verification)
- [ ] Testar recebimento de mensagens (POST)
- [ ] Testar envio de mensagens via WhatsAppService
- [ ] Testar OpenAI API (geração de respostas)
- [ ] Testar classificação de intenções
- [ ] Testar análise de sentimento
- [ ] Testar download de mídia do WhatsApp

### Workflows
- [ ] Implementar execução de nó START
- [ ] Implementar execução de nó MESSAGE
- [ ] Implementar execução de nó GPT_RESPONSE
- [ ] Implementar execução de nó CONDITION
- [ ] Implementar execução de nó ACTION
- [ ] Implementar execução de nó DATA_COLLECTION
- [ ] Implementar execução de nó APPOINTMENT_BOOKING
- [ ] Implementar execução de nó TRANSFER_HUMAN
- [ ] Implementar execução de nó DELAY
- [ ] Implementar execução de nó END
- [ ] Testar fluxo completo de workflow
- [ ] Testar persistência de contexto entre mensagens

### Testes
- [ ] Testar autenticação (login/register)
- [ ] Testar CRUD de pacientes
- [ ] Testar CRUD de workflows
- [ ] Testar processamento de mensagens
- [ ] Testar execução de workflows
- [ ] Testar integração com IA
- [ ] Testar integração com WhatsApp

---

## 📚 Documentação Adicional

Após criar o sistema, documentar:

1. **README.md** - Visão geral, instalação, configuração
2. **API_DOCUMENTATION.md** - Documentação completa dos endpoints
3. **WORKFLOW_DOCUMENTATION.md** - Como criar e usar workflows
4. **DEPLOYMENT.md** - Guia de deploy (Railway, Vercel, etc.)

---

## 🎯 Dicas de Implementação

1. **Comece pelo Backend**
   - Configure Prisma primeiro
   - Crie as migrações
   - Implemente autenticação
   - Depois parta para os serviços

2. **Workflow Engine é Complexo**
   - Implemente um nó por vez
   - Teste cada nó isoladamente
   - Depois integre com fluxo completo

3. **Frontend pode ser iterativo**
   - Comece com páginas simples (Login, Dashboard)
   - Editor de workflow pode ser feito por último
   - Use componentes reutilizáveis

4. **Teste cada integração separadamente**
   - WhatsApp: teste webhook primeiro
   - OpenAI: teste geração de resposta isolada
   - Socket.io: teste eventos um por um

5. **Use TypeScript estritamente**
   - Tipos bem definidos evitam bugs
   - Interfaces claras facilitam desenvolvimento

---

## ✅ Critérios de Sucesso

O sistema está completo quando:

1. ✅ Recebe mensagem do WhatsApp via webhook
2. ✅ Processa mensagem automaticamente (workflow ou IA)
3. ✅ Responde via WhatsApp automaticamente
4. ✅ Mantém contexto de conversa entre mensagens
5. ✅ Permite atendentes humanos pegarem conversas
6. ✅ Dashboard atualiza em tempo real
7. ✅ Editor de workflow funcional (criar, editar, salvar)
8. ✅ Workflows executam corretamente
9. ✅ IA gera respostas contextuais adequadas
10. ✅ Sistema multi-clínica e multi-convênio funciona

---

**BOA SORTE! 🚀**

Este sistema é complexo mas extremamente poderoso. Implemente passo a passo, teste cada parte e documente bem. O resultado final será uma plataforma completa de automação de atendimento via WhatsApp para clínicas de saúde.




