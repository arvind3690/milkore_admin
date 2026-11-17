# milkore_admin — Progress

Product docs and the API reference are in `../milkore_backend/docs/`. This file logs admin-dashboard work only.

| Date | Phase | Summary | Status |
|---|---|---|---|
| 2026-11-17 | N1 | **Notifications** page (`/notifications`): compose a push in English (+ optional Hindi), choose the audience (selected users, city/PIN, vendors by status; all users / whole role for super admins), choose the screen it opens (inbox, home, a seller's page, support, vendor-only "My shop" / "My products"), live recipient and reachable counts, phone-style preview, confirm dialog. History table with delivery counts, polling while sending, and a details panel with the read rate. Backend: ADR-022 | Done |

## Verified (2026-11-17)

- `npx tsc --noEmit`: clean. `npm run lint`: clean. `npm run build`: success (`/notifications` 7.48 kB).

## Not verified yet

- A click-through against a running API with real devices (the backend e2e suite covers the endpoints).

## Notes

- Uses the existing `/api/proxy/*` route (only `/api/v1/admin/*`); no proxy changes.
- The API enforces SUPER_ADMIN for ALL / ROLE audiences; the page also hides those options for moderators.
