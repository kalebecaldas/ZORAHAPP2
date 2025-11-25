## Diagnóstico
- Mensagens genéricas durante DATA_COLLECTION ainda disparam reset para `START`, apesar da guarda existente.
- Possível inconsistência entre `collectingField` e `currentCollectField` no estado (backend) faz a verificação falhar.
- Algumas conexões do workflow ativo no banco não batem com o arquivo local (ex.: `ask_procedimentos → collect_proc_1`).
- O editor salva `content/data` com variações; o engine consome `content`. Precisamos unificar conversão.

## Ajustes no Backend
- Conversas: reforçar guarda de coleta para NUNCA reclassificar ou resetar enquanto `userData.collectingField || userData.currentCollectField` estiver setado.
  - Onde atuar: `api/routes/conversations.ts:1912–2013` (bloco de genéricos e resets)
  - Ação: envolver toda lógica de mensagem genérica e reset com `if (!isCollectingData)`.
- Engine de Workflow:
  - DATA_COLLECTION: manter `collectingField` ativo até validar entrada; suprimir re-prompt se já enviado (feito) e garantir que mensagem genérica não avance nem resete.
  - Onde: `src/services/workflowEngine.ts:1274–1354`.
  - GPT_RESPONSE: não chamar GPT nem desviar quando coletando; já existe, reforçar contratos.
- Estados unificados: sempre usar `collectingField` como fonte de verdade; setar/limpar em um único ponto.

## Ajustes no Workflow (JSON)
- Garantir conexões obrigatórias no arquivo e no banco:
  - `msg_solicita_cadastro → collect_nome` (já presente)
  - `ask_procedimentos → collect_proc_1` (assegurar no ativo)
  - Cadeia completa até `end_success` (validada)
- Revisar prompts: `msg_solicita_cadastro` não deve perguntar dados; apenas introdução. Perguntas só nos `DATA_COLLECTION`.
- Corrigir qualquer edge com `port: main` em `CONDITION` com tokens específicos (já documentado em FIX_NODES_ISOLADOS.md).

## Sincronização Frontend ↔ Backend
- Endpoint de sync: usar `POST /api/workflows/sync/local` para importar `workflow_completo_definitivo.json` e ativar.
- Botão no painel: “Sincronizar Workflow” chama o endpoint e recarrega lista.
- Editor: garantir que salvar usa schema coerente (mapear `data` → `content` ao enviar)
  - Onde ajustar conversores: `src/pages/WorkflowsBeta.tsx:22–60` (load); `api/routes/workflows.ts:275–299` (build connections nos testes); util de conversão central se necessário.

## Proteções Adicionais
- Fallback inteligente no engine para avançar em fluxos conhecidos quando a edge faltar (já adicionados, manter):
  - `msg_cadastro_sucesso → ask_procedimentos`
  - `msg_paciente_encontrado → ask_procedimentos`
  - `ask_procedimentos → collect_proc_1`
- Na rota de conversas, ao detectar genérica, nunca resetar se `awaitingInput` estiver true e em coleta.

## Testes
- Criar teste de integração cobrindo:
  1) Saudação → seleção de unidade → “quero agendar” → `msg_solicita_cadastro` → `collect_nome`.
  2) Usuário envia “ok” durante coleta de nome → permanece em `collect_nome` (não reseta, não reclassifica).
  3) Usuário envia nome válido → avança para `collect_cpf`.
- Onde: `api/tests/workflow.integration.test.ts`.

## Validação
- Rodar `npm run check` e `npm run test`.
- Usar validador local de workflow:
  - `scripts/validate_workflow_file.ts` para confirmar edges e cadeia de pré-agendamento.
- Acionar botão “Sincronizar Workflow” e repetir cenário em ambiente UI.

## Entregáveis
- Correções na rota de conversas (guards) e engine (coleta, generic skip).
- Conexões garantidas no workflow ativo via sincronização.
- Tests cobrindo o cenário de “ok” em coleta.
- Botão de sincronização funcionando e documentação curta no painel.

Confirma que posso aplicar essas mudanças e sincronizar o workflow ativo?