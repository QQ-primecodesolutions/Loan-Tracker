# README.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Loan Tracker is a single-page Next.js app for tracking informal loans issued at a flat 50% interest rate, with optional R50/day late fees. Data is persisted server-side in [Turso](https://turso.tech) (hosted libSQL) via Prisma, and accessed through Next.js API routes — the client holds an in-memory Zustand cache populated from those routes, but the routes are the source of truth, not the browser.

Access is gated by a single shared password (not per-user auth), enforced server-side via a proxy (`src/proxy.ts`) that checks a signed session cookie before allowing any `/api/loans*` or `/api/settings*` request through.

## Commands

Package manager is **bun** (see `bun.lock`).

- `bun run dev` — start dev server on port 3000, tees output to `dev.log`
- `bun run build` — `next build` (plain; no standalone packaging — see "Deploying" below)
- `bun run start` — `next start`
- `bun run lint` — ESLint via `eslint.config.mjs`
- `bun run db:push` — push `prisma/schema.prisma` to the database at `TURSO_DATABASE_URL` (use this instead of migrations; there's no `prisma/migrations` history in this repo)
- `bun run db:generate` / `db:migrate` / `db:reset` — standard Prisma CLI commands, available but `db:push` is the normal workflow here

There is no test suite configured in this repo.

### `prisma.config.ts` — required for the CLI to reach Turso

Prisma's schema parser hard-requires the `sqlite` datasource's `url` to be a literal `file:`-prefixed string (even with a driver adapter active), so `prisma/schema.prisma`'s `datasource db { url = "file:local-placeholder.db" }` is a dummy value — it is **not** read at runtime by either the app or the CLI. Real connectivity for both goes through `@prisma/adapter-libsql`, reading `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN` from `process.env` directly:
- App runtime: `src/lib/db.ts` constructs the adapter directly.
- CLI (`db push`/`generate`/etc.): `prisma.config.ts` at the repo root registers the same adapter via `engine: 'js'` + `experimental: { adapter: true }`. This file also explicitly does `import 'dotenv/config'` — once a `prisma.config.ts` exists, the Prisma CLI stops auto-loading `.env` itself, so without that import `bunx prisma db push` fails with "Environment variable not found."

### Local development database

`TURSO_DATABASE_URL` can point at a local file for dev (no Turso account needed) — e.g. `file:C:/absolute/path/to/repo/db/custom.db`. **Use an absolute path**: `@prisma/adapter-libsql`/`@libsql/client` resolves relative `file:` URLs relative to `process.cwd()`, which differs depending on whether the CLI (`prisma.config.ts`, cwd = repo root) or a script run from elsewhere invokes it — an absolute path sidesteps any ambiguity.

## Architecture

### Data flow: API routes → Prisma (libSQL adapter) → Turso

- `src/lib/db.ts` builds the Prisma client with `@prisma/adapter-libsql`, reading `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN`. `prisma/schema.prisma` has `Loan`, `Payment` (cascade-deletes with its loan), and a singleton `Settings` row (`id: "global"`) holding `lateFeeEnabled`.
- Routes live under `src/app/api/loans/` (list/create, `[id]` update/delete, `[id]/payments` add, `[id]/payments/[paymentId]` delete) and `src/app/api/settings/` (get/patch). All mutation routes return the full updated `Loan` (with `payments` included) so the client can splice it straight into local state without a refetch.
- `src/lib/loan-server.ts` has the shared server-side recalculation helpers (`getLateFeeEnabled`, `recalcLoanStatus`) that every mutating route calls after writing, so the persisted `status` column stays consistent with the same `calculateDaysOverdue`/`calculateBalance`/`determineStatus` pure functions from `src/lib/types.ts` that the client also uses.

### Auth: server-side session cookie + proxy gate

- `src/lib/auth.ts` compares against `APP_PASSWORD` (env, defaults to `loan2024`) and derives a session token as `sha256(APP_PASSWORD)` using the Web Crypto API (`crypto.subtle`) — chosen deliberately over Node's `crypto` module so the same code works in both the Node route handlers and the Edge-runtime proxy.
- `src/app/api/auth/{login,logout,session}/route.ts` set/clear/check the `loan_auth` httpOnly cookie.
- `src/proxy.ts` is Next.js 16's replacement for `middleware.ts` (the file must be named `proxy.ts` and export a function named `proxy`, not `middleware` — Next 16 errors on the old convention). Its `matcher` only covers `/api/loans/:path*` and `/api/settings/:path*`; the `/api/auth/*` routes are intentionally left open so the client can check/establish a session.

### Client state — `src/lib/loan-store.ts`

Still a single Zustand store (`useLoanStore`), but no longer uses `persist`/localStorage — `loans` and `lateFeeEnabled` are populated by `init()` (called once from `src/app/page.tsx` on mount), which checks `/api/auth/session` and, if authenticated, fetches `/api/loans` + `/api/settings`. Every mutating action (`addLoan`, `updateLoan`, `deleteLoan`, `addPayment`, `deletePayment`, `setLateFeeEnabled`) is now `async`, hits the corresponding API route, and merges the returned record into local state; components call them the same fire-and-forget way as before (they don't await), so failures are caught inside the store and surfaced via `sonner` (`toast.error`) rather than thrown into an unhandled rejection.

Key derived-value pattern (unchanged from before the DB migration): raw `Loan` records only store borrower/loan facts + a best-effort `status`; **all money math is recomputed on read**, both server-side (`recalcLoanStatus`) and client-side (`getEnrichedLoan`/`getSummary` in the store, run fresh on every call against "now"). This is intentional duplication — a loan can flip from `pending` to `overdue` purely from time passing, with no mutation to trigger a recalc, so the client-side live computation is still required even though the server also tracks a status column. If you change a money formula, update `src/lib/types.ts` and check both `getEnrichedLoan`/`getSummary` (client) and `loan-server.ts` (server) pick it up.

### UI composition

`src/app/page.tsx` calls `init()` on mount, shows a spinner while `authChecked` is false, then gates on `isAuthenticated` (rendering `LoginScreen` otherwise), then composes `DashboardSummary`, `LoanTable`, and dialogs (`AddLoanDialog`, `PaymentDialog`, `ConfirmDeleteDialog`) from `src/components/loan-tracker/`. Feature components live in `src/components/loan-tracker/`; generic shadcn/ui primitives live in `src/components/ui/` (added via `components.json` — style `new-york`, no tsx prefix, aliases `@/components`, `@/lib`, `@/hooks`).

Two features are implemented directly in `page.tsx` rather than as separate modules:
- **Receipt generation**: `generateReceiptHTML()` builds a full standalone HTML string (inline CSS) opened in a new window via `window.open` + `document.write`.
- **CSV export**: `exportToCSV()` builds a CSV client-side and triggers a download via a Blob URL.

### Theming

Dark theme only, defined via CSS custom properties in `src/app/globals.css` under `:root` (Tailwind v4 `@theme inline` mapping). Brand accent is a neon-yellow (`--primary: #FACC15`), with extra one-off tokens `--color-neon`, `--color-neon-glow`, `--color-surface` used ad hoc in component classNames. When adding new UI, match this existing neon-on-black palette rather than introducing new colors.

## Environment variables

- `TURSO_DATABASE_URL` — libSQL connection string (`libsql://<db>-<org>.turso.io` in production, or a local `file:` path for dev — see "Local development database" above)
- `TURSO_AUTH_TOKEN` — Turso auth token (not needed for local `file:` dev)
- `APP_PASSWORD` — shared password for the login screen (defaults to `loan2024` if unset — override this in any real deployment)

All three are read directly via `process.env`; there's no validation/parsing layer, so a typo'd var name fails silently at the Prisma/auth layer rather than at startup.

## Deploying

Target is Vercel (no `output: "standalone"` in `next.config.ts`, plain `next build`/`next start` scripts). Set `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, and `APP_PASSWORD` as Vercel project env vars, then run `bunx prisma db push` once against the real Turso DB (from a machine with the same env vars) before first deploy — there's no build-time migration step.

The `.zscripts/`, `Caddyfile`, and `mini-services/` files are leftovers from this repo's original self-hosted deployment path (template-provided, comments in Chinese) and are no longer wired up — `next.config.ts` no longer produces the `.next/standalone` output they depend on. They're safe to ignore or delete; don't try to fix them up as part of unrelated work.

## Other leftover scaffolding

- `src/app/api/route.ts` — a placeholder `{ message: "Hello, world!" }` handler at `/api`, unrelated to the loan tracker's own `/api/loans` etc.
- `examples/websocket/` — template example code, unrelated to the loan tracker (and doesn't typecheck standalone — `socket.io`/`socket.io-client` aren't installed).

## Notable non-defaults

- `next.config.ts` sets `typescript: { ignoreBuildErrors: true }` and `reactStrictMode: false`. `add-loan-dialog.tsx`/`payment-dialog.tsx` currently have real `tsc` errors from a zod/react-hook-form resolver type mismatch — pre-existing, build-invisible only because of `ignoreBuildErrors`.
- `eslint.config.mjs` turns off most `@typescript-eslint`, several `react`/`react-hooks`, and `@next/next` rules — lint is intentionally permissive here.
