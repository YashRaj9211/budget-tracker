# HANDOFF — start here in a new chat

Paste this at the start of a new session: *"Read docs/HANDOFF.md, docs/PROJECT_MAP.md and ISSUES.md, then continue."*

Last updated: 2026-10-01 · Branch: `refactor/folder-structure` · **Nothing is committed yet** (all work is uncommitted).

## What the app is
Budget tracker + expense splitting. React/TS/Vite PWA (`src/`) + Go/Gin/GORM/PostgreSQL API (`go-server/`).
Two data worlds: **local** (IndexedDB: Home, Budget, Analytics "This device") and **server** (groups, splits, Hub, Analytics "My account").

## Done so far
- Security/validation fixes, group/friend split rules, versioned DB migrations, settlement flag (issues 1–14).
- Charts/analytics system: Recharts, `/dashboard/analytics`, Hub charts, Analytics page (device/account switch), Home chart.
- Demo data: `go run ./cmd/seed` → `alice@demo.com` / `password` (also bob, charlie…).
- `reset_db -yes` now wipes everything (`ResetAll`).
- Add Expense form: new **Split** option (group or friends, payer, equal/amount/percent/shares, category) + `GET /categories`.
- Deploy guide: `docs/DEPLOY.md` (Render + Netlify + phone install), `netlify.toml`.

## Open work
- Code quality/housekeeping issues **15–27** in `ISSUES.md` (left open on purpose).
- Not yet done: commit to git, CI (GitHub Actions), real-phone test after deploy, demo Excel for the local tracker (offered, not answered).

## Commands
```
npm install && npm run dev          # frontend, http://localhost:5173
npm test                            # Vitest (30 tests)
npm run build && npm run lint       # lint has ~17 old errors (issue 15)
cd go-server
go run ./cmd/migrate                # apply DB migrations
go run ./cmd/seed                   # demo data
go run ./cmd/reset_db -yes          # WIPES the DB (never on production)
go run main.go                      # needs go-server/.env: DATABASE_URL, JWT_SECRET, ENV=local, PORT=3001
TEST_DATABASE_URL=<scratch db> go test ./...
```

## Gotchas
- Deploy backend + frontend **together** (old routes were removed).
- Server needs `ENV=local` outside AWS Lambda.
- Group creation needs a `description`.
- Money is handled in paise; split maths is in `src/utils/splitMath.ts` (frontend) and the expense handler (backend).
- Charts animate; wait a few seconds before screenshots.
- Files on this PC use CRLF in the Go handlers; keep line endings when editing.
- The server calls `divvit.onrender.com/ping` on a loop (issue 22).

## Where things are
See `docs/PROJECT_MAP.md` section 10 ("where do I change X?").
