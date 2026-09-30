# Budget Tracker / Finance Hub — Project Map

> Quick guide for browsing this repo. Updated 2026-10-01. New chat? Read `docs/HANDOFF.md` first. Read top to bottom once, then use as a lookup.

## 1. What it is (one paragraph)
A mobile-style PWA for **personal budgeting** (offline, stored in the browser) plus **shared-expense splitting** (Splitwise-like, stored on a Go server). Neo-brutalist UI (black borders, hard shadows). Also has Excel import/export and voice entry parsed by Google Gemini.

## 1b. Folder changes made (branch `refactor/folder-structure`)
- `docs/` now holds `PROJECT_MAP.md`, `STYLE_GUIDE.md` (was `Style.md`), `FALLOW_ANALYSIS.md`, `API_ROUTER_NOTES.md` (was `bruno/User_Router_Notes.md`).
- Renamed `Calander.tsx` → `Calendar.tsx`; Go router files now `auth_router.go`, `group_router.go`, `friendship_router.go`.
- Deleted empty `go-server/router/user_router.go` and its call.
- Root `.env` removed from git tracking (file stays on disk).
- Go backend compiled and vetted clean; auth behaviour tested against a real PostgreSQL (see `ISSUES.md`).
- Rejected work is kept in `docs/rejected/migrations-attempt/` (not compiled).

## 2. Two halves
| Half | Tech | Lives in | Data stored |
|---|---|---|---|
| Frontend | React 19, TypeScript, Vite 8, Tailwind 4, Zustand, React Router 8, PWA | `src/` | IndexedDB (`idb`) in the browser |
| Backend | Go 1.25, Gin, GORM, PostgreSQL (Neon), Gorilla WebSocket, JWT | `go-server/` | PostgreSQL |
| API tests | Bruno collection | `bruno/` | — |

Backend runs two ways: normal server (`ENV=local`) or AWS Lambda. Production is on Render (`divvit.onrender.com`); frontend on Netlify.

## 3. Two data sources (important)
1. **Local (offline)** — transactions, budgets, categories, accounts. Uses `src/db/index.ts` (IndexedDB) → stores → pages `Home`, `Budget`, `Stats`.
2. **Server** — users, friends, groups, group expenses, dashboard. Uses `src/api/*`. Since the latest fixes the **`/split` page also uses the server** when logged in (`splitStore` calls `groupApi`/`expenseApi`); browser storage is only a fallback. Balances are calculated in the browser in integer paise (`utils/debtSimplification.ts`).

## 4. Frontend map (`src/`)
| Path | What it does |
|---|---|
| `main.tsx` → `router.ts` → `App.tsx` | Entry. `App` = layout shell + BottomNav + opens WebSocket |
| `router.ts` | Routes: `/login`; protected: `/` Home, `/hub`, `/budget`, `/stats`, `/split`, `/friends`, `/profile` |
| `pages/` | One file per route |
| `stores/` | Zustand: `authStore` (JWT in localStorage), `transactionStore`, `budgetStore`, `splitStore`, `initialState` |
| `db/index.ts` | IndexedDB wrapper (DB v3; stores: transactions, budgets, categories, accounts, split_groups, split_expenses) |
| `api/` | `client.ts` (axios + JWT interceptor), `authApi`, `financeHubApi` (dashboard/expense/friendship/group), `socketService` (WebSocket w/ auto-reconnect) |
| `hooks/useWebSocket.ts` | Connects socket when logged in; lets pages listen for `REFETCH_EXPENSES`, friend events |
| `components/` | `auth/`, `budget/`, `common/`, `home/`, `split/`, `transaction/` |
| `utils/` | `date.ts`, `debtSimplification.ts` (who-pays-whom), `gemini.ts` (voice text → JSON transaction) |
| `types/` | `index.ts` (Transaction, Budget), `split.ts`, `auth.ts` |

