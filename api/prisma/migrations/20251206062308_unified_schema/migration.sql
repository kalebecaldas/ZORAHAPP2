/*
  Warnings:

  - You are about to drop the `PatientProcedure` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `timestamp` on the `PatientInteraction` table. All the data in the column will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "PatientProcedure";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "QuickReply" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "shortcut" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "QuickReply_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "patientName" TEXT NOT NULL,
    "patientPhone" TEXT NOT NULL,
    "procedure" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "time" TEXT NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorId" TEXT NOT NULL,
    "targetUserId" TEXT,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AIConfiguration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL DEFAULT 'Configuração Principal',
    "description" TEXT,
    "systemPrompt" TEXT NOT NULL,
    "personality" TEXT NOT NULL DEFAULT 'Empática e profissional',
    "tone" TEXT NOT NULL DEFAULT 'Conversacional e amigável',
    "useEmojis" BOOLEAN NOT NULL DEFAULT true,
    "offerPackages" BOOLEAN NOT NULL DEFAULT true,
    "askInsurance" BOOLEAN NOT NULL DEFAULT true,
    "maxResponseLength" INTEGER NOT NULL DEFAULT 500,
    "businessRules" TEXT,
    "temperature" REAL NOT NULL DEFAULT 0.7,
    "maxTokens" INTEGER NOT NULL DEFAULT 1000,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AIExample" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "configId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'GERAL',
    "userMessage" TEXT NOT NULL,
    "expectedIntent" TEXT NOT NULL,
    "expectedAction" TEXT NOT NULL,
    "botResponse" TEXT NOT NULL,
    "entities" TEXT NOT NULL,
    "confidence" REAL NOT NULL DEFAULT 0.95,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AIExample_configId_fkey" FOREIGN KEY ("configId") REFERENCES "AIConfiguration" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TransferRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "configId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "keywords" TEXT NOT NULL,
    "intents" TEXT NOT NULL,
    "minConfidence" REAL NOT NULL DEFAULT 0.6,
    "targetQueue" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "transferMessage" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TransferRule_configId_fkey" FOREIGN KEY ("configId") REFERENCES "AIConfiguration" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AILearningData" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phone" TEXT NOT NULL,
    "intent" TEXT,
    "sentiment" TEXT,
    "style" TEXT,
    "context" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_AILearningData" ("context", "createdAt", "id", "intent", "phone", "sentiment", "style") SELECT "context", "createdAt", "id", "intent", "phone", "sentiment", "style" FROM "AILearningData";
DROP TABLE "AILearningData";
ALTER TABLE "new_AILearningData" RENAME TO "AILearningData";
CREATE TABLE "new_Conversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phone" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'BOT_QUEUE',
    "assignedToId" TEXT,
    "patientId" TEXT,
    "lastMessage" TEXT NOT NULL,
    "lastTimestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "workflowId" TEXT,
    "currentWorkflowNode" TEXT,
    "workflowContext" TEXT,
    "awaitingInput" BOOLEAN NOT NULL DEFAULT false,
    "sessionStartTime" DATETIME,
    "sessionExpiryTime" DATETIME,
    "sessionStatus" TEXT NOT NULL DEFAULT 'active',
    "lastUserActivity" DATETIME,
    "channel" TEXT NOT NULL DEFAULT 'whatsapp',
    "channelMetadata" TEXT,
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Conversation_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Conversation_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Conversation" ("assignedToId", "createdAt", "id", "lastMessage", "lastTimestamp", "patientId", "phone", "status", "updatedAt") SELECT "assignedToId", "createdAt", "id", "lastMessage", "lastTimestamp", "patientId", "phone", "status", "updatedAt" FROM "Conversation";
DROP TABLE "Conversation";
ALTER TABLE "new_Conversation" RENAME TO "Conversation";
CREATE TABLE "new_Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "messageText" TEXT NOT NULL,
    "messageType" TEXT NOT NULL DEFAULT 'TEXT',
    "mediaUrl" TEXT,
    "metadata" TEXT,
    "direction" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "systemMessageType" TEXT,
    "systemMetadata" TEXT,
    CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Message" ("conversationId", "createdAt", "direction", "from", "id", "mediaUrl", "messageText", "messageType", "metadata", "phoneNumber", "systemMessageType", "systemMetadata", "timestamp") SELECT "conversationId", "createdAt", "direction", "from", "id", "mediaUrl", "messageText", "messageType", "metadata", "phoneNumber", "systemMessageType", "systemMetadata", "timestamp" FROM "Message";
DROP TABLE "Message";
ALTER TABLE "new_Message" RENAME TO "Message";
CREATE TABLE "new_Patient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phone" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cpf" TEXT,
    "email" TEXT,
    "birthDate" DATETIME,
    "address" TEXT,
    "emergencyContact" TEXT,
    "insuranceCompany" TEXT,
    "insuranceNumber" TEXT,
    "preferences" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Patient" ("address", "birthDate", "cpf", "createdAt", "email", "emergencyContact", "id", "insuranceCompany", "insuranceNumber", "name", "phone", "preferences", "updatedAt") SELECT "address", "birthDate", "cpf", "createdAt", "email", "emergencyContact", "id", "insuranceCompany", "insuranceNumber", "name", "phone", "preferences", "updatedAt" FROM "Patient";
DROP TABLE "Patient";
ALTER TABLE "new_Patient" RENAME TO "Patient";
CREATE UNIQUE INDEX "Patient_phone_key" ON "Patient"("phone");
CREATE UNIQUE INDEX "Patient_cpf_key" ON "Patient"("cpf");
CREATE TABLE "new_PatientInteraction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "data" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PatientInteraction_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_PatientInteraction" ("createdAt", "data", "description", "id", "patientId", "type") SELECT "createdAt", "data", "description", "id", "patientId", "type" FROM "PatientInteraction";
DROP TABLE "PatientInteraction";
ALTER TABLE "new_PatientInteraction" RENAME TO "PatientInteraction";
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'AGENT',
    "isMasterFrozen" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("createdAt", "email", "id", "name", "password", "role", "updatedAt") SELECT "createdAt", "email", "id", "name", "password", "role", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE TABLE "new_Workflow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'CONVERSATION',
    "config" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Workflow" ("config", "createdAt", "description", "id", "isActive", "name", "type", "updatedAt") SELECT "config", "createdAt", "description", "id", "isActive", "name", "type", "updatedAt" FROM "Workflow";
DROP TABLE "Workflow";
ALTER TABLE "new_Workflow" RENAME TO "Workflow";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "QuickReply_userId_idx" ON "QuickReply"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "QuickReply_userId_shortcut_key" ON "QuickReply"("userId", "shortcut");

-- CreateIndex
CREATE INDEX "AIExample_configId_isActive_idx" ON "AIExample"("configId", "isActive");

-- CreateIndex
CREATE INDEX "AIExample_category_idx" ON "AIExample"("category");

-- CreateIndex
CREATE INDEX "TransferRule_configId_isActive_idx" ON "TransferRule"("configId", "isActive");

-- CreateIndex
CREATE INDEX "TransferRule_priority_idx" ON "TransferRule"("priority");
