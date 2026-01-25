# Guia Passo a Passo: Implementação do Cadastro Inteligente no N8N

## 📋 Pré-requisitos

- [x] N8N com acesso ao workflow "ZoraH Bot - Simple Working"
- [x] API Agil configurada e funcionando
- [x] API Zorah Railway em produção
- [ ] Token de API do Zorah para N8N

---

## PASSO 1: Gerar Token de API para N8N

### 1.1. Fazer Login como MASTER/ADMIN no Zorah

Acesse: `https://zorahapp2-production.up.railway.app/login`

### 1.2. Gerar Token via API

**Método 1: Via Postman/Insomnia**

```http
POST https://zorahapp2-production.up.railway.app/api/auth/generate-n8n-token
Authorization: Bearer {seu_token_de_login}
```

**Método 2: Via curl**

```bash
curl -X POST https://zorahapp2-production.up.railway.app/api/auth/generate-n8n-token \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

**Resposta esperada:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "type": "n8n_integration",
  "expiresIn": "10 years",
  "usage": "Use este token no header: Authorization: Bearer {token}"
}
```

### 1.3. Salvar Token nas Variáveis de Ambiente do N8N

No N8N, adicione:

```
ZORAH_API_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## PASSO 2: Adicionar Nodes ao Workflow

### 2.1. Abrir o Workflow

No N8N, abra o workflow: **"ZoraH Bot - Simple Working"**

### 2.2. Adicionar Node "Verificador Paciente Zorah"

**Posição**: Após "Parse Intent Response", antes de "Intent Router"

**Tipo**: `HTTP Request Tool`

**Configurações**:

```json
{
  "name": "Verificador Paciente Zorah",
  "toolDescription": "Verifica se o paciente já existe no sistema Zorah usando o telefone",
  "method": "GET",
  "url": "=https://zorahapp2-production.up.railway.app/api/patients?search={{ $('Extract Data').item.json.phone }}",
  "authentication": "headerAuth",
  "genericAuthType": "httpHeaderAuth",
  "sendHeaders": true,
  "headerParameters": {
    "parameters": [
      {
        "name": "Authorization",
        "value": "={{ 'Bearer ' + $env.ZORAH_API_TOKEN }}"
      }
    ]
  },
  "options": {
    "response": {
      "response": {
        "neverError": true
      }
    }
  }
}
```

**Conectar como Tool** no "Intent Classifier Agent"

---

### 2.3. Adicionar Node "Patient Status Checker"

**Posição**: Após "Parse Intent Response"

**Tipo**: `Code`

**JavaScript**:

```javascript
// Obtém dados dos nodes anteriores
const intentData = $json;
const extractData = $items('Extract Data')[0]?.json || {};

// Busca resposta do Agil (da tool do Agent)
let agilData = null;
try {
  const agentOutput = $items('Intent Classifier Agent')[0]?.json;
  // Tenta extrair dados do Agil da resposta do agent
  if (agentOutput?.output?.includes('Identificador de Paciente')) {
    // Parse da resposta da tool
    const toolMatch = agentOutput.output.match(/Identificador de Paciente.*?data["\s]*:["\s]*\{([^}]+)\}/s);
    if (toolMatch) {
      agilData = JSON.parse(`{${toolMatch[1]}}`);
    }
  }
} catch (e) {
  console.log('Agil data not found or not used');
}

// Busca resposta do Zorah
let zorahData = null;
try {
  const agentOutput = $items('Intent Classifier Agent')[0]?.json;
  if (agentOutput?.output?.includes('Verificador Paciente Zorah')) {
    const toolMatch = agentOutput.output.match(/Verificador Paciente Zorah.*?patients["\s]*:["\s]*\[([^\]]+)\]/s);
    if (toolMatch) {
      const patientsArray = JSON.parse(`[${toolMatch[1]}]`);
      if (patientsArray.length > 0) {
        zorahData = patientsArray[0];
      }
    }
  }
} catch (e) {
  console.log('Zorah data not found');
}

const existsInAgil = agilData && agilData.name;
const existsInZorah = zorahData && zorahData.id;

// Define ação baseada no status
let action = 'CONTINUE';
let message = null;

