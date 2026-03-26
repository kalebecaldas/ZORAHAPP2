# Skill: Integração Clínica Ágil API

## Quando usar esta skill
Ao modificar qualquer código relacionado à integração com a Clínica Ágil: endpoint proxy no backend, workflow n8n, ou fluxo de identificação/cadastro/agendamentos de pacientes via bot.

---

## Visão geral

O ZoraH integra com a API da Clínica Ágil para identificar pacientes pelo telefone antes do atendimento e, no intent `CONFIRMAR_CONSULTA`, retornar os próximos 30 dias de agendamentos do paciente.

### Arquivos relevantes
- `api/routes/clinicaAgil.ts` — proxy seguro (backend → Clínica Ágil)
- `api/utils/botAuth.ts` — `botKeyMiddleware` compartilhado
- `api/routes/patients.ts` — endpoint `POST /api/patients/upsert-from-bot`
- `prisma/schema.prisma` — model `Patient` (campo `clinicaAgilId`)
- `n8n/Zorah bot n8n ativo.json` — nodes "Lookup & Parse Patient", "Upsert Patient ZoraH", "HTTP: Buscar Agendamentos", "Formatar Agendamentos"

---

## Endpoints da Clínica Ágil utilizados

| Endpoint | X-API-METHOD | Uso |
|----------|-------------|-----|
| `POST /patient_data` | `Ch4tB0tW4tsS4v3QRc0d3` | Lookup do paciente pelo telefone |
| `POST /get_patient_appointments` | `Ch4tB0tW4tsa4g4lyT9` | Próximos 30 dias de agendamentos |

---

## Proxy Backend

### `POST /api/clinica-agil/patient` — dashboard (authMiddleware)
Uso pelo frontend ZoraH. Requer JWT de usuário logado. A `CLINICA_AGIL_API_KEY` nunca é exposta ao frontend.

### `POST /api/clinica-agil/patient-bot` — n8n (botKeyMiddleware)
Uso pelo workflow n8n no node "Lookup & Parse Patient". Requer header `x-bot-key: N8N_BOT_API_KEY`.
Body: `{ phone: string }`

### `POST /api/clinica-agil/appointments` — n8n (botKeyMiddleware)
Uso pelo workflow n8n no node "HTTP: Buscar Agendamentos" (intent CONFIRMAR_CONSULTA).
Body: `{ clinicaAgilId: string }`
Retorna: próximos 30 dias de agendamentos do paciente na Clínica Ágil.

---

## Fluxo no N8N (fluxo principal)

```
Webhook Start → Extract Data
  → Lookup & Parse Patient   (Code: chama /api/clinica-agil/patient-bot via x-bot-key)
  → Upsert Patient ZoraH     (POST /api/patients/upsert-from-bot, inclui clinicaAgilId)
  → Set: Intent Context      (propaga patientName, clinicaAgilId, etc.)
  → Intent Classifier Agent
  → Parse Intent Response
  → Intent Router
      ├── INFORMACAO         → Information Agent → ...
      ├── AGENDAR            → Fila agendamento
      ├── FALAR_ATENDENTE    → Transferência humana
      ├── CONFIRMAR_CONSULTA → HTTP: Buscar Agendamentos
      │                          → Formatar Agendamentos
      │                          → Format Final Response
      └── PEDIR_UNIDADE      → Format Ask Unit Response → ...
```

### Node "Lookup & Parse Patient"
- Tipo: `n8n-nodes-base.code`
- Chama `POST /api/clinica-agil/patient-bot` com `x-bot-key: $env.N8N_BOT_API_KEY`
- `onError: continueRegularOutput` — não bloqueia o fluxo se a API falhar
- Campos extraídos: `patientFound`, `patientName`, `convenioId`, `email`, `clinicaAgilId`

### Node "HTTP: Buscar Agendamentos"
- Tipo: `n8n-nodes-base.httpRequest`
- Chama `POST /api/clinica-agil/appointments` com `x-bot-key`
- Body: `{ clinicaAgilId }` (vindo do contexto)
- `onError: continueRegularOutput`

---

## Model Patient (Prisma)

```prisma
model Patient {
  id               String    @id @default(cuid())
  phone            String    @unique
  name             String
  cpf              String?   @unique
  email            String?
  birthDate        DateTime?
  address          String?
  emergencyContact String?
  insuranceCompany String?   // convenio_id da Clínica Ágil (string)
  insuranceNumber  String?
  clinicaAgilId    String?   // paciente_id da Clínica Ágil
  preferences      Json?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
}
```

---

## Variáveis de ambiente necessárias

| Variável | Onde configurar | Descrição |
|----------|-----------------|-----------|
| `CLINICA_AGIL_API_KEY` | Railway | Chave de autenticação da Clínica Ágil |
| `N8N_BOT_API_KEY` | Railway + N8N (env var `$env.N8N_BOT_API_KEY`) | Chave para N8N chamar endpoints bot do backend |

**Importante**: Nunca hardcodar as chaves. Validar no startup.

---

## Tratamento de erros

| Cenário | Comportamento |
|---------|---------------|
| API Clínica Ágil timeout | `onError: continueRegularOutput`; fluxo prossegue com `patientFound: false` |
| API Clínica Ágil status != success | `patientFound: false`; bot atende normalmente sem nome |
| Upsert ZoraH falha | `onError: continueRegularOutput`; paciente não é cadastrado neste ciclo |
| `clinicaAgilId` ausente no CONFIRMAR_CONSULTA | Formatar Agendamentos retorna mensagem amigável orientando contato direto |
| `N8N_BOT_API_KEY` ausente | 503 com mensagem de erro |
| `CLINICA_AGIL_API_KEY` ausente | 503 com mensagem de erro |

---

## Expansão futura

O endpoint `get_patient_treatments` pode ser adicionado seguindo o mesmo padrão:
- Nova rota `POST /api/clinica-agil/treatments` em `clinicaAgil.ts`
- X-API-METHOD: `Ch4tB0tW4tsamn92TT9`
- Novo node no n8n para intent `CONFIRMAR_TRATAMENTO`
