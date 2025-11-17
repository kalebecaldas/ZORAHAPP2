# 🤖 Sistema de Clínica com WhatsApp AI

Um sistema completo de gerenciamento de clínica com integração de WhatsApp Business API e Inteligência Artificial para automação de atendimentos e agendamentos.

## 🚀 Funcionalidades

### 💬 WhatsApp Business API
- ✅ Integração completa com Meta WhatsApp Business API
- ✅ Envio e recebimento de mensagens em tempo real
- ✅ Suporte para mensagens de texto, imagens e templates
- ✅ Webhook seguro para recebimento de mensagens
- ✅ Confirmação de entrega e leitura de mensagens

### 🤖 Inteligência Artificial
- ✅ Integração com OpenAI GPT-3.5-turbo
- ✅ Classificação de intenções (agendamento, preços, informações)
- ✅ Análise de sentimento das mensagens
- ✅ Contexto inteligente com histórico do paciente
- ✅ Respostas automáticas personalizadas

### 📋 Sistema de Filas
- ✅ Fila BOT: Atendimento inicial automatizado
- ✅ Fila PRINCIPAL: Humanos disponíveis
- ✅ Em Atendimento: Conversas ativas com humanos
- ✅ Fechadas: Conversas finalizadas
- ✅ Transferência entre filas com contexto

### 👥 Gestão de Pacientes
- ✅ Cadastro completo de pacientes
- ✅ Informações de convênio/seguro
- ✅ Histórico de conversas e atendimentos
- ✅ Anotações e observações
- ✅ Busca e filtros avançados

### 📊 Dashboard e Analytics
- ✅ Dashboard em tempo real com Socket.io
- ✅ Estatísticas de conversas e atendimentos
- ✅ Gráficos de desempenho por agente
- ✅ Métricas de satisfação e resolução
- ✅ Relatórios exportáveis

### 🔧 Workflows Visuais
- ✅ Criador de workflows com interface visual
- ✅ Nós de decisão, mensagens e ações
- ✅ Automação de processos repetitivos
- ✅ Teste e simulação de workflows
- ✅ Ativação/desativação de workflows

### 👨‍💼 Gestão de Usuários
- ✅ Sistema de autenticação JWT
- ✅ Perfis ADMIN e AGENT
- ✅ Controle de acesso por permissões
- ✅ Registro de atividades
- ✅ Performance por usuário

## 🛠️ Tecnologias Utilizadas

### Backend
- **Node.js** + **Express.js** - Servidor web
- **Socket.io** - Comunicação em tempo real
- **Prisma ORM** - Mapeamento objeto-relacional
- **PostgreSQL** - Banco de dados
- **OpenAI API** - Inteligência artificial
- **JWT** - Autenticação
- **Zod** - Validação de dados
- **Helmet** - Segurança
- **CORS** - Cross-origin resource sharing

### Frontend
- **React 18** - Framework UI
- **TypeScript** - Tipagem estática
- **Vite** - Build tool e dev server
- **Tailwind CSS** - Estilização
- **React Router** - Roteamento
- **Zustand** - Gerenciamento de estado
- **Recharts** - Gráficos e visualizações
- **Lucide React** - Ícones
- **Sonner** - Notificações toast

### Testes
- **Vitest** - Framework de testes
- **Supertest** - Testes de API

## 📋 Pré-requisitos

- Node.js 18+ 
- npm ou pnpm
- PostgreSQL (ou SQLite para desenvolvimento)
- Conta WhatsApp Business API
- Chave API OpenAI

## 🔧 Instalação e Configuração

### 1. Clone o repositório
```bash
git clone <url-do-repositorio>
cd sistema-clinica-whatsapp
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Configure as variáveis de ambiente
Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
# Banco de Dados
DATABASE_URL="postgresql://usuario:senha@localhost:5432/clinic_db"

# JWT
JWT_SECRET="sua-chave-secreta-super-segura"

# OpenAI
OPENAI_API_KEY="sk-sua-chave-openai"

# WhatsApp Business API
WHATSAPP_ACCESS_TOKEN="seu-token-whatsapp"
WHATSAPP_PHONE_NUMBER_ID="seu-phone-number-id"
WHATSAPP_WEBHOOK_VERIFY_TOKEN="seu-token-de-verificacao"

# Servidor
PORT=3002
NODE_ENV="development"
```

