import { useMemo } from 'react';
import { Link } from 'react-router';
import { useTransactionStore } from '../../stores/transactionStore';
import { categoryTotals, dailySeries, expensesOf, inMonth, percentChange, previousMonth, sum } from '../../utils/analytics';
import SpendSparkline from '../charts/SpendSparkline';
import Chip from '../ui/Chip';
import { Card } from '../ui/Card';
import { inr } from '../charts/format';

export default function HomeSnapshot() {
	const all = useTransactionStore((s) => s.allTransactions);
	const year = useTransactionStore((s) => s.selectedYear);
	const month = useTransactionStore((s) => s.selectedMonth);

	const data = useMemo(() => {
		const prev = previousMonth(year, month);
		const current = inMonth(all, year, month);
		const spent = sum(expensesOf(current));
		const prevSpent = sum(expensesOf(inMonth(all, prev.year, prev.month)));
		const now = new Date();
		const isThisMonth = now.getFullYear() === year && now.getMonth() === month;
		return {
			spent,
			change: percentChange(spent, prevSpent),
			prevLabel: new Date(prev.year, prev.month).toLocaleString('default', { month: 'short' }),
			daily: dailySeries(all, year, month),
			lastDay: isThisMonth ? now.getDate() : 31,
			categories: categoryTotals(current),
		};
	}, [all, year, month]);

	if (data.spent === 0) return null;
	const top = data.categories.slice(0, 3);

	const isIncrease = (data.change ?? 0) > 0;
	const changeText =
		data.change === null
			? `vs ${data.prevLabel}`
			: data.change === 0
			? `Same as ${data.prevLabel}`
			: `${Math.abs(data.change).toFixed(0)}% ${isIncrease ? 'higher' : 'lower'} vs ${data.prevLabel}`;

	return (
		<Card variant="light" className="mb-4">
			<div className="flex items-start justify-between mb-4">
				<div>
					<p className="text-[12px] text-text-muted mb-1">Spent this month</p>
					<p className="text-[26px] font-medium text-text mb-2">{inr(data.spent)}</p>
					<Chip variant={data.change === null ? 'neutral' : isIncrease ? 'negative' : 'positive'}>
						{changeText}
					</Chip>
				</div>
				<Link to="/stats" className="text-text-muted hover:text-ink transition-colors flex items-center gap-1 text-[12px] font-medium bg-card px-3 py-1.5 rounded-full shadow-sm">
					Analytics
				</Link>
			</div>

			<SpendSparkline data={data.daily} lastDay={data.lastDay} />

			<div className="flex h-3 w-full rounded-full overflow-hidden mt-4 bg-card" role="img" aria-label="Spending by category">
				{data.categories.map((c, i) => {
					// Use mint and lavender for the first two, surface for the rest
					const bg = i === 0 ? 'var(--color-mint)' : i === 1 ? 'var(--color-lavender)' : 'var(--color-text-muted)';
					return <div key={c.name} style={{ width: `${c.share}%`, background: bg }} title={`${c.name}: ${inr(c.amount)}`} />;
				})}
			</div>
			
			<div className="flex flex-wrap gap-x-4 gap-y-2 mt-3">
				{top.map((c, i) => {
					const bg = i === 0 ? 'var(--color-mint)' : i === 1 ? 'var(--color-lavender)' : 'var(--color-text-muted)';
					return (
						<span key={c.name} className="flex items-center gap-1.5 text-[12px] font-medium text-text-muted">
							<span className="w-2.5 h-2.5 rounded-full" style={{ background: bg }} />
							{c.name} {c.share.toFixed(0)}%
						</span>
					);
				})}
			</div>
		</Card>
	);
}
