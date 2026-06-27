import { Settings, TrendingDown, TrendingUp } from 'lucide-react';
import { Link } from 'react-router';
import { useTransactionStore, useMonthlyTotals, useTodayExpense } from '../../stores/transactionStore';
import { useBudgetStore } from '../../stores/budgetStore';
import { getDaysRemainingInMonth, formatDisplayDate, todayStr } from '../../utils/date';

function DailyBudgetCard() {
	const selectedYear = useTransactionStore((s) => s.selectedYear);
	const selectedMonth = useTransactionStore((s) => s.selectedMonth);
	const budget = useBudgetStore((s) => s.currentBudget);
	const { expense } = useMonthlyTotals();

	const today = todayStr();
	const todayExpense = useTodayExpense(today);
	const monthlyLimit = budget?.monthlyLimit ?? 0;

	// Rolling daily allowance: spread remaining budget over remaining days
	const daysRemaining = getDaysRemainingInMonth(selectedYear, selectedMonth);
	const dailyAllowance = daysRemaining > 0 ? (monthlyLimit - expense) / daysRemaining : 0;
	const progressPercent = monthlyLimit > 0 ? Math.min(Math.round((expense / monthlyLimit) * 100), 100) : 0;

	// Today's over/under vs the allowance
	const todayDelta = dailyAllowance - todayExpense; // positive = under budget (good), negative = over
	const isOverToday = todayDelta < 0;
	const isViewingCurrentMonth =
		new Date().getFullYear() === selectedYear && new Date().getMonth() === selectedMonth;

	return (
		<div className="border border-black bg-white p-5 pb-3 shadow-box my-4">
			<div className="flex justify-between items-center mb-3">
				<h3 className="text-xl font-bold text-black">Daily Budget</h3>
				<Link to="/budget" className="text-gray-500 hover:text-black transition-colors cursor-pointer flex items-center" aria-label="Budget settings">
					<Settings size={18} />
				</Link>
			</div>
            
			<div className="flex justify-between items-baseline mb-2 text-sm">
				<span className="text-gray-600">Progress</span>
				<span className="font-bold text-base">{progressPercent}%</span>
			</div>

			{/* Progress bar matching the mockup's flat tan/cream colors */}
			<div className="w-full h-3 bg-[#eedcc2] border border-black mb-4">
				<div className="h-full bg-[#9f8569]" style={{ width: `${progressPercent}%` }}></div>
			</div>

			{/* Mini Stats Row */}
			<div className="flex justify-between items-center">
				<div className="border border-black px-3 py-1.5 text-xs font-bold bg-white text-black tracking-tight">
					{formatDisplayDate(today)}
				</div>
				<div className="flex flex-col text-xs font-medium text-gray-600">
					<span>
						Today's Allowance: <span className="font-bold text-black">₹{dailyAllowance > 0 ? dailyAllowance.toFixed(2) : '0.00'}</span>
					</span>
					<span>
						Today's Spent: <span className="font-bold text-black">₹{todayExpense.toFixed(2)}</span>
					</span>
				</div>
			</div>

			{/* Today's over/under indicator — only shown for current month */}
			{isViewingCurrentMonth && monthlyLimit > 0 && (
				<div className={`flex items-center justify-between mt-3 px-3 py-2 border text-xs font-bold ${
					isOverToday
						? 'border-rose-400 bg-rose-50 text-rose-700'
						: 'border-emerald-400 bg-emerald-50 text-emerald-700'
				}`}>
					<span className="flex items-center gap-1.5">
						{isOverToday ? <TrendingDown size={13} /> : <TrendingUp size={13} />}
						{isOverToday ? 'Over today\'s budget' : 'Under today\'s budget'}
					</span>
					<span>
						{isOverToday ? '−' : '+'}₹{Math.abs(todayDelta).toFixed(2)}
					</span>
				</div>
			)}

			<div className="flex justify-between text-[11px] text-gray-400 mt-4 px-0.5 font-medium">
				<span>Total: ₹{monthlyLimit.toFixed(2)}</span>
				<span>Used: ₹{expense.toFixed(2)}</span>
				<span>{daysRemaining} days left</span>
			</div>
		</div>
	);
}

export default DailyBudgetCard;
