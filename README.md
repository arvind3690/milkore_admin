# Milkore Admin

Next.js 15 (App Router) dashboard for Milkore operations: vendor approvals, users, product moderation, categories, reports, support tickets, audit log and admin accounts.

## Run locally

```bash
cp .env.example .env.local      # MILKORE_API_URL=http://localhost:3000/api/v1
npm install
npm run dev -- -p 3001          # http://localhost:3001
```

Start `milkore_backend` first. The first super admin comes from the backend seed (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`).

## How auth works

- `/api/auth/login` (route handler) calls `POST /admin/auth/login` and stores the access + refresh tokens in **httpOnly, SameSite=Strict cookies**. The browser never receives a token.
- Every data call goes through `/api/proxy/<path>` → `/api/v1/admin/<path>`, adding the bearer token server-side and refreshing it once on 401.
- `middleware.ts` sends visitors without a session to `/login`. The API still authorizes every request (MODERATOR vs SUPER_ADMIN).

## Checks

```bash
npx tsc --noEmit
npm run lint
npm run build
```

## Deploy

Vercel (or any Node host): set `MILKORE_API_URL=https://api.milkore.in/api/v1` and `NEXT_PUBLIC_MILKORE_API_ORIGIN` (origin for dev-style relative photo URLs). See `milkore_backend/docs/DEPLOYMENT.md` §7.
