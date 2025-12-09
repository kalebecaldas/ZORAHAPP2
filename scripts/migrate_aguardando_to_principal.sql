-- Script SQL para migrar conversas com status 'AGUARDANDO' para 'PRINCIPAL'
-- Execute este script diretamente no banco de dados do Railway

-- Verificar quantas conversas têm status AGUARDANDO
SELECT COUNT(*) as total_aguardando 
FROM "Conversation" 
WHERE status = 'AGUARDANDO';

-- Migrar todas as conversas de AGUARDANDO para PRINCIPAL
UPDATE "Conversation" 
SET status = 'PRINCIPAL' 
WHERE status = 'AGUARDANDO';

-- Verificar se a migração foi bem-sucedida
SELECT COUNT(*) as total_aguardando_restante 
FROM "Conversation" 
WHERE status = 'AGUARDANDO';

-- Mostrar algumas conversas migradas (opcional)
SELECT id, phone, status, "lastMessage", "lastTimestamp"
FROM "Conversation" 
WHERE status = 'PRINCIPAL'
ORDER BY "lastTimestamp" DESC
LIMIT 10;

