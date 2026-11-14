import { useEffect, useMemo } from 'react';
import { ArrowLeft, CalendarRange } from 'lucide-react';
import { Link } from 'react-router';
import { useBudgetStore } from '../stores/budgetStore';
import { statusSheet } from '../stores/statusSheetStore';
import { todayStr } from '../utils/date';
import { BudgetForm } from '../components/budget/BudgetForm';
import { BudgetListItem } from '../components/budget/BudgetListItem';
import { Card } from '../components/ui/Card';
import Chip from '../components/ui/Chip';

function BudgetSettings() {
	const allBudgets = useBudgetStore((s) => s.allBudgets);
	const saveBudget = useBudgetStore((s) => s.saveBudget);
	const deleteBudget = useBudgetStore((s) => s.deleteBudget);
	const loadAllBudgets = useBudgetStore((s) => s.loadAllBudgets);
	const categories = useBudgetStore((s) => s.categories);
	const accounts = useBudgetStore((s) => s.accounts);
	const deleteCategory = useBudgetStore((s) => s.deleteCategory);
	const deleteAccount = useBudgetStore((s) => s.deleteAccount);

	const today = todayStr();

	// Load all budgets on mount
	useEffect(() => {
		loadAllBudgets().then(() => {
			window.hideSplashScreen?.();
		});
	}, [loadAllBudgets]);

	const handleDeleteBudget = async (id: string) => {
		await statusSheet.execute({
			action: async () => {
				await deleteBudget(id);
			},
			processingTitle: 'Deleting budget...',
			processingMessage: 'Removing budget cycle',
			successTitle: 'Budget removed',
			successMessage: 'The budget period has been deleted',
			buttonText: 'Done',
		});
	};

	// Sort budgets: active first, then upcoming, then past (most recent first)
	const sortedBudgets = useMemo(() => {
		return [...allBudgets].sort((a, b) => {
			const aActive = today >= a.startDate && today <= a.endDate;
			const bActive = today >= b.startDate && today <= b.endDate;
			if (aActive && !bActive) return -1;
			if (!aActive && bActive) return 1;

			const aFuture = today < a.startDate;
			const bFuture = today < b.startDate;
			if (aFuture && !bFuture) return -1;
			if (!aFuture && bFuture) return 1;

			return b.startDate.localeCompare(a.startDate);
		});
	}, [allBudgets, today]);

	return (
		<div className="w-full space-y-4 pb-28">
			{/* Modern Navigation Header */}
			<div className="flex items-center justify-between mb-4">
				<div className="flex items-center gap-3">
					<Link
						to="/"
						className="w-10 h-10 rounded-full bg-surface hover:bg-surface/80 text-text flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
						aria-label="Go back"
					>
						<ArrowLeft size={18} strokeWidth={1.5} />
					</Link>
					<div>
						<h1 className="text-[20px] font-medium text-text">Budget settings</h1>
						{/* <p className="text-[12px] text-text-muted mt-0.5">Manage spending targets & allowance rules</p> */}
					</div>
				</div>
				{allBudgets.length > 0 && (
					<Chip variant="neutral">
						{allBudgets.length} {allBudgets.length === 1 ? 'cycle' : 'cycles'}
					</Chip>
				)}
			</div>

			{/* Create New Budget Form */}
			<BudgetForm onSave={saveBudget} />

			{/* Saved Budgets List */}
			{allBudgets.length > 0 ? (
				<Card variant="white" className="p-5 space-y-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2.5">
							<div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-text shrink-0">
								<CalendarRange size={16} strokeWidth={1.5} />
							</div>
							<div>
								<h2 className="text-[15px] font-medium text-text">Saved budgets</h2>
								<p className="text-[12px] text-text-muted">Active, upcoming, and archived periods</p>
							</div>
						</div>
						<Chip variant="neutral">{allBudgets.length}</Chip>
					</div>

					<div className="space-y-3">
						{sortedBudgets.map((budget) => (
							<BudgetListItem
								key={budget.id}
								budget={budget}
								today={today}
								onDelete={handleDeleteBudget}
							/>
						))}
					</div>
				</Card>
			) : (
				<Card variant="white" className="py-10 px-4 text-center flex flex-col items-center justify-center gap-2">
					<div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center text-text-muted mb-1">
						<CalendarRange size={22} strokeWidth={1.5} />
					</div>
					<h3 className="text-[15px] font-medium text-text">No budgets saved yet</h3>
					<p className="text-[12px] text-text-muted max-w-xs">
						Create your first spending ceiling above to track daily allowances and receive threshold warnings.
					</p>
				</Card>
			)}

			{/* Categories and Payment Methods Management */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{/* Categories Card */}
				<Card variant="white" className="p-5 space-y-4">
					<div className="flex items-center justify-between">
						<div>
							<h2 className="text-[15px] font-medium text-text">Categories</h2>
							<p className="text-[12px] text-text-muted">For classifying your expenses</p>
						</div>
						<Chip variant="neutral">{categories.length}</Chip>
					</div>

					<div className="flex flex-wrap gap-1.5">
						{categories.map((cat) => {
							const canDelete = categories.length > 1;
							return (
								<div
									key={cat}
									className="group inline-flex items-center rounded-full text-xs font-medium bg-surface text-text-muted hover:text-text transition-all px-3 py-1.5"
								>
									<span>{cat}</span>
									{canDelete && (
										<button
											type="button"
											onClick={() => deleteCategory(cat)}
											title={`Delete ${cat}`}
											aria-label={`Delete ${cat}`}
											className="ml-1.5 opacity-50 hover:opacity-100 hover:text-danger cursor-pointer transition-opacity"
										>
											×
										</button>
									)}
								</div>
							);
						})}
					</div>
				</Card>

				{/* Payment Methods Card */}
				<Card variant="white" className="p-5 space-y-4">
					<div className="flex items-center justify-between">
						<div>
							<h2 className="text-[15px] font-medium text-text">Payment methods</h2>
							<p className="text-[12px] text-text-muted">Accounts or cards used</p>
						</div>
						<Chip variant="neutral">{accounts.length}</Chip>
					</div>

					<div className="flex flex-wrap gap-1.5">
						{accounts.map((acc) => {
							const canDelete = accounts.length > 1;
							return (
								<div
									key={acc}
									className="group inline-flex items-center rounded-full text-xs font-medium bg-surface text-text-muted hover:text-text transition-all px-3 py-1.5"
								>
									<span>{acc}</span>
									{canDelete && (
										<button
											type="button"
											onClick={() => deleteAccount(acc)}
											title={`Delete ${acc}`}
											aria-label={`Delete ${acc}`}
											className="ml-1.5 opacity-50 hover:opacity-100 hover:text-danger cursor-pointer transition-opacity"
										>
											×
										</button>
									)}
								</div>
							);
						})}
					</div>
				</Card>
			</div>
		</div>
	);
}

export default BudgetSettings;
