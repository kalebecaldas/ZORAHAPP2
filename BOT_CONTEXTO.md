# Contexto do Bot ZoraH — Estado Atual

## Instância n8n

| Propriedade | Valor |
|-------------|-------|
| Host | `https://n8nserver.iaamazonas.com.br` |
| Workflow ID | `5xTy00n8X2mmwJ7z` |
| Workflow Name | `ZoraH Bot - Simple v2.2.4` |
| Total de nodes | 48 | active: true |
| API Key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0YWIyNDU1MC02ODhkLTQwNDQtOWRjMC1mZjMwZmY0OTU1NWYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzc0Mzg2NTU4fQ.6A72dHBr-B-fJmzpQCkdu22c4HK-OZ7xZ1CTWWF5TgA` |

---

## Fluxo Principal do Bot

```
Webhook Start
  └── Extract Data (Code)
        └── Lookup & Parse Patient (Code — busca Clínica Ágil API)
              └── Upsert Patient ZoraH (HTTP POST /api/patients/upsert-from-bot)
                    └── Set: Intent Context  ← injeta contexto sem cross-node ref
                          └── Intent Classifier Agent (Gemini)
                                └── Parse Intent Response (Code)
                                      └── Intent Router (Switch)
                                            ├── INFORMACAO → Information Agent (Gemini)
                                            │       └── Set: Info Context
                                            │             └── Parse Information Response (Code)
                                            │                   └── Format Final Response (Code)
                                            │                         └── Prepare Analytics → Send to System → Webhook Response
                                            ├── AGENDAR → Handle Appointment Request (Code)
                                            │       └── Format Final Response (Code)
                                            ├── FALAR_ATENDENTE → Handler Transfer → Send to System → Webhook Response
                                            └── PEDIR_UNIDADE → Format Ask Unit Response → Format Final Response → ...