if (existsInAgil && !existsInZorah) {
  action = 'CREATE_FROM_AGIL';
  message = `Olá, ${agilData.name}! 😊 Vi que você já é paciente do IAAM. Vou apenas registrar você no nosso sistema...`;
} else if (!existsInAgil && !existsInZorah) {
  action = 'COLLECT_DATA';
  message = null; // Vai para o agent coletor
} else if (existsInZorah) {
  action = 'CONTINUE';
  message = null; // Paciente já existe, continua fluxo normal
}

return [{
  json: {
    ...intentData,
    registrationStatus: {
      existsInAgil,
      existsInZorah,
      agilData: existsInAgil ? agilData : null,
      zorahData: existsInZorah ? zorahData : null,
      action,
      message,
      phone: extractData.phone,
      conversationId: extractData.conversationId
    }
  }
}];
```

---

### 2.4. Adicionar Node "Registration Router"

**Posição**: Após "Patient Status Checker"

**Tipo**: `Switch`

**Configurações**:

```json
{
  "name": "Registration Router",
  "rules": {
    "values": [
      {
        "conditions": {
          "conditions": [
            {
              "leftValue": "={{ $json.registrationStatus.action }}",
              "rightValue": "CONTINUE",
              "operator": {
                "type": "string",
                "operation": "equals"
              }
            }
          ]
        },
        "renameOutput": true,
        "outputKey": "continue"
      },
      {
        "conditions": {
          "conditions": [
            {
              "leftValue": "={{ $json.registrationStatus.action }}",
              "rightValue": "CREATE_FROM_AGIL",
              "operator": {
                "type": "string",
                "operation": "equals"
              }
            }
          ]
        },
        "renameOutput": true,
        "outputKey": "create_from_agil"
      },
      {
        "conditions": {
          "conditions": [
            {
              "leftValue": "={{ $json.registrationStatus.action }}",
              "rightValue": "COLLECT_DATA",
              "operator": {
                "type": "string",
                "operation": "equals"
              }
            }
          ]
        },
        "renameOutput": true,
        "outputKey": "collect_data"
      }
    ]
  }
}
```

---

### 2.5. Adicionar Node "Criar Paciente do Agil"

**Posição**: Saída "create_from_agil" do Router

**Tipo**: `HTTP Request`

**Configurações**:

```json
{
  "name": "Criar Paciente do Agil",
  "method": "POST",
  "url": "https://zorahapp2-production.up.railway.app/api/patients",
  "authentication": "genericCredentialType",
  "genericAuthType": "httpHeaderAuth",
  "sendHeaders": true,
  "headerParameters": {
    "parameters": [
      {
        "name": "Content-Type",
        "value": "application/json"
      },
      {
        "name": "Authorization",
        "value": "={{ 'Bearer ' + $env.ZORAH_API_TOKEN }}"
      }
    ]
  },
  "sendBody": true,
  "specifyBody": "json",
  "jsonBody": "={{ {\n  name: $json.registrationStatus.agilData.name,\n  phone: $json.registrationStatus.phone,\n  cpf: $json.registrationStatus.agilData.cpf || null,\n  email: $json.registrationStatus.agilData.email || null,\n  birthDate: $json.registrationStatus.agilData.birthDate || null,\n  insuranceCompany: $json.registrationStatus.agilData.insuranceCompany || null,\n  insuranceNumber: $json.registrationStatus.agilData.insuranceNumber || null\n} }}",
  "options": {
    "response": {
      "response": {
        "neverError": true
      }
    }
  }
}
```

---

### 2.6. Adicionar Node "Coletor Rápido Agent"

**Posição**: Saída "collect_data" do Router

**Tipo**: `AI Agent`

**Configurações**:

```javascript
{
  "name": "Coletor Rápido Agent",
  "promptType": "define",
  "text": "={{ $json.chatInput }}",
  "options": {
    "systemMessage": `Você é Zorah, assistente de cadastro do IAAM.

## MISSÃO:
Coletar dados do paciente de forma RÁPIDA e DIRETA.

## CONTEXTO:
O paciente ainda NÃO tem cadastro no sistema.

## DADOS NECESSÁRIOS:
1. ✅ Nome completo
2. ✅ CPF (11 dígitos, sem pontos/traços)
3. ✅ Email (opcional, mas recomendado)
4. ✅ Data de nascimento (formato DD/MM/AAAA, opcional)

## REGRAS:
- Seja OBJETIVA e RÁPIDA
- Peça TODOS os dados DE UMA VEZ em uma mensagem
- NÃO faça perguntas individuais (isso é LENTO)
- Valide CPF (deve ter 11 dígitos)
- Confirme os dados antes de salvar

## PRIMEIRA MENSAGEM (use exatamente esta):
"Para continuar, preciso de alguns dados rápidos 📋:

1️⃣ Nome completo
2️⃣ CPF
3️⃣ Email (opcional)
4️⃣ Data de nascimento (DD/MM/AAAA) (opcional)

Por favor, envie todos de uma vez, assim:
Nome: João Silva
CPF: 12345678900
Email: joao@email.com
Data: 15/01/1990"

## QUANDO RECEBER OS DADOS:
1. Valide o CPF (11 dígitos)
2. Confirme com o paciente
3. Retorne exatamente este JSON:

{
  "action": "REGISTER_PATIENT",
  "patientData": {
    "name": "João Silva",
    "cpf": "12345678900",
    "email": "joao@email.com",
    "birthDate": "1990-01-15"
  }
}

## IMPORTANTE:
- Se CPF inválido → peça novamente
- Se faltar nome → peça novamente
- Sempre confirme antes de retornar o JSON`
  }
}
```

**Conectar ao modelo Gemini e Postgres Memory**

---

### 2.7. Adicionar Node "Parse Coleta Response"

**Posição**: Após "Coletor Rápido Agent"

**Tipo**: `Code`

**JavaScript**:

```javascript
const agentResponse = $json;
const extractData = $items('Extract Data')[0]?.json || {};

