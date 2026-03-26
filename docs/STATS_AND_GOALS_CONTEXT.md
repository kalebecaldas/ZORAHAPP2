# Contexto: Estatísticas de Encerramento e Tempo de Resposta — ZoraH

> Documento de referência para ajustes de metas, SLA e métricas.
> Gerado em: 25/03/2026

---

## 1. Encerramento de Conversas

### 1.1 Campos relevantes no schema (`Conversation`)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `status` | String | Estado atual: `BOT_QUEUE`, `PRINCIPAL`, `AGUARDANDO`, `EM_ATENDIMENTO`, **`FECHADA`** |
| `closedAt` | DateTime? | Timestamp do encerramento manual |
| `closedByUserId` | String? | ID do usuário que encerrou |
| `closeCategory` | String? | Categoria de encerramento (ex.: `AGENDAMENTO`, `AGENDAMENTO_PARTICULAR`) |
| `privateAppointment` | Json? | Dados do agendamento particular (se categoria = `AGENDAMENTO_PARTICULAR`) |
| `normalAppointment` | Json? | Dados do agendamento normal (se categoria = `AGENDAMENTO`) |
| `sessionStatus` | String? | `active` / `expired` / `closed` |
| `sessionStartTime` | DateTime? | Início da sessão atual |
| `sessionExpiryTime` | DateTime? | Expiração da sessão (24h após última interação) |
| `lastUserActivity` | DateTime? | Última atividade do usuário |
| `lastAgentActivity` | DateTime? | Última atividade do atendente |
| `createdAt` | DateTime | Criação da conversa |
| `updatedAt` | DateTime | Última atualização |

> **Não existe** campo `resolvedAt`. O timestamp formal de encerramento é **`closedAt`**.

---

### 1.2 Fluxos de Encerramento

#### A) Encerramento Manual (action: `close`)

Arquivo: `api/routes/conversations.ts`

- Requer campo `category` no payload.
- Valida e persiste:
  - `status: 'FECHADA'`
  - `assignedToId: null`
  - `sessionStatus: 'closed'`
  - `closeCategory` (categoria informada)
  - `closedAt: new Date()`
  - `closedByUserId` (usuário que fechou)
  - `privateAppointment` ou `normalAppointment` (conforme categoria)
- Pode enviar mensagem de encerramento via WhatsApp.
- Dispara webhook `conversation_closed` com:
  ```json
  { "metrics": { "duration": "<segundos entre createdAt e closedAt>" } }
  ```

#### B) Encerramento por Expiração de Sessão (~24h)

- Se sessão expirou e conversa **não** está `EM_ATENDIMENTO` com atendente:
  - Atualiza: `status: 'FECHADA'`, `sessionStatus: 'expired'`, `lastUserActivity`
  - **NÃO** define `closedAt`, `closeCategory` nem `closedByUserId`
- Se está na fila do atendente:
  - Apenas marca `sessionStatus: 'expired'` — **não fecha**

#### C) Reabertura

- Define `status: 'PRINCIPAL'`, `assignedToId: null`
- `closedAt` e `closeCategory` **não são limpos** na reabertura — dados antigos persistem no registro

---

### 1.3 Impactos nos Relatórios

| Cenário | closedAt preenchido | closeCategory preenchida | Conta em analytics? |
|---------|--------------------|--------------------------|--------------------|
| Encerramento manual | ✅ | ✅ | ✅ Sim (todos) |
| Expiração de sessão | ❌ | ❌ | ⚠️ Parcial (`status=FECHADA` conta, mas sem categoria) |
| Reabertura de conversa fechada | (mantém valor antigo) | (mantém valor antigo) | ⚠️ Pode distorcer |

**Endpoint afetado:** `GET /api/analytics/closure-categories`
- Faz `groupBy closeCategory WHERE status=FECHADA AND closeCategory IS NOT NULL`
- Conversas expiradas (sem `closeCategory`) ficam **fora** deste relatório

---

## 2. Tempo de Resposta

### 2.1 Três definições em uso simultâneo (problema de consistência)

#### Definição A — `stats.ts` (`GET /api/stats`)

**Fórmula:** `AVG(m2.timestamp - m1.timestamp)` onde `m1.direction = 'RECEIVED'` e `m2.direction = 'SENT'` com `m2.timestamp > m1.timestamp`

- **Problema:** junta **qualquer** mensagem SENT posterior, não apenas a primeira resposta. Pode subestimar a média.
- **Unidade retornada:** segundos (`avg_time`)
- **Como o frontend usa:** `avgResponseTime / 60` → exibe em minutos (Dashboard.tsx, Stats.tsx)

