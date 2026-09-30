# ISSUES (open only)

Updated 2026-10-01. Items 1–14 from the last list are **fixed and tested** (Go tests + Vitest). Only code-quality and housekeeping items remain (you asked to leave these for now).
Priority: 🟡 when convenient.

## ✅ Do this when you deploy the fixes

1. **Run the database migration before (or while) starting the new server:** `cd go-server && go run ./cmd/migrate` — or set `AUTO_MIGRATE=true` on the server (e.g. Render) and it runs on start. It adds the `expenses.is_settlement` column and marks old "Settlement…" expenses as settlements.
2. **Deploy the Go server and the frontend together.** Old routes (`/expenses/user/:id`, …) are gone; an old frontend gets 404s.
3. Run `npm install` once (the `xlsx` package changed and `vitest` was added). Then `npm test` and `cd go-server && TEST_DATABASE_URL=<a scratch database> go test ./...`.
4. `go run ./cmd/reset_db -yes` now wipes and rebuilds the database (it needs `-yes`). Never run it on production.

## 🟡 Code quality and housekeeping

| # | Problem | How to fix |
|---|---|---|
| 15 | **20 lint errors remain** (10 `any`, 10 `setState` inside `useEffect`) plus 2 warnings. | Type the WebSocket and voice payloads. Move effect-loaded data into handlers or hooks. |
| 16 | "You owe" text in group detail shows the rounded-down share, so it can be 1 paisa off. `GroupDetailView.tsx` | Reuse the remainder-splitting helper from `debtSimplification.ts`. |
| 17 | Group creation errors are only logged; the user sees nothing. `AddGroupModal.tsx` | Show the error message in the modal. |
| 18 | Amount math uses `new Function()`. Input is limited to digits and operators, so risk is low. `useMathAmountInput.ts` | Replace with a small expression parser. |
| 19 | Two split code paths remain (server when logged in, browser storage as fallback). All routes need login, so the fallback is mostly dead. | Delete the local fallback, or label it as guest mode. |
| 20 | Stale docs: `docs/STYLE_GUIDE.md`, `docs/FALLOW_ANALYSIS.md` (mention files that don't exist), `go-server/README.md` (old prototype), `docs/API_ROUTER_NOTES.md`. | Rewrite or delete. Keep `PROJECT_MAP.md` as the source of truth. |
| 21 | Git shows ~46 files as modified, but only line endings differ. | Add `.gitattributes` with `* text=auto`. |
| 22 | `main.go` pings a hard-coded Render URL forever. | Use an external uptime pinger or an env setting. |
| 23 | Clutter and config: `go-server/app` (38 MB), `splitwise-go.exe`, `dist/`, `.fallow/`; `.netlify` has a Windows path; no CI. | Delete the binaries locally. A repo-level `netlify.toml` now exists; still add a GitHub Actions job (lint, build, test). |
| 24 | Unused code left over: frontend `expenseApi.settleSplit` and the backend route `PUT /expenses/settle/:splitId` (the UI now settles with settlement expenses). Also several untouched Go files are not `gofmt`-formatted (`friendship_handler.go`, `functions/simplify_expense.go`, `mcp/tools.go`, `utils/*.go`, `validators/*.go`). | Delete the unused API/route, or keep it on purpose. Run `gofmt -w .` in `go-server`. |
| 25 | Guest (offline) mode in the Split screen still matches people by name, because local data has no user IDs. | Fine while names are unique; remove guest mode (see #19) to drop the problem. |
| 26 | Main JS bundle is ~1.1 MB (350 KB gzipped) before charts; the chart library loads separately only on `/stats`, `/hub` and Home. | Lazy-load the other pages too, or use `manualChunks`. |
| 27 | Analytics month buckets use UTC dates on the server and local dates in the browser, so an expense near midnight can land in a neighbouring month on the Hub vs Analytics pages. | Store a date-only `expense_date`, or pass the user's time zone to `/dashboard/analytics`. |