### Page → data source
| Page | Data from |
|---|---|
| Home `/` | IndexedDB (transactions, budget) + small spend chart (`components/home/HomeSnapshot.tsx`) |
| Budget `/budget` | IndexedDB (budgets, categories, accounts) |
| Analytics `/stats` | Switch: **This device** (IndexedDB) or **My account** (server `/dashboard/analytics`, `AccountAnalytics.tsx`) |
| Split `/split` | Server when logged in (`splitStore`); "+ Split" popup = `AddSplitModal` |
| HubDashboard `/hub` | Server (`dashboardApi`, analytics) + WebSocket refresh; charts in `HubCharts.tsx` |
| Friends `/friends` | Server (`friendshipApi`) + WebSocket |
| Auth / Profile | Server (`authApi`) / authStore |

### Add Expense form (`AddTransactionForm.tsx`)
Income / Expense save to IndexedDB. **Split** saves to the server via `useSplitDraft` (`hooks/`), `splitMath.ts` (`utils/`) and `SplitExpenseFields.tsx` (`components/split/`). Group or Friends mode, payer, Equal/Amounts/Percent/Shares, category (from `GET /categories`). Server rules: group mode = everyone must be a member; friends mode = payer is you and others must be accepted friends; split amounts must equal the total.

### Biggest files (refactor candidates)
`AddTransactionForm.tsx` 405 · `db/index.ts` 314 · `Budget.tsx` 309 · `financeHubApi.ts` 300 · `Calendar.tsx` 286 · `AddSplitModal.tsx` 272

## 5. Backend map (`go-server/`)
| Path | What it does |
|---|---|
| `main.go` | Entry. Local server or Lambda. Has a self-ping loop to keep Render awake |
| `router/default_router.go` | Wires everything. Public: `/api/_public/v1/users/{signup,login}`. Private (JWT): `/api/_private/v1/...` |
| `handlers/` | `auth`, `dashboard`, `expense`, `friendship`, `group`, `websocket` |
| `models/models.go` | GORM tables: User, Friendship, Group, GroupMember, Category, Expense, ExpenseSplit, Payment, Budget |
| `middleware/` | JWT check (`x-token` header or `?token=`), CORS |
| `functions/simplify_expense.go` | Greedy debt-simplification (uses `decimal`) |
| `websocket/` | Hub + client (broadcasts refetch events) |
| `mcp/` | MCP server over SSE (tools for AI agents) — experimental |
| `cmd/` | One-off tools: `migrate` (versioned SQL in `go-server/migrations/`), `seed`, `reset_db -yes`, `fix_schema` (deprecated, runs migrate), `debug_uuid` |
| `openapi.yaml` | API spec |

Endpoints (private, **user comes from the JWT, never the URL**): `POST/GET /expenses`, `PUT/DELETE /expenses/:id`, `PUT /expenses/settle/:splitId`, `/groups`, `/groups/:id`, `/groups/:id/members`, `/groups/:id/leave`, `/friendships/...`, `/friends`, `/dashboard`, `/dashboard/{expenses,friends,graph,analytics}`, `/categories`, `/ws`, `/mcp/...`

## 6. Main flows
- **Add a personal transaction:** `AddTransactionForm` → `transactionStore.addTransaction` → `db.addTransaction` → reload month.
- **Voice entry:** `VoiceInput` (browser SpeechRecognition) → `gemini.parseVoiceCommand` → fills the form.
- **Login:** `Auth` → `authStore.login` → JWT saved in localStorage → axios adds it to every request → socket connects.
- **Live sync:** server broadcasts `REFETCH_EXPENSES` → `HubDashboard` reloads.

## 7. Issues
See `ISSUES.md` in the project root (open issues only, each with a fix). Deploy steps: `docs/DEPLOY.md`.

