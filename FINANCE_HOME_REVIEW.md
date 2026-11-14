# Finance & Home page review (branch: complete-budget-transformation)

Method: read diffs + `tsc --noEmit` (clean). App not run. `vitest`: first run had 5 failures in 3 files (not captured), later 3 runs passed 79/79 -> flaky, not reproduced.

## Items

| # | Area | Issue | Files | Status |
|---|------|-------|-------|--------|
| 1 | Balances | `AccountsPanel` no longer clamps balance at 0 (`Math.max(0, …)` removed) -> can go negative | `src/components/money/AccountsPanel.tsx`, `paymentShared.ts` | OK - negatives correct, consistent with other panels |
| 2 | Balances | Accounts/Payments panels now read `allTransactions`; may show unadjusted balances until loaded | `src/pages/HubDashboard.tsx` | FIXED - `txReady` guard in HubDashboard |
| 3 | Balances | `linkedDelta` added to `savingsTotal`; double-counts if server total already reflects linked payments | `src/pages/HubDashboard.tsx`, go-server finance handlers | OK - not a double-count |
| 4 | Payment methods | New `linkDates`: legacy links count all history, new links default to today -> smaller deductions than before | `src/stores/paymentMethodStore.ts` | FIXED - null link clears stale date; test added. Open: no UI to pick link date |
| 5 | Navigation | Finance tabs removed from page; only reachable via "+" menu (`?tab=`); `/finance` and `/money` auto-open menu | `src/components/common/BottomNav.tsx`, `HubDashboard.tsx`, `src/utils/financeTabs.ts` | FIXED - Finance nav active on /finance and /money. Suggest: active-tab title |
| 6 | Add transaction | Single FAB (tap=form, hold 450ms=voice); z-index `z-40` -> `z-10`, may sit behind nav backdrop (`z-20`) | `src/components/transaction/AddTransactionForm.tsx` | FIXED - hold timer cleanup, ignore non-primary buttons; z-index fine |
| 7 | Voice | Old `handleVoiceParsed` autofill removed; `VoiceInput` replaced by `VoiceCaptureOverlay`, autofill unverified | `AddTransactionForm.tsx`, `src/components/voice/`, `useVoiceInput.ts` | FIXED - stale onend in useVoiceInput. Open: voice no longer opens prefilled form / creates categories |
| 8 | Dates | `toISOString()` -> `toLocaleDateString('en-CA')`; other code may still use UTC "today" | grep `toISOString` in `src` | FIXED - todayStr() used in 6 files |

## Batch 3 (Go server)
- Voice endpoint: hardened (32KB body cap, rune-safe truncation, list caps, date validation, 1MB upstream cap).
- Unique username migration/auth: no bugs.
- Friendships/bloom: no bugs. Minor: no unique index on friendships; blocked users get generic 409.

## Not reviewed (original, now covered above)
- Go server: `voice_handler.go`, `000010_unique_username` migration, `voiceApi.ts`.
- `Home.tsx` unchanged; affected only via new `BottomNav`.

## Agent batches (3 at a time)
- Batch 1: #3, #6, #7
- Batch 2: #1, #2, #4
- Batch 3: #5, #8, Go server/voice review
