## O que está acontecendo
- Ao enviar "ok" durante a coleta, o fluxo volta ao `START` porque a guarda de genéricos não detecta coleta a tempo (usa `awaitingInput`/`collectingField` desatualizados).
- O workflow ativo (ID informado) não está sincronizado com o arquivo local; conexões como `ask_procedimentos → collect_proc_1` precisam estar garantidas no banco.

## Plano de Correção
### 1) Blindagem de coleta no backend
- Em `api/routes/conversations.ts`, antes de qualquer reclassificação ou reset, detectar se o nó corrente é de coleta:
  - Adicionar `isInDataCollection = currentNode && (currentNode.type === 'DATA_COLLECTION' || currentNode.type === 'COLLECT_INFO')`.
  - Se `isInDataCollection` ou `awaitingInput` for true, nunca resetar para `START` e nunca voltar ao `gpt_classifier`; processar apenas como entrada do campo.
- Resultado: "ok", "beleza", etc. durante coleta ficam no campo atual e avançam normalmente.

### 2) Sincronizar workflow ativo com o editor
- Usar o endpoint `POST /api/workflows/sync/local` para importar `workflow_completo_definitivo.json` e ativar.
- Garantir que o workflow ativo (cmid7w6gf...) tenha:
  - `msg_solicita_cadastro → collect_nome` (já ok)
  - `ask_procedimentos → collect_proc_1` (forçar via import/ajuste)
  - Cadeia completa até `end_success`.
- Após sync, validar com `scripts/validate_workflow_file.ts`.

### 3) Verificação final em runtime
- Executar cenário: saudação → unidade → "quero agendar" → cadastro → confirmação → `ask_procedimentos` → `collect_proc_1`.
- Testar mensagem genérica "ok" em `collect_nome` e confirmar que não há reset nem reclassificação, e que o prompt é mantido.

### 4) Testes automatizados
- Adicionar teste de integração cobrindo:
  - Entrada genérica durante coleta
  - Avanço correto após confirmação de cadastro

Posso aplicar agora as mudanças, sincronizar o workflow ativo e validar com o seu cenário de teste?