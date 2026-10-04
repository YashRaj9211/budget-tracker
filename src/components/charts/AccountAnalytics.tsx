import { useEffect, useState } from 'react';
import { PieChart as PieIcon, TrendingUp, Users } from 'lucide-react';
import { dashboardApi, type AnalyticsResponse } from '../../api/financeHubApi';
import ChartCard from './ChartCard';
import ChangeBadge from './ChangeBadge';
import { CategoryDonut } from './StatsCharts';
import { GroupSpendChart, ServerTrendChart } from './HubCharts';
import { inr } from './format';
import { Card } from '../ui/Card';

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

	if (error) return <div className="rounded-[16px] bg-danger-soft p-3 text-xs font-medium text-danger">{error}</div>;
	if (!data) return <div className="py-10 text-center text-sm text-text-muted">Loading…</div>;

	const total = data.trend.reduce((s, m) => s + m.spent, 0);
	const empty = data.trend.every((m) => m.spent === 0 && m.lent === 0);

	return (
		<>
			<div role="group" aria-label="Period" className="flex bg-surface p-1 rounded-full gap-1 mb-4">
				{RANGES.map((r) => (
					<button
						key={r}
						aria-pressed={months === r}
						onClick={() => setMonths(r)}
						className={`flex-1 py-1.5 text-xs font-medium rounded-full cursor-pointer transition-all ${
							months === r ? 'bg-ink text-white shadow-2xs' : 'text-text-muted hover:text-text'
						}`}
					>
						{r} months
					</button>
				))}
			</div>

			<Card variant="mint" className="mb-5 p-5">
				<span className="text-[12px] text-text-muted block mb-1">Spent in {months} months</span>
				<div className="flex items-end justify-between">
					<div className="text-[26px] font-medium text-text">{inr(total)}</div>
					<ChangeBadge change={data.comparison.lastMonth > 0 ? data.comparison.changePercent : null} />
				</div>
			</Card>

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
