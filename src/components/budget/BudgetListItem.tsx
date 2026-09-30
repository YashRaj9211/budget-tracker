import React from 'react';
import { Trash2 } from 'lucide-react';
import type { Budget } from '../../types';
import { formatDisplayDate, getTotalDays } from '../../utils/date';

interface BudgetListItemProps {
	budget: Budget;
	today: string;
	onDelete: (id: string) => void;
}

export const BudgetListItem: React.FC<BudgetListItemProps> = ({ budget, today, onDelete }) => {
	const isActive = today >= budget.startDate && today <= budget.endDate;
	const isPast = today > budget.endDate;
	const isFuture = today < budget.startDate;

	return (
		<div
			className={`border p-3 flex items-start justify-between gap-3 ${
				isActive
					? 'border-emerald-500 bg-emerald-50'
					: isPast
					? 'border-gray-300 bg-gray-50'
					: 'border-black bg-white'
			}`}
		>
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2 mb-0.5">
					<span className="text-xs font-bold text-black">
						{formatDisplayDate(budget.startDate)} → {formatDisplayDate(budget.endDate)}
					</span>
					{isActive && (
						<span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-500 text-white uppercase tracking-wide">
							Active
						</span>
					)}
					{isPast && (
						<span className="text-[10px] font-bold px-1.5 py-0.5 bg-gray-400 text-white uppercase tracking-wide">
							Past
						</span>
					)}
					{isFuture && (
						<span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-500 text-white uppercase tracking-wide">
							Upcoming
						</span>
					)}
				</div>
				<div className="text-xs text-gray-600">
					<span className="font-semibold text-black">₹{budget.totalLimit.toFixed(2)}</span> over{' '}
					{getTotalDays(budget.startDate, budget.endDate)} days · Alert at {budget.alertThreshold}%
				</div>
			</div>
			<button
				onClick={() => onDelete(budget.id)}
				className="shrink-0 p-1.5 border border-transparent hover:border-rose-400 hover:bg-rose-50 text-gray-400 hover:text-rose-600 transition-all cursor-pointer"
				aria-label="Delete budget"
			>
				<Trash2 size={15} />
			</button>
		</div>
	);
};
