---
name: /check-routes
description: Gera mapa completo de todos os endpoints da API ZoraH — autenticação, roles necessários, validação Zod e conformidade com o padrão de erro. Útil antes de deployar ou ao adicionar novos endpoints.
---

Generate a complete authentication and validation map of all ZoraH API endpoints.

## Step 1: Load skill
Load `security-best-practices` skill for reference on Express/TypeScript security patterns.

## Step 2: Map route registry
Read `api/app.ts` completely. Extract every `router.use()` call with its path prefix and middleware chain.

Build the top-level map:
```
/api/auth          → authRouter (check if authMiddleware applied at router level)
/api/patients      → patientsRouter
/api/conversations → conversationsRouter
/api/workflows     → workflowsRouter
... etc
```

## Step 3: Deep-dive each route file
For every file in `api/routes/`, read it and list every endpoint:
- HTTP method (GET, POST, PUT, DELETE, PATCH)
- Path
- Middlewares applied (authMiddleware? authorize()? which roles?)
- Body validation (uses Zod schema? which schema?)
- Returns PHI data (patient name, phone, CPF, medical info)?

## Step 4: Check error response format
For each route file, verify that all error responses use the standard format:
```typescript
return res.status(4XX).json({ error: string, code?: string })
```
Flag any that expose Prisma error details, stack traces, or raw error messages.

## Step 5: Check for dev-only bypasses
Search for `NODE_ENV === 'development'` in all route files that skip authentication or validation.

## Step 6: Generate table
Output a formatted table:

```markdown
## ZoraH API Route Map

| Method | Path | Auth | Roles | Zod Validation | PHI Data | Status |
|--------|------|------|-------|----------------|----------|--------|
| GET | /api/clinic/data | ❌ None | - | ❌ | ❌ | ⚠️ Public, review |
| GET | /api/conversations | ✅ auth | ATENDENTE+ | ❌ | ✅ | ⚠️ No Zod |
| POST | /api/auth/login | ❌ None | - | ✅ | ❌ | ✅ Public OK |
...

## Summary
- Total endpoints: X
- Unauthenticated (justified): X
- Unauthenticated (review needed): X
- Missing Zod validation: X
- Returning PHI without role check: X
```