function extractText(res) {
  if (!res) return '';
  if (typeof res === 'string') return res;
  if (res.output?.text) return res.output.text;
  if (typeof res.output === 'string') return res.output;
  if (res.text) return res.text;
  return '';
}

let responseText = extractText(agentResponse);
let patientData = null;
let shouldRegister = false;

// Tenta extrair JSON da resposta
const jsonMatch = responseText.match(/\{[\s\S]*?"action"[\s\S]*?\}/);
if (jsonMatch) {
  try {
    const parsed = JSON.parse(jsonMatch[0]);
    if (parsed.action === 'REGISTER_PATIENT' && parsed.patientData) {
      patientData = parsed.patientData;
      shouldRegister = true;
    }
  } catch (e) {
    console.log('Failed to parse patient data JSON');
  }
}

return [{
  json: {
    conversationId: extractData.conversationId,
    phone: extractData.phone,
    patientData,
    shouldRegister,
    response: responseText,
    chatInput: extractData.chatInput
  }
}];
```

---

### 2.8. Adicionar Node "Criar Paciente Coletado"

**Posição**: Após "Parse Coleta Response"

**Tipo**: `HTTP Request`

**Configurações**: (igual ao "Criar Paciente do Agil", mas com jsonBody diferente)

```json
{
  "jsonBody": "={{ {\n  name: $json.patientData.name,\n  phone: $json.phone,\n  cpf: $json.patientData.cpf || null,\n  email: $json.patientData.email || null,\n  birthDate: $json.patientData.birthDate || null\n} }}"
}
```

---

## PASSO 3: Conectar os Nodes

### 3.1. Fluxo Principal

```
Extract Data
  ↓
Intent Classifier Agent (com tools: Identificador de Paciente + Verificador Paciente Zorah)
  ↓
Parse Intent Response
  ↓
Patient Status Checker
  ↓
Registration Router
  ├─→ [continue] → Intent Router (existente)
  ├─→ [create_from_agil] → Criar Paciente do Agil → Merge com Intent Router
  └─→ [collect_data] → Coletor Rápido Agent → Parse Coleta Response → Criar Paciente Coletado → Merge com Intent Router
```

### 3.2. Adicionar Node Merge

**Posição**: Antes do "Intent Router" original

**Tipo**: `Merge`

**Conectar**:
- Registration Router [continue]
- Criar Paciente do Agil
- Criar Paciente Coletado

**Saída** → Intent Router

---

## PASSO 4: Atualizar System Message do Intent Classifier

No node "Intent Classifier Agent", atualizar o systemMessage para incluir:

```
## TOOLS DISPONÍVEIS:

