## Objetivo
- Tornar o workflow a fonte única de lógica do bot (nós e transições) e refletir toda execução no backend.
- Melhorar a UX: botão “Padrão” na lista de Workflows e layout em cascata por nível.

## UI (Frontend)
- Workflows List:
  - Adicionar botão “Padrão” em cada card → `PUT /api/workflows/default { id }`.
  - Indicar workflow padrão com badge.
- Editor (WorkflowEditor):
  - Botão “Auto‑organizar” (layout cascata BFS com espaçamento por nível: START → MESSAGE → GPT_RESPONSE → END).
  - Paleta completa de nós e propriedades:
    - MESSAGE: `content.text`
    - GPT_RESPONSE: `content.systemPrompt`
    - DATA_COLLECTION: `content.field`, `content.prompt`
    - CONDITION: `content.condition` (JS‑like ou DSL simples)
    - DELAY: `content.delay` (segundos)
    - ACTION/API_CALL: `content.action`, `content.params`
    - TRANSFER_HUMAN: `content.finalMessage`
  - Persistir `config { nodes, edges }` com positions.

## Modelo de Dados (Backend)
- Conversa/workflow state:
  - Tabela (ou campos no Conversation) para estado do motor:
    - `workflowId`, `currentNodeId`, `contextJson` (dados coletados), `awaitingInput` (bool), `lastRunAt`.
  - Logs/Auditoria:
    - `AuditLog` para transições: `WORKFLOW_START`, `WORKFLOW_NODE_EXEC`, `WORKFLOW_END`, `WORKFLOW_ERROR`.

## Motor de Execução (Backend)
- Orquestrador (service):
  - Carrega `config { nodes, edges }` e monta grafo (map por `id` + lista de adjacências).
  - Entradas:
    - `conversation`, `incomingMessage?`, `state`.
  - Ciclo:
    1) START quando `state` vazio (na criação da conversa ou quando setado workflow padrão).
    2) Executa nós até encontrar:
       - DATA_COLLECTION → pausa (`awaitingInput=true`), grava `prompt`; próximo passo só após próxima mensagem do usuário.
       - DELAY → agenda execução (setTimeout/queue) e retorna.
       - CONDITION → avalia `content.condition` com `contextJson` + `incomingMessage` (DSL segura).
       - GPT_RESPONSE → chama IA com `systemPrompt` + `contextJson` + histórico; persiste mensagem.
       - MESSAGE/TRANSFER_HUMAN/END → efeitos imediatos e transições.
    3) Atualiza `currentNodeId`, `contextJson` e `awaitingInput`.
- Integração em `processIncomingMessage`:
  - Se conversa tem workflow ativo e `awaitingInput=true`, processa entrada e avança.
  - Se não, inicia workflow padrão (se definido) e executa ciclo até pausar ou terminar.
- Nós e Efeitos:
  - MESSAGE: persiste `SENT/BOT` com `content.text`.
  - GPT_RESPONSE: IA com `systemPrompt`; persiste `SENT/BOT`.
  - DATA_COLLECTION: valida campo (regex/mascara básica); salva em `contextJson`.
  - CONDITION: avaliar condicional com funções seguras (`includes`, `equals`, `exists(context.field)` etc.).
  - DELAY: agenda reentrada (job simples em memória + persistência de `lastRunAt`).
  - ACTION/API_CALL: abstração para integração futura (mock inicialmente: `search_patient`, `schedule_appointment`).
  - TRANSFER_HUMAN: atualiza `status: PRINCIPAL`, cria mensagem final (opcional).
  - END: mensagem final, encerra motor (`workflowId/currentNodeId` nulos).

## Segurança e Robustez
- CORS e métodos: `GET, POST, PUT, PATCH, DELETE, OPTIONS` habilitados.
- Validação Zod do workflow (types, fields por nó) com mensagens claras.
- Try/catch em cada nó, log `WORKFLOW_ERROR` e fallback (auto‑mensagem ou transferência).
- Sandbox de `CONDITION`: DSL própria (evitar eval JS).

## Testes
- Unidade (motor):
  - Execução de cadeia START→MESSAGE→END.
  - Pausa/reentrada com DATA_COLLECTION.
  - CONDITION com caminhos distintos.
  - DELAY com reexecução.
  - GPT_RESPONSE com mock IA.
- Integração (conversas):
  - Conversa nova com workflow padrão inicia em `BOT_QUEUE` e envia mensagens dos nós.
  - Fluxo de agendamento dispara card e transfere para `PRINCIPAL`.
- UI:
  - Editor salva e reabre com nós/edges e posições.
  - Botão “Padrão” define workflow padrão e reflete no backend.

## Validação Final
- Criar workflow complexo via template, marcar como padrão.
- Enviar mensagens de teste; observar conversas e mensagens do bot seguindo nós do workflow.
- Confirmar estados pausados e retomados, delays e transferências.

Posso implementar o motor completo de execução, adicionar o botão “Padrão” na lista, terminar o layout em cascata e rodar os testes/validações agora?