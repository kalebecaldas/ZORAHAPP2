-- Script SQL de migração para Railway
-- Cria as tabelas necessárias se não existirem
-- Idempotente: pode ser executado múltiplas vezes

-- ============================================
-- SystemSettings
-- ============================================
CREATE TABLE IF NOT EXISTS "system_settings" (
    "id" TEXT NOT NULL,
    "inactivityTimeoutMinutes" INTEGER NOT NULL DEFAULT 20,
    "closingMessage" TEXT NOT NULL DEFAULT 'Obrigado pelo contato! Estamos à disposição. 😊',
    "autoAssignEnabled" BOOLEAN NOT NULL DEFAULT true,
    "maxConversationsPerAgent" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- ResponseRule
-- ============================================
CREATE TABLE IF NOT EXISTS "ResponseRule" (
    "id" TEXT NOT NULL,
    "intent" TEXT NOT NULL,
    "context" TEXT,
    "targetType" TEXT,
    "targetId" TEXT,
    "template" TEXT NOT NULL,
    "conditions" JSONB,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "rules" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResponseRule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ResponseRule_intent_targetType_idx" ON "ResponseRule"("intent", "targetType");
CREATE INDEX IF NOT EXISTS "ResponseRule_isActive_idx" ON "ResponseRule"("isActive");
CREATE INDEX IF NOT EXISTS "ResponseRule_priority_idx" ON "ResponseRule"("priority");

-- ============================================
-- ProcedureRule
-- ============================================
CREATE TABLE IF NOT EXISTS "ProcedureRule" (
    "id" TEXT NOT NULL,
    "procedureCode" TEXT NOT NULL,
    "requiresEvaluation" BOOLEAN NOT NULL DEFAULT false,
    "evaluationPrice" DECIMAL(10,2),
    "evaluationInPackage" BOOLEAN NOT NULL DEFAULT false,
    "evaluationIncludesFirstSession" BOOLEAN NOT NULL DEFAULT true,
    "minimumPackageSessions" INTEGER,
    "highlightPackages" BOOLEAN NOT NULL DEFAULT false,
    "showEvaluationFirst" BOOLEAN NOT NULL DEFAULT true,
    "customMessage" TEXT,
    "specialConditions" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcedureRule_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ProcedureRule_procedureCode_key" UNIQUE ("procedureCode")
);

CREATE INDEX IF NOT EXISTS "ProcedureRule_procedureCode_idx" ON "ProcedureRule"("procedureCode");

-- ============================================
-- InsuranceRule
-- ============================================
CREATE TABLE IF NOT EXISTS "InsuranceRule" (
    "id" TEXT NOT NULL,
    "insuranceCode" TEXT NOT NULL,
    "showCoveredProcedures" BOOLEAN NOT NULL DEFAULT true,
    "mentionOtherBenefits" BOOLEAN NOT NULL DEFAULT true,
    "customGreeting" TEXT,
    "hideValues" BOOLEAN NOT NULL DEFAULT true,
    "canShowDiscount" BOOLEAN NOT NULL DEFAULT false,
    "specialProcedures" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsuranceRule_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "InsuranceRule_insuranceCode_key" UNIQUE ("insuranceCode")
);

CREATE INDEX IF NOT EXISTS "InsuranceRule_insuranceCode_idx" ON "InsuranceRule"("insuranceCode");

-- ============================================
-- Comentários
-- ============================================
COMMENT ON TABLE "system_settings" IS 'Configurações gerais do sistema';
COMMENT ON TABLE "ResponseRule" IS 'Templates de resposta por intenção';
COMMENT ON TABLE "ProcedureRule" IS 'Regras específicas por procedimento';
COMMENT ON TABLE "InsuranceRule" IS 'Regras específicas por convênio';
