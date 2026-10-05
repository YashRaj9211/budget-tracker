import React, { useState } from 'react';
import { Trash2, CalendarRange, Bell, Check, X } from 'lucide-react';
import type { Budget } from '../../types';
import { formatDisplayDate, getTotalDays } from '../../utils/date';
import Chip from '../ui/Chip';

interface BudgetListItemProps {
	budget: Budget;
	today: string;
	onDelete: (id: string) => void | Promise<void>;
}

export const BudgetListItem: React.FC<BudgetListItemProps> = ({ budget, today, onDelete }) => {
	const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	const isActive = today >= budget.startDate && today <= budget.endDate;
	const isPast = today > budget.endDate;
	const isFuture = today < budget.startDate;

	const totalDays = getTotalDays(budget.startDate, budget.endDate);
	const dailyAvg = totalDays > 0 ? Math.round(budget.totalLimit / totalDays) : 0;

	const handleDelete = async () => {
		setIsDeleting(true);
		try {
			await onDelete(budget.id);
		} finally {
			setIsDeleting(false);
			setIsConfirmingDelete(false);
		}
	};

	return (
		<div
			className={`p-4 rounded-[20px] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
				isActive ? 'bg-surface ring-1 ring-mint/60 shadow-2xs' : 'bg-surface/70 hover:bg-surface'
			}`}
		>
			{/* Left Side: Icon & Time/Meta Info */}
			<div className="flex items-center gap-3 min-w-0">
				<div
					className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
						isActive
							? 'bg-mint text-ink'
							: isFuture
								? 'bg-lavender/30 text-lavender-deep'
								: 'bg-card text-text-muted'
					}`}
				>
					<CalendarRange size={18} strokeWidth={1.5} />
				</div>

				<div className="min-w-0 flex-1 flex flex-col justify-center">
					<div className="flex items-center gap-2 mb-1">
						<span className="text-[14px] font-medium text-text truncate">
							{formatDisplayDate(budget.startDate)} – {formatDisplayDate(budget.endDate)}
						</span>
						{isActive && (
							<Chip variant="positive" className="shrink-0">
								Active
							</Chip>
						)}
						{isFuture && (
							<Chip variant="info" className="shrink-0">
								Upcoming
							</Chip>
						)}
						{isPast && (
							<Chip variant="neutral" className="shrink-0">
								Past
							</Chip>
						)}
					</div>

					<div className="flex items-center gap-3 text-[12px] text-text-muted">
						<span>{totalDays} days</span>
						<div className="w-1 h-1 rounded-full bg-border/60 hidden sm:block"></div>
						<span className="inline-flex items-center gap-1">
							<Bell size={11} strokeWidth={1.5} />
							Alert at {budget.alertThreshold}%
						</span>
					</div>
				</div>
			</div>

			{/* Right Side: Financials & Action */}
			<div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto pt-3 sm:pt-0 mt-1 sm:mt-0 border-t sm:border-t-0 border-black/30">
				{/* Money Metrics */}
				<div className="flex flex-col sm:items-end justify-center">
					<span className="font-semibold text-text text-[15px]">
						₹{budget.totalLimit.toLocaleString('en-IN')}
					</span>
					<span className="text-[12px] text-text-muted">
						₹{dailyAvg.toLocaleString('en-IN')}/day
					</span>
				</div>

				{/* Delete Action with subtle divider on desktop */}
				<div className="shrink-0 sm:pl-3 sm:border-l sm:border-border/50">
					{isConfirmingDelete ? (
						<div className="flex items-center gap-1.5 bg-card px-2 py-1 rounded-full shadow-2xs">
							<span className="text-[11px] text-danger font-medium pl-1">Delete?</span>
							<button
								onClick={handleDelete}
								disabled={isDeleting}
								className="w-7 h-7 rounded-full bg-danger text-white flex items-center justify-center hover:bg-danger/90 transition-colors disabled:opacity-50 cursor-pointer"
								title="Confirm delete"
							>
								<Check size={13} strokeWidth={2} />
							</button>
							<button
								onClick={() => setIsConfirmingDelete(false)}
								disabled={isDeleting}
								className="w-7 h-7 rounded-full bg-surface text-text-muted hover:text-text flex items-center justify-center transition-colors cursor-pointer"
								title="Cancel"
							>
								<X size={13} strokeWidth={2} />
							</button>
						</div>
					) : (
						<button
							onClick={() => setIsConfirmingDelete(true)}
							className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-danger hover:bg-danger-soft/60 transition-colors cursor-pointer"
							title="Delete budget"
						>
							<Trash2 size={15} strokeWidth={1.5} />
						</button>
					)}
				</div>
			</div>
		</div>
	);
};