### 4. Configure o banco de dados
```bash
# Para SQLite (desenvolvimento)
npx prisma migrate dev --name init

# Para PostgreSQL (produção)
npx prisma migrate deploy
```

### 5. Inicie o servidor de desenvolvimento
```bash
# Backend
npm run dev:api

# Frontend (em outro terminal)
npm run dev:web
```

### 6. Acesse o sistema
- Frontend: http://localhost:5173
- Backend API: http://localhost:3002
- Documentação API: http://localhost:3002/api-docs

## 📡 Configuração do WhatsApp Business API

### 1. Crie uma conta no Meta Business
- Acesse https://business.facebook.com/
- Crie um aplicativo do tipo "Business"
- Adicione o produto "WhatsApp"

### 2. Configure o Webhook
- No dashboard do Meta, configure o webhook URL: `https://seu-dominio.com/api/webhook/whatsapp`
- Use o token de verificação definido em `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
- Assine os eventos: `messages`, `message_status`

### 3. Obtenha as credenciais
- **Access Token**: Gerado no dashboard do Meta
- **Phone Number ID**: ID do número de telefone
- **Webhook Verify Token**: Token que você definiu

## 🤖 Configuração da IA

### Prompt do Sistema
O sistema usa um prompt inteligente que inclui:
- Informações da clínica (procedimentos, preços, horários)
- Contexto do paciente (histórico, preferências)
- Diretrizes de atendimento
- Fallback para humanos quando necessário

### Intenções Reconhecidas
- `agendamento` - Marcar consultas
- `precos` - Informações sobre valores
- `informacoes` - Dados gerais da clínica
- `cancelamento` - Cancelar consultas
- `reagendamento` - Alterar horários
- `duvidas` - Perguntas gerais
- `reclamacao` - Reclamações e feedback

## 📊 API Endpoints

### Autenticação
```http
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
```

### Conversas
```http
GET    /api/conversations
POST   /api/conversations
GET    /api/conversations/:id
PATCH  /api/conversations/:id/status
POST   /api/conversations/:id/messages
```

### Pacientes
```http
GET    /api/patients
POST   /api/patients
GET    /api/patients/:id
PUT    /api/patients/:id
DELETE /api/patients/:id
```

### Workflows
```http
GET    /api/workflows
POST   /api/workflows
GET    /api/workflows/:id
PUT    /api/workflows/:id
DELETE /api/workflows/:id
POST   /api/workflows/:id/test
```

### Estatísticas
```http
GET /api/stats/dashboard
GET /api/stats/conversations
GET /api/stats/agents
GET /api/stats/patients
```

### Configurações
```http
GET  /api/settings
PUT  /api/settings
POST /api/settings/test-whatsapp
POST /api/settings/test-openai
```

## 🧪 Testes

Execute os testes automatizados:

```bash
# Todos os testes
npm test

# Testes específicos
npm test -- --grep "Authentication"
npm test -- --grep "AI Service"
npm test -- --grep "WhatsApp Service"
```

## 🚀 Deploy

### Deploy com Vercel
1. Conecte seu repositório ao Vercel
2. Configure as variáveis de ambiente
3. O deploy será automático a cada push

### Deploy Manual
```bash
# Build do frontend
npm run build

# Build do backend
npm run build:api

# Inicie em produção
npm start
```

## 🔒 Segurança

- Autenticação JWT com refresh tokens
- CORS configurado para domínios específicos
- Rate limiting em endpoints críticos
- Validação de dados com Zod
- Sanitização de inputs
- Logs de auditoria
- Criptografia de senhas com bcrypt

## 📈 Performance

- Cache de respostas frequentes
- Paginação em listagens
- Índices otimizados no banco de dados
- Lazy loading de componentes
- Compressão gzip/brotli
- CDN para assets estáticos

## 🎯 Próximas Features

- [ ] Integração com Google Calendar
- [ ] Sistema de notificações por email/SMS
- [ ] Chat em tempo real na web
- [ ] Aplicativo mobile para agentes
- [ ] Integração com sistemas de pagamento
- [ ] Análise preditiva de demanda
- [ ] Chatbot com NLP avançado
- [ ] Multi-idioma (ES, EN)

## 🤝 Contribuindo

1. Fork o projeto
2. Crie sua feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 📞 Suporte

Para suporte e dúvidas:
- Email: suporte@clinica.com
- WhatsApp: (11) 99999-9999
- Documentação: https://docs.clinica.com

---

**Desenvolvido com ❤️ para clínicas modernas**