# Fallow Code Analysis Report

## Summary
- **Dead files:** 1
- **Dead exports:** 9
- **Duplicates:** 2 clone groups (45 lines)
- **High complexity functions:** 13
- **Large functions:** 10

---

## Dead Code

### Unused Files

| File | Issue | Fix |
|------|-------|-----|
| `src/components/common/BottomNav.tsx` | Not reachable from any entry point | Remove the file or wire it up to an entry point |

### Unused Exports

| File | Unused Exports | Fix |
|------|---------------|-----|
| `src/utils/date.ts` | `parseMonthKey`, `getDaysInMonth`, `getDaysRemainingInMonth`, `isDateInRange` | Remove exports or use them |
| `src/db/index.ts` | `getTransactionsByDateRange`, `seedCategories`, `seedAccounts` | Remove exports or use them |
| `src/stores/transactionStore.ts` | `useMonthlyTotals` | Remove export or use it |
| `src/utils/midnight.ts` | `msUntilMidnight` | Remove export or use it |

**Quick fix:** Run `fallow fix --dry-run` to auto-fix, or add `// fallow-ignore-next-line unused-exports` to suppress.

---

## Duplication

### Clone Group 1 (20 lines)
- `src/components/home/HomeHeader.tsx:7-26`
- `src/pages/Stats.tsx:8-27`

**Fix:** Extract shared function from both files.

### Clone Group 2 (5 lines)
- `src/components/home/HomeHeader.tsx:5-9`
- `src/pages/Stats.tsx:5-8`

**Fix:** Extract shared function (5 lines) from HomeHeader.tsx, Stats.tsx.

---

## Complexity Issues

### Critical Risk (CRAP ≥ 100)

| File | Function | Lines | CRAP | Fix |
|------|----------|-------|------|-----|
| `src/components/budget/DailyBudgetCard.tsx` | `DailyBudgetCard` | 142 | 306.0 | Break into smaller components |
| `src/components/common/ExcelTools.tsx` | `handleFileChange` | 61 | 306.0 | Extract logic into helper functions |
| `src/components/common/VoiceInput.tsx` | `VoiceInput` | 119 | 156.0 | Break into smaller components |
| `src/pages/Budget.tsx` | `BudgetSettings` | 301 | 132.0 | Split into sub-components |
| `src/components/transaction/AddTransactionForm.tsx` | `AddTransactionForm` | 396 | 110.0 | Split into smaller form sections |
| `src/components/transaction/AddTransactionForm.tsx` | `handleVoiceParsed` | 17 | 90.0 | Extract validation logic |

### High Risk (CRAP 30-99)

| File | Function | Lines | CRAP |
|------|----------|-------|------|
| `src/components/common/Calander.tsx` | `<arrow>` | 31 | 72.0 |
| `src/components/transaction/AddTransactionForm.tsx` | `<arrow>` | 25 | 72.0 |
| `src/pages/Budget.tsx` | `<arrow>` | 53 | 56.0 |
| `src/stores/transactionStore.ts` | `useDateRangeTotals` | 16 | 56.0 |
| `src/pages/Stats.tsx` | `Stats` | 194 | 56.0 |
| `src/pages/Budget.tsx` | `handleSave` | 29 | 30.0 |
| `src/components/common/Calander.tsx` | `Calendar` | 106 | 30.0 |

---

## Test-Only Dependency

| Package | Issue | Fix |
|---------|-------|-----|
| `@tailwindcss/vite` | Listed as production dependency | Move to `devDependencies` |

```bash
npm install --save-dev @tailwindcss/vite
```

---

## Hotspots (High Churn + Complexity)

| File | Risk Score | Trend | Suggestion |
|------|-----------|-------|------------|
| `src/stores/transactionStore.ts` | 63.8 | Cooling | Monitor, already stabilizing |
| `src/pages/Home.tsx` | 50.8 | Cooling | Consider refactoring if issues arise |
| `src/components/transaction/AddTransactionForm.tsx` | 47.8 | Cooling | High churn, prioritize simplification |
| `src/stores/budgetStore.ts` | 43.1 | Cooling | Monitor |
| `src/components/transaction/TransactionCard.tsx` | 40.7 | Accelerating | Review for recent changes |
| `src/db/index.ts` | 33.3 | Accelerating | Review for recent changes |

---

## Recommended Actions

1. **Immediate:** Move `@tailwindcss/vite` to devDependencies
2. **Short-term:** Remove unused exports or add fallow ignore comments
3. **Medium-term:** Extract duplicate code into shared utilities
4. **Long-term:** Break down large components (BudgetSettings, AddTransactionForm, DailyBudgetCard)