import { Settings } from 'lucide-react';
import { Link } from 'react-router';
import { useTransactionStore, useMonthlyTotals } from '../../stores/transactionStore';
import { useBudgetStore } from '../../stores/budgetStore';
import { getDaysRemainingInMonth, formatDisplayDate, todayStr } from '../../utils/date';

function DailyBudgetCard() {
	const selectedYear = useTransactionStore((s) => s.selectedYear);
	const selectedMonth = useTransactionStore((s) => s.selectedMonth);
	const budget = useBudgetStore((s) => s.currentBudget);
	const { expense } = useMonthlyTotals();

	const monthlyLimit = budget?.monthlyLimit ?? 0;
	const daysRemaining = getDaysRemainingInMonth(selectedYear, selectedMonth);
	const dailyAllowance = daysRemaining > 0 ? (monthlyLimit - expense) / daysRemaining : 0;
	const progressPercent = monthlyLimit > 0 ? Math.min(Math.round((expense / monthlyLimit) * 100), 100) : 0;
	const remaining = Math.max(dailyAllowance, 0);
	const today = formatDisplayDate(todayStr());

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

			{/* Mini Stats Row - Subtle/Muted extra info */}
			<div className="flex justify-between items-center">
				<div className="border border-black px-3 py-1.5 text-xs font-bold bg-white text-black tracking-tight">
					{today}
				</div>
				<div className="flex flex-col text-xs font-medium text-gray-600">
					<span>
						Remaining: <span className="font-bold text-black">₹{remaining.toFixed(2)}</span>
					</span>
					<span>
						Allowance: <span className="font-bold text-black">₹{dailyAllowance > 0 ? dailyAllowance.toFixed(2) : '0.00'}</span>
					</span>
				</div>
			</div>

			<div className="flex justify-between text-[11px] text-gray-400 mt-4 px-0.5 font-medium">
				<span>Total: ₹{monthlyLimit.toFixed(2)}</span>
				<span>Used: ₹{expense.toFixed(2)}</span>
				<span>{daysRemaining} days left</span>
			</div>
		</div>
	);
}

export default DailyBudgetCard;
