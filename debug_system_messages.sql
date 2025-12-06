-- Verificar mensagens SYSTEM da conversa
SELECT 
    id,
    "messageType",
    "systemMessageType",
    "messageText",
    "systemMetadata",
    "createdAt"
FROM "Message"
WHERE "conversationId" = 'cmittpipk0001ji19198c39ju'
AND "messageType" = 'SYSTEM'
ORDER BY "createdAt" DESC;

-- Se não existir, criar uma mensagem SYSTEM de teste
-- INSERT INTO "Message" (
--     id,
--     "conversationId",
--     "phoneNumber",
--     "messageText",
--     "messageType",
--     direction,
--     "from",
--     "systemMessageType",
--     "systemMetadata",
--     "createdAt",
--     "updatedAt"
-- ) VALUES (
--     gen_random_uuid()::text,
--     'cmittpipk0001ji19198c39ju',
--     'system',
--     '📋 Dados coletados pelo bot',
--     'SYSTEM',
--     'system',
--     'system',
--     'PATIENT_DATA_CARD',
--     jsonb_build_object(
--         'patientData', jsonb_build_object(
--             'name', 'Denis Oliveira',
--             'phone', '5592958632513',
--             'cpf', '999.282.181-90',
--             'email', 'denis@gmail.com',
--             'birthDate', '02/03/1993',
--             'insuranceCompany', 'SulAmérica'
--         )
--     ),
--     NOW(),
--     NOW()
-- );
