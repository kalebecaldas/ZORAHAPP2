---
name: zorah-railway-deploy
description: Manage ZoraH backend deployments on Railway via MCP. Use when deploying the backend, checking deployment logs, managing environment variables, or diagnosing production issues. Triggers on "deploy", "Railway", "production logs", "env vars", "set variable", "check deployment", "rollback". Do NOT use for frontend (Vercel), database migrations (use zorah-prisma-safe), or local development tasks.
---

# ZoraH Railway Deploy

Manages the ZoraH **backend** deployment on Railway using the Railway MCP server (`user-Railway`).

## Project Context

| Property | Value |
|----------|-------|
| **Workspace path** | `/Users/kalebecaldas/Documents/cursor_projects/ZORAHAPP2-1` |
| **Backend deploy** | Railway (Express API, port 3001) |
| **Frontend deploy** | Vercel (separate — not managed here) |
| **MCP server** | `user-Railway` |

## Available MCP Tools

All tools require `workspacePath: "/Users/kalebecaldas/Documents/cursor_projects/ZORAHAPP2-1"` unless noted.

### Inspection Tools
| Tool | Purpose | Key Parameters |
|------|---------|----------------|
| `list-projects` | List all Railway projects in the account | none |
| `list-services` | List services in the linked project | `workspacePath` |
| `list-deployments` | List deployments with IDs and statuses | `workspacePath`, `limit`, `json: true` for metadata |
| `list-variables` | List all env vars in active environment | `workspacePath`, `service`, `environment` |
| `check-railway-status` | Check Railway platform status | `workspacePath` |

### Action Tools
| Tool | Purpose | Key Parameters |
|------|---------|----------------|
| `deploy` | Upload and deploy from current directory | `workspacePath`, `ci: true` for CI mode, `environment`, `service` |
| `get-logs` | Get build or deploy logs | `workspacePath`, `logType: "build"|"deploy"`, `lines`, `filter`, `deploymentId` |
| `set-variables` | Set environment variables | `workspacePath`, `variables: ["KEY=value"]`, `skipDeploys: true` to avoid auto-redeploy |
| `generate-domain` | Generate a Railway domain for the service | `workspacePath`, `service` |

### Setup Tools (use once)
| Tool | Purpose |
|------|---------|
| `link-service` | Link local project to a Railway service |
| `link-environment` | Link to a specific environment (production/staging) |
| `create-project-and-link` | Create new Railway project and link |
| `create-environment` | Create a new environment (e.g., staging) |
| `deploy-template` | Deploy a Railway template |

## Common Workflows

### 1. Deploy Backend to Production
```
1. Run /pre-deploy checklist first (security + lint + build)
2. list-deployments → note the current deployment ID (for rollback reference)
3. deploy(workspacePath, ci: true) → stream build logs
4. get-logs(workspacePath, logType: "deploy", lines: 50) → verify startup
5. Check for errors: get-logs(filter: "@level:error", lines: 20)
```

### 2. Diagnose Production Error
```
1. list-deployments(json: true) → find failed deployment ID
2. get-logs(workspacePath, logType: "build", deploymentId: "xxx") → build errors
3. get-logs(workspacePath, logType: "deploy", filter: "@level:error", lines: 100) → runtime errors
4. Common ZoraH errors to look for:
   - "AUTH_JWT_SECRET is not defined" → missing env var
   - "Prisma can't reach database" → DATABASE_URL issue
   - "ECONNREFUSED" → OpenAI or external API unreachable
```

### 3. Set/Update Environment Variables
```
IMPORTANT: Never set variables without reading the current list first.

1. list-variables(workspacePath) → see current env vars
2. Verify the variable name matches what api/ code expects:
   - AUTH_JWT_SECRET (not JWT_SECRET — README is outdated)
   - DATABASE_URL
   - OPENAI_API_KEY
   - GPT_MAX_TOKENS_CONVERSATION (default: 500)
   - WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID
   - INSTAGRAM_TOKEN
3. set-variables(workspacePath, variables: ["KEY=value"], skipDeploys: true)
4. If secret change: set-variables then deploy manually
```

### 4. Check Current Deployment Status
```
1. check-railway-status(workspacePath) → platform status
2. list-deployments(workspacePath, json: true, limit: 5) → recent deployments
3. Status values: SUCCESS | FAILED | BUILDING | DEPLOYING | CRASHED
```

## Safety Rules

1. **Always run `/pre-deploy` before deploying** — never deploy without TypeScript + lint + security checks
2. **Always note the current deployment ID before deploying** — enables manual rollback if needed
3. **Never set env vars that contain secrets via chat** — use `set-variables` with the actual value, don't log secrets
4. **`skipDeploys: true` when setting multiple variables** — set all vars first, then trigger a single deploy
5. **Prisma migrations are NOT automatic** — after deploying, manually run: `npx prisma migrate deploy`
6. **Never deploy directly to production with schema changes** — run migration first, then deploy code

## Critical ZoraH Environment Variables

These must exist in Railway for the backend to start:

```
# Authentication
AUTH_JWT_SECRET=<strong random string>

# Database
DATABASE_URL=postgresql://...

# OpenAI
OPENAI_API_KEY=sk-...
GPT_MAX_TOKENS_CONVERSATION=500
GPT_MODEL=gpt-4o

# WhatsApp
WHATSAPP_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_VERIFY_TOKEN=...

# Instagram (optional)
INSTAGRAM_TOKEN=...

# n8n (optional)
N8N_WEBHOOK_URL=...

# Server
NODE_ENV=production
PORT=3001
```

## Log Filter Patterns (for get-logs `filter` param)

| Scenario | Filter |
|----------|--------|
| All errors | `@level:error` |
| Auth failures | `@level:error AND auth` |
| Prisma/DB errors | `prisma OR database OR ECONNREFUSED` |
| OpenAI errors | `openai OR GPT OR token` |
| WhatsApp webhook | `webhook OR whatsapp` |
| Specific status code | `@status:500` |
| Slow requests | `@level:warn AND timeout` |

## Post-Deploy Verification Checklist

After every Railway deploy:
- [ ] `get-logs(logType: "deploy", lines: 30)` — no FATAL errors on startup
- [ ] `get-logs(filter: "@level:error", lines: 20)` — no runtime errors in first 2 min
- [ ] Test WhatsApp webhook endpoint: `GET /webhook` returns 200
- [ ] Test auth endpoint: `POST /api/auth/login` responds correctly
- [ ] Check `GET /api/clinic/data` still serves (public endpoint)