#### Definição B — `analytics.ts` (`calculateAvgResponseTime`)

**Fórmula:** Para cada mensagem `RECEIVED`, busca a **primeira** `SENT` com `MIN(m3.timestamp)` em subquery

- Mais precisa para "tempo até primeira resposta por turno"
- Filtra por `assignedToId = userId` e `c.createdAt >= startDate`
- Usado em: ManagerDashboard, AgentDashboard, metas de `RESPONSE_TIME`

#### Definição C — `stats.ts` (`GET /api/stats/reports`)

**Fórmula:** `AVG(updatedAt - createdAt)` por conversa atribuída → `avg_duration_hours`

- **Não é tempo de resposta** — é duração bruta da conversa
- **Problema:** `Stats.tsx` exibe isso como "Tempo de Resposta" na tabela de agentes (`avg_duration_hours * 60`)
- **Resultado:** label enganoso — duração de conversa ≠ tempo de resposta

> ⚠️ As três definições produzem números **incompatíveis** entre telas diferentes do produto.

---

### 2.2 Thresholds e Constantes Hardcoded

| Arquivo | Valor | Contexto |
|---------|-------|----------|
| `conversations.ts` | **24 horas** | Expiração de sessão |
| `conversations.ts` | **30 segundos** | Transferência automática bot→humano |
| `analytics.ts` | `AVG_HUMAN_CONVERSATION_MINUTES = 15` | Cálculo de ROI |
| `analytics.ts` | `COST_PER_HOUR = 30` | Cálculo de ROI |
| `ManagerDashboard.tsx` | `avgResponseTimeMinutes > 10` | Alerta visual "precisa atenção" |
| `AgentDashboard.tsx` | `avgResponseTimeMinutes > 5` | Dica de UX para atendente |
| `badgeSystem.ts` | `< 3 min` | Badge de velocidade (básico) |
| `badgeSystem.ts` | `< 1 min` | Badge de velocidade (elite) |
| `badgeSystem.ts` | `responseScore = 100 - (avgResponseTimeMinutes - 3) * 14` | Score de performance (satura em 0–100) |

---

## 3. Metas (`Goal`)

### 3.1 Schema do modelo `Goal`

| Campo | Tipo | Valores |
|-------|------|---------|
| `type` | String | `CONVERSATIONS`, `APPOINTMENTS`, `CONVERSION_RATE`, `RESPONSE_TIME` |
| `target` | Float | Valor alvo configurado |
| `period` | String | `DAILY`, `WEEKLY`, `MONTHLY` |
| `isActive` | Boolean | Ativa ou não |

Constraint: `@@unique([userId, type, period])` — uma meta por tipo/período/usuário

### 3.2 Lógica de Progresso Atual

**Arquivo:** `api/routes/goals.ts` → `GET /api/goals/users/:userId/progress`

```
achieved = current >= target   ← para TODOS os tipos
```

> ⚠️ **Bug lógico para `RESPONSE_TIME`:** Um tempo de resposta **menor** é melhor. Com a lógica `current >= target`, uma meta "responder em até 3 min" (`target = 3`) seria marcada como **alcançada** com `current = 10 min` (pior). A condição deveria ser `current <= target` para este tipo.

### 3.3 Cálculo do Valor Atual para `RESPONSE_TIME` (metas)

- Usa a **Definição B** (primeira resposta por turno)
- Restrita a conversas com `c.closedAt` no intervalo do período da meta
- Filtra por `assignedToId` do usuário

### 3.4 Placeholder não implementado

```
GET /api/analytics/conversion → avgResolutionTimeMinutes: 0  // sempre zero
```

---

## 4. Componentes de Frontend

### 4.1 Páginas principais

| Arquivo | O que exibe |
|---------|-------------|
| `src/pages/Dashboard.tsx` | KPIs de `/api/stats`, tendências de `/api/stats/reports` |
| `src/pages/Stats.tsx` | Stats + analytics, conversion, closure-categories |
| `src/pages/DashboardIntelligent.tsx` | Roteador gerente vs atendente |
| `src/pages/ConversationsNew.tsx` | UI de `closeCategory` e envio do fechamento |

### 4.2 Componentes de dashboard

