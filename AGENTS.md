# AGENTS.md

## Cursor Cloud specific instructions

### Overview

ZoraH App is a clinic management system with WhatsApp AI integration (Brazilian Portuguese UI). Single `package.json` project with:
- **Frontend**: React 18 + Vite (port 4002)
- **Backend**: Express + Socket.IO (port 3001)
- **Database**: PostgreSQL with Prisma ORM

### Running the app

- `npm run dev` starts both frontend and backend concurrently.
- `npm run up` kills stale ports first, then starts both.
- Backend health check: `curl http://localhost:3001/api/health`

### Database

- PostgreSQL must be running on localhost:5432 before starting the backend.
- Start PostgreSQL: `sudo pg_ctlcluster 16 main start`
- Database name: `zorahapp`, user: `postgres`, password: `postgres`
- The Prisma migration history has ordering issues; use `npx prisma db push` instead of `npx prisma migrate deploy` for local dev setup.
- After schema changes, run `npx prisma generate` to update the client.
- Seed data: `npx tsx scripts/seed_complete.ts && npx tsx scripts/seed_clinic_data.ts && npx tsx scripts/seed_templates.ts`

### Testing

- `npm test` runs Vitest (configured in `vitest.config.ts`, tests in `tests/` directory).
- `npm run lint` runs ESLint (pre-existing lint errors in the codebase are expected).

### Auth

- Register: `POST /api/auth/register` with `{email, name, password}`.
- Login: `POST /api/auth/login` with `{email, password}`.
- Default dev credentials can be created via the register endpoint.

### Environment variables

- A `.env` file is required at the project root. See `scripts/setup_local_db.sh` for the template.
- `DATABASE_URL`, `JWT_SECRET`, and `PORT` are the minimum required for local dev.
- External integrations (OpenAI, WhatsApp, Instagram, n8n) are optional and degrade gracefully.
