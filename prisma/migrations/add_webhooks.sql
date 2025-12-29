-- Migration: Adicionar tabelas de Webhooks para integrações externas
-- Data: 2025-01-22

-- Tabela principal de subscriptions de webhooks
CREATE TABLE IF NOT EXISTS "WebhookSubscription" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT NOT NULL,
    "token" TEXT NOT NULL UNIQUE,
    "events" TEXT[] NOT NULL DEFAULT ARRAY['first_message']::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastTriggeredAt" TIMESTAMP(3),
    "metadata" JSONB,
    
    CONSTRAINT "WebhookSubscription_pkey" PRIMARY KEY ("id")
);

-- Tabela de logs de webhooks
CREATE TABLE IF NOT EXISTS "WebhookLog" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "statusCode" INTEGER,
    "responseTime" INTEGER,
    "error" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "WebhookLog_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "WebhookLog_subscriptionId_fkey" 
        FOREIGN KEY ("subscriptionId") 
        REFERENCES "WebhookSubscription"("id") 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS "WebhookSubscription_isActive_idx" ON "WebhookSubscription"("isActive");
CREATE INDEX IF NOT EXISTS "WebhookSubscription_token_idx" ON "WebhookSubscription"("token");

CREATE INDEX IF NOT EXISTS "WebhookLog_subscriptionId_idx" ON "WebhookLog"("subscriptionId");
CREATE INDEX IF NOT EXISTS "WebhookLog_createdAt_idx" ON "WebhookLog"("createdAt");
CREATE INDEX IF NOT EXISTS "WebhookLog_success_idx" ON "WebhookLog"("success");

-- Comentários
COMMENT ON TABLE "WebhookSubscription" IS 'Armazena configurações de webhooks para integrações externas (Google Ads, CRMs, etc)';
COMMENT ON TABLE "WebhookLog" IS 'Registra todas as tentativas de envio de webhooks para auditoria e debug';
COMMENT ON COLUMN "WebhookSubscription"."token" IS 'Token único e seguro (whk_...) para autenticação do webhook';
COMMENT ON COLUMN "WebhookSubscription"."events" IS 'Lista de eventos que este webhook deve receber (first_message, appointment_created, etc)';
COMMENT ON COLUMN "WebhookLog"."responseTime" IS 'Tempo de resposta em milissegundos';
