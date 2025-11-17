## Visão Geral
- Introduzir hierarquia de 4 níveis com regras rígidas de acesso e edição.
- Manter compatibilidade com o código atual, evoluindo schema Prisma, rotas e UI.
- Implementar auditoria e testes para garantir segurança e consistência.

## Backend: Modelos e Seeds
- Prisma (schema.prisma):
  - Campo `role` passa a aceitar 4 níveis — manter como `String` com validação ou migrar para `enum` (preferível).
  - Campos novos em `User`: `isMasterFrozen: Boolean @default(false)`, `lastLoginAt: DateTime?`.
  - Tabela `AuditLog`: `{ id, actorId, targetUserId?, action, details Json?, createdAt }`.
- Seed/Primeiro login:
  - Criação do usuário legado com e-mail/senha fornecidos (via script/rota segura): `kalebe.caldas@hotmail.com`.
  - Regra de PROMOÇÃO: ao primeiro login desse usuário, se não houver MASTER existente → promover para `MASTER` e marcar `isMasterFrozen=true`.

## Backend: Middlewares e Permissões
- Middleware `authMiddleware` atual permanece.
- Novo `authorize(roles?: Role[], permissions?: Permission[])`:
  - Valida usuário autenticado e verifica regra de role/permits.
  - Bloqueia ações sobre `MASTER` (edição/deleção) para qualquer não‐MASTER.
- Regras principais:
  - MASTER: acesso total, pode criar MASTER.
  - ADMIN: acesso total exceto modificar MASTER.
  - SUPERVISOR: páginas de relatórios/analytics; leitura limitada de demais áreas.
  - ATENDENTE: apenas página de mensagens.
- Auditoria:
  - Logar ações administrativas (criar/editar/deletar usuário, mudanças de permissões) em `AuditLog`.
- Arquivos afetados:
  - `api/utils/auth.ts`: adicionar helpers `requireRoleHierarchy`, `authorize`.
  - `api/routes/users.ts`: aplicar `authorize` nas rotas; bloquear operações sobre MASTER quando `req.user.role !== 'MASTER'`.
  - `api/routes/settings.ts`: adicionar endpoints de matriz de permissões por nível (CRUD), com auditoria.

## Frontend: Páginas e UI
- Login:
  - Persistir `lastLoginAt` via backend.
  - Mensagens claras de erro e estados.
- Usuários (`/users`):
  - Dropdown de criação com os 4 níveis.
  - Validação: apenas MASTER pode escolher “MASTER”; caso contrário, desabilitar opção.
  - Exibir usuários MASTER como “congelados”: desativar ações de editar/deletar.
  - Paginação, busca por nome/email e filtros por nível.
- Configurações (`/settings`):
  - Seção “Permissões por Nível”: matriz editável (checkboxes) por funcionalidade (mensagens, pacientes, workflows, relatórios, settings, users).
  - Bloqueio de edição de usuários MASTER.
  - Persistência via `PUT /api/settings/permissions` (estrutura modular para futuras permissões).

## Fluxos e Regras
- Criação MASTER: somente por MASTER logado.
- Edição/remoção MASTER: proibido; UI mostra badge “Congelado” e ações desabilitadas.
- Acesso por nível:
  - ATENDENTE: rota `/conversations` apenas.
  - SUPERVISOR: `/stats` e relatórios; leitura limitada em outras áreas.
  - ADMIN: tudo exceto modificar MASTER.
  - MASTER: tudo.

## Testes
- Autenticação:
  - Login para cada nível; persistência de token e acesso básico.
- Autorização:
  - Tentativas de acesso a áreas bloqueadas retornam `403`.
  - ADMIN não consegue editar/deletar MASTER.
  - MASTER consegue criar MASTER; ADMIN não.
- Segurança:
  - Sem escalonamento de privilégios via UI/rota.
- UI:
  - Validações de formulário (senha ≥6, seleção de nível restrita) e estados “congelado”.

## Entregáveis
- Schema Prisma atualizado (User + AuditLog).
- Middlewares de autorização e auditoria integrados nas rotas.
- Páginas de Usuários e Configurações com validações e bloqueios.
- Script/rota para criar usuário legado e promoção automática a MASTER no primeiro login.
- Suite de testes (backend e UI) com cenários definidos.

## Observações de Segurança
- Não hardcode secrets; armazenar credenciais de seed via .env e script de inicialização.
- Registrar auditoria de alterações de permissões e de usuários, com ator e alvo.

Posso iniciar a implementação conforme este plano e entregar as páginas, middlewares e testes? 