## 8. Commands
```
npm install        # frontend deps
npm run dev        # http://localhost:5173
npm run build      # tsc -b && vite build
npm run lint
cd go-server && go run main.go      # needs go-server/.env (DATABASE_URL, JWT_SECRET, ENV=local, PORT=3001)
```
Env: root `.env` (see `.env.example`) for frontend; `go-server/.env` for backend.

## 9. Skills to improve (based on what this code shows)
Ordered by payoff.

| # | Skill | Why (evidence in this repo) | How to practise here |
|---|---|---|---|
| 1 | **API security / authorization** | Handlers trust URL `userId` (issue 1); secrets in git (issue 2) | Add a middleware helper `CurrentUserID(c)`; remove `:userId` from routes; write a test that user A cannot read user B |
| 2 | **Automated testing** | Zero tests | Vitest for `debtSimplification`, `date.ts`; Go table tests for `SimplifyDebts`; Bruno assertions |
| 3 | **Money handling** | Floats in TS vs decimal in Go | Store amounts as integer paise in the frontend; test rounding |
| 4 | **Architecture / single source of truth** | Two split systems | Decide: server-only, or local-first with sync; delete the unused half |
| 5 | **React component design** | Fallow: `DailyBudgetCard`, `AddTransactionForm`, `BudgetSettings` are 140–400-line components | Split into small components + custom hooks |
| 6 | **TypeScript strictness** | `any` in `useWebSocket`, `socketService`, `window as any` | Type the WS event payloads; enable `noExplicitAny` |
| 7 | **Go project layout** | Duplicated init/main, mis-named files, `cmd/` mixed with app | Move to `cmd/server` + `internal/`; one `setupRouter()` |
| 8 | ~~Database migrations~~ | Fixed: versioned SQL migrations + `AUTO_MIGRATE` | — |
| 9 | **Error handling & validation** | Only one validator file; handlers return raw errors | Central error type + request validation with `validator/v10` |
| 10 | **DevOps hygiene** | Local-path Netlify config, keep-alive ping hack, no CI | GitHub Actions: lint + build + test; env-specific config |
| 11 | **Offline-first sync design** | IndexedDB + server both exist | Learn sync queues, conflict resolution (fits the PWA goal) |
| 12 | **Docs discipline** | 3 stale docs | One README + this map; update on each structure change |

## 10. Quick "where do I change X?" table
| I want to… | Edit |
|---|---|
| Add a route/page | `src/pages/`, then `src/router.ts`, then `components/common/BottomNav.tsx` |
| Change default categories/accounts | `src/types/index.ts` and `src/stores/initialState.ts` (two lists — they disagree!) |
| Change the IndexedDB schema | `src/db/index.ts` (bump `DB_VERSION`, add an `oldVersion < N` block) |
| Add an API endpoint | `go-server/handlers/`, `go-server/router/`, then `src/api/financeHubApi.ts`, `bruno/`, `openapi.yaml` |
| Change DB tables | `go-server/models/models.go` **and** a new `go-server/migrations/0000NN_name.up.sql` + `.down.sql` |
| Who may do what (auth rules) | `go-server/handlers/authz.go` |
| API tests | `go-server/router/api_test.go` (needs `TEST_DATABASE_URL`) |
| Charts (Recharts, soft colours) | `src/components/charts/` |
| Chart maths (trends, budget pace, insights) | `src/utils/analytics.ts` (+ `.test.ts`) |
| Server chart data | `go-server/handlers/analytics_handler.go` -> `GET /dashboard/analytics` |
| Split form logic (group/friends, payer, split types) | `src/hooks/useSplitDraft.ts`, `src/utils/splitMath.ts`, `src/components/split/SplitExpenseFields.tsx` |
| Categories list for forms | `go-server/handlers/category_handler.go` -> `GET /categories` |
| Analytics "My account" view | `src/components/charts/AccountAnalytics.tsx` |
| Split balances | `src/utils/debtSimplification.ts` (+ `.test.ts`) |
| Change the Gemini prompt | `src/utils/gemini.ts` |
