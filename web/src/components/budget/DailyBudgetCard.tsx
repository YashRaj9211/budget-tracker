import { Settings, CalendarRange, PlusCircle } from 'lucide-react';
import { Link } from 'react-router';
import { Card } from '../ui/Card';
import ProgressBar from '../ui/ProgressBar';
import Chip from '../ui/Chip';
import { useDailyBudget } from '../../hooks/useDailyBudget';
import { formatDisplayDate } from '../../utils/date';

function DailyBudgetCard() {
	const budgetData = useDailyBudget();

	if (!budgetData.hasBudget) {
		return (
			<Card variant="white" className="flex flex-col items-center justify-center gap-3 text-center my-4 py-8">
				<CalendarRange size={28} className="text-text-muted" />
				<div>
					<p className="text-[15px] font-medium text-text">No active budget</p>
					<p className="text-[12px] text-text-muted mt-1">
						Set up a budget with a date range to track your spending.
					</p>
				</div>
				<Link
					to="/budget"
					className="flex items-center gap-1.5 text-sm font-medium bg-ink text-white rounded-full px-5 py-2.5 mt-2 active:scale-[0.98] transition-transform"
				>
					<PlusCircle size={16} />
					Create Budget
				</Link>
			</Card>
		);
	}

	const {
		budget,
		totalLimit,
		daysRemaining,
		dailyAllowance,
		progressPercent,
		isOverToday,
		isActive,
		rangeExpense,
	} = budgetData;

	return (
		<Card variant="ink" className="pb-5 my-4">
			<div className="flex justify-between items-start mb-5">
				<div>
					<h3 className="text-[15px] font-medium text-white mb-1">Budget</h3>
					<p className="text-[12px] text-text-on-ink-muted flex items-center gap-1">
						<CalendarRange size={12} />
						{formatDisplayDate(budget.startDate)} → {formatDisplayDate(budget.endDate)}
					</p>
				</div>
				<Link
					to="/budget"
					className="text-text-on-ink-muted hover:text-white transition-colors flex items-center"
					aria-label="Budget settings"
				>
					<Settings size={20} />
				</Link>
			</div>

			<div className="flex flex-col gap-1 mb-5">
				<span className="text-[12px] text-text-on-ink-muted">Today's allowance</span>
				<div className="flex items-end justify-between">
					<span className="text-[36px] leading-none font-medium text-white">
						₹{dailyAllowance > 0 ? dailyAllowance.toFixed(0) : '0'}
					</span>
					{isActive && totalLimit > 0 && (
						<Chip variant={isOverToday ? 'negative' : 'positive'}>
							{isOverToday ? "Over budget" : "Under budget"}
						</Chip>
					)}
				</div>
			</div>

			<div className="mb-4">
				<ProgressBar progress={progressPercent} variant="ink" />
			</div>

			<div className="flex justify-between items-center text-[12px] text-text-on-ink-muted">
				<span>₹{rangeExpense.toFixed(0)} of ₹{totalLimit.toFixed(0)}</span>
				<span>{daysRemaining} days left</span>
			</div>
		</Card>
	);
}

export default DailyBudgetCard;
