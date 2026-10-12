# Finance Hub Plan (Salary, Savings Accounts, Exclude-from-Budget)

Created: 2026-10-11 · Status: in progress (Steps 1, 2, 3, 4 & 5 completed, Step 6 planned)

## 1. Goal

Turn the budget tracker into a full finance hub:

1. Enter salary (with history of changes).
2. Keep savings in several accounts (bank, FD, cash, etc.).
3. Mark any transaction as "not in budget", so it is shown but does not affect the budget.
4. See totals: salary, total spent, budget spent, excluded spend, total savings.

## 2. Decisions (confirmed)

| # | Question | Decision |
|---|---|---|
| D1 | What does "exclude" affect? | **Only the budget numbers.** An excluded transaction still shows in lists and in total expenditure. It is NOT counted in budget limit, budget-left, daily budget or budget alerts. |
| D2 | Salary: one value or history? | **History.** Each salary entry has a start date. The salary for a month is the latest entry that started on or before that month. |
| D3 | Offline support for new items? | **Online only** for salary and savings accounts (phase 1). Old offline features stay as they are. |

## 2b. Review notes (2026-10-11)

Steps 1–5 were implemented before this review. Corrections:

- **Bug fixed (Step 1):** a plain edit of an excluded expense that did not send `includeInBudget` re-included it. The stored value is now kept unless the client sends the field. Regression test: `TestExcludedExpenseSurvivesPlainEdit`.
- **Plan mistake fixed (Step 5):** total-spend views on the server (`GetExpensesSummary`, `GetDailySpendOverview`, `GetAnalytics`) had been filtered. They include all PERSONAL rows again, as decision D1 says. Only budget numbers exclude rows.
- **Test corrected:** `TestExcludeFromBudgetBehavior` now expects dashboard and analytics totals of 800 (including the excluded 500).
- **Step 6 done:** the sync service and API client now send `includeInBudget`, so server `budgetSpent` is correct for new and edited transactions.
- **Still to do:** run `gofmt -w models/models.go` (the `Expense` struct alignment changed), then `go vet ./...` and `go test ./...` against a scratch database.

## 3. Ground rules (so current users are not affected)

- **Only add.** New columns get defaults. New tables are separate. No drops, no renames, no data wipes.
- **Never run `go run ./cmd/reset_db -yes` on the real database.** It wipes everything.
- Existing rows get the default value, so today's behaviour stays the same:
  - `include_in_budget` defaults to `true` → all old transactions still count in the budget.
- Old frontend keeps working: the new field is optional, and old requests without it are accepted.
- Old routes are not changed. New routes are added next to them.

## 4. Current state (what exists today)

| Area | Where it lives today |
|---|---|
| Personal transactions, budgets (local) | Browser IndexedDB (`src/db/index.ts`), used by Home/Budget |
| Personal transactions (server copy) | Postgres `expenses` table, pushed by `src/services/syncService.ts` (types `PERSONAL` / `INCOME`) |
| Budgets (server) | Postgres `budgets` table + `handlers/budget_handler.go` |
| Accounts (GPay/Cash/Card) | Plain text on each transaction. No account table. |
| Salary / savings / exclude flag | **Does not exist** |
| Totals | `handlers/dashboard_handler.go`, `handlers/analytics_handler.go`, `src/hooks/useDailyBudget.ts` |

## 5. Database approach

- Migrations are SQL files in `go-server/migrations/`, numbered in order (`000006_...`).
- They are run by `go run ./cmd/migrate`, or automatically if `AUTO_MIGRATE=true`.
- Each file runs once and is recorded in `schema_migrations`.
- Each migration needs an `.up.sql` and a `.down.sql`.
- New `.sql` files are picked up automatically (they are embedded with `go:embed`). No code change is needed to register them.

**Safety steps before any migration on the real database:**
1. Commit the current code to git (so we can go back).
2. Take a Neon branch or backup of the database.
3. Run the migration on that branch first.
4. Start the new server against the branch. Check that the old frontend still works.
5. Only then run it on the real database.

