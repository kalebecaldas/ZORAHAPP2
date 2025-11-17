## Visão Geral
- Implementar um fluxo robusto de agendamento guiado pelo bot, integrado ao GPT para detecção de intenção, workflow engine para orquestração de estados e Prisma para persistência.
- Garantir experiências específicas: seleção de procedimentos (até 3), cobertura por convênio, data/turno em um único dia, exceções e handoff para atendentes.

## Detecção de Intenções (GPT + Heurística)
- Centralizar no `api/services/intelligentBot.ts`:
  - Ampliar `classifyIntent(...)` com intenções: `VALOR`, `CONVENIO`, `LOCALIZACAO`, `AGENDAMENTO`.
  - Complementar com heurísticas (palavras-chave) para frases como “hoje”, “amanhã”, “marcar”, “preço”, “convênio”, “onde fica”.
  - Normalizar a saída (enum interno) para acionar o fluxo no servidor.

## Orquestração de Fluxo (Workflow Engine)
- Usar `src/services/workflowEngine.ts` e `api/routes/conversations.ts`:
  - Nós principais: `START` → `VERIFY_PATIENT` → `REGISTER_PATIENT` → `SELECT_PROCEDURES` → `SELECT_DATE` → `CONFIRM_SUMMARY` → `TRANSFER_HUMAN` → `END`.
  - `CONDITION` controla desvios: paciente já cadastrado, convênio válido, limite de 3 procedimentos, frases de finalização.
  - Persistir `currentWorkflowNode` e `workflowContext.userData` na `Conversation` para retomar corretamente.

## Processo de Cadastro
- Em `REGISTER_PATIENT`:
  - Coletar dados pessoais (nome, telefone, email, CPF), convênio e número do convênio.
  - Validar convênio contra tabela de convênios ativos.
  - Salvar/atualizar `Patient` e associar à `Conversation`.

## Seleção de Procedimentos
- Em `SELECT_PROCEDURES`:
  - Listar apenas procedimentos cobertos pelo convênio do paciente.
  - Permitir seleção múltipla até 3; oferecer ação “Somente este procedimento”.
  - Armazenar seleção em `PatientProcedure` (status `SCHEDULED` preliminar até confirmar).

## Escolha de Data/Horário
- Em `SELECT_DATE`:
  - Interpretar “hoje”/“amanhã”/data explícita (ex.: `dd/MM`), usando `date-fns` para parsing.
  - Oferecer turnos (manhã/tarde/noite) conforme disponibilidade (regra simples inicial; integração futura com agenda real).
  - Validar que todos os procedimentos ocorram no mesmo dia.

## Finalização do Agendamento
- Em `CONFIRM_SUMMARY`:
  - Gerar resumo com convênio, procedimentos, data e turno.
  - Encaminhar para fila principal (`Conversation.status = 'PRINCIPAL'`) e anexar metadados para o atendente (paciente, procedimentos selecionados, datas sugeridas).

## Tratamento de Exceções
- Implementar contadores no `workflowContext`:
  - Timeout após 3 tentativas (retorna para atendente humano).
  - Reconhecer frases de finalização (“é só isso”, “só esse procedimento”) e encerrar adequadamente.
  - Convênio não encontrado/procedimento não coberto: instruir alternativas (particular) ou outras unidades.

## Integrações de Dados (Prisma)
- Reutilizar modelos existentes (`api/prisma/schema.prisma`): `Patient`, `Conversation`, `Workflow`, `PatientProcedure` e entidades de convênio/procedimento/clínica.
- Criar/ajustar consultas para:
  - Mapear cobertura de convênios por procedimento.
  - Gerar/sincronizar registros de `PatientProcedure` vinculados à conversa/paciente.

## Fluxo para Atendentes e Filas
- Atualizar `Conversation.status` conforme estados:
  - `BOT_QUEUE` durante o fluxo do bot.
  - `PRINCIPAL` quando pronto para atendimento humano.
  - `EM_ATENDIMENTO` ao ser assumida; mover para “Minhas conversas”.
  - `FECHADA` ao encerrar.
- Front-end:
  - `src/components/ConversationList.tsx` e `ConversationQueueManager.tsx`: não contar conversas já assumidas na fila principal; indicar “com outro atendente”.
  - `src/components/ConversationViewer.tsx`: desabilitar input quando não atribuída ao atendente atual; habilitar somente ao assumir.
  - Eventos Socket (`src/hooks/useSocket.ts`): emitir/escutar `conversation_updated` para refletir atribuições.

## APIs
- Extensões em `api/routes/conversations.ts`:
  - Endpoints para assumir/soltar conversa e atualizar status.
  - Endpoints para cadastro e validação de convênio.
  - Endpoints para listar procedimentos cobertos e registrar seleção múltipla (até 3).
  - Endpoint para confirmação e transferência à fila principal.

## Validação e Testes
- Cenários automatizados (Vitest):
  - Intenções: `VALOR`, `CONVENIO`, `LOCALIZACAO`, `AGENDAMENTO` (GPT + heurísticas).
  - Cadastro vs pular cadastro.
  - Seleção múltipla e bloqueio no 4º procedimento.
  - Parsing de “hoje”/“amanhã”/data explícita.
  - Fila e atribuição: contagem correta e bloqueio de input.
- Teste manual via `POST /api/test/test-bot` e UI.

## Entregáveis
- Fluxo do bot operando ponta a ponta.
- UI de filas/assunção consistente com regras.
- APIs e persistência com Prisma.
- Testes cobrindo intenções, seleção, datas e filas.

Confirma implementar conforme o plano acima? Posso começar pela detecção de intenção e o esqueleto do fluxo no workflow engine, seguido das integrações de dados e UI das filas.