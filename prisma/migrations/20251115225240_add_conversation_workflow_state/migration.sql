-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "workflowContext" JSONB,
    "awaitingInput" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Conversation_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Conversation_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Conversation" ("assignedToId", "createdAt", "id", "lastMessage", "lastTimestamp", "patientId", "phone", "status", "updatedAt") SELECT "assignedToId", "createdAt", "id", "lastMessage", "lastTimestamp", "patientId", "phone", "status", "updatedAt" FROM "Conversation";
DROP TABLE "Conversation";
ALTER TABLE "new_Conversation" RENAME TO "Conversation";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
