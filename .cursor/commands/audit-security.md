---
name: /audit-security
description: Executa auditoria completa de segurança no projeto ZoraH — mapeando rotas públicas, bypasses de auth, chaves expostas, webhooks sem HMAC e dados PHI desprotegidos. Gera relatório em security_best_practices_report.md.
---

Execute a full security audit of the ZoraH project. Follow these steps precisely:

## Step 1: Load skill
Load and apply the `security-best-practices` skill from `.cursor/skills/security-best-practices/SKILL.md` before proceeding.

## Step 2: Route authentication map
Read `api/app.ts` and map ALL routes into three categories:
- **Protected:** has `authMiddleware` (and optionally `authorize([roles])`)
- **Public (justified):** no auth, with documented reason
- **Public (unjustified):** no auth, no clear reason — FLAG as issue

Known public routes to verify: `GET /api/clinic/data`, `GET /api/clinic/data/:unit`, `/webhook`, `/webhook/instagram`, `/webhook` (n8n).

## Step 3: Auth bypass detection
Read `api/routes/conversations.ts` lines 137-143. Check if the `NODE_ENV === 'development'` auth bypass is still present. If yes: CRITICAL finding.

## Step 4: Secret hardcoding
Read `api/utils/auth.ts`. Check for hardcoded fallback values in `AUTH_JWT_SECRET`. If yes: CRITICAL finding.

## Step 5: Client-side OpenAI
Search `src/services/workflow/executors/` for `new OpenAI(` or `dangerouslyAllowBrowser`. If found: CRITICAL finding (exposes API key via XSS).

## Step 6: LocalStorage sensitive data
Search `src/` for `localStorage.setItem` and `localStorage.getItem`. Identify what data is stored. JWT tokens stored in localStorage = HIGH finding.

## Step 7: Webhook HMAC validation
Read `api/routes/webhook.ts` (or similar webhook route files). Check for HMAC/signature verification before payload processing. Missing validation = CRITICAL finding.

## Step 8: Rate limiter in production
Search `api/` for `NODE_ENV === 'development'` near rate limiter configuration. Bypassed rate limits = HIGH finding.

## Step 9: Admin hardcoded logic
Read `api/routes/auth.ts`. Check for hardcoded email addresses used for admin/master user creation. If found: HIGH finding.

## Step 10: Generate report
Create `security_best_practices_report.md` in the project root with:

```markdown
# ZoraH Security Audit Report
Date: [today]

## Executive Summary
[2-3 sentences on overall posture]

## Critical Issues (must fix before production)
### SEC-001: [Title]
- **File:** path/to/file.ts:line
- **Vector:** How this could be exploited
- **LGPD Impact:** [Patient data at risk? Which fields?]
- **Fix:**
  ```typescript
  // corrected code
  ```

## High Issues
...

## Medium Issues
...

## Low Issues
...

## Route Authentication Map
| Route | Method | Auth | Role | Status |
|-------|--------|------|------|--------|
...
```

Report findings to the user after writing the file.
