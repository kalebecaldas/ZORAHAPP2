---
name: ZoraH Agent
description: Agente geral do projeto ZoraH. Conhece a stack completa, o banco de dados, os padrões de segurança e roteia para as skills adequadas conforme o domínio da tarefa. Use para qualquer tarefa de desenvolvimento no projeto ZoraH.
---

You are the ZoraH project AI assistant — a SaaS platform for physiotherapy clinic management with conversational AI via WhatsApp/Instagram.

## Stack

- **Frontend:** React 18 + TypeScript + Vite 6 + Tailwind CSS + Zustand + @xyflow/react + Framer Motion + Lucide + Recharts + Sonner
- **Backend:** Express 4 + Prisma 6 + PostgreSQL + Socket.io + Zod
- **AI:** OpenAI GPT-4o + n8n + WhatsApp Business API + Instagram Graph API
- **Deploy:** Railway (backend, port 3001) + Vercel (frontend, port 4002 in dev)

## Key Files

- `api/app.ts` — route registry (some public routes without auth — security concern)
- `api/utils/auth.ts` — JWT middleware + role system (MASTER/ADMIN/SUPERVISOR/ATENDENTE)
- `api/services/conversationalAI.ts` — main AI bot with `buildRichSystemPrompt`, history slice (-10), max_tokens=500
- `api/services/conversationContext.ts` — `EnhancedContext` builder (patient, history, appointments, learning, memory)
- `api/services/costMonitoring.ts` — token usage logging (required after every OpenAI call)
- `src/styles/design-system.css` — ZoraH CSS variables (primary: #3B82F6)
- `src/components/ui/DesignSystem.tsx` — base components (StatCard, MetricBadge, skeleton, fade-in)
- `prisma/schema.prisma` — DB schema (27 models, PostgreSQL)

## Database Schema (27 models — PostgreSQL via Prisma 6)

### Domain 1 — Clinic & Catalog
- `Clinic` — physical units (address, openingHours:Json, coordinates:Json, specialties:Json, accessibility:Json)
- `Procedure` — therapy catalog (basePrice, duration, categories:Json, requiresEvaluation)
- `InsuranceCompany` — accepted insurance plans (discount, discountPercentage, isParticular)
- `ClinicInsurance` — junction: Clinic ↔ InsuranceCompany
- `ClinicProcedure` — junction: Clinic ↔ Procedure (with defaultPrice)
- `ClinicInsuranceProcedure` — **SOURCE OF TRUTH FOR PRICES**: Clinic × InsuranceCompany × Procedure (price, hasPackage)

### Domain 2 — Patients (PHI/LGPD)
- `Patient` — PHI: phone:unique, name, cpf:unique, email, birthDate, insuranceCompany, preferences:Json
- `Appointment` — procedure, date, time, status[SCHEDULED|...], notes
- `PatientInteraction` — generic interaction log (type, data:Json)

### Domain 3 — Conversations & Messages
- `Conversation` — status:String[BOT_QUEUE|HUMAN_QUEUE|CLOSED], channel[whatsapp|instagram|messenger], patientId, assignedToId, workflowId, sessionStatus, unreadCount, closeCategory, tabulação fields
- `Message` — messageText, messageType[TEXT|IMAGE|DOCUMENT|AUDIO|VIDEO|SYSTEM], direction, mediaUrl, systemMessageType, metadata:Json

### Domain 4 — Users & Operations
- `User` — email, role[MASTER|ADMIN|SUPERVISOR|ATENDENTE], isMasterFrozen
- `Goal` — type[CONVERSATIONS|APPOINTMENTS|CONVERSION_RATE|RESPONSE_TIME], target, period[DAILY|WEEKLY|MONTHLY]
- `QuickReply` — shortcut, text, isGlobal
- `AuditLog` — actorId, action, details:Json

### Domain 5 — AI Conversational
- `AIConfiguration` — systemPrompt:Text, personality, tone, temperature, maxTokens, businessRules:Json
- `AIExample` — few-shot: userMessage, expectedIntent, expectedAction, botResponse, entities:Json, confidence
- `TransferRule` — keywords:[], intents:[], targetQueue, transferMessage
- `AILearningData` — phone, intent, sentiment, style, context:Json
- `ResponseRule` — intent, template:Text with variables, conditions:Json, priority
- `ProcedureRule` — procedureCode, requiresEvaluation, evaluationPrice, packageRules, specialConditions:Json
- `InsuranceRule` — insuranceCode, hideValues, showCoveredProcedures, customGreeting, specialProcedures:Json

### Domain 6 — System & Integrations
- `Template` — key:unique, category, content with variables:Json
- `SystemSettings` — inactivityTimeoutMinutes, closingMessage, autoAssignEnabled, maxConversationsPerAgent
- `Workflow` — name, type, config:Json, isActive
- `WebhookSubscription` — url, token:unique, events:[], metadata:Json
- `WebhookLog` — subscriptionId, eventType, payload:Json, statusCode, success

### Known Indexing Gaps (performance risk at scale)
- `Message.conversationId` — no explicit index (hot path: loading messages)
- `Conversation.status` — no index (hot path: filtering queues)
- `AILearningData.phone` — no index
- `AuditLog.createdAt`, `AuditLog.action` — no index

### Rules for New Features
- Prices: ALWAYS query `ClinicInsuranceProcedure`, never `Procedure.basePrice`
- `Conversation.status` is String (not enum) — use existing values only
- No `MemoryData` model — memory stored in `PatientInteraction` or `AILearningData`
- `AIConfiguration.systemPrompt` is `@db.Text` — don't eager-load with `AIExample[]`

## Skill Routing

Load the matching skill BEFORE acting on any task:

| Task Domain | Load Skill |
|-------------|-----------|
| Security, auth, routes, webhooks | `security-best-practices` |
| New feature planning | `tlc-spec-driven` |
| Pre-deploy audit, performance | `web-quality-audit` |
| React performance, Core Web Vitals | `core-web-vitals` |
| OpenAI calls, prompts, token budget | `zorah-token-optimizer` |
| React components, UI, design system | `zorah-ui-system` |
| Prisma schema, migrations, PHI data | `zorah-prisma-safe` |
| Deploy Railway, logs, env vars, CI/CD | `zorah-railway-deploy` |

## Protocol

1. **Classify** the task domain(s)
2. **Load** matching skill(s) from `.cursor/skills/`
3. **Apply** skill rules BEFORE writing any code
4. **Check** existing patterns in the codebase before introducing new ones
5. For multi-domain tasks: load multiple skills, apply all constraints

## Critical Known Issues (NEVER replicate these patterns)

- `new OpenAI({ apiKey })` in browser — **FORBIDDEN**, all AI calls must go through `api/`
- `NODE_ENV === 'development'` auth bypass — **SECURITY DEBT**, never add more
- JWT in `localStorage` — flag for migration to httpOnly cookie in new auth features
- Hardcoded fallback values for secrets — always `throw new Error()` on missing env vars
- Rate limiter disabled in development — use relaxed values, never absence
