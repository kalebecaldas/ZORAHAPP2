# Plano de Melhorias — ZoraH (Sessão Futura)

> Criado em: 24/03/2026  
> Status: 🟡 Aguardando implementação  
> Arquivos de referência: `LOGOS/logo zorah completo.png`, `LOGOS/logo zorah icon.png`

---

## 1. Taxa de Conversão & Dashboard

### Diagnóstico atual

A taxa de conversão já usa `closeCategory: { in: ['AGENDAMENTO', 'AGENDAMENTO_PARTICULAR'] }` na maioria das rotas, **mas há dois problemas**:

**Problema A — Rota `/api/analytics/conversion` exclui atendentes humanos:**
```ts
// api/routes/analytics.ts:199-215
// assignedToId: null → conta SÓ conversas resolvidas pelo bot
// Conversas de atendentes que fecharam com agendamento são ignoradas
```

**Problema B — Receita no ROI usa valor fixo hardcoded:**
```ts
// api/routes/analytics.ts:794
const AVG_PROCEDURE_VALUE = 150  // ← inventado, não reflete a realidade
const regularRevenue = appointmentsFromBot * AVG_PROCEDURE_VALUE
```
A página de Estatísticas exibe `revenueGenerated = regularRevenue + privateRevenue`,  
onde `regularRevenue` é calculado com R$ 150/agendamento fixo. Isso está **errado**.

### O que corrigir

#### 1.1 Taxa de conversão global (rota `/conversion`)
- Remover filtro `assignedToId: null` → contar **todas** as conversas encerradas com agendamento
- Separar: taxa bot × taxa atendente × taxa total

```ts
// Nova lógica:
const totalClosed = prisma.conversation.count({ where: { status: 'FECHADA', closedAt: { gte } } })
const totalConverted = prisma.conversation.count({
  where: {
    status: 'FECHADA',
    closedAt: { gte },
    closeCategory: { in: ['AGENDAMENTO', 'AGENDAMENTO_PARTICULAR'] }
  }
})
// conversionRate = totalConverted / totalClosed * 100
```

#### 1.2 Receita na página de Estatísticas (rota `/roi`)
- Não usar `AVG_PROCEDURE_VALUE = 150`  
- Somar somente o `privateAppointment.totalValue` de `AGENDAMENTO_PARTICULAR`  
- Para `AGENDAMENTO` (convênio), exibir **quantidade** de agendamentos, não valor monetário estimado  
- Renomear o card na UI: "Receita Particular Gerada" (não "Receita Total")

#### 1.3 Arquivo a editar
- `api/routes/analytics.ts` → rotas `/conversion`, `/roi`, `/funnel`
- `src/pages/Stats.tsx` → card de receita, label do tooltip

---

## 2. Logo & Remoção de Branding

### Diagnóstico atual
- `src/pages/Settings.tsx` tem aba de Branding que permite editar nome e logo
- `src/services/systemBrandingService.ts` carrega logo dinamicamente
- O sistema continua com logo genérica/SVG padrão

### O que corrigir

#### 2.1 Fixar a logo definitivamente
- Copiar `LOGOS/logo zorah completo.png` → `public/logo-zorah.png`
- Copiar `LOGOS/logo zorah icon.png` → `public/logo-zorah-icon.png`
- Em `src/components/Layout.tsx` e `src/components/Sidebar.tsx`: substituir qualquer `<img src={branding.logoUrl}>` por `<img src="/logo-zorah.png">` (logo completa no sidebar aberto) e `<img src="/logo-zorah-icon.png">` (ícone no sidebar recolhido)
- Em `index.html`: `<link rel="icon" href="/logo-zorah-icon.png">`

#### 2.2 Remover aba de Branding das Configurações
- `src/pages/Settings.tsx`: remover tab "Branding" e todo estado `systemBranding`
- `src/components/settings/SystemSettingsTab.tsx`: verificar se tem algum bloco de branding e remover
- Manter apenas: Configurações Gerais, Inatividade, Respostas Rápidas, etc.

#### 2.3 Arquivos a editar
- `src/pages/Settings.tsx`
- `src/components/Layout.tsx`
- `src/components/Sidebar.tsx`
- `index.html`
- `public/` (copiar os PNGs)

---

## 3. N8N — Reduzir Alucinações do Bot

### Diagnóstico atual
- O bot consulta `https://zorahapp2-production.up.railway.app/api/clinic/data/vieiralves`  
  e `https://zorahapp2-production.up.railway.app/api/clinic/data/sao-jose`
- Mas ainda alucina valores, procedimentos e informações que não constam na API

### O que ajustar no N8N

#### 3.1 Prompt do agente (system message)
Adicionar instrução explícita:

