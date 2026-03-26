-- Migration: 20260325000000_add_patient_clinica_agil_id
-- Type: ADDITIVE
-- PHI Impact: LOW (ID técnico de referência externa, não dado sensível)
-- LGPD: N/A
-- Rollback: ALTER TABLE "Patient" DROP COLUMN IF EXISTS "clinicaAgilId";

ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "clinicaAgilId" TEXT;