```

**Branch "1" (legado/paralelo):** `Extract Data1 → Intent Classifier Agent1 → ...` — não mexer.

---

## Intenções Classificadas

| Intent | Trigger | Ação |
|--------|---------|------|
| `INFORMACAO` | Perguntas gerais, cumprimentos, dúvidas | Information Agent consulta tool da unidade |
| `AGENDAR` | "agendar", "marcar", "reservar" | Transfere para fila Principal |
| `FALAR_ATENDENTE` | "falar com humano", "atendente", reclamações | Transfere para humano |
| `PEDIR_UNIDADE` | Mensagem sem unidade explícita, ou seleção de unidade | Pergunta/confirma a unidade |

---

## Unidades

| Unidade | Tool do n8n | HTTP Request node |
|---------|-------------|-------------------|
| Vieiralves | Base de Informações da Unidade Vieiralves | `HTTP Request Vieiralves` |
| São José | Base de Informações da Unidade São José | `HTTP Request São José` |

---

## Comportamento Atual do Bot (Estado Pós-Ajustes)

### Fluxo de conversa esperado

1. **Usuário manda mensagem** (ex: "Bom dia")
2. **Intent Classifier** detecta que falta unidade → `PEDIR_UNIDADE`
3. **Bot pergunta a unidade:**
   > "Para qual unidade você deseja atendimento? 😊 1️⃣ Vieiralves 2️⃣ São José"
4. **Usuário seleciona** ("1", "2", "Vieiralves", "São José")
5. **Intent Classifier** classifica como `INFORMACAO` (com unit detectada via memória)
6. **Information Agent** reconhece que é seleção de unidade → **NÃO lista preços** → pergunta o que precisa:
   > "Ótimo! Você selecionou a unidade São José. Como posso ajudar? 😊 Precisa de informações sobre procedimentos, valores, convênios ou quer agendar?"
7. **Usuário pergunta algo específico** (ex: "quais os preços de fisioterapia?")
8. **Information Agent** consulta a tool da unidade → responde só o que foi perguntado

### Regras do Information Agent

- **Seleção de unidade sem pergunta específica** → NÃO consulta tool, NÃO lista preços → pergunta o que precisa
- **Pergunta específica** → consulta tool, responde só o necessário (não despeja tudo)
- **Sem unidade** → pergunta a unidade

---

## Ajustes Recentes Feitos

| Data | O que foi feito |
|------|----------------|
| Mar 25 | Fix do crash do Task Runner: removidas cross-node refs (`$('NodeName').item.json`) dos Code nodes |
| Mar 25 | Criados Set nodes `Set: Intent Context` e `Set: Info Context` para injetar contexto sem OOM |
| Mar 25 | Fix do `Intent Classifier Agent`: prompt usa `$('Lookup & Parse Patient').item.json.chatInput` |
| Mar 25 | Criado `Set: Intent Context` (faltava no workflow) — injeta chatInput, phone, conversationId, sessionId, platform, patientName, patientFound, convenioId, needsPhone, messageReceivedAt, patient, context, appointmentFlow — resolvendo erro "No prompt specified" no Intent Classifier Agent |
| Mar 25 | Criado `Set: Pre-Parse Context` entre Intent Classifier Agent e Parse Intent Response — injeta agentOutput + contexto do Set: Intent Context — resolvendo crash do Task Runner OOM em Parse Intent Response |
| Mar 25 | Reescrito `Parse Intent Response` — removidas todas as cross-node refs (`$('Lookup & Parse Patient').item.json`) — usa apenas `$json` (vindo do Set node anterior) |
| Mar 25 | Fix timeout 300s: `Set: Pre-Parse Context` estava ausente do workflow (restaurado de backup sem ele) — recriado e conexões corrigidas: `Intent Classifier Agent → Set: Pre-Parse Context → Parse Intent Response` |
| Mar 25 | Fix timeout `Format Final Response`: `Set: Info Context` ausente, `Parse Information Response`/`Handle Appointment Request`/`Format Ask Unit Response`/`Handler Transfer`/`Format Final Response` com cross-node refs — criado Set: Info Context, todos os Code nodes corrigidos para usar apenas `$json`, `messageReceivedAt` propagado por todas as branches. Workflow agora tem 48 nodes, zero cross-node refs proibidas. |
| Mar 25 | Criado `Set: Info Context` entre Information Agent e Parse Information Response — stripa `intermediateSteps` (dados grandes das tool calls HTTP) antes do Code node — resolve OOM no Task Runner |
| Mar 25 | Reescritos `Parse Information Response`, `Format Final Response`, `Handle Appointment Request` — removidas todas as cross-node refs (`$('Parse Patient Data')`, `$('Extract Data')`, `$('Parse Intent Response')`) |
| Mar 25 | Varredura completa: todos os Code nodes do main flow estão sem cross-node refs |
| Mar 25 | Fix comportamental: Information Agent não lista preços ao receber apenas seleção de unidade — confirma unidade e pergunta o que precisa |
| Mar 25 | Fix Handle Appointment Request: removidas cross-node refs, usa $json do Intent Router |
| Mar 25 | Workflow restaurado de backup limpo + todos os fixes aplicados atomicamente para resolver erro 400 de ativação |
| Mar 25 | Fix do `Information Agent`: não lista preços ao receber apenas seleção de unidade |
| Mar 25 | Fix de imagens: endpoint `/api/conversations/files/:filename` re-baixa do WhatsApp se arquivo não existir |

---

## O que Ainda Pode Precisar de Ajuste

### Comportamento do bot

- [ ] **Agendamento**: quando `AGENDAR`, o bot transfere para fila mas não coleta dados do agendamento antes (data, procedimento, convênio). Considerar coletar antes de transferir.
- [ ] **Resposta de boas-vindas na seleção de unidade**: verificar se o tom está adequado após os ajustes de hoje
- [x] **Zero cross-node refs**: varredura completa confirmou que todos os Code nodes do main flow usam apenas `$json` / `$input`
- [ ] **Branch "1" (nodes com sufixo "1")**: ainda tem cross-node refs com `$items('Extract Data1')` — pode crashar se essa branch for ativada
- [ ] **Teste do fluxo INFORMACAO completo**: verificar se após a pergunta "como posso ajudar?" o bot responde corretamente quando o usuário pergunta algo específico

### Técnico

- [ ] **Build error no Railway**: `Property 'sendMessage' does not exist on type 'InstagramService'` em `conversations.ts` linha 1318 — verificar se ainda está presente
- [ ] **Timeout do fallback de n8n**: está em 30s com 2 retries (~63s total). Se n8n não responder, o usuário recebe mensagem de boas-vindas e vai para fila principal.

---

## Arquivos Relevantes

| Arquivo | Descrição |
|---------|-----------|
| `n8n/Zorah bot n8n ativo.json` | JSON do workflow (sincronizado com o n8n) |
| `api/routes/conversations.ts` | Rota principal do backend — processa mensagens, chama n8n |
| `api/services/n8nBotService.ts` | Serviço de integração com n8n (timeout 30s, 2 retries) |
| `api/routes/webhook.ts` | Recebe webhooks do WhatsApp/Instagram |
| `api/routes/instagram-webhook.ts` | Recebe webhooks do Instagram |
| `.cursor/skills/zorah-n8n-workflow/SKILL.md` | Skill para o agente gerenciar o n8n via API |

---

## Como Editar o Bot via API (resumo)

```python
import json, ssl, urllib.request

