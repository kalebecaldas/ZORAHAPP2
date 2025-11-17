## Objetivo
- Permitir que conversas assumidas permaneçam visíveis na fila Principal, com status "Em atendimento" e fluxo de solicitação controlado.
- Tornar o chat visível em filas Bot e Principal; input só habilitado ao atendente que assumiu.

## Modelagem de Dados
- `Conversation` (Prisma): manter `status` e `assignedToId` como hoje (api/prisma/schema.prisma).
- Adicionar tabela `ConversationRequest` (solicitações): `id`, `conversationId`, `requestedById`, `requestedAt`, `status` (`PENDING|APPROVED|REJECTED`), `notes`.
- Opcional: campo `lastRequestedAt` em `Conversation` para facilitar ordenação e indicadores.

## Regras de Negócio
- Assumir conversa:
  - Marca `status = EM_ATENDIMENTO`, seta `assignedToId = userId`.
  - Conversa permanece listada na fila Principal (visível), mas desabilita ação de assumir para outros.
- Solicitar conversa:
  - Usuário não pode assumir diretamente se `assignedToId` estiver preenchido.
  - Disponibiliza botão "Solicitar conversa" no card; cria `ConversationRequest` com `PENDING`.
  - Notifica atendente atual via socket e log.
  - Aprovação pode ser automática (regra simples: inatividade > X min) ou manual (MVP: manual via API).
- Filas sincronizadas:
  - Principal: mostra todas as conversas `PRINCIPAL` e também `EM_ATENDIMENTO` (visíveis), com ações condicionadas.
  - Minhas: mostra `EM_ATENDIMENTO` do usuário.
  - Bot: chat sempre visível (read-only se não assumida pelo usuário).

## Backend (API)
- `api/routes/conversations.ts`:
  - `POST /api/conversations/actions { action: 'take', phone }` (já existe): restringir quando `assignedToId` != `currentUser` → retornar 409, sugerir `/request`.
  - `POST /api/conversations/:id/request`: criar `ConversationRequest` e emitir `conversation_request_created` via socket.
  - `POST /api/conversations/:id/request/:requestId/approve|reject`: mudar status; em approve, reatribuir `assignedToId` e notificar.
  - `GET /api/conversations?queue=principal|minhas|bot`: incluir `EM_ATENDIMENTO` na Principal, mantendo flag de desabilitar "Assumir".
  - Garantir visibilidade do chat nas rotas de detalhe `/api/conversations/:id`.
- Validações:
  - Bloquear múltiplas associações diretas (quando já atribuída).
  - Manter histórico das solicitações.

## Socket
- `api/realtime.ts`:
  - Eventos: `conversation_updated`, `conversation_request_created`, `conversation_request_resolved`.
- `src/hooks/useSocket.ts`: escutar novos eventos e refletir na UI (badges/estado).

## Frontend (UI)
- `src/components/ConversationList.tsx`:
  - Fila Principal: incluir conversas `EM_ATENDIMENTO` (visíveis), mas:
    - Substituir botão "Assumir" por "Solicitar conversa" quando `assignedToId` presente.
    - Badge "Em atendimento" e indicação do atendente atual.
  - Botões:
    - `Assumir`: apenas quando `assignedToId` vazio (`PRINCIPAL` ou `BOT_QUEUE`).
    - `Solicitar conversa`: quando `assignedToId` preenchido.
- `src/components/ConversationViewer.tsx`:
  - Chat visível em Bot e Principal; input desabilitado quando não for do usuário atual (já implementado: status `MINHAS_CONVERSAS` habilita input).
  - Mostrar cabeçalho/indicadores sempre, inclusive em read-only.

## Testes e Validação
- Cenários:
  - Assumir conversa mantém na Principal e aparece em Minhas.
  - Outro usuário não consegue assumir diretamente; vê "Solicitar conversa".
  - Solicitação criada e registrada; aprovação reatribui e atualiza filas.
  - Chat visível em Bot e Principal; input só habilita quando `EM_ATENDIMENTO` do usuário.
- Automatizar com Vitest: mocks de rotas e socket.

## Entregas em Fases
1. Backend: rotas de request/approve/reject + restrição de take quando atribuída.
2. UI: ajuste de filas e botões; chat visível em Bot/Principal.
3. Socket: eventos de request/resolução e indicadores.
4. Validações e testes.
5. Próximos passos: intenção no serviço de IA, esqueleto do fluxo de agendamento, integrações convênio/procedimentos, UX final de filas.

Posso iniciar com as rotas de backend e os ajustes na fila Principal/Minhas para liberar rapidamente a visibilidade do chat e o fluxo de solicitação.