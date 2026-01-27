-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN "lastAgentActivity" TIMESTAMP(3);

-- Update existing conversations to set lastAgentActivity to lastUserActivity (migration de dados)
UPDATE "Conversation" SET "lastAgentActivity" = "lastUserActivity" WHERE "lastUserActivity" IS NOT NULL;
