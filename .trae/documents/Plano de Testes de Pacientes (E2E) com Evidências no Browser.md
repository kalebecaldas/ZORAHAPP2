## Preparação do Ambiente
- Garantir cliente e servidor ativos: `http://localhost:4002/` (web) e `http://localhost:4001/` (API).
- Login com usuário de teste; manter token no navegador.
- Dados base disponíveis via seed dinâmico (convênios/procedimentos) — validar em `Configurações`.
- Verificar conectividade real-time (Socket.IO) e health (`/api/health`).

## Escopo e Interfaces
- Páginas: `Configurações`, `Conversas`, `Pacientes`, `Workflows`, `Teste`.
- Endpoints auxiliares para conferência (apenas leitura durante os testes): `GET /api/conversations/:phone`, `GET /api/clinic/insurances`, `GET /api/cobertura/convenios`.

## Casos de Teste Positivos
1) Cadastro Automático via Webhook
- Ação: enviar mensagem de um telefone novo pela página `Teste`.
- Esperado: criação do `Patient` (nome temporário), `PATIENT_CREATED` registrado, `Conversation` com `status: BOT_QUEUE`.
- Evidência: abrir `Conversas` e `Pacientes` e capturar tela do novo registro; histórico mostra `RECEIVED`.

2) Consulta e Atualização de Paciente
- Ação: localizar paciente recém-criado em `Pacientes` e editar dados (nome, email, convênio).
- Esperado: persistência das alterações; listagem e perfil refletem mudanças.
- Evidência: prints da lista e do perfil antes/depois.

3) Convênios e Cobertura no Bot
- Ação: perguntar “Vocês atendem convênio Bradesco?” via `Teste`.
- Esperado: resposta do bot listando procedimentos cobertos (dados do banco), mensagem `SENT/BOT` persistida.
- Evidência: abrir `Conversas` do telefone e capturar tela com a resposta e o contexto.

4) Agendamento Completo (Particular)
- Ação: “Qual valor da acupuntura?” → “E a fisioterapia?” → “Quero agendar” → “AAAA-MM-DD turno”.
- Esperado: valores via DB, prompt de agendamento, card-resumo com procedimentos, data/turno; transferência para `PRINCIPAL`.
- Evidência: tela da conversa com o card e status atualizado.

5) Agendamento com Convênio
- Ação: “Vocês atendem convênio Bradesco?” → “Quero agendar pelo Bradesco” → “AAAA-MM-DD turno”.
- Esperado: card inclui `Convênio: bradesco`, transferência para `PRINCIPAL`.
- Evidência: tela de conversa com card e status.

## Casos de Teste Negativos
- Acesso sem token a rotas protegidas (`/api/clinic/insurances`): esperado `401`.
- Payload inválido ao criar/atualizar convênios/procedimentos: esperado `400`.
- Formato de data/turno inválido no agendamento: bot responde com instrução de formato.

## Procedimento de Execução no Browser
1) Login
- Acessar `http://localhost:4002/`, realizar login.

2) Configurações
- Abrir `Configurações` → validar convênios/procedimentos, filtros e modais.

3) Teste de Mensagens
- Abrir `Teste` → executar os cenários (convênio, particular, agendamento).

4) Conversas
- Abrir `Conversas` → localizar cada telefone testado → confirmar histórico, estados e cards.

5) Pacientes
- Abrir `Pacientes` → localizar recém-criados → validar perfil e atualizações.

## Documentação e Métricas
- Capturar screenshots das páginas (`Configurações`, `Conversas`, `Pacientes`, `Teste`) para cada caso.
- Registrar tempos observados: resposta do webhook (<2s), geração de resposta do bot (1–3s), atualização de UI em tempo real.
- Anotar qualquer erro, inconsistência visual ou funcional.

## Critérios de Aceitação
- Sem erros no console; rotas retornam `2xx` nos casos válidos.
- Bot usa dados do DB (convênios/procedimentos) em todas as respostas.
- Cards de agendamento gerados corretamente e transferência para `PRINCIPAL`.

## Entregáveis
- Relatório consolidado com resultados, evidências (prints/logs) e recomendações.
- Lista de pendências/ajustes se houver.

Posso iniciar os testes agora, navegar pelo sistema e apresentar as evidências no browser conforme o roteiro acima?