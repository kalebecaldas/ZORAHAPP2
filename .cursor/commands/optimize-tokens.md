---
name: /optimize-tokens
description: Analisa o uso de tokens OpenAI nos serviços ZoraH e propõe otimizações concretas — caching de prompts estáticos, compressão de histórico, right-sizing de modelos. Gera relatório com economia estimada por serviço.
---

Analyze and optimize OpenAI token usage across all ZoraH AI services. Follow these steps:

## Step 1: Load skill
Load and apply the `zorah-token-optimizer` skill from `.cursor/skills/zorah-token-optimizer/SKILL.md` before proceeding.

## Step 2: Audit conversationalAI.ts
Read `api/services/conversationalAI.ts` in full. Analyze:
- `buildRichSystemPrompt` — identify sections that are static across conversations (clinic data, procedures list, insurance list)
- History slice — current is `-10`. Are older messages just dropped or summarized?
- `max_tokens` value — is `GPT_MAX_TOKENS_CONVERSATION` set in all environments?
- Is `costMonitoringService.logUsage()` called after every completion?
- What model is used? (`this.model` — is it always GPT-4o or can tasks be routed to gpt-4o-mini?)

## Step 3: Audit conversationContext.ts
Read `api/services/conversationContext.ts`. Map the `EnhancedContext` object:
- List every field that is loaded (patient data, history, appointments, learning data, memories, etc.)
- For each field, assess: is it ALWAYS used in the prompt, or only for specific intents?
- Identify fields that are loaded but referenced conditionally

## Step 4: Audit other AI services
Quickly audit `api/services/intelligentBot.ts`, `api/services/ai.ts`, `api/services/memoryService.ts`:
- Are they calling `costMonitoringService.logUsage()` after each completion?
- Are `max_tokens` explicitly set?
- Are they using the right model for their task?

## Step 5: Identify client-side OpenAI
Check `src/services/workflow/executors/gptExecutor.ts` and `gptResponseExecutor.ts`:
- These make OpenAI calls from the browser — this is both a security issue AND a token monitoring gap (costs not tracked)
- Estimate how often workflow GPT nodes are executed

## Step 6: Calculate token estimates
Based on the analysis, estimate average tokens per call:
- Static prompt section: X tokens
- Dynamic context (history + patient data): X tokens
- User message: X tokens
- Response: X tokens
- **Total per turn:** X tokens
- **Monthly estimate** (if traffic data available): X tokens

## Step 7: Propose optimizations
For each optimization found, provide:
1. What to change (with code snippet)
2. Estimated token reduction (%)
3. Implementation complexity (Low/Medium/High)
4. Risk of quality regression (Low/Medium/High)

Prioritize by: high reduction + low risk first.

## Step 8: Generate report
Create `token_optimization_report.md` with findings and save it. Summary to user:
```
Service | Avg Tokens/Call | Proposed Reduction | Risk
conversationalAI | ~2000 | ~40% (cache + history) | Low
intelligentBot | ? | ? | ?
...
```
