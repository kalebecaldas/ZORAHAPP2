## Correções
- Configurações: tornar `clinic.email` opcional no backend para evitar falha ao salvar sem email.
- Workflows: manter tipos como enums do backend; mapear em exibição posteriormente (não bloqueia os cenários).

## Implementação do Fluxo de Agendamento
- Criar orquestração de agendamentos no backend em `api/routes/conversations.ts`:
  - Detectar intenções: preço particular (acupuntura/fisioterapia), convênio Bradesco, pedido de agendar.
  - Manter estado do agendamento (rascunho) em memória por `conversationId` com espelho em `PatientInteraction` (`type: 'APPOINTMENT_DRAFT'`).
  - Coletar dados do paciente se não cadastrado (nome e cpf/email mínimos) e registrar em `patient`.
  - Permitir múltiplos procedimentos: acumular em array.
  - Solicitar dia e turno (manhã/tarde/noite) por procedimento e confirmar.
  - Gerar card resumo (mensagem estruturada) com todas as informações e enviar na conversa.
  - Transferir a conversa para a fila principal com motivo “Agendamento: card enviado”.
- Reutilizar dados da clínica (`clinicDataService`) para preços particulares e cobertura do convênio Bradesco.
- Usar `WhatsAppService.sendTextMessage` para prompts e confirmações via bot.

## Testes Automatizados dos Dois Cenários
1) Particular:
- Mensagens sequenciais: perguntar preço de acupuntura → preço de fisioterapia → pedir para agendar → coletar dados → escolher dia/turno → gerar card e transferir.
- Validar: interações salvas, rascunho em `PatientInteraction`, card enviado e `status: PRINCIPAL`.
2) Convênio Bradesco:
- Mensagens: pergunta sobre atendimento Bradesco → listar procedimentos inclusos → seguir para agendamento → coletar/confirmar → card e transferência.

## Evidências
- Logs das chamadas, respostas de API e conteúdo das mensagens do card.
- Referências de código: `api/routes/conversations.ts` para novas funções; `api/services/intelligentBot.ts` e `api/data/clinicData.js` para dados e IA; `api/services/conversationTransfer.ts` para a transferência.

Posso aplicar estas mudanças e executar os testes dos dois cenários agora?