## Objetivo
- Organizar automaticamente os nós do workflow em camadas (linha/coluna) a partir do nó START, evitando nós amontoados e melhorando a visualização.

## Estratégia
- Implementar layout BFS: percorrer o grafo a partir do START usando `connections`, atribuir nível (profundidade) a cada nó.
- Posicionar nós por nível:
  - eixo X crescente por ordinal dentro do nível
  - eixo Y por nível (ex.: 160px por nível)
- Fallback:
  - Se não houver START, manter distribuição em grade como hoje.
  - Nós não alcançáveis (sem caminho a partir do START) ficam em uma linha “Orfãos”.

## Implementação (Frontend)
- `src/pages/Workflows.tsx`:
  - Criar `layoutByBFS(nodes)` que retorna novos `position` por nível/ordem.
  - Em `toEditorWorkflow`, após reconstruir `connections`, aplicar `layoutByBFS` para definir `position` antes de passar ao editor.
  - Adicionar botão “Auto‑organizar” no editor (via prop callback) que reaplica o layout ao estado atual.
- `src/components/WorkflowEditor.tsx`:
  - Receber `onAutoLayout` e renderizar botão no painel; ao clicar, chama o callback com os `nodes` atuais e atualiza `nodes` com os `position` calculados.

## Persistência
- Salvamento atual já persiste `config.nodes` e `config.edges`.
- Manter `position` no `config.nodes` ao salvar para reabrir com o layout aplicado.

## Validação
- Abrir workflows existentes: nós aparecem em colunas por nível, setas entre eles corretamente.
- Criar novo workflow: após adicionar START/MESSAGE/END e conexões, “Auto‑organizar” deve distribuí-los.

Posso aplicar o layout BFS, adicionar o botão “Auto‑organizar” e validar no navegador?