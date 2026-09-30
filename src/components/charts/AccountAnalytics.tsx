import { useEffect, useState } from 'react';
import { PieChart as PieIcon, TrendingUp, Users } from 'lucide-react';
import { dashboardApi, type AnalyticsResponse } from '../../api/financeHubApi';
import ChartCard from './ChartCard';
import ChangeBadge from './ChangeBadge';
import { CategoryDonut } from './StatsCharts';
import { GroupSpendChart, ServerTrendChart } from './HubCharts';
import { inr } from './format';

const RANGES = [3, 6, 12] as const;

/** Analytics built from the synced account data (personal + split expenses stored on the server). */
export default function AccountAnalytics() {
	const [months, setMonths] = useState<(typeof RANGES)[number]>(6);
	const [data, setData] = useState<AnalyticsResponse | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		dashboardApi
			.getAnalytics(months)
			.then((res) => {
				if (!cancelled) {
					setData(res);
					setError(null);
				}
			})
			.catch(() => {
				if (!cancelled) setError('Could not load your account analytics. Check your connection and try again.');
			});
		return () => {
			cancelled = true;
		};
	}, [months]);

	if (error) return <div className="border-2 border-black bg-rose-50 p-3 text-xs font-bold text-rose-800">{error}</div>;
	if (!data) return <div className="py-10 text-center text-sm text-gray-400">Loading…</div>;

	const total = data.trend.reduce((s, m) => s + m.spent, 0);
	const empty = data.trend.every((m) => m.spent === 0 && m.lent === 0);

	return (
		<>
			<div role="group" aria-label="Period" className="grid grid-cols-3 border border-black mb-4 bg-white">
				{RANGES.map((r, i) => (
					<button
						key={r}
						aria-pressed={months === r}
						onClick={() => setMonths(r)}
						className={`py-1.5 text-[11px] font-bold uppercase cursor-pointer ${i > 0 ? 'border-l border-black' : ''} ${months === r ? 'bg-yellow-200' : 'bg-white hover:bg-gray-50'}`}
					>
						{r} months
					</button>
				))}
			</div>

			<div className="border border-black p-4 bg-rose-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-5">
				<span className="text-xs font-bold uppercase tracking-wider text-rose-800">Spent in {months} months</span>
				<div className="text-xl font-black text-black">{inr(total)}</div>
				<ChangeBadge change={data.comparison.lastMonth > 0 ? data.comparison.changePercent : null} />
			</div>

			<ChartCard title="Monthly spending" subtitle="Paid for yourself + your share of split bills" icon={<TrendingUp size={16} />} empty={empty} emptyText="No spending in this period">
				<ServerTrendChart data={data.trend} />
			</ChartCard>
			<ChartCard title="By category" icon={<PieIcon size={16} />} empty={data.categories.length === 0} emptyText="No categorised spending yet">
				<CategoryDonut data={data.categories.map((c) => ({ name: c.name, amount: c.amount, color: c.color || undefined }))} centerLabel="Spent" />
			</ChartCard>
			<ChartCard title="Groups" subtitle="Your share vs what the group spent" icon={<Users size={16} />} empty={data.groups.length === 0} emptyText="No group spending yet">
				<GroupSpendChart data={data.groups} />
			</ChartCard>
		</>
	);
}
