import { useEffect, useState } from 'react';
import {
	LayoutDashboard,
	ArrowUpRight,
	ArrowDownRight,
	Activity,
	TrendingUp,
	PieChart as PieIcon,
	Users,
	Scale,
} from 'lucide-react';
import {
	dashboardApi,
	type AnalyticsResponse,
	type ExpensesSummary,
	type FriendsBalanceResponse,
	type DailySpendStat,
} from '../api/financeHubApi';
import { useAuthStore } from '../stores/authStore';
import { useWebSocket } from '../hooks/useWebSocket';
import ChartCard from '../components/charts/ChartCard';
import ChangeBadge from '../components/charts/ChangeBadge';
import { CategoryDonut } from '../components/charts/StatsCharts';
import {
	DailyTimelineChart,
	FriendBalanceChart,
	GroupSpendChart,
	ServerTrendChart,
} from '../components/charts/HubCharts';
import { Card } from '../components/ui/Card';
import SegmentedTabs from '../components/ui/SegmentedTabs';
import { ListRow } from '../components/ui/ListRow';

export default function HubDashboard() {
	const user = useAuthStore((s) => s.user);
	const [summary, setSummary] = useState<ExpensesSummary | null>(null);
	const [friendsBalance, setFriendsBalance] = useState<FriendsBalanceResponse | null>(null);
	const [graphData, setGraphData] = useState<DailySpendStat[]>([]);
	const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
	const [period, setPeriod] = useState<'WEEK' | 'MONTH'>('MONTH');
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const { onEvent } = useWebSocket();

	const [chartView, setChartView] = useState<'CATEGORY' | 'GROUP' | 'SPLIT'>('CATEGORY');

	const loadDashboardData = async () => {
		if (!user?.id) return;
		setIsLoading(true);
		setError(null);
		try {
			const [sumRes, friendsRes, graphRes, analyticsRes] = await Promise.all([
				dashboardApi.getSummary(),
				dashboardApi.getFriendsBalance(),
				dashboardApi.getSpendOverviewGraph(period),
				dashboardApi.getAnalytics(6),
			]);
			setSummary(sumRes);
			setAnalytics(analyticsRes);
			setFriendsBalance(friendsRes);
			setGraphData(graphRes || []);
		} catch (err: any) {
			setError(err.message || 'Failed to load dashboard data');
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		loadDashboardData();
		window.hideSplashScreen?.();
	}, [user?.id, period]);

	useEffect(() => {
		const unsub = onEvent('REFETCH_EXPENSES', () => {
			loadDashboardData();
		});
		return () => unsub();
	}, [onEvent, user?.id, period]);

	return (
		<div className="w-full space-y-3 pb-28">
			{/* Title block */}
			<div className="flex items-center justify-between mb-4">
				<div>
					<h1 className="text-[20px] font-medium text-text flex items-center gap-2">
						<LayoutDashboard className="w-5 h-5 text-text-muted" strokeWidth={1.5} /> Finance hub
					</h1>
					<p className="text-[12px] text-text-muted">Live synced cashflow</p>
				</div>
				{isLoading && (
					<span className="text-[12px] text-text-muted animate-pulse">Syncing…</span>
				)}
			</div>

			{error && (
				<div className="p-3 bg-danger-soft text-danger rounded-[20px] text-sm">
					{error}
				</div>
			)}

			{/* 2×2 KPI grid */}
			<div className="grid grid-cols-2 gap-3">
				<Card variant="mint" nested>
					<p className="text-[12px] text-text-muted mb-1">Total spent</p>
					<p className="text-[22px] font-medium text-text">₹{summary ? Number(summary.totalExpenses).toLocaleString() : '0'}</p>
				</Card>
				<Card variant="lavender" nested>
					<p className="text-[12px] text-text-muted mb-1">Personal</p>
					<p className="text-[22px] font-medium text-text">₹{summary ? Number(summary.personalExpenses).toLocaleString() : '0'}</p>
				</Card>
				<Card variant="white" nested>
					<p className="text-[12px] text-text-muted mb-1 flex items-center gap-1">
						<ArrowUpRight className="w-3 h-3" /> Lent
					</p>
					<p className="text-[22px] font-medium text-mint-deep">+₹{summary ? Number(summary.totalLent).toLocaleString() : '0'}</p>
				</Card>
				<Card variant="white" nested>
					<p className="text-[12px] text-text-muted mb-1 flex items-center gap-1">
						<ArrowDownRight className="w-3 h-3" /> Borrowed
					</p>
					<p className="text-[22px] font-medium text-danger">-₹{summary ? Number(summary.totalBorrowed).toLocaleString() : '0'}</p>
				</Card>
			</div>

			{/* Monthly spending chart */}
			<ChartCard
				className="mb-0"
				title="Monthly spending"
				subtitle="What you paid for yourself + your share of split bills"
				icon={<TrendingUp className="w-4 h-4" strokeWidth={1.5} />}
				action={
					analytics ? (
						<ChangeBadge
							change={
								analytics.comparison.lastMonth > 0 ? analytics.comparison.changePercent : null
							}
						/>
					) : undefined
				}
				empty={!analytics || analytics.trend.every((m) => m.spent === 0 && m.lent === 0)}
				emptyText="No spending in the last 6 months"
			>
				{analytics && <ServerTrendChart data={analytics.trend} />}
			</ChartCard>

			<div className="mt-4">
				<SegmentedTabs
					tabs={[
						{ id: 'CATEGORY', label: 'Category' },
						{ id: 'GROUP', label: 'Groups' },
						{ id: 'SPLIT', label: 'Splits' },
					]}
					activeId={chartView}
					onChange={(id) => setChartView(id as 'CATEGORY' | 'GROUP' | 'SPLIT')}
				/>
			</div>

			<div className="grid grid-cols-1 gap-3">
				{chartView === 'CATEGORY' && (
					<ChartCard
						className="mb-0"
						title="By category"
						subtitle="Last 6 months"
						icon={<PieIcon className="w-4 h-4" strokeWidth={1.5} />}
						empty={!analytics || analytics.categories.length === 0}
						emptyText="No categorised spending yet"
					>
						{analytics && (
							<CategoryDonut
								data={analytics.categories.map((c) => ({
									name: c.name,
									amount: c.amount,
									color: c.color || undefined,
								}))}
								centerLabel="Spent"
							/>
						)}
					</ChartCard>
				)}

				{chartView === 'GROUP' && (
					<ChartCard
						className="mb-0"
						title="Groups"
						subtitle="Your share vs what the group spent"
						icon={<Users className="w-4 h-4" strokeWidth={1.5} />}
						empty={!analytics || analytics.groups.length === 0}
						emptyText="No group spending yet"
					>
						{analytics && <GroupSpendChart data={analytics.groups} />}
					</ChartCard>
				)}

				{chartView === 'SPLIT' && (
					<ChartCard
						className="mb-0"
						title="Who owes whom"
						subtitle="Green: they owe you · Red: you owe them"
						icon={<Scale className="w-4 h-4" strokeWidth={1.5} />}
						empty={
							!friendsBalance ||
							(friendsBalance.owesYou.length === 0 && friendsBalance.youOwe.length === 0)
						}
						emptyText="You are all settled up"
					>
						{friendsBalance && (
							<FriendBalanceChart
								data={[
									...friendsBalance.owesYou.map((f) => ({ name: f.name, balance: Number(f.amount) })),
									...friendsBalance.youOwe.map((f) => ({ name: f.name, balance: -Number(f.amount) })),
								]}
							/>
						)}
					</ChartCard>
				)}
			</div>

			{/* Friend debt balances */}
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
				<Card variant="white">
					<div className="flex items-center justify-between mb-3">
						<h2 className="text-[15px] font-medium text-text flex items-center gap-1.5">
							<ArrowUpRight className="w-4 h-4 text-mint-deep" strokeWidth={1.5} /> Owed to you
						</h2>
						<span className="text-[12px] font-medium bg-mint text-ink px-2 py-0.5 rounded-full">
							{friendsBalance?.owesYou.length || 0}
						</span>
					</div>
					{friendsBalance?.owesYou.length === 0 ? (
						<p className="text-[12px] text-text-muted py-2">No one owes you money right now.</p>
					) : (
						<div className="divide-y divide-black/5">
							{friendsBalance?.owesYou.map((f) => (
								<ListRow
									key={f.id}
									icon={<span className="font-medium text-[14px]">{f.name.slice(0, 1)}</span>}
									title={f.name}
									caption={`@${f.username}`}
									amount={`+₹${Number(f.amount).toLocaleString()}`}
									amountColor="mint-deep"
								/>
							))}
						</div>
					)}
				</Card>

				<Card variant="white">
					<div className="flex items-center justify-between mb-3">
						<h2 className="text-[15px] font-medium text-text flex items-center gap-1.5">
							<ArrowDownRight className="w-4 h-4 text-danger" strokeWidth={1.5} /> You owe
						</h2>
						<span className="text-[12px] font-medium bg-danger-soft text-danger px-2 py-0.5 rounded-full">
							{friendsBalance?.youOwe.length || 0}
						</span>
					</div>
					{friendsBalance?.youOwe.length === 0 ? (
						<p className="text-[12px] text-text-muted py-2">You don't owe any money!</p>
					) : (
						<div className="divide-y divide-black/5">
							{friendsBalance?.youOwe.map((f) => (
								<ListRow
									key={f.id}
									icon={<span className="font-medium text-[14px]">{f.name.slice(0, 1)}</span>}
									title={f.name}
									caption={`@${f.username}`}
									amount={`-₹${Number(f.amount).toLocaleString()}`}
									amountColor="danger"
								/>
							))}
						</div>
					)}
				</Card>
			</div>

			{/* Daily spend timeline */}
			<Card variant="white">
				<div className="flex items-center justify-between mb-3">
					<h2 className="text-[15px] font-medium text-text flex items-center gap-2">
						<Activity className="w-4 h-4 text-text-muted" strokeWidth={1.5} /> Daily timeline
					</h2>
					<SegmentedTabs
						tabs={[{ id: 'WEEK', label: '7D' }, { id: 'MONTH', label: '30D' }]}
						activeId={period}
						onChange={(id) => setPeriod(id as 'WEEK' | 'MONTH')}
						className="w-20"
					/>
				</div>
				{graphData.every((d) => d.total === 0) ? (
					<p className="text-[12px] text-text-muted py-4 text-center">
						No transactions recorded in this period.
					</p>
				) : (
					<DailyTimelineChart data={graphData} />
				)}
			</Card>
		</div>
	);
}
