import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { LayoutDashboard, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';
import { dashboardApi, type ExpensesSummary, type FriendsBalanceResponse, type DailySpendStat } from '../api/financeHubApi';
import { useAuthStore } from '../stores/authStore';
import { useWebSocket } from '../hooks/useWebSocket';

export default function HubDashboard() {
	const user = useAuthStore((s) => s.user);
	const [summary, setSummary] = useState<ExpensesSummary | null>(null);
	const [friendsBalance, setFriendsBalance] = useState<FriendsBalanceResponse | null>(null);
	const [graphData, setGraphData] = useState<DailySpendStat[]>([]);
	const [period, setPeriod] = useState<'WEEK' | 'MONTH'>('MONTH');
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const { onEvent } = useWebSocket();

	const loadDashboardData = async () => {
		if (!user?.id) return;
		setIsLoading(true);
		setError(null);
		try {
			const [sumRes, friendsRes, graphRes] = await Promise.all([
				dashboardApi.getSummary(user.id),
				dashboardApi.getFriendsBalance(user.id),
				dashboardApi.getSpendOverviewGraph(user.id, period),
			]);
			setSummary(sumRes);
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
		(window as any).hideSplashScreen?.();
	}, [user?.id, period]);

	// Auto-refresh when someone adds or settles an expense over WebSocket
	useEffect(() => {
		const unsub = onEvent('REFETCH_EXPENSES', () => {
			loadDashboardData();
		});
		return () => unsub();
	}, [onEvent, user?.id, period]);

	return (
		<div className="w-full space-y-4 pb-28">
			{/* Top Bar Banner */}
			<div className="border-[3px] border-black p-4 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-xl font-black text-black uppercase tracking-wider flex items-center gap-1.5">
							<LayoutDashboard className="w-6 h-6" /> Finance Hub
						</h1>
						<p className="text-[10px] text-black/60 font-bold mt-0.5">
							Live synced Splitwise & Cashflow
						</p>
					</div>
					<Link
						to="/profile"
						className="text-right p-1.5 bg-[#fefed4] hover:bg-yellow-200 border border-black shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 transition-all block cursor-pointer"
						title="Manage Profile & Session"
					>
						<span className="text-[9px] font-black uppercase text-black/60 block leading-tight">Profile</span>
						<span className="font-black text-xs text-black block truncate max-w-[80px]">@{user?.username || 'user'}</span>
						{isLoading && <span className="text-[9px] font-black uppercase text-amber-600 block animate-pulse">Syncing</span>}
					</Link>
				</div>
			</div>

			{error && (
				<div className="p-3 border-[3px] border-red-500 bg-red-50 text-red-700 text-xs font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
					{error}
				</div>
			)}

			{/* Metric KPI Cards */}
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
				<div className="border-[3px] border-black p-3 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
					<span className="text-[10px] font-black uppercase text-black/60 block">Total Spent</span>
					<span className="text-lg font-black text-black">
						₹{summary ? Number(summary.totalExpenses).toLocaleString() : '0'}
					</span>
				</div>
				<div className="border-[3px] border-black p-3 bg-yellow-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
					<span className="text-[10px] font-black uppercase text-black/60 block">Personal</span>
					<span className="text-lg font-black text-black">
						₹{summary ? Number(summary.personalExpenses).toLocaleString() : '0'}
					</span>
				</div>
				<div className="border-[3px] border-black p-3 bg-emerald-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
					<span className="text-[10px] font-black uppercase text-emerald-900 flex items-center gap-0.5">
						<ArrowUpRight className="w-3 h-3" /> Lent (Owed)
					</span>
					<span className="text-lg font-black text-emerald-800">
						+₹{summary ? Number(summary.totalLent).toLocaleString() : '0'}
					</span>
				</div>
				<div className="border-[3px] border-black p-3 bg-rose-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
					<span className="text-[10px] font-black uppercase text-rose-900 flex items-center gap-0.5">
						<ArrowDownRight className="w-3 h-3" /> Borrowed
					</span>
					<span className="text-lg font-black text-rose-800">
						-₹{summary ? Number(summary.totalBorrowed).toLocaleString() : '0'}
					</span>
				</div>
			</div>

			{/* Friend Debt Balances */}
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
				{/* Owes You */}
				<div className="border-[3px] border-black p-4 bg-white shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] space-y-3">
					<div className="flex items-center justify-between border-b-2 border-black pb-2">
						<h2 className="text-xs font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
							<ArrowUpRight className="w-4 h-4" /> Friends Who Owe You
						</h2>
						<span className="text-xs font-black bg-emerald-100 border border-emerald-500 text-emerald-800 px-1.5">
							{friendsBalance?.owesYou.length || 0}
						</span>
					</div>

					{friendsBalance?.owesYou.length === 0 ? (
						<p className="text-xs text-black/40 font-bold py-2">No one owes you money right now.</p>
					) : (
						friendsBalance?.owesYou.map((f) => (
							<div
								key={f.id}
								className="flex items-center justify-between p-2 border-2 border-black bg-emerald-50/60"
							>
								<div>
									<h4 className="font-black text-sm text-black">{f.name}</h4>
									<span className="text-[11px] font-bold text-black/50">@{f.username}</span>
								</div>
								<span className="font-black text-emerald-700 text-sm">
									+₹{Number(f.amount).toLocaleString()}
								</span>
							</div>
						))
					)}
				</div>

				{/* You Owe */}
				<div className="border-[3px] border-black p-4 bg-white shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] space-y-3">
					<div className="flex items-center justify-between border-b-2 border-black pb-2">
						<h2 className="text-xs font-black uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
							<ArrowDownRight className="w-4 h-4" /> Friends You Owe
						</h2>
						<span className="text-xs font-black bg-rose-100 border border-rose-500 text-rose-800 px-1.5">
							{friendsBalance?.youOwe.length || 0}
						</span>
					</div>

					{friendsBalance?.youOwe.length === 0 ? (
						<p className="text-xs text-black/40 font-bold py-2">You don't owe any money to friends!</p>
					) : (
						friendsBalance?.youOwe.map((f) => (
							<div
								key={f.id}
								className="flex items-center justify-between p-2 border-2 border-black bg-rose-50/60"
							>
								<div>
									<h4 className="font-black text-sm text-black">{f.name}</h4>
									<span className="text-[11px] font-bold text-black/50">@{f.username}</span>
								</div>
								<span className="font-black text-rose-700 text-sm">
									-₹{Number(f.amount).toLocaleString()}
								</span>
							</div>
						))
					)}
				</div>
			</div>

			{/* Spend Overview Graph / Timeline */}
			<div className="border-[3px] border-black p-5 bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-4">
				<div className="flex items-center justify-between border-b-2 border-black pb-2">
					<h2 className="text-sm font-black uppercase tracking-wider flex items-center gap-2 text-black">
						<Activity className="w-5 h-5" /> Daily Spend Timeline
					</h2>
					<div className="flex border-2 border-black text-xs font-black">
						<button
							onClick={() => setPeriod('WEEK')}
							className={`px-3 py-1 ${period === 'WEEK' ? 'bg-yellow-300' : 'bg-white hover:bg-neutral-100'}`}
						>
							7D
						</button>
						<button
							onClick={() => setPeriod('MONTH')}
							className={`px-3 py-1 border-l-2 border-black ${period === 'MONTH' ? 'bg-yellow-300' : 'bg-white hover:bg-neutral-100'}`}
						>
							30D
						</button>
					</div>
				</div>

				<div className="space-y-2 max-h-60 overflow-y-auto pr-1">
					{graphData.length === 0 ? (
						<p className="text-xs text-black/40 font-bold py-4 text-center">No transactions recorded in this period.</p>
					) : (
						graphData
							.filter((stat) => stat.total > 0)
							.slice(-10)
							.reverse()
							.map((stat) => (
								<div
									key={stat.date}
									className="flex items-center justify-between p-2 border-2 border-black text-xs font-bold"
								>
									<div className="flex items-center gap-2">
										<span className="px-1.5 py-0.5 bg-black text-white text-[10px] font-black">
											{stat.day}
										</span>
										<span>{stat.date}</span>
									</div>
									<div className="flex items-center gap-4">
										{stat.personal > 0 && (
											<span className="text-neutral-700">Pers: ₹{stat.personal}</span>
										)}
										{stat.borrowed > 0 && (
											<span className="text-rose-700">Borr: ₹{stat.borrowed}</span>
										)}
										<span className="font-black text-black">Total: ₹{stat.total}</span>
									</div>
								</div>
							))
					)}
				</div>
			</div>
		</div>
	);
}
