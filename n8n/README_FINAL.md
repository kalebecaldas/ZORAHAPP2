# ✅ ZoraH Bot Simple v2.2.4 - VERSÃO FINAL

## 🎯 Status: PRONTO PARA USO

**Arquivo:** `ZoraH Bot - Simple v2.2.4.json`  
**Data:** 20/01/2026  
**Versão:** Simplificada com analytics essenciais

---

## 📊 O Que Este Workflow Faz

### 1. **Responde Perguntas** (INFORMACAO)
- Bot responde perguntas sobre procedimentos, valores, horários, etc.
- Usa AI com acesso às bases de dados das unidades

### 2. **Detecta Agendamento** (AGENDAR)
- Identifica quando usuário quer agendar
- **Transfere direto para fila "Principal"**
- Atendente humano cuida do agendamento

### 3. **Transfere para Humano** (FALAR_ATENDENTE)
- Quando usuário pede atendente
- Transferência imediata

### 4. **Pergunta Unidade** (PEDIR_UNIDADE)
- Se não sabe qual unidade
- Oferece opções: Vieiralves ou São José

---

## 📈 Métricas Coletadas (ESSENCIAIS)

```json
{
  "metrics": {
    "intent": "AGENDAR",         // Intenção detectada
    "responseTimeMs": 2300,      // Tempo de resposta (ms)
    "timestamp": "2026-01-20...", // Quando processou
    "requiresTransfer": true     // Se transferiu
  }
}
```

**Apenas 4 campos!** Simples e útil.

---

## 🔄 Como Funciona

```
User envia mensagem
    ↓
Bot classifica intenção
    ↓
┌─────────┬──────────┬──────────┬──────────┐
│INFORMACAO│ AGENDAR │ATENDENTE │  UNIDADE │
└─────────┴──────────┴──────────┴──────────┘
    ↓          ↓         ↓          ↓
  Responde  Transfere Transfere  Pergunta
  pergunta   p/ fila   p/ fila   unidade
    ↓          ↓         ↓          ↓
Backend recebe resposta + métricas
```

---

## 💾 Integração Backend (Opcional)

### Salvar Métricas (se quiser relatórios):

```typescript
// webhook-n8n.ts
if (response.metrics) {
  await db.botMetrics.create({
    conversationId: response.conversationId,
    intent: response.metrics.intent,
    responseTimeMs: response.metrics.responseTimeMs,
    requiresTransfer: response.metrics.requiresTransfer
  });
}
```

### Tabela Mínima:

```sql
CREATE TABLE bot_metrics (
  id SERIAL PRIMARY KEY,
  conversation_id VARCHAR(255),
  intent VARCHAR(50),
  response_time_ms INTEGER,
  requires_transfer BOOLEAN,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 📊 Relatórios Simples

### Distribuição de Intenções:
```sql
SELECT intent, COUNT(*) FROM bot_metrics
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY intent;
```

### Performance:
```sql
SELECT AVG(response_time_ms) as avg_ms
FROM bot_metrics
WHERE created_at >= NOW() - INTERVAL '7 days';
```

### Taxa de Transferência:
```sql
SELECT 
  COUNT(CASE WHEN requires_transfer THEN 1 END) * 100.0 / COUNT(*)
FROM bot_metrics;
```

---

## 🚀 Como Usar

1. **Importe no n8n:** `ZoraH Bot - Simple v2.2.4.json`
2. **Configure credenciais:** Gemini API + Postgres
3. **Ative workflow**
4. **Teste:** Envie mensagem via webhook
5. **Backend:** Adicione save de métricas (opcional)

---

## 📦 Arquivos

- ✅ **`ZoraH Bot - Simple v2.2.4.json`** - Workflow final
- ✅ **`ZoraH Bot - Optimized v2.2.4.json`** - Versão completa (futuro)
- 📄 **`SIMPLE_VERSION_README.md`** - Este documento

---

## ✨ Diferenças vs Versão Completa

| Feature | Simple | Completa |
|---------|--------|----------|
| Responder perguntas | ✅ | ✅ |
| Detectar AGENDAR | ✅ | ✅ |
| Transferir para fila | ✅ | ✅ |
| Coletar dados paciente | ❌ | ✅ |
| Cadastrar paciente | ❌ | ✅ |
| Criar agendamento | ❌ | ✅ |
| Métricas | 4 campos | 11 campos |

---

## 🎉 Conclusão

**Workflow simplificado, validado e pronto!**

✅ 20 nodes (vs 34 na completa)  
✅ Apenas métricas essenciais  
✅ Fácil de integrar  
✅ Pode usar AGORA  

**Mais tarde:** Migre para versão completa quando quiser agendamento automático.

**🚀 Pode importar no n8n!**
