# 🚀 Guia de Início Rápido - ZORAHAPP2

## 📋 Bem-vindo!

Este guia vai te ajudar a **começar rapidamente** com o ZORAHAPP2, seja você um novo desenvolvedor, um revisor de código, ou alguém planejando implementar melhorias.

**Tempo estimado**: 30 minutos

---

## 🎯 Escolha Seu Caminho

### 👨‍💻 Sou um Novo Desenvolvedor
**Objetivo**: Entender o sistema e começar a desenvolver

**Passo a passo**:
1. ✅ Leia este guia completo (10 min)
2. 📚 Leia [RESUMO_EXECUTIVO_ANALISE.md](./RESUMO_EXECUTIVO_ANALISE.md) (15 min)
3. 🏗️ Leia [ANALISE_ARQUITETURA_ATUAL.md](./ANALISE_ARQUITETURA_ATUAL.md) (30 min)
4. 💻 Configure ambiente local (veja seção abaixo)
5. 🧪 Rode o sistema e teste
6. 📖 Explore a documentação conforme necessário

**Próximo passo**: [Configurar Ambiente Local](#-configurar-ambiente-local)

---

### 🔍 Sou um Revisor/Auditor
**Objetivo**: Entender o sistema e validar qualidade

**Passo a passo**:
1. ✅ Leia [RESUMO_EXECUTIVO_ANALISE.md](./RESUMO_EXECUTIVO_ANALISE.md) (15 min)
2. ✅ Leia [VALIDACAO_DOCUMENTACAO.md](./VALIDACAO_DOCUMENTACAO.md) (20 min)
3. 🏗️ Leia [ANALISE_ARQUITETURA_ATUAL.md](./ANALISE_ARQUITETURA_ATUAL.md) (30 min)
4. 📊 Revise métricas e estatísticas
5. ⚠️ Analise pontos de atenção identificados

**Próximo passo**: [Principais Descobertas](#-principais-descobertas)

---

### 🚀 Vou Implementar Melhorias
**Objetivo**: Executar o roadmap de upgrades

**Passo a passo**:
1. ✅ Leia [RESUMO_EXECUTIVO_ANALISE.md](./RESUMO_EXECUTIVO_ANALISE.md) (15 min)
2. 🗺️ Leia [ROADMAP_UPGRADES.md](./ROADMAP_UPGRADES.md) (45 min)
3. 🎯 Escolha uma fase para começar (recomendado: FASE 1)
4. 📋 Siga os checklists da fase escolhida
5. 🧪 Teste as mudanças
6. ✅ Marque tarefas como concluídas

**Próximo passo**: [Roadmap de Upgrades](#-roadmap-de-upgrades)

---

### 🐛 Preciso Resolver um Problema
**Objetivo**: Encontrar solução para um problema específico

**Passo a passo**:
1. 🔍 Identifique o tipo de problema (Workflow, GPT, Mídia, etc.)
2. 📚 Consulte [INDICE_DOCUMENTACAO.md](./INDICE_DOCUMENTACAO.md)
3. 🐛 Vá para a seção "Troubleshooting e Fixes"
4. 📖 Siga o guia específico do problema
5. 🧪 Teste a solução

**Próximo passo**: [Troubleshooting](#-troubleshooting-rápido)

---

## 💻 Configurar Ambiente Local

### Pré-requisitos
- Node.js 18+ instalado
- PostgreSQL instalado e rodando
- Git instalado

### Passo a Passo

#### 1. Clonar Repositório
```bash
cd ~/Documents/cursor_projects
# (Já está clonado em ZORAHAPP2-1)
```

#### 2. Instalar Dependências
```bash
cd ZORAHAPP2-1
npm install
```

#### 3. Configurar Variáveis de Ambiente
```bash
# Copiar .env.example para .env (se existir)
# Ou criar .env com as variáveis necessárias

# Variáveis essenciais:
DATABASE_URL=postgresql://user:password@localhost:5432/zorahapp2
JWT_SECRET=sua_chave_secreta_super_segura
OPENAI_API_KEY=sk-...
META_ACCESS_TOKEN=...
META_PHONE_NUMBER_ID=...
```

#### 4. Configurar Banco de Dados
```bash
# Criar banco de dados
createdb zorahapp2

# Rodar migrations
npx prisma db push

# (Opcional) Seed de dados
npx prisma db seed
```

#### 5. Iniciar Sistema
```bash
# Mata portas ocupadas e inicia dev
npm run up

# Ou separadamente:
# Terminal 1 - Backend
npm run server:dev

# Terminal 2 - Frontend
npm run client:dev
```

#### 6. Acessar Sistema
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3001
- **API Docs**: http://localhost:3001/api-docs (se Swagger estiver configurado)

#### 7. Login Inicial
```
Email: admin@zorahapp.com
Senha: (verificar no banco ou criar usuário)
```

---

## 📊 Principais Descobertas

### ✅ Pontos Fortes
1. **Arquitetura Sólida** - MVC + Microserviços internos bem estruturados
2. **Código Organizado** - TypeScript, Prisma, separação clara de responsabilidades
3. **Funcionalidades Completas** - Workflows, IA, multi-canal, multi-clínica
4. **Segurança Implementada** - JWT, bcrypt, Helmet, CORS, Rate Limiting
5. **Real-time** - Socket.io para atualizações instantâneas

### ⚠️ Pontos de Atenção
1. **WorkflowEngine Duplicado** 🔴 CRÍTICO
   - Duas implementações: legado (125KB) + modular
   - **Ação**: Consolidar para versão modular

2. **Serviços Não Documentados** 🟡 IMPORTANTE
   - 5 serviços importantes sem documentação
   - **Ação**: Documentar cada serviço

3. **Páginas Duplicadas** 🟡 IMPORTANTE
   - Conversations.tsx vs ConversationsNew.tsx
   - **Ação**: Remover versões antigas

4. **Falta de Testes** 🟡 IMPORTANTE
   - Cobertura baixa
   - **Ação**: Aumentar para 70%+

### 📈 Métricas do Projeto
- **Arquivos**: 190+
- **Linhas de Código**: ~35.000
- **Tamanho**: ~2MB
- **Dependências**: 66 (36 prod + 30 dev)
- **Documentação**: 60+ arquivos .md

---

## 🗺️ Roadmap de Upgrades

### Visão Geral das Fases

#### 🔴 FASE 1: Consolidação (1 semana)
**Objetivo**: Eliminar duplicações
- Consolidar WorkflowEngine
- Limpar páginas duplicadas
- Consolidar serviços de IA
- Esclarecer uso de infor_clinic.txt

**Estimativa**: 10-14 horas

#### 🟡 FASE 2: Documentação (1 semana)
**Objetivo**: Documentar tudo
- Documentar serviços faltantes
- Documentar tipos de nós adicionais
- Criar documentação de API (Swagger)

**Estimativa**: 11-16 horas

#### 🟡 FASE 3: Performance (1 semana)
**Objetivo**: Otimizar sistema
- Implementar cache
- Otimizar queries Prisma
- Lazy loading no frontend
- Otimizar renderização de mensagens

**Estimativa**: 13-18 horas

#### 🟢 FASE 4: Testes (2 semanas)
**Objetivo**: Aumentar confiabilidade
- Testes unitários (70% cobertura)
- Testes de integração
- Testes E2E

**Estimativa**: 36-48 horas

#### 🟢 FASE 5: UX (1 semana)
**Objetivo**: Melhorar experiência
- Loading states
- Error boundaries
- Feedback visual
- Modo offline

**Estimativa**: 17-23 horas

#### 🟢 FASE 6: IA (2 semanas)
**Objetivo**: Evoluir inteligência
- Memória de longo prazo
- Fine-tuning do modelo
- Análise de sentimento em tempo real
- Sugestões inteligentes

**Estimativa**: 40-50 horas

**Total**: 8 semanas (2 meses)

**Detalhes completos**: [ROADMAP_UPGRADES.md](./ROADMAP_UPGRADES.md)

---

## 🐛 Troubleshooting Rápido

### Problema: Sistema não inicia
**Possíveis causas**:
- Portas ocupadas (3001, 5173)
- Banco de dados não conectado
- Variáveis de ambiente faltando

**Solução**:
```bash
# 1. Matar portas ocupadas
npm run kill-ports

# 2. Verificar banco de dados
psql -U postgres -c "SELECT 1"

# 3. Verificar .env
cat .env | grep DATABASE_URL
```

---

### Problema: Workflow não executa
**Possíveis causas**:
- Workflow não está ativo
- Nós mal configurados
- Conexões faltando

**Solução**:
1. Verificar se workflow está ativo no banco
2. Verificar logs do servidor
3. Consultar [WORKFLOW_FIX.md](./WORKFLOW_FIX.md)

---

### Problema: GPT não responde
**Possíveis causas**:
- OPENAI_API_KEY inválida
- Timeout
- Modelo incorreto

**Solução**:
1. Verificar OPENAI_API_KEY no .env
2. Testar com script: `npm run test:gpt-models`
3. Consultar [CONFIGURACAO_MODELOS_GPT.md](./CONFIGURACAO_MODELOS_GPT.md)

---

### Problema: Mídia não carrega
**Possíveis causas**:
- META_ACCESS_TOKEN expirado
- URL de mídia inválida
- Permissões de arquivo

**Solução**:
1. Verificar token do WhatsApp
2. Verificar logs de download
3. Consultar [DEBUG_MEDIA.md](./DEBUG_MEDIA.md)

---

## 📚 Documentos Essenciais

### Para Começar
1. ⭐ [RESUMO_EXECUTIVO_ANALISE.md](./RESUMO_EXECUTIVO_ANALISE.md) - **LEIA PRIMEIRO**
2. 📚 [INDICE_DOCUMENTACAO.md](./INDICE_DOCUMENTACAO.md) - Índice completo
3. 📖 [README.md](./README.md) - Documentação original

### Para Entender
4. 🏗️ [ANALISE_ARQUITETURA_ATUAL.md](./ANALISE_ARQUITETURA_ATUAL.md) - Arquitetura
5. ✅ [VALIDACAO_DOCUMENTACAO.md](./VALIDACAO_DOCUMENTACAO.md) - Validação

### Para Implementar
6. 🗺️ [ROADMAP_UPGRADES.md](./ROADMAP_UPGRADES.md) - Plano de ação
7. 🚀 [DEPLOYMENT.md](./DEPLOYMENT.md) - Deploy

---

## 🎯 Próximos Passos Recomendados

### Hoje (Imediato)
1. ✅ Ler [RESUMO_EXECUTIVO_ANALISE.md](./RESUMO_EXECUTIVO_ANALISE.md)
2. ✅ Configurar ambiente local
3. ✅ Rodar sistema e explorar

### Esta Semana
4. 📚 Ler documentação técnica completa
5. 🔄 Iniciar FASE 1 do roadmap (Consolidação)
6. 🧪 Familiarizar-se com testes

### Este Mês
7. 🚀 Completar FASE 1 e FASE 2
8. 📈 Implementar melhorias de performance
9. 🧪 Aumentar cobertura de testes

---

## 💡 Dicas Úteis

### Desenvolvimento
- Use `npm run up` para iniciar (mata portas automaticamente)
- Logs estão em `logs/` (application.log, error.log)
- Use `npx prisma studio` para visualizar banco de dados
- Socket.io events são úteis para debug em tempo real

### Workflows
- Editor visual em `/workflows/editor/:id`
- Teste workflows em `/test` (TestChat)
- Workflows JSON estão na raiz do projeto
- Use `npm run sync:workflow:railway` para sincronizar

### IA/GPT
- Modelo padrão: GPT-4o
- Configurável via variável de ambiente
- Logs de IA em `AILearningData` no banco
- Use `npm run test:gpt-models` para testar

### Deploy
- Railway é a plataforma de produção
- Use `npm run deploy:prod` para build
- Variáveis de ambiente no Railway Dashboard
- Logs no Railway CLI: `railway logs`

---

## 🔗 Links Úteis

### Documentação Externa
- [Prisma Docs](https://www.prisma.io/docs)
- [OpenAI API](https://platform.openai.com/docs)
- [WhatsApp Business API](https://developers.facebook.com/docs/whatsapp)
- [React Flow](https://reactflow.dev/docs)
- [Socket.io](https://socket.io/docs)

### Ferramentas
- [Railway Dashboard](https://railway.app)
- [Prisma Studio](http://localhost:5555) (quando rodando)
- [Meta Developer Console](https://developers.facebook.com)

---

## 📞 Suporte

### Documentação
- Consulte [INDICE_DOCUMENTACAO.md](./INDICE_DOCUMENTACAO.md) para encontrar documentos específicos
- Seção de Troubleshooting tem guias de problemas comuns

### Comunidade
- Issues no GitHub (se aplicável)
- Documentação interna do projeto

---

## ✅ Checklist de Início

Use esta checklist para garantir que está tudo configurado:

### Ambiente
- [ ] Node.js 18+ instalado
- [ ] PostgreSQL instalado e rodando
- [ ] Repositório clonado
- [ ] Dependências instaladas (`npm install`)

### Configuração
- [ ] Arquivo `.env` criado
- [ ] `DATABASE_URL` configurada
- [ ] `JWT_SECRET` configurada
- [ ] `OPENAI_API_KEY` configurada
- [ ] Tokens do WhatsApp configurados (se testar webhook)

### Banco de Dados
- [ ] Banco de dados criado
- [ ] Migrations rodadas (`npx prisma db push`)
- [ ] Consegue conectar ao banco

### Sistema
- [ ] Backend inicia sem erros (`npm run server:dev`)
- [ ] Frontend inicia sem erros (`npm run client:dev`)
- [ ] Consegue acessar http://localhost:5173
- [ ] Consegue fazer login

### Documentação
- [ ] Leu [RESUMO_EXECUTIVO_ANALISE.md](./RESUMO_EXECUTIVO_ANALISE.md)
- [ ] Entendeu a arquitetura básica
- [ ] Sabe onde encontrar documentação específica

---

## 🎓 Conclusão

Parabéns! Você agora tem uma **visão completa** do ZORAHAPP2 e está pronto para:

- ✅ Desenvolver novas funcionalidades
- ✅ Implementar melhorias do roadmap
- ✅ Resolver problemas
- ✅ Fazer deploy

**Próximo passo sugerido**: Escolha uma tarefa da FASE 1 do roadmap e comece a implementar!

---

**Criado por**: Antigravity AI  
**Data**: 04/12/2025 22:32 BRT  
**Versão**: 1.0  
**Status**: ✅ Pronto para Uso

**Boa sorte! 🚀**
