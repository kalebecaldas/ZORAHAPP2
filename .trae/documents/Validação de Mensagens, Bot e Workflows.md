## Preparação
- Garantir servidor e cliente ativos (`/api` e `/`), token de login presente.
- Confirmar `AI_ENABLE_CLASSIFIER=true`, `OPENAI_API_KEY` válido e variáveis WhatsApp configuradas (modo fail-open em dev não bloqueia persistência).

## Testes com Página de Teste (2 números)
1. Abrir `Teste` (`/test`). Enviar a mensagem “Olá, gostaria de agendar” para `5511999991111`.
- Verificar em `Conversas` (`/conversations`) ou via `GET /api/conversations/5511999991111?limit=50` que:
  - Conversa criada com `status: BOT_QUEUE`.
  - Mensagem recebida (`direction: RECEIVED`, `from: USER`).
  - Em até poucos segundos, mensagem do bot (`direction: SENT`, `from: BOT`).
- Repetir para `5511988882222` e validar os mesmos pontos.
- Confirmar que, sem interação adicional, após ~30s a conversa transfere para humano (`status: PRINCIPAL`) por timeout.

## Persistência no Banco
- Conferir contagem e conteúdo:
  - `GET /api/conversations?status=BOT` deve incluir ao menos uma das conversas.
  - `GET /api/conversations/:phone?limit=50` para cada número deve listar histórico contendo a mensagem do usuário e resposta do bot.

## Validação de Resposta do Bot e Chamada ao GPT
- Usar endpoint de teste de IA avançada: `POST /api/test/test-bot` com `{ phone, message }` para cada número.
- Esperado:
  - Retorno `success: true` com `botResponse` preenchido.
  - Últimas mensagens incluem uma `SENT/BOT` com texto coerente e contextual.
- Opcional: `GET /api/test/test-conversation/:phone` para inspecionar status, mensagens e paciente.

## Teste da Lógica de Workflow
1. Em `Workflows` (`/workflows`), criar um workflow com nó `GPT_RESPONSE` usando o template “Informações da Clínica”.
2. Obter o `id` via `GET /api/workflows`.
3. Executar `POST /api/workflows/:id/test` com `{ phone: '5511999991111', message: 'Quais procedimentos e valores?' }`.
- Validar:
  - `result.executed` lista a ordem dos nós.
  - Para nó `GPT_RESPONSE`, verificar `response` retornado pelo simulador e que a transição segue as `edges` conforme condição.
- Observação: o teste de workflow simula a lógica e não dispara WhatsApp; a chamada real ao GPT ocorre no fluxo de conversas (IA).

## Critérios de Sucesso
- Duas conversas criadas, persistidas e inicialmente em `BOT_QUEUE`.
- Pelo menos uma resposta do bot presente e coerente por conversa.
- Transferência automática para humano após ~30s sem continuidade.
- Workflow testado com execução dos nós e transições corretas.
- Teste de IA avançada retorna `botResponse` válido; sem erros de OpenAI.

## Entregáveis
- Evidências: respostas dos endpoints (`/api/conversations/:phone`, `/api/test/test-bot`, `/api/workflows/:id/test`) e prints das telas.
- Relatório curto com status final das conversas e resultado dos testes de workflow.

Confirma executar os testes agora conforme o plano e apresentar os resultados?