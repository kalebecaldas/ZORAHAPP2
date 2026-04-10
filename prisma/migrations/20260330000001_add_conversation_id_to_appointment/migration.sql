-- Migration: 20260330_add_conversation_id_to_appointment
-- Type: ADDITIVE
-- PHI Impact: LOW (new nullable FK column — no patient data changed)
-- LGPD: N/A
-- Rollback: DROP INDEX ...; ALTER TABLE "Appointment" DROP COLUMN "conversationId";

ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "conversationId" TEXT;

ALTER TABLE "Appointment"
  ADD CONSTRAINT "Appointment_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Appointment_conversationId_idx"
  ON "Appointment"("conversationId");

CREATE INDEX IF NOT EXISTS "Appointment_patientId_idx"
  ON "Appointment"("patientId");
