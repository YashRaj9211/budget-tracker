import { useDateRangeTotals, useTodayExpense } from '../stores/transactionStore';
import { useBudgetStore } from '../stores/budgetStore';
import { getDaysRemaining, getTotalDays, todayStr } from '../utils/date';

export function useDailyBudget() {
	const budget = useBudgetStore((s) => s.activeBudget);
	const today = todayStr();
	const { expense: rangeExpense } = useDateRangeTotals(budget?.startDate, budget?.endDate);
	const todayExpense = useTodayExpense(today);

	// Yesterday's date string for prior expenses
	const todayDate = new Date(today + 'T00:00:00');
	todayDate.setDate(todayDate.getDate() - 1);
	const yesterday = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;

	const { expense: expenseBeforeToday } = useDateRangeTotals(budget?.startDate, yesterday);

	if (!budget) {
		return {
			hasBudget: false as const,
			budget: null,
			today,
		};
	}

	const totalLimit = budget.totalLimit;
	const totalDays = getTotalDays(budget.startDate, budget.endDate);
	const daysRemaining = getDaysRemaining(budget.endDate);

	// Rolling daily allowance
	const dailyAllowance = daysRemaining > 0 ? (totalLimit - expenseBeforeToday) / daysRemaining : 0;
	const progressPercent = totalLimit > 0 ? Math.min(Math.round((rangeExpense / totalLimit) * 100), 100) : 0;

	const isAlert = progressPercent >= budget.alertThreshold;
	const todayDelta = dailyAllowance - todayExpense;
	const isOverToday = todayDelta < 0;
	const isActive = today >= budget.startDate && today <= budget.endDate;

	return {
		hasBudget: true as const,
		budget,
		today,
		totalLimit,
		totalDays,
		daysRemaining,
		dailyAllowance,
		progressPercent,
		isAlert,
		todayDelta,
		isOverToday,
		isActive,
		rangeExpense,
		todayExpense,
	};
}
