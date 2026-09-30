import { useMemo } from 'react';
import { Link } from 'react-router';
import { ArrowRight, BarChart3 } from 'lucide-react';
import { useTransactionStore } from '../../stores/transactionStore';
import { categoryTotals, dailySeries, expensesOf, inMonth, percentChange, previousMonth, sum } from '../../utils/analytics';
import SpendSparkline from '../charts/SpendSparkline';
import ChangeBadge from '../charts/ChangeBadge';
import { colorFor } from '../charts/palette';
import { inr } from '../charts/format';

/** "This month at a glance" card on the home page. Loaded lazily so charts do not slow the first screen. */
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

	return (
		<section className="border-2 border-black bg-white p-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
			<div className="flex items-start justify-between">
				<div>
					<p className="text-[10px] font-black uppercase tracking-wider text-gray-500">Spent this month</p>
					<p className="text-xl font-black text-black">{inr(data.spent)}</p>
					<ChangeBadge change={data.change} label={`vs ${data.prevLabel}`} />
				</div>
				<Link to="/stats" className="flex items-center gap-1 text-[10px] font-black uppercase border border-black px-2 py-1 bg-[#fefed4] shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none">
					<BarChart3 size={12} /> Analytics <ArrowRight size={12} />
				</Link>
			</div>

			<SpendSparkline data={data.daily} lastDay={data.lastDay} />

			{/* Category split as one stacked bar */}
			<div className="flex h-3 w-full border border-black overflow-hidden mt-1" role="img" aria-label="Spending by category">
				{data.categories.map((c, i) => (
					<div key={c.name} style={{ width: `${c.share}%`, background: colorFor(c.name, i) }} title={`${c.name}: ${inr(c.amount)}`} />
				))}
			</div>
			<div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
				{top.map((c, i) => (
					<span key={c.name} className="flex items-center gap-1 text-[10px] font-bold text-gray-700">
						<span className="w-2.5 h-2.5 border border-black/30" style={{ background: colorFor(c.name, i) }} />
						{c.name} {c.share.toFixed(0)}%
					</span>
				))}
			</div>
		</section>
	);
}