```
Você é um atendente virtual da clínica de fisioterapia. 

REGRAS ABSOLUTAS:
1. NUNCA invente preços, procedimentos ou convênios. Use APENAS os dados retornados pela tool de consulta.
2. Se um procedimento não estiver na lista, diga: "No momento não oferecemos esse serviço."
3. Se um convênio não estiver na lista, diga: "Esse convênio não é aceito nesta unidade."
4. Se um preço não estiver disponível, diga: "Para informações de valor, por favor entre em contato."
5. Use SEMPRE os valores exatos retornados pela API. Não arredonde nem estime.
```

#### 3.2 Tool de consulta de dados da clínica
- Manter a tool que chama a API do ZoraH
- Adicionar **instrução na tool** (field "description" no N8N):
  ```
  Consulte esta tool ANTES de responder qualquer pergunta sobre procedimentos, 
  preços ou convênios. Retorne os dados exatamente como recebidos.
  ```
- Configurar a tool para ser chamada **obrigatoriamente** no início de cada conversa (não apenas quando solicitado)

#### 3.3 Temperatura do modelo
- Reduzir temperature para `0.2` ou `0.3` para respostas mais consistentes e menos criativas

---

## 4. Skill — Integração Clínica Ágil API

### Objetivo
Criar uma skill para o agente ZoraH que busca dados do paciente na Clínica Ágil antes de iniciar o atendimento, e cadastra novos pacientes quando não encontrado.

### Endpoint de consulta
```
POST https://app2.clinicaagil.com.br/api/integration/patient_data
Headers:
  X-API-KEY: <chave>
  X-API-METHOD: Ch4tB0tW4tsS4v3QRc0d3
  accept: application/json
  content-type: multipart/form-data
Body:
  numero_paciente: <telefone com DDD>
```

**Resposta (encontrado):**
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

**Resposta (não encontrado):** `{ "status": "not_found" }`

### Fluxo proposto

```
1. Mensagem recebida
   ↓
2. Buscar paciente na Clínica Ágil (pelo telefone do WhatsApp/Instagram)
   ↓
3a. Encontrado → Pre-preencher contexto no ZoraH (nome, convênio, email)
               → Bot cumprimenta pelo nome: "Olá, [nome]! Como posso ajudar?"
   ↓
3b. Não encontrado → Bot coleta dados:
    - Nome completo
    - CPF (opcional)
    - E-mail
    - Convênio ou particular
    → Cadastrar no ZoraH (tabela Patient)
    → [Futuramente] Cadastrar na Clínica Ágil via API se houver endpoint de POST
```

### O que criar

#### 4.1 Skill `.cursor/skills/clinica-agil-api/SKILL.md`
Documentar:
- Como chamar a API
- Fluxo de busca e cadastro
- Mapeamento `convenio_id` → nome do convênio (precisamos do mapa da Clínica Ágil)
- Tratamento de erros (timeout, not_found, erro de API)

#### 4.2 Tool no N8N
- HTTP Request node: `POST /api/integration/patient_data`
- Extrair `numero_paciente` do telefone da conversa
- Se `status === 'success'`: injetar dados no contexto do bot
- Se `status !== 'success'`: iniciar fluxo de coleta de dados

#### 4.3 Variável de ambiente necessária
```
CLINICA_AGIL_API_KEY=<chave fornecida pela clínica>
```
Adicionar no Railway após obter a chave.

#### 4.4 Arquivos a criar/editar no backend (opcional)
- `api/routes/clinicaAgil.ts` — proxy seguro para a API (evitar expor API KEY no N8N)
- `api/app.ts` — registrar rota `/api/clinica-agil/patient`

---

## Ordem de Execução Sugerida

| # | Tarefa | Complexidade | Impacto |
|---|--------|--------------|---------|
| 1 | Fixar logo + remover Branding | Baixa | Visual imediato |
| 2 | Corrigir taxa de conversão (analytics) | Média | Dados corretos no dashboard |
| 3 | Corrigir receita na página Stats | Média | Dados confiáveis |
| 4 | Ajustar prompt N8N (temperatura + regras) | Baixa | Menos alucinações imediato |
| 5 | Criar skill Clínica Ágil | Alta | Atendimento mais inteligente |
| 6 | Implementar tool N8N Clínica Ágil | Alta | Integração real de dados |

---

## Notas Técnicas

- **API Clínica Ágil**: Confirmar se o `convenio_id` retornado (`"4"`) tem um mapeamento público ou se precisamos da tabela de convênios da Clínica Ágil
- **Taxa de conversão**: Verificar se o campo `closeCategory` é preenchido automaticamente pelo bot ou manualmente pelo atendente — se for só manual, a taxa bot vai ser sempre 0
- **Deploy**: Após cada sessão de código, fazer commit + push (Railway auto-deploys via GitHub)
- **Instagram token**: Ainda precisa ser renovado no Facebook Developer Console (token atual expirou)
- **AUTH_JWT_SECRET**: Adicionar no Railway com o mesmo valor de `JWT_SECRET`
