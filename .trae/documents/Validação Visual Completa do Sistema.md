## Escopo
- Validar visualmente todas as páginas e componentes: Sidebar/Layout, Dashboard, Conversas, Pacientes, Workflows, Estatísticas, Configurações, Usuários, Teste.
- Checar posicionamento, consistência visual, responsividade, estados visuais e conteúdo dinâmico.

## Preparação
- Garantir cliente ativo em `http://localhost:4002/` e login efetuado.
- Coletar evidências com capturas (screenshots) e anotações de estados (hover/disabled/erro/sucesso).

## Checklist por Páginas
- Sidebar/Layout:
  - Links e ícones, estado ativo e hover; usuário e botão sair.
  - Referência: `src/components/Sidebar.tsx` (itens no array `menuItems`) e `src/App.tsx:28-36` (Layout).
- Dashboard:
  - Cards/resumos, gráficos e toasts onde aplicável.
- Conversas:
  - Lista, filtros/status, histórico e envio/recebimento; estados de fila `BOT_QUEUE/PRINCIPAL`.
  - Referência: `api/routes/conversations.ts:121` (listagem), `:438` (envio), `:551` (processamento webhook).
- Pacientes:
  - Tabela, busca, detalhes e ações.
- Workflows:
  - Cabeçalho e filtros; grid e estado vazio; ações (editar/duplicar/testar/ativar). Editor visual.
  - Referência: `src/pages/Workflows.tsx:699` (UI geral), `:736` (Filtros), `:790` (Grid), `:806` (Empty state), `WorkflowCard` em `:73`.
- Estatísticas:
  - Gráficos e indicadores; atualização e layout.
- Configurações:
  - Seções WhatsApp/IA/Clínica; botões de teste e salvar; estados de loading/saving/testing.
  - Referência: `src/pages/Settings.tsx:119` (loading), `:333` (Salvar), `:253` (Test WhatsApp), `:321` (Test IA).
- Usuários:
  - Listagem e ações; papéis e feedbacks.
- Teste:
  - Envio de mensagens simuladas; feedback e atualização em tempo real.

## Interações Visuais
- Hover, foco e active em botões/links.
- Estados disabled (ex.: `testingWhatsApp`, `testingAI`, `saving`).
- Toaster `sonner` para sucesso/erro.

## Responsividade
- Validar em larguras `sm/md/lg/xl`: espaçamentos, grid (Workflows), painéis (Settings), Sidebar fixa.
- Tailwind classes garantem breakpoints; inspecionar wraps e overflows.

## Conteúdo e Ícones
- Textos/labels em PT-BR e consistentes.
- Ícones `lucide-react` corretos por contexto.
- Dados dinâmicos:
  - Workflows: listagem e estatísticas mock; nós renderizados.
  - Configurações: mapeamento das chaves do backend exibidas corretamente.

## Relatório de Inconsistências
- Documentar problemas de layout, estados incorretos, labels inconsistentes, quebras de responsividade, feedback ausente ou atrasado.
- Incluir referência `file_path:line_number` para origem do componente.

## Entregáveis
- Checklist preenchido por página.
- Capturas das telas em múltiplos tamanhos.
- Lista de issues com severidade e sugestões de correção.

Confirma que eu execute e registre as evidências agora?