---
name: /pre-deploy
description: Checklist completo pré-deploy para Railway (backend) e Vercel (frontend) — segurança, TypeScript, lint, migrações Prisma, env vars e qualidade web. Gera relatório PASS/FAIL/WARN por item.
---

Run the complete ZoraH pre-deployment checklist. Execute each step and report PASS ✅, FAIL ❌, or WARN ⚠️.

## Step 1: Load skills
Load `security-best-practices` and `web-quality-audit` skills before proceeding.

## Step 2: Security checks
- Search for hardcoded secrets, API keys, or passwords in `api/` and `src/` (grep for common patterns: `apiKey:`, `password =`, `secret =`, `Bearer `)
- Check `api/utils/auth.ts` for hardcoded JWT fallback
- Check `api/routes/conversations.ts` for `NODE_ENV === 'development'` auth bypass
- Check `src/services/workflow/executors/` for `new OpenAI(` in browser code
- Result: ✅ No hardcoded secrets | ❌ Found: [list]

## Step 3: TypeScript check
Run: `npm run check` (which runs `tsc --noEmit`)
- Report: number of errors, first 5 errors if any
- Result: ✅ 0 type errors | ❌ X errors found

## Step 4: Lint check
Run: `npm run lint`
- Report: number of errors and warnings
- Result: ✅ Clean | ⚠️ Warnings only | ❌ Errors found

## Step 5: TypeScript strict mode
Read `tsconfig.json` — check if `strict: false` is still set.
- Result: ✅ strict: true | ⚠️ strict: false (migration in progress — acceptable for now)

## Step 6: Environment variables
Scan `api/` for all `process.env.VARIABLE_NAME` usages. Create a list.
Check that each variable is documented (in README, .env.example, or deployment config).
- Result: ✅ All documented | ⚠️ Missing documentation for: [list]

## Step 7: Prisma migrations
Run: `npx prisma migrate status`
- Result: ✅ All migrations applied | ❌ Pending migrations: [list]

## Step 8: Build test
Run: `npm run build`
- Result: ✅ Build succeeded | ❌ Build failed

## Step 9: Deploy config
- Read `vercel.json` — verify routes and build config
- Read `package.json` scripts — verify Railway deploy scripts exist
- Result: ✅ Config looks correct | ⚠️ [issue]

## Step 10: Web quality spot-check
For the main entry `src/main.tsx` and `index.html`:
- Check for meta tags (title, description, lang attribute)
- Check for no exposed source maps config in Vite build
- Result: ✅ | ⚠️ [issue]

## Final Report

```markdown
# ZoraH Pre-Deploy Checklist
Date: [today]
Target: Railway (backend) + Vercel (frontend)

| Check | Status | Notes |
|-------|--------|-------|
| No hardcoded secrets | ✅/❌ | |
| TypeScript (0 errors) | ✅/❌ | X errors |
| Lint (0 errors) | ✅/❌ | |
| strict mode | ✅/⚠️ | |
| Env vars documented | ✅/⚠️ | |
| Prisma migrations applied | ✅/❌ | |
| Build succeeds | ✅/❌ | |
| Deploy config valid | ✅/⚠️ | |
| Meta tags present | ✅/⚠️ | |

## Blockers (must fix before deploy)
[List FAIL items]

## Warnings (should fix soon)
[List WARN items]
```
