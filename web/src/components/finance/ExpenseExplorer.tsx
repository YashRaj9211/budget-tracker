import { useState, useMemo } from 'react';
import { Filter, Sparkles } from 'lucide-react';
import type { Transaction, DayGroup } from '../../types';
import { Card } from '../ui/Card';
import { getDayName, getDayNum } from '../../utils/date';
import TransactionList from '../transaction/TransactionList';

interface ExpenseExplorerProps {
	transactions: Transaction[];
	onEditTransaction?: (transaction: Transaction) => void;
}

type FilterMode = 'ALL' | 'BUDGETED' | 'EXCLUDED' | 'INCOME';

export default function ExpenseExplorer({
	transactions,
}: ExpenseExplorerProps) {
	const [filter, setFilter] = useState<FilterMode>('ALL');

	const stats = useMemo(() => {
		let totalAll = 0;
		let budgetedCount = 0;
		let budgetedSum = 0;
		let excludedCount = 0;
		let excludedSum = 0;
		let incomeCount = 0;
		let incomeSum = 0;

		for (const t of transactions) {
			const amt = t.amount || 0;
			if (t.type === 'income') {
				incomeCount++;
				incomeSum += amt;
			} else {
				totalAll += amt;
				if (t.includeInBudget === false) {
					excludedCount++;
					excludedSum += amt;
				} else {
					budgetedCount++;
					budgetedSum += amt;
				}
			}
		}

		return {
			totalAll,
			budgetedCount,
			budgetedSum,
			excludedCount,
			excludedSum,
			incomeCount,
			incomeSum,
		};
	}, [transactions]);

	const filteredList = useMemo(() => {
		return transactions.filter((t) => {
			if (filter === 'ALL') return t.type === 'expense';
			if (filter === 'BUDGETED') return t.type === 'expense' && t.includeInBudget !== false;
			if (filter === 'EXCLUDED') return t.type === 'expense' && t.includeInBudget === false;
			if (filter === 'INCOME') return t.type === 'income';
			return true;
		});
	}, [transactions, filter]);

	const dayGroups = useMemo(() => {
		const groupMap = new Map<string, Transaction[]>();
		for (const t of filteredList) {
			const list = groupMap.get(t.date) ?? [];
			list.push(t);
			groupMap.set(t.date, list);
		}

		const groups: DayGroup[] = [];
		for (const [date, txns] of groupMap) {
			txns.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
			groups.push({
				date,
				dayNum: getDayNum(date),
				dayName: getDayName(date),
				transactions: txns,
				income: txns.filter((t) => t.type === 'income').reduce((sum, t) => sum + (t.amount || 0), 0),
				expense: txns.filter((t) => t.type === 'expense').reduce((sum, t) => sum + (t.amount || 0), 0),
			});
		}

		groups.sort((a, b) => b.date.localeCompare(a.date));
		return groups;
	}, [filteredList]);

	return (
		<div className="space-y-4">
			{/* Title and summary header card */}
			<Card variant="white" className="p-4 space-y-3.5 shadow-sm">
				<div className="flex items-center justify-between">
					<div>
						<h2 className="text-[15px] font-medium text-text flex items-center gap-1.5">
							<Filter className="w-4 h-4 text-text-muted" strokeWidth={1.5} /> Expense audit
						</h2>
						<p className="text-[12px] text-text-muted">
							Review all transactions and budget exclusions
						</p>
					</div>
				</div>

				{/* Filter Pills */}
				<div className="flex flex-wrap gap-1.5">
					<button
						type="button"
						onClick={() => setFilter('ALL')}
						className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
							filter === 'ALL'
								? 'bg-ink text-white'
								: 'bg-surface text-text-muted hover:text-text'
						}`}
					>
						All expenses (₹{Math.round(stats.totalAll).toLocaleString('en-IN')})
					</button>
					<button
						type="button"
						onClick={() => setFilter('BUDGETED')}
						className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
							filter === 'BUDGETED'
								? 'bg-lavender-deep text-white'
								: 'bg-surface text-text-muted hover:text-text'
						}`}
					>
						In budget ({stats.budgetedCount})
					</button>
					<button
						type="button"
						onClick={() => setFilter('EXCLUDED')}
						className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer ${
							filter === 'EXCLUDED'
								? 'bg-ink text-white'
								: 'bg-surface text-lavender-deep hover:bg-lavender/20'
						}`}
					>
						<Sparkles className="w-3 h-3 text-lavender" />
						Excluded ({stats.excludedCount} · ₹{Math.round(stats.excludedSum).toLocaleString('en-IN')})
					</button>
					<button
						type="button"
						onClick={() => setFilter('INCOME')}
						className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
							filter === 'INCOME'
								? 'bg-mint-deep text-white'
								: 'bg-surface text-text-muted hover:text-text'
						}`}
					>
						Income ({stats.incomeCount})
					</button>
				</div>
			</Card>

			{/* Day-by-Day Transaction Lists (Exact budget card component) */}
			{dayGroups.length === 0 ? (
				<Card variant="white" className="py-8 text-center text-[12px] text-text-muted shadow-sm">
					No transactions found for this filter in the selected month.
				</Card>
			) : (
				<div>
					{dayGroups.map((group) => (
						<TransactionList key={group.date} group={group} />
					))}
				</div>
			)}
		</div>
	);
}