N8N_BASE = 'https://n8nserver.iaamazonas.com.br'
N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
WF_ID = '5xTy00n8X2mmwJ7z'

ctx = ssl.create_default_context()

# Ler workflow
req = urllib.request.Request(f'{N8N_BASE}/api/v1/workflows/{WF_ID}',
    headers={'X-N8N-API-KEY': N8N_API_KEY, 'accept': 'application/json'})
with urllib.request.urlopen(req, context=ctx) as r:
    wf = json.loads(r.read().decode())

# Encontrar e editar um node
for node in wf['nodes']:
    if node['name'] == 'Nome do Node':
        node['parameters']['options']['systemMessage'] = 'novo prompt...'
        break

# Salvar (só esses campos são aceitos no PUT)
payload = {
    'name': wf['name'], 'nodes': wf['nodes'],
    'connections': wf['connections'],
    'settings': {'executionOrder': 'v1', 'callerPolicy': 'workflowsFromSameOwner'},
    'staticData': wf.get('staticData')
}
put_req = urllib.request.Request(f'{N8N_BASE}/api/v1/workflows/{WF_ID}',
    data=json.dumps(payload).encode(), method='PUT',
    headers={'X-N8N-API-KEY': N8N_API_KEY, 'Content-Type': 'application/json', 'accept': 'application/json'})
with urllib.request.urlopen(put_req, context=ctx) as r:
    print(json.loads(r.read().decode()).get('id'))
```

---

## Nodes por Nome (IDs para referência)

| Node | ID |
|------|----|
| `Intent Classifier Agent` | `ef05b1f9-a3ca-402d-b58f-d4f5a9f62723` |
| `Set: Intent Context` | `e5be6318-1760-4a97-a9cb-2bce94e1de5e` |
| `Set: Pre-Parse Context` | `4809121a-9a51-48a8-83ba-6cf8e5c3d191` | injeta agentOutput + 13 campos de contexto do Set: Intent Context |
| `Parse Intent Response` | `aa22d26b-dcbf-4ca0-8229-fe6f1bfbc3b1` |
| `Intent Router` | `231a0010-a0ac-4be1-abc3-21509486ac77` |
| `Information Agent` | `e617a874-e0fd-41d3-92fe-07cb93628459` |
| `Set: Info Context` | *(ver JSON)* |
| `Parse Information Response` | `ec48645c-3e77-401d-b0b1-e7cd7649cc41` |
| `Handle Appointment Request` | `2f564920-9c34-4eaa-8a3d-a43fe7b06989` |
| `Format Final Response` | `3facf87f-c290-4205-97a2-7e29af6ab5ef` |
| `Send to System` | `f7db9d45-7478-43af-baa4-cedcc09c3b57` |