| Arquivo | O que exibe |
|---------|-------------|
| `src/components/dashboards/ManagerDashboard.tsx` | Equipe, `avgResponseTimeMinutes`, alertas |
| `src/components/dashboards/AgentDashboard.tsx` | `/api/analytics/agents/me`, metas, comparação com equipe |
| `src/components/dashboards/AgentRankingCard.tsx` | Tempo médio por atendente |
| `src/components/dashboards/PersonalPerformanceChart.tsx` | Eixo "Tempo de Resposta (min)" |
| `src/components/dashboards/TeamPerformanceChart.tsx` | Gráfico de equipe |
| `src/components/dashboards/GoalsProgress.tsx` | Progresso das metas |
| `src/components/settings/GoalsManagement.tsx` | Configuração de metas (Settings) |

---

## 5. Problemas Identificados para Ajuste

### P1 — Bug Crítico: Lógica invertida para meta `RESPONSE_TIME`
- **Onde:** `api/routes/goals.ts`, função de cálculo de `achieved`
- **Fix:** `achieved = type === 'RESPONSE_TIME' ? current <= target : current >= target`

### P2 — Inconsistência: Três definições de "tempo de resposta"
- `stats.ts` (qualquer par RECEIVED→SENT) ≠ `analytics.ts` (primeira SENT por turno) ≠ `reports` (duração da conversa)
- **Fix sugerido:** padronizar em uma única função compartilhada usando a **Definição B** (mais precisa)

### P3 — Label errado: "Tempo de Resposta" na tabela de agentes (`Stats.tsx`)
- Exibe `avg_duration_hours * 60` mas rotula como "Tempo de Resposta"
- **Fix:** renomear para "Duração Média da Conversa" ou recalcular com a métrica correta

### P4 — Encerramento por expiração não preenche `closedAt` nem `closeCategory`
- Conversas expiradas ficam fora dos relatórios de categorias
- **Fix:** no fluxo de expiração, definir `closedAt: new Date()` e `closeCategory: 'SESSAO_EXPIRADA'`

### P5 — Placeholder `avgResolutionTimeMinutes: 0` em `/api/analytics/conversion`
- Campo sempre retorna zero, nunca implementado

### P6 — `closedAt` não é limpo na reabertura de conversa
- Se uma conversa é reaberta, o `closedAt` antigo persiste e pode distorcer cálculos de duração

---

## 6. Endpoints de API Relevantes

| Método | Rota | Uso |
|--------|------|-----|
| `GET` | `/api/stats` | KPIs gerais (usa Definição A) |
| `GET` | `/api/stats/reports` | Relatórios por agente (usa duração bruta) |
| `GET` | `/api/analytics/agents` | Lista de agentes com métricas (usa Definição B) |
| `GET` | `/api/analytics/agents/me` | Métricas do atendente logado |
| `GET` | `/api/analytics/conversion` | Taxa de conversão (avgResolutionTime = 0) |
| `GET` | `/api/analytics/closure-categories` | Distribuição por categoria de encerramento |
| `GET` | `/api/goals/users/:userId/progress` | Progresso das metas do usuário |
| `POST` | `/api/goals` | Criar/atualizar meta |

---

## 7. Sistema de Badges (`badgeSystem.ts`)

Referência para entender os thresholds atuais de performance:

| Badge | Critério |
|-------|----------|
| Velocidade básica | `avgResponseTimeMinutes < 3` |
| Velocidade elite | `avgResponseTimeMinutes < 1` |
| Alta conversão | `conversionRate > 70%` |
| Conversão elite | `conversionRate > 85%` |
| Taxa de fechamento alta | `closeRate > 80%` |
| Taxa de fechamento elite | `closeRate > 90%` |
| Volume alto | `> 15 conversas` no período |
| Consistência | streak `>= 3` períodos consecutivos |

**Fórmula do score de resposta:**
```
responseScore = Math.max(0, Math.min(100, 100 - (avgResponseTimeMinutes - 3) * 14))
```
- Score 100 = ≤ 3 min
- Score 86 = 4 min
- Score 72 = 5 min
- Score 0 = ≥ 10.14 min

---

## 8. Resumo: O que Precisamos Decidir

Antes dos ajustes, definir:

1. **Qual definição de "tempo de resposta" é a oficial?** (Definição A, B ou nova?)
2. **Qual meta de tempo de resposta é razoável para o produto?** (atualmente: alerta em > 5 min no AgentDashboard e > 10 min no ManagerDashboard)
3. **Como tratar conversas expiradas nas estatísticas?** (ignorar? usar categoria própria?)
4. **O score de badges (base 3 min, penalidade 14pts/min) está correto para o negócio?**
5. **`avgResolutionTimeMinutes` precisa ser implementado de fato?**
