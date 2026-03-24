---
name: /db-map
description: Gera ou atualiza .specs/codebase/DATABASE.md com mapeamento completo do banco ZoraH — diagrama ER em Mermaid, 6 domínios de negócio, campos PHI para LGPD, issues de indexação e guia de padrões de acesso para novas features.
---

Generate or update the complete ZoraH database documentation at `.specs/codebase/DATABASE.md`.

## Step 1: Load skill
Load `zorah-prisma-safe` skill for database context and PHI knowledge.

## Step 2: Read the schema
Read `prisma/schema.prisma` completely to get the current authoritative schema.

## Step 3: Create directory if needed
Ensure `.specs/codebase/` directory exists.

## Step 4: Generate DATABASE.md

Create `.specs/codebase/DATABASE.md` with the following sections:

### Section 1: Overview
```markdown
# ZoraH Database

**Provider:** PostgreSQL  
**ORM:** Prisma 6 (`prisma-client-js`)  
**Connection:** `DATABASE_URL` env var  
**Deploy:** Railway  
**Models:** 27  
**Last updated:** [today]
```

### Section 2: ER Diagram (Mermaid)
Generate a Mermaid `erDiagram` showing all models with their key fields and relationships. Group by domain using comments.

Include relationships:
- User → Conversation (assignedTo, closedBy)
- User → Goal, QuickReply, AuditLog
- Patient → Conversation, Appointment, PatientInteraction
- Conversation → Message
- Clinic ↔ InsuranceCompany (via ClinicInsurance)
- Clinic ↔ Procedure (via ClinicProcedure)
- Clinic × InsuranceCompany × Procedure (via ClinicInsuranceProcedure)
- AIConfiguration → AIExample, TransferRule
- WebhookSubscription → WebhookLog

### Section 3: Domain Groups
Document each of the 6 domains:

**Domain 1 — Clinic & Catalog** (6 models)
**Domain 2 — Patients (PHI/LGPD)** (3 models)
**Domain 3 — Conversations & Messages** (2 models)
**Domain 4 — Users & Operations** (4 models)
**Domain 5 — AI Conversational** (7 models)
**Domain 6 — System & Integrations** (5 models)

For each model: name, purpose (1 sentence), key fields, relationships.

### Section 4: PHI Fields (LGPD)
```markdown
## PHI Fields (Protected Health Information — LGPD)

| Model | PHI Fields | Sensitivity |
|-------|-----------|-------------|
| Patient | name, phone, cpf, email, birthDate, address, emergencyContact, insuranceNumber | HIGH |
| Appointment | patientName, patientPhone, notes | MEDIUM |
| Conversation | phone, patientId, privateAppointment, normalAppointment | MEDIUM |
| Message | messageText, phoneNumber, mediaUrl | MEDIUM |
| AILearningData | phone, intent, sentiment, context | LOW-MEDIUM |
| PatientInteraction | description, data | LOW-MEDIUM |
```

### Section 5: Indexing Analysis
```markdown
## Indexing Analysis

### Existing Indexes
[List all @@index and @unique constraints per model]

### Missing Indexes (performance risk)
| Table | Field | Query Pattern | Impact |
|-------|-------|---------------|--------|
| Message | conversationId | Load conversation messages | CRITICAL |
| Message | timestamp | Order messages | HIGH |
| Conversation | status | Filter queues (BOT_QUEUE, HUMAN_QUEUE) | CRITICAL |
| Conversation | assignedToId | Agent's conversation list | HIGH |
| AILearningData | phone | Lookup patient learning data | MEDIUM |
| AuditLog | createdAt | Audit reports by date | MEDIUM |
| AuditLog | actorId | User action history | MEDIUM |

### Recommended Migration
[Provide the @@index additions as a Prisma schema diff]
```

### Section 6: Enum-like String Fields
```markdown
## String Fields Used as Enums (not enforced by Prisma)

| Model | Field | Known Values |
|-------|-------|-------------|
| Conversation | status | BOT_QUEUE, HUMAN_QUEUE, CLOSED, PENDING |
| Conversation | channel | whatsapp, instagram, messenger |
| Conversation | sessionStatus | active, warning, expired, closed |
| Message | messageType | TEXT, IMAGE, DOCUMENT, AUDIO, VIDEO, SYSTEM |
| Appointment | status | SCHEDULED, CONFIRMED, CANCELLED, COMPLETED |
| User | role | MASTER, ADMIN, SUPERVISOR, ATENDENTE |
```

### Section 7: Development Guidelines
```markdown
## Development Guidelines

### Pricing Queries
ALWAYS query `ClinicInsuranceProcedure` for prices.
NEVER use `Procedure.basePrice` for patient-facing prices.

### Memory Storage
No `MemoryData` model exists. Patient memory is stored in:
- `PatientInteraction` (type='MEMORY')
- `AILearningData` (learning context)
Verify before creating new memory features.

### Conversation Flow
Bot → (intent detected) → TransferRule check → Human Queue OR ResponseRule → Reply

### Large Text Fields
`AIConfiguration.systemPrompt` is @db.Text.
Do NOT eager-load with `AIExample[]` in the same query (N+1 risk).
Use separate queries or explicit includes with pagination.

### Transaction Requirements
Multi-table operations MUST use `prisma.$transaction()`:
- Close conversation (update Conversation + create Message + create AuditLog)
- Assign agent (update Conversation + create Message + update User stats)
```

## Step 5: Confirm creation
After writing the file, tell the user:
- File created at `.specs/codebase/DATABASE.md`
- Summary of what's documented
- Top 3 actionable findings (e.g., missing indexes, enum-like strings to formalize)
