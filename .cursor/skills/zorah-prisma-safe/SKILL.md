---
name: zorah-prisma-safe
description: Safe Prisma schema changes and migrations for ZoraH's healthcare database containing PHI (Protected Health Information) subject to LGPD. Use when modifying prisma/schema.prisma, creating migrations, or writing new Prisma queries. Do NOT use for non-database tasks.
---

# ZoraH Prisma Safe

Protects ZoraH's PostgreSQL database from destructive migrations and ensures LGPD compliance for healthcare data.

## Database: PostgreSQL via Prisma 6

**Connection:** `DATABASE_URL` env var  
**Deploy target:** Railway  
**ORM:** Prisma 6 with `prisma-client-js`

## PHI Tables (Protected Health Information — LGPD)

These tables contain sensitive patient data. Any change requires explicit LGPD impact assessment:

| Table | PHI Fields |
|-------|-----------|
| `Patient` | name, phone, cpf, email, birthDate, address, emergencyContact, insuranceNumber |
| `Appointment` | patientId, patientName, patientPhone, notes |
| `Conversation` | phone, patientId, closeCategory, privateAppointment, normalAppointment |
| `Message` | messageText, phoneNumber, mediaUrl |
| `AILearningData` | phone, intent, sentiment, context |
| `PatientInteraction` | patientId, description, data |

## Migration Classification

Before ANY schema change, classify it:

| Class | Examples | Risk | Action |
|-------|----------|------|--------|
| **ADDITIVE** | New optional field, new table, new index | Low | Direct migration |
| **MODIFYING** | Type change, rename, constraint change | Medium | 2-step migration |
| **DESTRUCTIVE** | Remove field, drop table, cascade delete | High | Backup + rollback script |

## 2-Step Migration Pattern (MODIFYING/DESTRUCTIVE)

```
Step 1: Add new field (optional, nullable)
  → Deploy to production
  → Migrate existing data via script
  → Verify data integrity

Step 2: Make field required OR remove old field
  → Deploy to production
  → Verify no references to old field
```

## Mandatory Checks Before Any Migration

1. **Is it DESTRUCTIVE?** → STOP. Propose 2-step migration. Get explicit confirmation.
2. **Does it touch PHI tables?** → Document LGPD impact. Require explicit user confirmation.
3. **New query added?** → Verify it uses existing indexes (no full scan on hot tables).
4. **Multi-table operation?** → Wrap in `prisma.$transaction([...])`.
5. **Migration name descriptive?** → Format: `YYYYMMDD_verb_description` (e.g., `20260324_add_patient_tags`)

## Known Indexing Gaps (fix these before scaling)

```prisma
// Add these indexes to existing models:

model Message {
  // ... existing fields ...
  @@index([conversationId])        // Hot path: loading conversation messages
  @@index([timestamp])             // Hot path: ordering messages
}

model Conversation {
  // ... existing fields ...
  @@index([status])                // Hot path: filtering queues (BOT_QUEUE, HUMAN_QUEUE)
  @@index([assignedToId])          // Hot path: agent's conversation list
}

model AILearningData {
  // ... existing fields ...
  @@index([phone])                 // Hot path: lookup by patient phone
}

model AuditLog {
  // ... existing fields ...
  @@index([createdAt])             // Hot path: audit reports by date
  @@index([actorId])               // Hot path: user action history
}
```

## Prisma Query Safety Rules

```typescript
// ✅ Always use try/catch
try {
  const patient = await prisma.patient.findUnique({ where: { id } })
} catch (error) {
  console.error('Prisma error:', error)
  return res.status(500).json({ error: 'Internal server error' }) // Never expose Prisma details
}

// ✅ Multi-table operations → transactions
await prisma.$transaction([
  prisma.conversation.update({ where: { id }, data: { status: 'CLOSED', closedAt: new Date() } }),
  prisma.message.create({ data: { conversationId: id, messageText: closingMsg, ... } }),
  prisma.auditLog.create({ data: { actorId: userId, action: 'CLOSE_CONVERSATION', ... } })
])

// ✅ Select only needed fields (reduce data transfer)
const patient = await prisma.patient.findUnique({
  where: { phone },
  select: { id: true, name: true, insuranceCompany: true } // Not select: { cpf: true, birthDate: true }
})
```

## Critical Business Rules

1. **Prices:** ALWAYS query `ClinicInsuranceProcedure` for real prices. `Procedure.basePrice` is a reference only.
2. **Conversation.status:** String field (not enum) — use only: `BOT_QUEUE`, `HUMAN_QUEUE`, `CLOSED`, `PENDING`
3. **Message.onDelete: Restrict** — you cannot delete a `Conversation` that has `Messages`. Use `status = 'CLOSED'` instead.
4. **No MemoryData model** — patient memory is stored in `PatientInteraction` (type='MEMORY') or `AILearningData`. Verify before adding new memory feature.
5. **AIConfiguration.systemPrompt** is `@db.Text` — never eager-load together with `AIExample[]` (N+1 risk).

## Migration File Template

```sql
-- Migration: YYYYMMDD_description
-- Type: ADDITIVE | MODIFYING | DESTRUCTIVE
-- PHI Impact: NONE | LOW (indexes only) | HIGH (patient data fields)
-- LGPD: N/A | Requires DPO review
-- Rollback: prisma migrate resolve --rolled-back MIGRATION_NAME

-- Up migration
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "tags" TEXT[];

-- Rollback script (save separately)
-- ALTER TABLE "Patient" DROP COLUMN IF EXISTS "tags";
```
