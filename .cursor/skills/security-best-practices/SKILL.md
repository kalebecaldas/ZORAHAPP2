---
name: security-best-practices
description: Perform language and framework specific security best-practice reviews and suggest improvements. Use when the user explicitly requests security best practices guidance, a security review or report, or secure-by-default coding help. Supports Python, JavaScript/TypeScript, and Go. Do NOT use for general code review, debugging, threat modeling (use security-threat-model), or non-security tasks.
metadata:
  author: github.com/openai/skills
  version: '1.0.0'
---

# Security Best Practices

## Overview

This skill provides a description of how to identify the language and frameworks used by the current context, and then to load information from this skill's references directory about the security best practices for this language and or frameworks.

This information, if present, can be used to write new secure by default code, or to passively detect major issues within existing code, or (if requested by the user) provide a vulnerability report and suggest fixes.

## Workflow

The initial step for this skill is to identify ALL languages and ALL frameworks which you are being asked to use or already exist in the scope of the project you are working in. Focus on the primary core frameworks. Often you will want to identify both frontend and backend languages and frameworks.

Then check this skill's references directory to see if there are any relevant documentation for the language and or frameworks. Make sure you read ALL reference files which relate to the specific language and or frameworks.

## ZoraH-Specific Security Context

**Stack:** Express 4 + TypeScript + React 18 + Prisma 6 + PostgreSQL

**Known critical issues to audit:**
- `api/routes/conversations.ts` lines 137-143 — auth bypass by `NODE_ENV === 'development'`
- `api/utils/auth.ts` — JWT hardcoded fallback secret
- `api/app.ts` — `GET /api/clinic/data` is public without `authMiddleware`
- `src/services/workflow/executors/gptExecutor.ts` — `new OpenAI({ apiKey })` in browser (XSS risk)
- JWT stored in `localStorage` instead of httpOnly cookie
- Rate limiters bypassed in development mode
- Webhooks `/webhook`, `/webhook/instagram` — missing HMAC signature validation
- PHI data (Patient, Appointment, Conversation) without proper LGPD data handling controls

**Authentication System:**
- JWT via `Bearer` header, validated in `api/utils/auth.ts`
- Roles: `MASTER | ADMIN | SUPERVISOR | ATENDENTE`
- `authMiddleware` → `authorize([roles])` pattern in `api/utils/auth.ts`

## Report Format

When producing a report, write it to `security_best_practices_report.md`.

The report should have:
- Short executive summary
- Sections delineated by severity: CRITICAL | HIGH | MEDIUM | LOW
- For each finding: numeric ID, file path with line number, impact statement (one sentence), fix with code
- LGPD/PHI impact column for findings touching patient data

## Fixes Protocol

- Fix one finding at a time
- Consider regressions carefully — especially auth bypasses that may be load-bearing for development
- Always run `npm run check` (tsc) and `npm run lint` after fixes
- Use atomic commits per finding

## Secure Coding Defaults for This Stack

### Express Endpoints
```typescript
// Every new route MUST have one of:
router.get('/path', authMiddleware, authorize(['ADMIN']), handler)  // protected
// OR a documented public justification:
// PUBLIC: This endpoint serves clinic info for the booking widget (no auth)
router.get('/public-path', handler)
```

### Zod Validation (mandatory on all inputs)
```typescript
const schema = z.object({ phone: z.string().min(10), name: z.string().min(2) })
const result = schema.safeParse(req.body)
if (!result.success) return res.status(400).json({ error: 'Invalid input' })
```

### Prisma Error Handling (never expose internals)
```typescript
try {
  const data = await prisma.patient.findMany(...)
} catch (error) {
  console.error('DB error:', error)
  return res.status(500).json({ error: 'Internal server error' })
}
```

### Webhook HMAC Validation
```typescript
const signature = req.headers['x-hub-signature-256'] as string
const expected = 'sha256=' + crypto.createHmac('sha256', process.env.WEBHOOK_SECRET!)
  .update(JSON.stringify(req.body)).digest('hex')
if (signature !== expected) return res.status(401).json({ error: 'Invalid signature' })
```
