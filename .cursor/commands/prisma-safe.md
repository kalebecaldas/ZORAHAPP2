---
name: /prisma-safe
description: Workflow seguro para qualquer alteração no schema Prisma do ZoraH — classifica o risco (ADITIVA/MODIFICADORA/DESTRUTIVA), verifica impacto LGPD em dados PHI de pacientes, e propõe migração em 2 passos se necessário. Uso: /prisma-safe [descrição da mudança]
---

Execute a safe Prisma schema change workflow for ZoraH's healthcare database. The user will describe what they need to change.

## Step 1: Load skill
Load `zorah-prisma-safe` skill from `.cursor/skills/zorah-prisma-safe/SKILL.md` before proceeding.

## Step 2: Read current schema
Read `prisma/schema.prisma` completely to understand the current state.

## Step 3: Understand the change
Based on the user's description, identify:
- Which model(s) are affected
- What fields or relationships are changing
- The purpose of the change (new feature, bug fix, performance, etc.)

## Step 4: Classify the change

**ADDITIVE (safe to run directly):**
- Adding a new optional field (`?`)
- Adding a new table
- Adding a new index
- Adding a new enum value

**MODIFYING (requires 2-step migration):**
- Changing a field type
- Making an optional field required
- Adding a unique constraint
- Renaming a field

**DESTRUCTIVE (requires backup + rollback plan):**
- Removing a field
- Dropping a table
- Adding cascade delete
- Removing a unique constraint that data depends on

## Step 5: Check PHI/LGPD impact
Does the change touch any of these tables?
- `Patient`, `Appointment`, `Conversation`, `Message`, `AILearningData`, `PatientInteraction`

If YES: state LGPD impact and ask for explicit confirmation before proceeding.

## Step 6: Check query impact
Search `api/services/` and `api/routes/` for Prisma queries that reference the affected model.
Identify any queries that will break or behave differently after the change.

## Step 7: Propose the migration

**For ADDITIVE:** Write the schema change directly with migration name.

**For MODIFYING/DESTRUCTIVE:** Propose 2-step approach:
```
Step 1 Migration (YYYYMMDD_step1_description):
  - Add new field as optional
  - Keep old field

Data migration script:
  - Script to copy/transform data from old to new field

Step 2 Migration (YYYYMMDD_step2_description):
  - Make new field required (if needed)
  - Remove old field (if needed)
```

## Step 8: Generate rollback script
For MODIFYING and DESTRUCTIVE changes, provide the SQL rollback:
```sql
-- Rollback: YYYYMMDD_description
-- Run with: prisma migrate resolve --rolled-back MIGRATION_NAME
ALTER TABLE "TableName" ... ; -- reverse the change
```

## Step 9: Check for missing indexes
If the change adds a new field that will be queried frequently, suggest adding `@@index([fieldName])`.
Also remind about known missing indexes: `Message.conversationId`, `Conversation.status`, `AILearningData.phone`.

## Step 10: Confirm and execute
Show the proposed `schema.prisma` diff and migration name. Ask for user confirmation before making any changes.
After confirmation: update `schema.prisma` and provide the migration command:
```bash
npx prisma migrate dev --name YYYYMMDD_description
```
