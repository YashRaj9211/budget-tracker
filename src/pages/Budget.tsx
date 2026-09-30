import { useEffect } from 'react';
import { ArrowLeft, CalendarRange } from 'lucide-react';
import { Link } from 'react-router';
import { useBudgetStore } from '../stores/budgetStore';
import { todayStr } from '../utils/date';
import { BudgetForm } from '../components/budget/BudgetForm';
import { BudgetListItem } from '../components/budget/BudgetListItem';

function BudgetSettings() {
	const allBudgets = useBudgetStore((s) => s.allBudgets);
	const saveBudget = useBudgetStore((s) => s.saveBudget);
	const deleteBudget = useBudgetStore((s) => s.deleteBudget);
	const loadAllBudgets = useBudgetStore((s) => s.loadAllBudgets);

	const today = todayStr();

	// Load all budgets on mount
	useEffect(() => {
		loadAllBudgets().then(() => {
			window.hideSplashScreen?.();
		});
	}, [loadAllBudgets]);

	return (
		<div className="relative pb-24">
			{/* Header */}
			<div className="flex items-center justify-between border border-black p-3 bg-white shadow-box mb-6">
				<Link
					to="/"
					className="p-1 hover:bg-gray-50 border border-transparent hover:border-black cursor-pointer transition-all flex items-center"
					aria-label="Go back"
				>
					<ArrowLeft size={20} />
				</Link>
				<h2 className="text-base font-bold text-black tracking-tight">Budget Settings</h2>
				<div className="w-8"></div>
			</div>

			{/* Create New Budget Form */}
			<BudgetForm onSave={saveBudget} />

			{/* Existing Budgets List */}
			{allBudgets.length > 0 && (
				<div className="border border-black bg-white shadow-box p-5">
					<div className="flex items-center gap-2 mb-4">
						<CalendarRange size={18} />
						<h3 className="text-base font-bold text-black">Saved Budgets</h3>
					</div>

					<div className="space-y-3">
						{allBudgets.map((budget) => (
							<BudgetListItem
								key={budget.id}
								budget={budget}
								today={today}
								onDelete={deleteBudget}
							/>
						))}
					</div>
				</div>
			)}

			{allBudgets.length === 0 && (
				<div className="border border-dashed border-gray-300 p-6 text-center text-sm text-gray-400">
					No budgets saved yet. Create one above.
				</div>
			)}
		</div>
	);
}

export default BudgetSettings;
