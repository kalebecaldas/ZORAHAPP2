## Diagnóstico
- Erros no Editor: referências soltas (workflow/wf), nós legados sem `position/connections`, render de linhas assumindo valores.
- Salvamento: CORS bloqueava `PATCH`; backend Zod exige campos além dos enviados (ex.: `type`).
- UX: autosave dispara com workflow inválido; chamadas paralelas; 404 de conversas durante edição.

## Correções Frontend
- Normalizar nós ao carregar: garantir defaults para `position`, `connections`, `content` e usar `?.`/`??` nas coordenadas.
- Unificar salvamento: mudar para `PUT /api/workflows/:id` e enviar payload completo `{ name, description, type, config: { nodes }, isActive }`.
- Tratar autosave: só salvar quando `START` e `END` existirem e um `isSaving` esteja falso; permitir apenas “Salvar Workflow” manual por agora.
- Silenciar 404 de conversas na edição: não chamar preview de conversas quando só editando workflow.
- Adicionar error boundary no Workflows para evitar quebra da página.

## Correções Backend
- CORS: permitir `PATCH` (já ajustado) e confirmar `PUT`.
- Validação Zod (workflowSchema): aceitar `description` opcional; manter `type` obrigatório (frontend passa valor, ex.: `CONSULTATION`).

## Implementação
- Atualizar `src/pages/Workflows.tsx`:
  - `handleSaveWorkflow`: usar `PUT` e incluir `type`.
  - Desabilitar autosave do editor temporariamente; salvar apenas no botão.
- Editor: confirmar normalização e coordenadas seguras (já feito) e remover código solto.
- Adicionar error boundary simples em `Workflows`.

## Validação
- Editar “Atendimento Básico”, alterar texto, conectar nós, salvar — ver sucesso.
- Testar criação de novo workflow vazio → exigir `START/END` antes de salvar.
- Confirmar sem erros ao abrir editor e sem `ERR_NETWORK` ou `CORS`.

Posso aplicar essas correções agora e validar no navegador?