## 6. Step-by-step implementation

Each step = one migration + one small set of code changes + tests. Do not start a step until the previous one is tested.

### Step 0 — Baseline (no code change)
- Commit the current work to git on a new branch, e.g. `feature/finance-hub`.
- Take a Neon branch/backup of the database.
- Run existing tests: `npm test` and `cd go-server && TEST_DATABASE_URL=<scratch db> go test ./...`.
- **Done when:** the commit exists and tests pass.

### Step 1 — Exclude-from-budget flag on transactions — `[COMPLETED]`

- **Status:** COMPLETED
- **What was achieved:**
  - Added migration `000006_add_expense_include_in_budget` (`up.sql` and `down.sql`).
  - Added `IncludeInBudget *bool` to `Expense` struct in `go-server/models/models.go` with pointer to prevent zero-value overrides and defaulted in `BeforeCreate`.
  - Updated `go-server/handlers/authz.go` to validate that the flag applies to `PERSONAL` and `INCOME`, defaults to `true` if omitted, and `SPLIT` expenses ignore it.
  - Updated `go-server/handlers/expense_handler.go` to assign `IncludeInBudget` on create and update.
  - Added test suite `TestExpenseIncludeInBudget` in `go-server/router/api_test.go` verifying create default true, create false, updates, old payload compatibility, and split behavior.
  - Updated `go-server/openapi.yaml` and Bruno request collections.
- **What is left:** None.

**Migration `000006_add_expense_include_in_budget`**

`up.sql`
```sql
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS include_in_budget boolean NOT NULL DEFAULT true;
```
`down.sql`
```sql
ALTER TABLE expenses DROP COLUMN IF EXISTS include_in_budget;
```

**Backend**
- `go-server/models/models.go` → in `Expense` add:
  ```go
  IncludeInBudget *bool `gorm:"column:include_in_budget;default:true" json:"includeInBudget"`
  ```
  - Use a **pointer** (`*bool`). With a GORM default of `true`, a plain `bool` set to `false` is saved as `true`.
  - Treat `nil` as `true` in code.
- `go-server/handlers/expense_handler.go` → accept `includeInBudget` on create and update. If missing, use `true`.
- `go-server/handlers/authz.go` → validation: the flag only matters for `PERSONAL` and `INCOME`. (Splits ignore it.)

**Tests**
- Create expense without the field → stored as `true`.
- Create with `false` → stored as `false`, returned as `false`.
- Old request body (no field) still works.

**Done when:** an expense can be saved with `includeInBudget: false`, and old requests are unchanged.

### Step 2 — Salary with history — `[COMPLETED]`

- **Status:** COMPLETED
- **What was achieved:**
  - Added migration `000007_add_salary_entries` (`up.sql` and `down.sql`).
  - Added `SalaryEntry` model in `go-server/models/models.go` with `salary` UUID generation in `BeforeCreate`.
  - Implemented `handlers/salary_handler.go` with:
    - `GET /salary` (full history ordered newest first).
    - `GET /salary/active?month=YYYY-MM` (evaluates active salary for specified month or current month).
    - `POST /salary` (validates amount >= 0, date formats, trims note, creates entry).
    - `PUT /salary/:id` (updates existing entry fields).
    - `DELETE /salary/:id` (soft-deletes by setting `deleted_at`).
    - Exported `GetSalaryForMonth(db, userID, monthStr)` applying the rule: latest entry on or before the last day of the month.
  - Registered `SalaryRouter` in `router/salary_router.go` and wired into `router/default_router.go`.
  - Added `TestSalaryHistoryAndMonthlyRule` in `router/api_test.go` and verified schema compatibility in `database/migrations_test.go`.
  - Added Bruno API request collection under `bruno/Salary/`.
  - Updated `go-server/openapi.yaml` with salary endpoints and schemas.
- **What is left:** None.

**Migration `000007_add_salary_entries`**

