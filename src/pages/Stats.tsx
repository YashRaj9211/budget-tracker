import { useTransactionStore } from '../stores/transactionStore';
import { ChevronLeft, ChevronRight, BarChart3, Wallet, ArrowUpRight, ArrowDownRight, Percent } from 'lucide-react';

function Stats() {
	const selectedYear = useTransactionStore((s) => s.selectedYear);
	const selectedMonth = useTransactionStore((s) => s.selectedMonth);
	const setSelectedMonth = useTransactionStore((s) => s.setSelectedMonth);
	const transactions = useTransactionStore((s) => s.transactions);

	const displayDate = new Date(selectedYear, selectedMonth);
	const formattedMonth = displayDate.toLocaleString('default', { month: 'long', year: 'numeric' });

	const handlePrevMonth = () => {
		if (selectedMonth === 0) {
			setSelectedMonth(selectedYear - 1, 11);
		} else {
			setSelectedMonth(selectedYear, selectedMonth - 1);
		}
	};

	const handleNextMonth = () => {
		if (selectedMonth === 11) {
			setSelectedMonth(selectedYear + 1, 0);
		} else {
			setSelectedMonth(selectedYear, selectedMonth + 1);
		}
	};

	// Calculations
	const incomeTx = transactions.filter((t) => t.type === 'income');
	const expenseTx = transactions.filter((t) => t.type === 'expense');

	const totalIncome = incomeTx.reduce((sum, t) => sum + t.amount, 0);
	const totalExpense = expenseTx.reduce((sum, t) => sum + t.amount, 0);
	const netSavings = totalIncome - totalExpense;

	// Category breakdown for expenses
	const categoryTotals: Record<string, number> = {};
	expenseTx.forEach((t) => {
		const cat = t.category || 'Other';
		categoryTotals[cat] = (categoryTotals[cat] || 0) + t.amount;
	});

	const sortedCategories = Object.entries(categoryTotals)
		.map(([name, amount]) => ({ name, amount }))
		.sort((a, b) => b.amount - a.amount);

	const maxCategoryAmount = sortedCategories.length > 0 ? sortedCategories[0].amount : 1;

	// Account breakdown
	const accountTotals: Record<string, { income: number; expense: number }> = {};
	transactions.forEach((t) => {
		const acc = t.account || 'Cash';
		if (!accountTotals[acc]) {
			accountTotals[acc] = { income: 0, expense: 0 };
		}
		if (t.type === 'income') {
			accountTotals[acc].income += t.amount;
		} else {
			accountTotals[acc].expense += t.amount;
		}
	});

	const sortedAccounts = Object.entries(accountTotals)
		.map(([name, totals]) => ({ name, ...totals, net: totals.income - totals.expense }))
		.sort((a, b) => Math.abs(b.net) - Math.abs(a.net));

	return (
		<div className="relative pb-24">
			{/* Month Header */}
			<header className="flex items-center justify-between border border-black p-3 bg-white mb-6">
				<button
					onClick={handlePrevMonth}
					className="p-1.5 hover:bg-gray-50 border border-black transition-all cursor-pointer flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
					aria-label="Previous month"
				>
					<ChevronLeft size={18} />
				</button>
				<div className="flex items-center gap-2">
					<BarChart3 size={18} />
					<h2 className="text-base font-bold text-black tracking-tight">{formattedMonth} Stats</h2>
				</div>
				<button
					onClick={handleNextMonth}
					className="p-1.5 hover:bg-gray-50 border border-black transition-all cursor-pointer flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
					aria-label="Next month"
				>
					<ChevronRight size={18} />
				</button>
			</header>

			{/* Summaries */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
				<div className="border border-black p-4 bg-emerald-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
					<div className="flex justify-between items-center mb-1">
						<span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Total Income</span>
						<ArrowUpRight size={16} className="text-emerald-700" />
					</div>
					<div className="text-xl font-black text-black">₹{totalIncome.toFixed(2)}</div>
					<div className="text-[10px] font-bold text-emerald-700 mt-1">{incomeTx.length} Deposits</div>
				</div>

				<div className="border border-black p-4 bg-rose-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
					<div className="flex justify-between items-center mb-1">
						<span className="text-xs font-bold uppercase tracking-wider text-rose-800">Total Expenses</span>
						<ArrowDownRight size={16} className="text-rose-700" />
					</div>
					<div className="text-xl font-black text-black">₹{totalExpense.toFixed(2)}</div>
					<div className="text-[10px] font-bold text-rose-700 mt-1">{expenseTx.length} Payments</div>
				</div>

				<div className={`border border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${netSavings >= 0 ? 'bg-purple-100' : 'bg-amber-100'}`}>
					<div className="flex justify-between items-center mb-1">
						<span className="text-xs font-bold uppercase tracking-wider text-gray-800">Net Savings</span>
						<Wallet size={16} className="text-gray-700" />
					</div>
					<div className="text-xl font-black text-black">
						{netSavings < 0 ? '-' : ''}₹{Math.abs(netSavings).toFixed(2)}
					</div>
					<div className="text-[10px] font-bold text-gray-700 mt-1">
						{totalIncome > 0 ? `${((netSavings / totalIncome) * 100).toFixed(0)}% of income saved` : 'No income recorded'}
					</div>
				</div>
			</div>

			{/* Category Distribution */}
			<div className="border border-black bg-white shadow-box p-5 mb-6">
				<h3 className="text-sm font-bold text-black uppercase tracking-wider mb-4 border-b border-black pb-2 flex items-center gap-2">
					<Percent size={16} /> Expense by Category
				</h3>

				{sortedCategories.length > 0 ? (
					<div className="space-y-4">
						{sortedCategories.map(({ name, amount }) => {
							const percentage = totalExpense > 0 ? (amount / totalExpense) * 100 : 0;
							const fillWidth = (amount / maxCategoryAmount) * 100;
							return (
								<div key={name} className="space-y-1.5">
									<div className="flex justify-between items-center text-xs">
										<span className="font-bold text-black">{name}</span>
										<span className="font-medium text-gray-700">
											₹{amount.toFixed(2)} <span className="font-bold text-black">({percentage.toFixed(0)}%)</span>
										</span>
									</div>
									<div className="w-full border-2 border-black h-4 bg-gray-50 relative overflow-hidden">
										<div
											className="h-full bg-pastel-blue border-r-2 border-black transition-all duration-500"
											style={{ width: `${fillWidth}%` }}
										/>
									</div>
								</div>
							);
						})}
					</div>
				) : (
					<div className="py-8 text-center text-sm text-gray-400">
						No expense data for this month
					</div>
				)}
			</div>

			{/* Account Summary */}
			<div className="border border-black bg-white shadow-box p-5">
				<h3 className="text-sm font-bold text-black uppercase tracking-wider mb-4 border-b border-black pb-2 flex items-center gap-2">
					<Wallet size={16} /> Account Cashflows
				</h3>

				{sortedAccounts.length > 0 ? (
					<div className="space-y-3.5">
						{sortedAccounts.map(({ name, income, expense, net }) => (
							<div key={name} className="border border-black p-3 bg-gray-50 flex items-center justify-between">
								<div>
									<div className="font-bold text-sm text-black">{name}</div>
									<div className="text-[10px] text-gray-500 flex gap-2 mt-0.5">
										<span className="text-emerald-700 font-semibold">In: ₹{income.toFixed(0)}</span>
										<span>·</span>
										<span className="text-rose-700 font-semibold">Out: ₹{expense.toFixed(0)}</span>
									</div>
								</div>
								<div className="text-right">
									<div className={`font-black text-sm ${net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
										{net >= 0 ? '+' : ''}₹{net.toFixed(0)}
									</div>
									<div className="text-[9px] font-bold text-gray-400">Net Flow</div>
								</div>
							</div>
						))}
					</div>
				) : (
					<div className="py-8 text-center text-sm text-gray-400">
						No transaction data for this month
					</div>
				)}
			</div>
		</div>
	);
}

export default Stats;
