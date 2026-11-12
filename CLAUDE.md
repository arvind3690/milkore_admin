# CLAUDE.md — milkore_admin (Next.js)

Admin dashboard for Milkore. Product docs and the API reference live in `../milkore_backend/docs/` (`API_DOCUMENTATION.md` → "Admin").

## Rules

- Next.js 15 App Router, TypeScript strict, Tailwind 4, TanStack Query. No other UI or state libraries without a reason in the report.
- **Tokens never reach the browser.** Only `src/lib/server-api.ts` (server-only) reads/writes the `mk_admin_*` httpOnly cookies. Client code calls `api.*` from `src/lib/api.ts`, which only talks to `/api/auth/*` and `/api/proxy/*`.
- The proxy may only reach `/api/v1/admin/*`. Do not widen it.
- Pages are client components under `src/app/(dash)/`; shared UI in `src/components/ui.tsx`; the current admin via `useAdmin()` (`src/components/admin-context.tsx`). Hide super-admin actions in the UI, but rely on the API for enforcement.
- API responses use `{ statusCode, message, data, errors? }`; `api.*` unwraps `data` and throws `ApiError(message, status, errors)`.
- Destructive actions use `ActionDialog` (reason required for reject/suspend/remove — the vendor sees it).
- Before finishing: `npx tsc --noEmit`, `npm run lint`, `npm run build` — report the real output.
- Never commit `.env.local`. Commit only when asked.