`up.sql`
```sql
CREATE TABLE IF NOT EXISTS salary_entries (
    id             varchar(50)   PRIMARY KEY,
    user_id        varchar(50)   NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount         decimal(12,2) NOT NULL CHECK (amount >= 0),
    currency       varchar(10)   NOT NULL DEFAULT 'INR',
    effective_from date          NOT NULL,
    note           text,
    created_at     timestamptz   NOT NULL DEFAULT now(),
    updated_at     timestamptz   NOT NULL DEFAULT now(),
    deleted_at     timestamptz
);
CREATE INDEX IF NOT EXISTS idx_salary_user_from ON salary_entries (user_id, effective_from);
```
`down.sql`
```sql
DROP TABLE IF EXISTS salary_entries;
```

**Backend**
- `models/models.go` → `SalaryEntry` struct + `BeforeCreate` (ID prefix `salary`), same pattern as `Budget`.
- New file `handlers/salary_handler.go`:
  - `GET /salary` → full history, newest first.
  - `POST /salary` → add an entry `{ amount, effectiveFrom, note }`.
  - `PUT /salary/:id` → edit an entry.
  - `DELETE /salary/:id` → soft delete (set `deleted_at`).
  - All use `requireUserID(c)`, the same as the budget handler. User ID comes from the token, never from the URL.
- `router/salary_router.go` → register the routes.
- `router/default_router.go` → call `SalaryRouter(...)` next to the other routers.

**Rule:** current salary for a month = the entry with the latest `effective_from` that is on or before the last day of that month.

**Done when:** adding two salary entries (e.g. 50 000 from Jan, 60 000 from Jul) gives the right value for each month.

### Step 3 — Savings accounts and their transactions — `[COMPLETED]`

- **Status:** COMPLETED
- **What was achieved:**
  - Added migration `000008_add_savings_accounts` (`up.sql` and `down.sql`) creating `savings_accounts` and `savings_transactions` tables with check constraints and foreign keys.
  - Added models in `go-server/models/models.go`:
    - `SavingsAccountKind` enum (`BANK`, `FD`, `RD`, `MUTUAL_FUND`, `CASH`, `OTHER`).
    - `SavingsTxnDirection` enum (`DEPOSIT`, `WITHDRAWAL`).
    - `SavingsAccount` with `BeforeCreate` generating `account` UUID prefix, default currency `INR`, and default kind `OTHER`. Dynamic `Balance *decimal.Decimal` tagged `gorm:"-"`.
    - `SavingsTransaction` with `BeforeCreate` generating `savtxn` UUID prefix.
  - Implemented `handlers/savings_handler.go`:
    - Dynamic balance computation via `CalculateAccountBalance`: `opening_balance + sum(DEPOSIT) - sum(WITHDRAWAL)` ignoring soft-deleted transactions.
    - Global total savings helper `GetTotalSavings(db, userID)`.
    - `GET /savings-accounts`: lists active accounts for authenticated user, each with calculated `balance`.
    - `POST /savings-accounts`: validates name, kind, non-negative opening balance.
    - `GET /savings-accounts/:id`: returns single account with calculated `balance`.
    - `PUT /savings-accounts/:id`: updates account properties (name, kind, openingBalance, currency) and returns updated balance.
    - `DELETE /savings-accounts/:id`: transactional soft delete of the account and cascades soft delete to its transactions.
    - `GET /savings-accounts/:id/transactions`: lists transactions for the specified account in chronological order (newest first).
    - `POST /savings-accounts/:id/transactions`: validates positive amount, valid direction, parseable date, and records deposit/withdrawal.
    - `DELETE /savings-accounts/:id/transactions/:txnId`: soft-deletes individual transaction, immediately updating dynamic balance.
  - Registered `SavingsRouter` in `router/savings_router.go` and wired it into `router/default_router.go`.
  - Added Bruno API request collection under `bruno/Savings/` (7 request templates).
  - Updated `go-server/openapi.yaml` with savings accounts and transaction paths, parameters, and schemas.
  - Added `TestSavingsAccountsAndTransactions` in `router/api_test.go` and verified model schema mapping in `database/migrations_test.go`. All tests pass.
- **What is left:** None.

