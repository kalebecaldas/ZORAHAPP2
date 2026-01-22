# 📊 Analytics e Métricas - ZoraH Bot v2.2.4

## ✅ Status: IMPLEMENTADO E VALIDADO

O workflow agora rastreia **métricas completas** de cada interação para relatórios e análise de performance.

---

## 📊 Dados Coletados

### 1. **Timestamps**
```json
{
  "analytics": {
    "messageReceivedAt": "2026-01-20T11:30:00.123Z",
    "intentClassifiedAt": "2026-01-20T11:30:02.456Z",
    "botRespondedAt": "2026-01-20T11:30:05.789Z"
  }
}
```

### 2. **Tempos de Resposta**
```json
{
  "analytics": {
    "totalResponseTimeMs": 5666,           // Tempo total (ms)
    "intentClassificationDurationMs": 2333 // Tempo para classificar (ms)
  }
}
```

### 3. **Dados de Intenção**
```json
{
  "analytics": {
    "intent": "AGENDAR",        // Intenção detectada
    "confidence": 0.95,         // Confiança (0-1)
    "unit": "Vieiralves",       // Unidade selecionada
    "platform": "whatsapp"      // Plataforma
  }
}
```

### 4. **Flags de Ação**
```json
{
  "requiresQueueTransfer": true,
  "queueName": "Principal"
}
```

---

## 🔄 Fluxo de Coleta

```
┌──────────────────────────────────────────────────────────┐
│ 1. MENSAGEM RECEBIDA                                      │
│    Extract Data adiciona: messageReceivedAt + timestamp  │
└──────────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────────┐
│ 2. CLASSIFICAÇÃO DE INTENÇÃO                             │
│    Parse Intent Response adiciona:                       │
│    - intentClassifiedAt                                  │
│    - intentClassificationDuration                        │
│    - intent, confidence, unit                            │
└──────────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────────┐
│ 3. PROCESSAMENTO (Information/Appointment/etc)           │
│    Mantém analytics carregados                           │
└──────────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────────┐
│ 4. FORMATAÇÃO DA RESPOSTA                                │
│    Format Final Response adiciona:                       │
│    - botRespondedAt                                      │
│    - totalResponseTimeMs (calculado)                     │
└──────────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────────┐
│ 5. PREPARAÇÃO DE ANALYTICS                               │
│    Prepare Analytics cria analyticsRecord                │
└──────────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────────┐
│ 6. ENVIO PARA BACKEND                                    │
│    Send to System envia tudo via webhook                 │
└──────────────────────────────────────────────────────────┘
```

---

## 📦 Estrutura Completa Enviada ao Backend

```json
{
  "conversationId": "conv-123",
  "message": "Resposta do bot aqui...",
  "intent": "AGENDAR",
  "action": "TRANSFER_TO_QUEUE",
  "aiProvider": "n8n-gemini-v2.2.4-simple",
  "requiresHumanIntervention": false,
  "requiresQueueTransfer": true,
  "queueName": "Principal",
  
  "analytics": {
    // Timestamps
    "messageReceivedAt": "2026-01-20T11:30:00.123Z",
    "intentClassifiedAt": "2026-01-20T11:30:02.456Z",
    "botRespondedAt": "2026-01-20T11:30:05.789Z",
    
    // Duração
    "totalResponseTimeMs": 5666,
    "intentClassificationDurationMs": 2333,
    
    // Classificação
    "intent": "AGENDAR",
    "confidence": 0.95,
    "unit": "Vieiralves",
    "platform": "whatsapp"
  },
  
  "analyticsRecord": {
    "conversationId": "conv-123",
    "intent": "AGENDAR",
    "confidence": 0.95,
    "unit": "Vieiralves",
    "platform": "whatsapp",
    "messageReceivedAt": "2026-01-20T11:30:00.123Z",
    "intentClassifiedAt": "2026-01-20T11:30:02.456Z",
    "botRespondedAt": "2026-01-20T11:30:05.789Z",
    "totalResponseTimeMs": 5666,
    "intentClassificationDurationMs": 2333,
    "requiresQueueTransfer": true,
    "queueName": "Principal",
    "aiProvider": "n8n-gemini-v2.2.4-simple",
    "success": true
  },
  
  "success": true,
  "timestamp": "2026-01-20T11:30:05.789Z"
}
```

---

## 💾 Salvando no Banco de Dados

### Opção 1: Salvar via Backend (RECOMENDADO)

```typescript
// webhook-n8n.ts

export async function handleN8nResponse(req: Request, res: Response) {
  const response = req.body;
  
  // 1. Enviar mensagem ao usuário
  await conversationService.sendMessage(
    response.conversationId,
    response.message
  );
  
  // 2. Transferir para fila se necessário
  if (response.requiresQueueTransfer && response.queueName) {
    await conversationService.transferToQueue(
      response.conversationId,
      response.queueName,
      'Bot detectou intenção de agendamento'
    );
  }
  
  // 3. Salvar analytics no banco
  if (response.analyticsRecord) {
    await analyticsService.save({
      conversationId: response.analyticsRecord.conversationId,
      intent: response.analyticsRecord.intent,
      confidence: response.analyticsRecord.confidence,
      unit: response.analyticsRecord.unit,
      platform: response.analyticsRecord.platform,
      messageReceivedAt: new Date(response.analyticsRecord.messageReceivedAt),
      intentClassifiedAt: new Date(response.analyticsRecord.intentClassifiedAt),
      botRespondedAt: new Date(response.analyticsRecord.botRespondedAt),
      totalResponseTimeMs: response.analyticsRecord.totalResponseTimeMs,
      intentClassificationMs: response.analyticsRecord.intentClassificationDurationMs,
      requiresQueueTransfer: response.analyticsRecord.requiresQueueTransfer,
      queueName: response.analyticsRecord.queueName,
      aiProvider: response.analyticsRecord.aiProvider,
      success: response.analyticsRecord.success
    });
  }
  
  res.json({ success: true });
}
```