1. **Identificador de Paciente** (Agil):
   - Use SEMPRE no início da conversa
   - Busca dados do paciente no sistema Agil
   - Retorna: nome, CPF, email, convênio

2. **Verificador Paciente Zorah**:
   - Use logo após o Identificador de Paciente
   - Verifica se paciente já existe no Zorah
   - Retorna: dados cadastrais do Zorah

⚠️ IMPORTANTE: Use AMBAS as tools antes de qualquer resposta ao paciente!
```

---

## PASSO 5: Testar o Workflow

### Teste 1: Paciente existe em ambos

**Input**:
```
{
  "phone": "5592991234567", // Paciente já cadastrado
  "message": "Oi, quero agendar"
}
```

**Resultado esperado**:
- Identificador de Paciente → encontra
- Verificador Paciente Zorah → encontra
- Action: CONTINUE
- Resposta: "Olá, João Silva! Para qual unidade..."

---

### Teste 2: Paciente só no Agil

**Input**:
```
{
  "phone": "5592998765432", // Existe no Agil, não no Zorah
  "message": "Oi"
}
```

**Resultado esperado**:
- Identificador de Paciente → encontra dados do Agil
- Verificador Paciente Zorah → não encontra
- Action: CREATE_FROM_AGIL
- Cria paciente no Zorah automaticamente
- Resposta: "Olá, João Silva! Vi que você já é paciente..."

---

### Teste 3: Paciente novo

**Input**:
```
{
  "phone": "5592987654321", // Não existe em nenhum lugar
  "message": "Oi, quero agendar"
}
```

**Resultado esperado**:
- Identificador de Paciente → não encontra
- Verificador Paciente Zorah → não encontra
- Action: COLLECT_DATA
- Ativa Coletor Rápido Agent
- Resposta: "Para continuar, preciso de alguns dados rápidos..."

Paciente responde:
```
Nome: Maria Santos
CPF: 98765432100
Email: maria@email.com
Data: 20/05/1995
```

Agent:
- Valida CPF ✅
- Confirma: "Perfeito, Maria Santos! Confirma os dados?"

Paciente: "Sim"

Agent:
- Retorna JSON com action: REGISTER_PATIENT
- Cria paciente no Zorah
- Resposta: "Cadastro realizado com sucesso! ✅"

---

## PASSO 6: Monitorar e Ajustar

### Logs Importantes

No N8N, adicionar logs:

```javascript
// No node "Patient Status Checker"
console.log('📊 Status:', {
  existsInAgil,
  existsInZorah,
  action,
  phone: extractData.phone
});

// No node "Criar Paciente"
console.log('✅ Paciente criado:', {
  source: agilData ? 'agil' : 'manual',
  name: $json.name,
  timestamp: new Date().toISOString()
});
```

### Métricas a Acompanhar

1. **Taxa de cadastro automático**: Pacientes vindos do Agil
2. **Tempo médio de coleta**: Do início ao cadastro completo
3. **Taxa de erro**: CPF/dados inválidos
4. **Taxa de abandono**: Pacientes que não completam cadastro

---

## ✅ Checklist Final

- [ ] Token N8N gerado e salvo
- [ ] Variável `ZORAH_API_TOKEN` configurada
- [ ] Node "Verificador Paciente Zorah" adicionado
- [ ] Node "Patient Status Checker" adicionado
- [ ] Node "Registration Router" adicionado
- [ ] Node "Criar Paciente do Agil" adicionado
- [ ] Node "Coletor Rápido Agent" adicionado
- [ ] Node "Parse Coleta Response" adicionado
- [ ] Node "Criar Paciente Coletado" adicionado
- [ ] Node "Merge" adicionado
- [ ] Todas as conexões feitas
- [ ] Teste 1 (ambos sistemas) passou ✅
- [ ] Teste 2 (só Agil) passou ✅
- [ ] Teste 3 (novo) passou ✅
- [ ] Logs configurados
- [ ] Workflow ativado

---

**Tempo estimado de implementação**: 2-3 horas  
**Complexidade**: Média  
**Impacto**: Alto (reduz 80% do tempo de cadastro)

---

Última atualização: 25/01/2026