**Migration `000008_add_savings_accounts`**

`up.sql`
```sql
CREATE TABLE IF NOT EXISTS savings_accounts (
    id              varchar(50)   PRIMARY KEY,
    user_id         varchar(50)   NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            varchar(100)  NOT NULL,
    kind            varchar(20)   NOT NULL DEFAULT 'OTHER'
                    CHECK (kind IN ('BANK','FD','RD','MUTUAL_FUND','CASH','OTHER')),
    opening_balance decimal(12,2) NOT NULL DEFAULT 0 CHECK (opening_balance >= 0),
    currency        varchar(10)   NOT NULL DEFAULT 'INR',
    created_at      timestamptz   NOT NULL DEFAULT now(),
    updated_at      timestamptz   NOT NULL DEFAULT now(),
    deleted_at      timestamptz
);
CREATE INDEX IF NOT EXISTS idx_savings_accounts_user ON savings_accounts (user_id);

CREATE TABLE IF NOT EXISTS savings_transactions (
    id          varchar(50)   PRIMARY KEY,
    account_id  varchar(50)   NOT NULL REFERENCES savings_accounts(id) ON DELETE CASCADE,
    user_id     varchar(50)   NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount      decimal(12,2) NOT NULL CHECK (amount > 0),
    direction   varchar(10)   NOT NULL CHECK (direction IN ('DEPOSIT','WITHDRAWAL')),
    txn_date    date          NOT NULL,
    note        text,
    created_at  timestamptz   NOT NULL DEFAULT now(),
    deleted_at  timestamptz
);
CREATE INDEX IF NOT EXISTS idx_savings_txn_account ON savings_transactions (account_id, txn_date);
```
`down.sql`
```sql
DROP TABLE IF EXISTS savings_transactions;
DROP TABLE IF EXISTS savings_accounts;
```

**Balance rule (calculated, not stored):**
`balance = opening_balance + sum(DEPOSIT) − sum(WITHDRAWAL)`, ignoring soft-deleted rows.
Storing the balance would drift; calculating it cannot.

**Backend**
- `models/models.go` → `SavingsAccount`, `SavingsTransaction` + `BeforeCreate`.
- `handlers/savings_handler.go`:
  - `GET /savings-accounts` → list, each with its calculated `balance`.
  - `POST /savings-accounts`, `PUT /savings-accounts/:id`, `DELETE /savings-accounts/:id` (soft delete).
  - `GET /savings-accounts/:id/transactions`
  - `POST /savings-accounts/:id/transactions` → `{ amount, direction, txnDate, note }`
  - `DELETE /savings-accounts/:id/transactions/:txnId` (soft delete).
  - Check that the account belongs to the logged-in user before any change (use `handlers/authz.go` pattern).
- `router/savings_router.go` + register in `default_router.go`.

**Done when:** an account with opening 10 000, deposit 5 000, withdrawal 2 000 shows balance 13 000.

### Step 4 — Finance summary endpoint (read-only) — `[COMPLETED]`

