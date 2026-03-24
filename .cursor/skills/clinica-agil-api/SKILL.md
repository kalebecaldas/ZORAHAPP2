# Skill: Integração Clínica Ágil API

## Quando usar esta skill
Ao modificar qualquer código relacionado à integração com a Clínica Ágil: endpoint proxy no backend, tool do N8N, ou fluxo de identificação/cadastro de pacientes via bot.

---

## Visão geral

O ZoraH integra com a API da Clínica Ágil para identificar pacientes pelo telefone antes do atendimento.

### Arquivos relevantes
- `api/routes/clinicaAgil.ts` — proxy seguro (backend → Clínica Ágil)
- `api/routes/patients.ts` — endpoint `POST /api/patients/upsert-from-bot`
- `n8n/Zorah bot n8n ativo.json` — nodes "Lookup Patient", "Parse Patient Data", "Upsert Patient ZoraH"

---

## API da Clínica Ágil

### Endpoint de consulta
```
POST https://app2.clinicaagil.com.br/api/integration/patient_data
Headers:
  X-API-KEY: <CLINICA_AGIL_API_KEY>
  X-API-METHOD: Ch4tB0tW4tsS4v3QRc0d3
  accept: application/json
  content-type: multipart/form-data
Body (multipart):
  numero_paciente: <telefone somente dígitos>
```

### Resposta — paciente encontrado
```json
{
  "status": "success",
  "data": {
    "paciente_id": "78",
    "paciente_nome": "Maria Fernanda Kikuda Rodrigues",
    "telefone1": "(92) 99359-6706",
    "convenio_id": "4",
    "email": "fernandakikuda@iaamazonas.com.br"
  }
}
```

### Resposta — não encontrado
```json
{ "status": "not_found" }
```

---

## Fluxo no N8N (determinístico)

```
Webhook Start → Extract Data
  → Lookup Patient   (HTTP Request direto, onError: continueRegularOutput)
  → Parse Patient Data (Code: extrai patientName, convenioId, email, clinicaAgilId)
  → Upsert Patient ZoraH (POST /api/patients/upsert-from-bot)
  → Intent Classifier Agent
```

### Node "Lookup Patient"
- Tipo: `n8n-nodes-base.httpRequest` (NÃO `httpRequestTool`)
- Roda 100% das vezes, independente do AI
- `onError: continueRegularOutput` — não bloqueia o fluxo se a API falhar

### Node "Parse Patient Data" — campos extraídos
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `patientFound` | boolean | true se Clínica Ágil retornou status: success |
| `patientName` | string \| null | Nome completo do paciente |
| `convenioId` | string \| null | ID do convênio na Clínica Ágil |
| `email` | string \| null | Email cadastrado |
| `clinicaAgilId` | string \| null | ID do paciente na Clínica Ágil |

### Node "Upsert Patient ZoraH"
- `POST /api/patients/upsert-from-bot`
- Header: `x-bot-key: N8N_BOT_API_KEY`
- Cria paciente se não existe; atualiza nome/email/convênio se existir com dados temporários

---

## Proxy Backend (`/api/clinica-agil/patient`)

Endpoint para uso do dashboard ZoraH (não do N8N).
- Requer `authMiddleware` (JWT de usuário logado)
- A `CLINICA_AGIL_API_KEY` nunca é exposta ao frontend
- Timeout de 10 segundos

---

## Variáveis de ambiente necessárias

| Variável | Onde configurar | Descrição |
|----------|-----------------|-----------|
| `CLINICA_AGIL_API_KEY` | Railway | Chave de autenticação da Clínica Ágil |
| `N8N_BOT_API_KEY` | Railway + N8N (env var) | Chave para N8N chamar `/api/patients/upsert-from-bot` |

**Importante**: Nunca hardcodar as chaves. Validar no startup com `if (!process.env.CLINICA_AGIL_API_KEY) throw new Error(...)`.

---

## Mapeamento convenio_id

O campo `convenio_id` da Clínica Ágil é um ID numérico (ex: `"4"`). O ZoraH armazena como string no campo `insuranceCompany` do paciente. Para exibir o nome do convênio, consultar a lista de convênios da própria Clínica Ágil (endpoint ainda não documentado) ou manter mapeamento manual.

---

## Tratamento de erros

| Cenário | Comportamento |
|---------|---------------|
| API Clínica Ágil timeout | `onError: continueRegularOutput` no N8N; fluxo prossegue com `patientFound: false` |
| API Clínica Ágil status != success | `patientFound: false`; bot atende normalmente sem nome |
| Upsert ZoraH falha | `onError: continueRegularOutput`; paciente não é cadastrado neste ciclo |
| `N8N_BOT_API_KEY` ausente | 503 com mensagem de erro |
| `CLINICA_AGIL_API_KEY` ausente | 503 com mensagem de erro |
