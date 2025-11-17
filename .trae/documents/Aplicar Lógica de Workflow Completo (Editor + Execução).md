## Situação Atual
- Editor exibe START/MESSAGE/END e salva `{config: {nodes, edges}}`.
- Backend já suporta nós avançados (GPT_RESPONSE, DATA_COLLECTION, CONDITION, TRANSFER_HUMAN, DELAY, API_CALL/ACTION) e execução de teste.
- Falta: paleta completa de nós, templates complexos, associação do workflow ao fluxo do bot (execução real), e UI para selecionar workflow padrão.

## Objetivos
- Editor: suportar TODOS os nós de workflow e propriedades (systemPrompt, field/prompt, condition, delay, finalMessage, apiConfig/action).
- Templates: fornecer “Agendamento de Consultas”, “Cadastro de Pacientes”, “Suporte e Informações” com lógica complexa (inclui GPT + coleta de dados + condições + transferências).
- Execução: integrar workflow ao processamento do bot na conversa (usar workflow ativo/padrão) além do endpoint de teste.
- UI: permitir definir workflow padrão e associar a conversas/pacientes.

## Implementação (Frontend)
- `WorkflowEditor`
  - Adicionar tipos: CONDITION, DATA_COLLECTION, GPT_RESPONSE, TRANSFER_HUMAN, DELAY, ACTION/API_CALL.
  - Propriedades por nó (inputs dedicados) e validação básica.
  - Botão “Adicionar via Template” com 3 templates completos.
  - Layout BFS já presente; manter persistência de `nodes` + `edges`.
- `Workflows.tsx`
  - Atualizar `handleSaveWorkflow` para incluir todas propriedades.
  - Botão “Definir como Padrão” que faz `PUT /api/workflows/:id` com flag (ou em `settings` se preferirmos).

## Implementação (Backend)
- `workflowSchema`: garantir campos opcionais/obrigatórios por nó.
- Execução real:
  - Em `processIncomingMessage`, se houver workflow padrão/associado, executar engine de nós (START→ … → END), respeitando CONDITION/DELAY/DATA_COLLECTION/GPT_RESPONSE.
  - Persistir mensagens e transições; transferir para humano (TRANSFER_HUMAN) onde aplicável.
- Rota para “workflow padrão” (ex.: `PUT /api/workflows/:id/default`) ou via `settings`.

## Templates
- Agendamento:
  - START → DATA_COLLECTION(phone) → GPT_RESPONSE(systemPrompt de triagem) → CONDITION(agendar?) → ACTION(schedule) → END.
- Cadastro:
  - START → DATA_COLLECTION(nome/cpf) → ACTION(save patient) → GPT_RESPONSE(confirmação) → END.
- Suporte/Informações:
  - START → GPT_RESPONSE(systemPrompt com dados da clínica e convênios) → CONDITION(transfer?) → TRANSFER_HUMAN → END.

## Validação
- Editar workflow e aplicar template; salvar e reabrir sem perdas.
- Receber mensagens e verificar execução do workflow no bot.
- Teste de `/api/workflows/:id/test` reflete nós na ordem e transições.

Posso aplicar as mudanças (editor completo + templates + integração de execução) e validar no navegador e nas rotas agora?