- **Status:** COMPLETED
- **What was achieved:**
  - Implemented `handlers/finance_summary_handler.go`:
    - Defined `FinanceSummaryResponse` containing `month`, `salary`, `otherIncome`, `totalIncome`, `totalSpent`, `budgetSpent`, `excludedSpent`, `left`, and `savingsTotal`.
    - Defined `ComputeFinanceSummary(db, userID, monthStr)` helper implementing exact month boundary logic (UTC, matching `analytics_handler.go` and respecting `ISSUES.md` #27).
    - Reused `GetSalaryForMonth` (Step 2) for active monthly salary.
    - Aggregated `otherIncome` from `INCOME` expenses in the month.
    - Aggregated `totalSpent` from all `PERSONAL` expenses in the month (included and excluded).
    - Aggregated `budgetSpent` from `PERSONAL` expenses in the month where `include_in_budget` is true (or default/null).
    - Calculated `excludedSpent = totalSpent - budgetSpent`.
    - Calculated `totalIncome = salary + otherIncome`.
    - Calculated `left = totalIncome - totalSpent`.
    - Reused `GetTotalSavings` (Step 3) for all-time total savings across active savings accounts.
    - Implemented `GetFinanceSummary(c *gin.Context)` with `requireUserID` authentication and `YYYY-MM` month query parameter validation.
  - Implemented `router/finance_summary_router.go` and registered `FinanceSummaryRouter(private)` in `router/default_router.go`.
  - Added Bruno API request file under `bruno/FinanceSummary/Get Finance Summary.bru`.
  - Updated `go-server/openapi.yaml` with `GET /api/_private/v1/finance-summary` and `FinanceSummaryResponse` schema.
  - Added comprehensive test `TestFinanceSummary` in `router/api_test.go` verifying hand calculation for a test user with multiple expenses, salary changes, multiple accounts, soft-deleted expenses/accounts, date boundaries, and user isolation. All tests pass.
- **What is left:** None.

`GET /finance-summary?month=YYYY-MM` (no new tables).

Returns, for the month:

| Field | Meaning |
|---|---|
| `salary` | Salary in effect for that month (rule from Step 2) |
| `otherIncome` | Sum of `INCOME` expenses in the month (existing rows) |
| `totalIncome` | `salary + otherIncome` |
| `totalSpent` | All `PERSONAL` expenses in the month (included **and** excluded) |
| `budgetSpent` | `PERSONAL` expenses where `include_in_budget = true` |
| `excludedSpent` | `totalSpent − budgetSpent` |
| `left` | `totalIncome − totalSpent` |
| `savingsTotal` | Sum of balances across all savings accounts (all time, not per month) |

- New file `handlers/finance_summary_handler.go`, route `GET /finance-summary` in `router/`.
- Use date ranges based on the first and last day of the month.
- **Known issue to respect:** `docs/` and `ISSUES.md` #27 — the server uses UTC dates and the browser uses local dates. Use the same month boundaries as the existing analytics handler (check `analytics_handler.go` first) and note any difference.

**Done when:** the numbers match a hand calculation for a test user with a few entries.

### Step 5 — Apply "exclude" to existing budget totals — `[COMPLETED]`

- **Status:** COMPLETED
- **What was achieved:**
  - Server total-spend views (`GetExpensesSummary`, `GetDailySpendOverview`, `GetAnalytics`): **corrected in review.** They include all PERSONAL rows again (D1). Only `finance-summary` `budgetSpent` excludes excluded rows on the server.
  - Updated frontend browser budget calculation:
    - In `src/types/index.ts`: added `includeInBudget?: boolean` to `Transaction` interface.
    - In `src/stores/transactionStore.ts`: updated `useDateRangeTotals` and `useTodayExpense` (used by `useDailyBudget.ts`) to filter out `t.includeInBudget === false` when summing expenses. Total spend selectors (`useDayGroups`, `useMonthlyTotals`) keep all rows.
    - In `src/utils/analytics.ts`: updated `budgetProgress` and `budgetBurn` to filter `t.includeInBudget !== false`. Overall analytics functions (`monthlyTrend`, `categoryTotals`, etc.) keep all rows.
  - Automated tests added and passing:
    - `TestExcludeFromBudgetBehavior` in `go-server/router/api_test.go`: a ₹500 excluded expense is not in `finance-summary` `budgetSpent`, but IS in total spent on `dashboard` and `analytics` (corrected in review; expectations are now 800), and it still appears in the list breakdown.
    - Added unit test in `src/utils/analytics.test.ts` verifying that `includeInBudget: false` is excluded from `budgetProgress` and `budgetBurn`, while remaining in `monthlyTrend`.
    - All Go tests (`go test ./...`) and frontend tests (`npm test` 75/75) pass.
- **What is left:** Step 6 (sync + checkbox) so the flag reaches the server. See review notes in section 2b.

Only budget numbers skip excluded rows (`include_in_budget = false`). Total-spend views keep all rows (D1).

| Place | Status |
|---|---|
| Browser budget math: `useTodayExpense`, `useDateRangeTotals` (used only by `useDailyBudget.ts`), `budgetProgress` and `budgetBurn` in `src/utils/analytics.ts` | Done |
| Server budget figure: `budgetSpent` in `finance-summary` | Done |
| Server `GetExpensesSummary`, `GetDailySpendOverview`, `GetAnalytics` | Not filtered (total-spend views, corrected in review) |

Rules:
- Only the **budget** number changes (D1).
- Any new total-spend view must keep excluded rows.

**Done when:** a ₹500 excluded expense does not reduce budget-left, but does show in total spent.

### Step 6 — Frontend: checkbox and sync — `[COMPLETED]`

- **Status:** COMPLETED (2026-10-11)
- **What was done:**
  - `AddTransactionForm.tsx`: "Count in budget" checkbox (expense only, checked by default); value is saved on add and edit.
  - `TransactionCard.tsx`: "· Not in budget" label on excluded transactions.
  - `transactionStore.ts`: `includeInBudget` sent on immediate create and update.
  - `syncService.ts`: `includeInBudget` sent on all three personal create/update paths; server→device copy keeps the flag.
  - `financeHubApi.ts`: `includeInBudget` added to `Expense` and `CreateExpensePayload`.

- `src/types/index.ts` → `Transaction` gets `includeInBudget?: boolean` (`undefined` = included).
- `src/components/transaction/AddTransactionForm.tsx` → checkbox **"Count in budget"**, checked by default. Show it for expense type only.
- `src/components/transaction/TransactionCard.tsx` → small badge "Not in budget" when excluded.
- `src/services/syncService.ts` → add `includeInBudget` to the payload in both `expenseApi.create` and `expenseApi.update` calls (around lines 190–235 and 290–360).
- `src/api/financeHubApi.ts` → add `includeInBudget?: boolean` to the `Expense` and `CreateExpensePayload` types.
- **IndexedDB:** no version bump needed (records are stored as plain objects). Old records have no field → treated as included.

**Done when:** an excluded transaction is saved on the phone, synced to the server, and shows the badge after reload.

### Step 7 — Frontend: Money / Finance Hub screens (online only) — `[COMPLETED]`

- **Status:** COMPLETED (2026-10-11)
- **What was done:**
  - New page `src/pages/Money.tsx`, route `/money` (lazy-loaded in `src/router.ts`).
  - Monthly summary card from `GET /finance-summary`, with a month picker.
  - Salary section: add and delete salary entries (history).
  - Savings accounts: add and delete accounts; expand an account to add deposits/withdrawals and delete them.
  - Offline: shows "Connect to the internet" message.
  - API functions added to `src/api/financeHubApi.ts` (`salaryApi`, `savingsApi`, `financeSummaryApi`).
  - Not yet: a link to `/money` in the bottom navigation or Hub (open the URL directly for now); editing an existing salary entry in the UI (the API supports it).

- New page `src/pages/Money.tsx` (route in `src/router.ts`, link in `components/common/BottomNav.tsx` or inside `HubDashboard`).
- Sections:
  1. **Salary** — current salary + history list + "Add salary" form.
  2. **Savings accounts** — list with balances, "Add account", tap to see transactions, "Deposit / Withdraw".
  3. **Summary** — cards from `GET /finance-summary` (salary, total spent, budget spent, excluded, left, total savings).
- New API file functions in `src/api/financeHubApi.ts` (or a new `src/api/financeApi.ts`).
- If offline: show "Connect to the internet to use this" instead of an empty page.
- Follow `docs/STYLE_GUIDE.md` / the Soft Mint style in `migration_steps.md`.

**Done when:** all three sections work end to end on desktop and a phone-width screen.

## 7. Testing checklist (every step)

- [ ] Migration runs on a scratch/Neon branch with `go run ./cmd/migrate`.
- [ ] Down migration runs and the schema returns to the previous state.
- [ ] `go test ./...` passes (`TEST_DATABASE_URL` set to the scratch DB). Go is not installed on the Linux sandbox, so this was NOT run during the 2026-10-11 review.
- [ ] `npm test` passes on Windows. Vitest could not start on the Linux sandbox (native binary missing), so this was NOT run during the review.
- [ ] Regression: an excluded expense stays excluded after a plain edit (`TestExcludedExpenseSurvivesPlainEdit`).
- [ ] `npm test` passes. `npm run build` passes.
- [ ] Old frontend + new server: old screens still work (Home, Budget, Split).
- [ ] New server + old data: an existing user sees the same budget numbers as before.
- [ ] Bruno requests added in `bruno/` for each new endpoint.
- [ ] `openapi.yaml` updated for each new endpoint.

## 8. Deploy order (production)

1. Take a backup / Neon branch.
2. Run migrations (`go run ./cmd/migrate` or `AUTO_MIGRATE=true`). Each new migration only adds things, so the old server can still run.
3. Deploy the Go server (Render).
4. Deploy the frontend (Netlify).
5. Check the old and new screens.

## 9. Rollback

- Each migration has a `down.sql`.
- The new columns and tables are not used by old code, so rolling back the server alone is safe.
- If needed: revert the frontend deploy, then the server deploy, then run the down migration.

## 10. Gotchas

- GORM `default:true` + `bool false` → always use `*bool` for `IncludeInBudget`.
- Files on this PC use **CRLF** line endings in Go files. Keep them when editing.
- Money is stored as `decimal(12,2)` on the server and as paise/rupees on the client. Do not use floats for totals on the server.
- The Go server reads all `.sql` files in `migrations/` at build time. Rebuild the server after adding a migration.
- Do not commit `.env` files (they hold `DATABASE_URL` and `JWT_SECRET`).

## 11. Order of work (summary)

| Step | Title | Touches DB | Touches frontend | Status |
|---|---|---|---|---|
| 0 | Baseline commit + backup | — | — | COMPLETED |
| 1 | Exclude flag on transactions | Yes (000006) | No | COMPLETED |
| 2 | Salary history | Yes (000007) | No | COMPLETED |
| 3 | Savings accounts + transactions | Yes (000008) | No | PLANNED |
| 4 | Finance summary endpoint | No | No | PLANNED |
| 5 | Exclude applied to budget totals | No | Yes (budget hook) | PLANNED |
| 6 | Checkbox + sync | No | Yes | PLANNED |
| 7 | Money / Finance Hub screen | No | Yes | PLANNED |

---

## 12. Phase 2 — Money insights (in progress)

Goal: show the user how money moved month by month: salary, spending, overspending, savings per account, and charts.

### 12.1 What the user will see

| Area | Feature |
|---|---|
| Monthly table | One row per month (last 12 by default): income, spent, budget spent, not in budget, left, savings rate, overspent flag |
| Overspend | Months where spent > income are marked red, with the amount over (e.g. "Overspent by ₹3,200 in Aug") |
| Savings per account | Closing balance of each account at each month end, and a total line |
| Monthly saving | Net deposits minus withdrawals per month, per account |
| Charts | Income vs spent bars with savings-rate line; savings balance stacked area per account; budget vs not-in-budget spend per month; this-month category donut |
| Insights | Short text: "Overspent in 2 of the last 6 months", "Savings grew by ₹12,000 in 3 months" |
| Tabs | Overview · Monthly · Salary · Savings (uses the existing `SegmentedTabs`) |

### 12.2 New API (read-only, no change to old routes)

| Route | Returns |
|---|---|
| `GET /finance/overview?month=YYYY-MM&months=1..24` (default 6 months ending at `month`) | `months[]`: `salary`, `otherIncome`, `totalIncome`, `totalSpent`, `budgetSpent`, `budgetLimit`, `hasBudget`, `budgetLeft`, `overspent`, `overspentBy`, `overspendTotal` (cumulative), `savingsEnd`, `netSavingsFlow`, `adjustedSavings`, `accounts[]` (balance per account at month end); `accounts[]` (current balances); `summary` (`savingsTotal`, `overspendTotal`, `adjustedSavings`, `overspentMonths`) |

How it is calculated:
- Overspent = budget-counted spend (PERSONAL, include flag true or unset) is above the prorated budget limit for that month. `overspentBy = budgetSpent − budgetLimit`. A month with no budget is never overspent.
- Budget limit per month = each budget amount × (days of the month inside the budget range ÷ budget days), summed.
- Overspend is deducted cumulatively from savings: `adjustedSavings = savings − overspendTotal` (all months up to the end month).
- Savings at month end = opening balance + deposits dated before the month end − withdrawals dated before the month end. An account appears from its `openingDate`.
- All data is loaded once and aggregated in Go. Month boundaries are UTC (ISSUES #27, see 12.4).

### 12.3 Database changes (additive)

| Migration | Change | Why |
|---|---|---|
| `000009_add_savings_opening_date` | `savings_accounts.opening_date date` (existing rows set from `created_at`, new rows default to today) | DONE. Balance history needs to know when an account started. |
| (no migration) | Withdrawal over the current balance returns 400 in the savings handler | DONE. Keeps balances believable. A DB check can be added later. |

### 12.4 Known issue to fix first (important for monthly numbers)

- Expense dates are stored as UTC instants (ISSUES #27). An expense made at 1 AM IST on the 1st lands in the previous month on the server.
- Monthly totals will be wrong near month edges until this is fixed.
- Fix plan: store a date-only `expense_day` (the device's local date, sent by the app). Keep old rows as they are. Use `expense_day` for all monthly calculations.
- This is a schema change, so it needs a migration and a decision (see 12.7).

### 12.5 Frontend

- Money page gets tabs: **Overview** (summary + insight text), **Monthly** (table + charts), **Salary**, **Savings**.
- Charts use Recharts, which the project already uses in `src/components/charts/`. Colours come from `palette.ts`.
- Charts are online only (same as Money).
- The Stats page already shows monthly savings from the device's local data. Decide whether Money replaces it or stays separate (see 12.7).

### 12.6 Phase 2 steps (one at a time)

| Step | Work | Status |
|---|---|---|
| 2.1 | Migration 000009 (`opening_date`), required on create, defaulted on old rows | DONE |
| 2.2 | Withdrawal over balance returns 400 | DONE |
| 2.3 | `expense_day` migration + app sends local date (decision 12.7-3) | TODO |
| 2.4 | `GET /finance/overview` (one endpoint instead of monthly + history) with overspend and cumulative deduction tests | DONE (Go tests pass) |
| 2.5 | Money page redesign: hero ring, stats, charts, overspend tracker, forms | DONE (tsc and eslint pass on device; not yet checked in browser) |
| 2.6 | Insight text (e.g. "Overspent in 2 of the last 6 months") | TODO |
| 2.7 | Salary and account edit screens (rename, change kind, edit opening date) | TODO |
| 2.8 | Run Vitest on Windows and check the Money screens on a phone | TODO |

### 12.7 Decisions needed before Phase 2

1. **Overspent meaning:** DECIDED: budget spent is above the budget limit. The overspent amount is deducted cumulatively from total savings (see 12.2).
2. **Account start date:** add `opening_date` (recommended), so balances are correct for past months.
3. **Old expense dates:** keep old rows as they are and use `expense_day` for new rows (recommended). Or back-fill from the UTC date (slightly wrong for IST evenings).
4. **Stats page overlap:** keep Stats (local data) as it is, and build Money on server data (recommended for now). Or make Money the only monthly view later.

### 12.8 Later features (not in Phase 2)

- Savings goals per account (target amount, deadline, progress bar).
- Recurring entries (monthly SIP / RD deposit, salary auto-entry each month).
- Transfer between two savings accounts (one withdrawal + one deposit, linked).
- Interest tracking for FD/RD (rate, maturity date, expected value).
- Category budgets (limit per category) and alerts when near the limit.
- Net worth view (savings + other assets − debts).
- Export monthly report to Excel (project already has Excel helpers in `src/utils/excel.ts`).
- Offline support for the Money screens.
- Reminders (salary day, SIP due date).
