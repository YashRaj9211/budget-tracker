import { Settings, TrendingDown, TrendingUp, CalendarRange, PlusCircle } from 'lucide-react';
import { Link } from 'react-router';
import { useDateRangeTotals, useTodayExpense } from '../../stores/transactionStore';
import { useBudgetStore } from '../../stores/budgetStore';
import { getDaysRemaining, getTotalDays, formatDisplayDate, todayStr } from '../../utils/date';

function DailyBudgetCard() {
	const budget = useBudgetStore((s) => s.activeBudget);

	const today = todayStr();
	const { expense: rangeExpense } = useDateRangeTotals(budget?.startDate, budget?.endDate);
	const todayExpense = useTodayExpense(today);

	// Calculate yesterday's date string to get expenses strictly before today
	const todayDate = new Date(today + 'T00:00:00');
	todayDate.setDate(todayDate.getDate() - 1);
	const yesterday = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;

	const { expense: expenseBeforeToday } = useDateRangeTotals(budget?.startDate, yesterday);

	// ── No active budget state ──
	if (!budget) {
		return (
			<div className="border border-dashed border-gray-300 bg-white p-5 my-4 flex flex-col items-center justify-center gap-3 text-center">
				<CalendarRange size={28} className="text-gray-300" />
				<div>
					<p className="text-sm font-bold text-gray-500">No active budget</p>
					<p className="text-xs text-gray-400 mt-0.5">
						Set up a budget with a date range to track your spending.
					</p>
				</div>
				<Link
					to="/budget"
					className="flex items-center gap-1.5 text-xs font-bold border border-black px-3 py-1.5 bg-black text-white hover:bg-gray-800 transition-colors"
				>
					<PlusCircle size={13} />
					Create Budget
				</Link>
			</div>
		);
	}

	const totalLimit = budget.totalLimit;
	const totalDays = getTotalDays(budget.startDate, budget.endDate);
	const daysRemaining = getDaysRemaining(budget.endDate);

	// Rolling daily allowance: spread remaining budget at start of today over remaining days
	const dailyAllowance = daysRemaining > 0 ? (totalLimit - expenseBeforeToday) / daysRemaining : 0;
	const progressPercent =
		totalLimit > 0 ? Math.min(Math.round((rangeExpense / totalLimit) * 100), 100) : 0;

	// Alert color
	const alertPct = budget.alertThreshold;
	const isAlert = progressPercent >= alertPct;

	// Today's over/under vs allowance
	const todayDelta = dailyAllowance - todayExpense;
	const isOverToday = todayDelta < 0;

	// Is today within the budget range?
	const isActive = today >= budget.startDate && today <= budget.endDate;

	return (
		<div className="border border-black bg-white p-5 pb-3 shadow-box my-4">
			{/* Header */}
			<div className="flex justify-between items-center mb-1">
				<h3 className="text-xl font-bold text-black">Budget</h3>
				<Link
					to="/budget"
					className="text-gray-500 hover:text-black transition-colors cursor-pointer flex items-center"
					aria-label="Budget settings"
				>
					<Settings size={18} />
				</Link>
			</div>

			{/* Date range label */}
			<p className="text-xs text-gray-500 font-medium mb-3 flex items-center gap-1">
				<CalendarRange size={12} />
				{formatDisplayDate(budget.startDate)} → {formatDisplayDate(budget.endDate)}
				<span className="ml-1 text-gray-400">({totalDays} days)</span>
			</p>

			{/* Progress label row */}
			<div className="flex justify-between items-baseline mb-2 text-sm">
				<span className="text-gray-600">Progress</span>
				<span
					className={`font-bold text-base ${isAlert ? 'text-rose-600' : 'text-black'}`}
				>
					{progressPercent}%
				</span>
			</div>

			{/* Progress bar */}
			<div className="w-full h-3 bg-[#eedcc2] border border-black mb-4">
				<div
					className={`h-full transition-all ${isAlert ? 'bg-rose-500' : 'bg-[#9f8569]'}`}
					style={{ width: `${progressPercent}%` }}
				/>
			</div>

			{/* Mini Stats Row */}
			<div className="flex justify-between items-center">
				<div className="border border-black px-3 py-1.5 text-xs font-bold bg-white text-black tracking-tight">
					{formatDisplayDate(today)}
				</div>
				<div className="flex flex-col text-xs font-medium text-gray-600 text-right">
					<span>
						Daily Allowance:{' '}
						<span className="font-bold text-black">
							₹{dailyAllowance > 0 ? dailyAllowance.toFixed(2) : '0.00'}
						</span>
					</span>
					<span>
						Today's Spent:{' '}
						<span className="font-bold text-black">₹{todayExpense.toFixed(2)}</span>
					</span>
				</div>
			</div>

			{/* Today's over/under indicator — only shown while budget is active */}
			{isActive && totalLimit > 0 && (
				<div
					className={`flex items-center justify-between mt-3 px-3 py-2 border text-xs font-bold ${
						isOverToday
							? 'border-rose-400 bg-rose-50 text-rose-700'
							: 'border-emerald-400 bg-emerald-50 text-emerald-700'
					}`}
				>
					<span className="flex items-center gap-1.5">
						{isOverToday ? <TrendingDown size={13} /> : <TrendingUp size={13} />}
						{isOverToday ? "Over today's budget" : "Under today's budget"}
					</span>
					<span>
						{isOverToday ? '−' : '+'}₹{Math.abs(todayDelta).toFixed(2)}
					</span>
				</div>
			)}

			{/* Footer totals */}
			<div className="flex justify-between text-[11px] text-gray-400 mt-4 px-0.5 font-medium">
				<span>Total: ₹{totalLimit.toFixed(2)}</span>
				<span>Used: ₹{rangeExpense.toFixed(2)}</span>
				<span>{daysRemaining} days left</span>
			</div>
		</div>
	);
}

export default DailyBudgetCard;