### Opção 2: Schema da Tabela

```sql
CREATE TABLE bot_analytics (
  id SERIAL PRIMARY KEY,
  conversation_id VARCHAR(255) NOT NULL,
  
  -- Classificação
  intent VARCHAR(50) NOT NULL,
  confidence DECIMAL(3, 2),
  unit VARCHAR(100),
  platform VARCHAR(20),
  
  -- Timestamps
  message_received_at TIMESTAMP NOT NULL,
  intent_classified_at TIMESTAMP,
  bot_responded_at TIMESTAMP NOT NULL,
  
  -- Métricas de tempo
  total_response_time_ms INTEGER,
  intent_classification_ms INTEGER,
  
  -- Ações
  requires_queue_transfer BOOLEAN DEFAULT FALSE,
  queue_name VARCHAR(100),
  
  -- Metadados
  ai_provider VARCHAR(100),
  success BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_conversation (conversation_id),
  INDEX idx_intent (intent),
  INDEX idx_unit (unit),
  INDEX idx_received_at (message_received_at)
);
```

---

## 📈 Queries de Relatório

### 1. **Tempo Médio de Resposta por Intenção**
```sql
SELECT 
  intent,
  COUNT(*) as total_interactions,
  AVG(total_response_time_ms) as avg_response_ms,
  MIN(total_response_time_ms) as min_response_ms,
  MAX(total_response_time_ms) as max_response_ms
FROM bot_analytics
WHERE message_received_at >= NOW() - INTERVAL '7 days'
GROUP BY intent
ORDER BY total_interactions DESC;
```

### 2. **Distribuição de Intenções**
```sql
SELECT 
  intent,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage,
  AVG(confidence) as avg_confidence
FROM bot_analytics
WHERE message_received_at >= NOW() - INTERVAL '30 days'
GROUP BY intent
ORDER BY count DESC;
```

### 3. **Performance por Unidade**
```sql
SELECT 
  unit,
  COUNT(*) as interactions,
  AVG(total_response_time_ms) as avg_response_ms,
  COUNT(CASE WHEN requires_queue_transfer THEN 1 END) as transfer_count
FROM bot_analytics
WHERE unit IS NOT NULL
  AND message_received_at >= NOW() - INTERVAL '7 days'
GROUP BY unit;
```

### 4. **Análise de Transferências**
```sql
SELECT 
  DATE(message_received_at) as date,
  COUNT(*) as total_messages,
  COUNT(CASE WHEN requires_queue_transfer THEN 1 END) as transfers,
  ROUND(COUNT(CASE WHEN requires_queue_transfer THEN 1 END) * 100.0 / COUNT(*), 2) as transfer_rate
FROM bot_analytics
WHERE message_received_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(message_received_at)
ORDER BY date DESC;
```

### 5. **Performance por Hora do Dia**
```sql
SELECT 
  EXTRACT(HOUR FROM message_received_at) as hour,
  COUNT(*) as messages,
  AVG(total_response_time_ms) as avg_response_ms,
  AVG(intent_classification_ms) as avg_classification_ms
FROM bot_analytics
WHERE message_received_at >= NOW() - INTERVAL '7 days'
GROUP BY EXTRACT(HOUR FROM message_received_at)
ORDER BY hour;
```

---

## 📊 Dashboards Sugeridos

### 1. **Visão Geral**
- Total de interações (hoje, semana, mês)
- Tempo médio de resposta
- Taxa de transferência para fila
- Distribuição de intenções (gráfico pizza)

### 2. **Performance**
- Tempo de resposta ao longo do tempo (gráfico linha)
- Tempo de classificação de intenção
- Comparação por unidade
- Horários de pico

### 3. **Qualidade**
- Confiança média por intenção
- Taxa de sucesso
- Mensagens com baixa confiança (<0.7)
- Performance do AI Provider

### 4. **Conversões**
- Taxa de agendamentos vs informações
- Taxa de transferência para humano
- Funil de conversão

---

## 🎯 KPIs Importantes

| Métrica | Meta | Como Calcular |
|---------|------|---------------|
| **Tempo médio de resposta** | < 3s | AVG(totalResponseTimeMs) |
| **Taxa de transferência** | < 20% | (transfers / total) * 100 |
| **Confiança média** | > 0.85 | AVG(confidence) |
| **Taxa de sucesso** | > 99% | (success = true / total) * 100 |
| **Tempo de classificação** | < 1s | AVG(intentClassificationMs) |

---

## ✅ Conclusão

Agora você tem **analytics completo** integrado no workflow:

✅ Todos os timestamps são rastreados  
✅ Tempos de resposta calculados automaticamente  
✅ Dados de intenção e confiança salvos  
✅ Pronto para gerar relatórios  
✅ Compatível com sistema existente  

**🚀 Pode usar para análise de performance e relatórios!**
