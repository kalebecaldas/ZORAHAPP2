-- Migration: 20260330_add_performance_indexes
-- Type: ADDITIVE
-- PHI Impact: LOW (indexes only — no data fields added or removed)
-- LGPD: N/A
-- Rollback: DROP INDEX IF EXISTS "..." for each index below

-- Message indexes (hot path: response time queries, conversation message loading)
CREATE INDEX IF NOT EXISTS "Message_conversationId_idx"
  ON "Message"("conversationId");

CREATE INDEX IF NOT EXISTS "Message_timestamp_idx"
  ON "Message"("timestamp");

CREATE INDEX IF NOT EXISTS "Message_direction_idx"
  ON "Message"("direction");

-- Composite index used by avgResponseTime queries (conversationId + direction + timestamp)
CREATE INDEX IF NOT EXISTS "Message_conversationId_direction_timestamp_idx"
  ON "Message"("conversationId", "direction", "timestamp");

-- Conversation indexes (hot path: analytics filters, agent queue, date range queries)
CREATE INDEX IF NOT EXISTS "Conversation_status_idx"
  ON "Conversation"("status");

CREATE INDEX IF NOT EXISTS "Conversation_assignedToId_idx"
  ON "Conversation"("assignedToId");

CREATE INDEX IF NOT EXISTS "Conversation_createdAt_idx"
  ON "Conversation"("createdAt");

CREATE INDEX IF NOT EXISTS "Conversation_closedAt_idx"
  ON "Conversation"("closedAt");

CREATE INDEX IF NOT EXISTS "Conversation_closeCategory_idx"
  ON "Conversation"("closeCategory");

-- Composite index for agent analytics (assignedToId + status + createdAt)
CREATE INDEX IF NOT EXISTS "Conversation_assignedToId_status_createdAt_idx"
  ON "Conversation"("assignedToId", "status", "createdAt");
