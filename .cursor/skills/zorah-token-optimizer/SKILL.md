---
name: zorah-token-optimizer
description: Optimize OpenAI token usage in ZoraH AI services. Use when modifying conversationalAI.ts, intelligentBot.ts, ai.ts, memoryService.ts, conversationContext.ts, or any GPT executor in the workflow engine. Do NOT use for general code review, UI tasks, or non-AI services.
---

# ZoraH Token Optimizer

Specialized skill for reducing token cost and latency in ZoraH's OpenAI integrations without degrading bot quality.

## Target Files

| File | Role | Current State |
|------|------|---------------|
| `api/services/conversationalAI.ts` | Main bot — `buildRichSystemPrompt`, history slice (-10) | max_tokens=500 |
| `api/services/conversationContext.ts` | `EnhancedContext` builder — loads patient, history, appointments, learning, memory | No caching |
| `api/services/costMonitoring.ts` | Token usage logging — `logUsage({ model, inputTokens, outputTokens, service })` | Active |
| `api/services/intelligentBot.ts` | Secondary bot | Needs audit |
| `api/services/ai.ts` | Generic AI service | Needs audit |
| `api/services/memoryService.ts` | Patient memory persistence | Needs audit |
| `src/services/workflow/executors/gptExecutor.ts` | GPT nodes in visual workflow editor | **WARNING: client-side OpenAI** |
| `src/services/workflow/executors/gptResponseExecutor.ts` | GPT response processing | **WARNING: client-side OpenAI** |

## Optimization Checklist (run before every AI service change)

1. **max_tokens explicit?** — must be set, not relying on default (current: 500 via `GPT_MAX_TOKENS_CONVERSATION`)
2. **costMonitoringService.logUsage() called?** — after every `chat.completions.create()`
3. **Static clinic data in system prompt?** — procedures list, insurance list, clinic info don't change → cache them
4. **History slice justified?** — current: last 10 messages. Consider summary for older turns
5. **Model right-sized?** — classification, extraction, intent detection → `gpt-4o-mini`. Conversation → `gpt-4o`
6. **EnhancedContext fields used?** — check if loaded fields are actually referenced in the prompt template
7. **Duplicate calls?** — same context within 30s window → deduplicate

## Optimization Strategies

### 1. Cache Static System Prompt Sections
Clinic data (procedures, insurances, opening hours) doesn't change per conversation.
```typescript
// In conversationalAI.ts — cache the static portion
const staticPromptCache = new Map<string, { content: string; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

async function getStaticPromptSection(clinicId: string): Promise<string> {
  const cached = staticPromptCache.get(clinicId)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.content
  const content = await buildStaticClinicSection(clinicId)
  staticPromptCache.set(clinicId, { content, timestamp: Date.now() })
  return content
}
```

### 2. Summarize Old History (not truncate)
```typescript
// Instead of: context.history.recent.slice(-10)
// Use: recent 5 verbatim + summary of older turns
async function buildHistory(messages: Message[]) {
  if (messages.length <= 5) return messages.map(toOpenAIMessage)
  const recent = messages.slice(-5)
  const older = messages.slice(0, -5)
  const summary = await summarizeHistory(older) // Single cheap gpt-4o-mini call
  return [
    { role: 'system', content: `Previous conversation summary: ${summary}` },
    ...recent.map(toOpenAIMessage)
  ]
}
```

### 3. Right-Size Model by Task
```typescript
const MODEL_ROUTING = {
  intent_classification: 'gpt-4o-mini',  // ~50 token output
  entity_extraction: 'gpt-4o-mini',      // ~100 token output
  conversation: 'gpt-4o',                // Full quality needed
  summary: 'gpt-4o-mini',                // ~200 token output
}
```

### 4. Conditional EnhancedContext Loading
```typescript
// Only load what's needed by detected intent
async function buildContext(phone: string, intent: string): Promise<Partial<EnhancedContext>> {
  const base = await loadBaseContext(phone) // Patient + recent history always
  if (intent === 'AGENDAR') return { ...base, appointments: await loadAppointments(phone) }
  if (intent === 'INFORMACAO') return { ...base, procedures: await loadProcedures() }
  return base // For GERAL, SAUDACAO, etc.
}
```

### 5. Migrate Client-Side OpenAI (CRITICAL)
```typescript
// CURRENT (forbidden): src/services/workflow/executors/gptExecutor.ts
const openai = new OpenAI({ apiKey: import.meta.env.VITE_OPENAI_API_KEY, dangerouslyAllowBrowser: true })

// REQUIRED: Create API endpoint and call from browser
// api/routes/workflow.ts
router.post('/execute-gpt-node', authMiddleware, async (req, res) => {
  const { prompt, model, maxTokens } = req.body
  const result = await openai.chat.completions.create({ model, messages: [...], max_tokens: maxTokens })
  costMonitoringService.logUsage({ model, inputTokens: result.usage?.prompt_tokens ?? 0, outputTokens: result.usage?.completion_tokens ?? 0, service: 'WorkflowGPT' })
  return res.json({ content: result.choices[0].message.content })
})
```

## Token Estimation

Rough estimates for ZoraH's current patterns:
- System prompt (with clinic data): ~800-1200 tokens
- History (10 messages): ~500-800 tokens
- User message: ~20-50 tokens
- Response: ~300-500 tokens
- **Total per conversation turn: ~1620-2550 tokens**

With caching + right-sizing + history compression → target: ~900-1400 tokens (40-45% reduction)
