import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
	ArrowDownRight,
	ArrowUpRight,
	BarChart3,
	CalendarDays,
	CalendarRange,
	ChevronLeft,
	ChevronRight,
	Lightbulb,
	PieChart as PieIcon,
	PlusCircle,
	Scale,
	TrendingUp,
	Wallet,
} from 'lucide-react';
import { useTransactionStore } from '../stores/transactionStore';
import { useBudgetStore } from '../stores/budgetStore';
import { useMonthNavigation } from '../hooks/useMonthNavigation';
import { todayStr } from '../utils/date';
import {
	accountTotals,
	budgetBurn,
	budgetProgress,
	buildInsights,
	categoryTotals,
	compareCategories,
	dailySeries,
	expensesOf,
	incomeOf,
	inMonth,
	monthlyTrend,
	percentChange,
	previousMonth,
	sum,
	weekdayTotals,
} from '../utils/analytics';
import ChartCard from '../components/charts/ChartCard';
import ChangeBadge from '../components/charts/ChangeBadge';
import {
	AccountChart,
	BudgetBurnChart,
	CategoryCompareChart,
	CategoryDonut,
	DailySpendChart,
	MonthlyTrendChart,
	WeekdayChart,
} from '../components/charts/StatsCharts';
import { inr } from '../components/charts/format';
import AccountAnalytics from '../components/charts/AccountAnalytics';

type Tab = 'overview' | 'trends' | 'budget';

const TABS: { id: Tab; label: string }[] = [
	{ id: 'overview', label: 'Overview' },
	{ id: 'trends', label: 'Trends' },
	{ id: 'budget', label: 'Budget' },
];

type Source = 'device' | 'account';

const INSIGHT_STYLE = {
	good: 'bg-emerald-50 border-emerald-300 text-emerald-900',
	warn: 'bg-amber-50 border-amber-300 text-amber-900',
	info: 'bg-sky-50 border-sky-200 text-sky-900',
} as const;

const STATUS_STYLE = {
	safe: { label: 'On track', cls: 'bg-emerald-100 text-emerald-800 border-emerald-400', bar: '#8fd1a8' },
	watch: { label: 'Watch out', cls: 'bg-amber-100 text-amber-800 border-amber-400', bar: '#f6bd60' },
	over: { label: 'Over budget', cls: 'bg-rose-100 text-rose-800 border-rose-400', bar: '#f08a8a' },
} as const;

function Stats() {
	const allTransactions = useTransactionStore((s) => s.allTransactions);
	const loadAllTransactions = useTransactionStore((s) => s.loadAllTransactions);
	const activeBudget = useBudgetStore((s) => s.activeBudget);
	const loadActiveBudget = useBudgetStore((s) => s.loadActiveBudget);
	const { selectedYear, selectedMonth, formattedMonth, handlePrevMonth, handleNextMonth } = useMonthNavigation();
	const [tab, setTab] = useState<Tab>('overview');
	const [source, setSource] = useState<Source | null>(null); // null = pick automatically

	useEffect(() => {
		loadAllTransactions();
		loadActiveBudget(todayStr());
		window.hideSplashScreen?.();
	}, [loadAllTransactions, loadActiveBudget]);

	// Everything below is derived from the list of transactions — no extra requests.
	const data = useMemo(() => {
		const prev = previousMonth(selectedYear, selectedMonth);
		const current = inMonth(allTransactions, selectedYear, selectedMonth);
		const previous = inMonth(allTransactions, prev.year, prev.month);
		const income = sum(incomeOf(current));
		const expense = sum(expensesOf(current));
		const prevIncome = sum(incomeOf(previous));
		const prevExpense = sum(expensesOf(previous));
		const budget = activeBudget ? budgetProgress(activeBudget, allTransactions, todayStr()) : null;
		return {
			prevLabel: new Date(prev.year, prev.month).toLocaleString('default', { month: 'short' }),
			curLabel: new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'short' }),
			current,
			previous,
			income,
			expense,
			savings: income - expense,
			incomeChange: percentChange(income, prevIncome),
			expenseChange: percentChange(expense, prevExpense),
			categories: categoryTotals(current),
			categoryCompare: compareCategories(current, previous),
			accounts: accountTotals(current),
			trend: monthlyTrend(allTransactions, selectedYear, selectedMonth, 6),
			daily: dailySeries(allTransactions, selectedYear, selectedMonth),
			weekdays: weekdayTotals(current),
			budget,
			burn: activeBudget ? budgetBurn(activeBudget, allTransactions, todayStr()) : [],
			insights: buildInsights({ current, previous, budget }),
		};
	}, [allTransactions, selectedYear, selectedMonth, activeBudget]);

	const hasExpenses = data.expense > 0;

	// Two data sources: this device's own tracker, and the synced account (server).
	// If nothing is saved on this device, start on the account view so the page is never empty.
	const hasDeviceData = allTransactions.length > 0;
	const activeSource: Source = source ?? (hasDeviceData ? 'device' : 'account');

	const sourceSwitch = (
			<div role="group" aria-label="Data source" className="grid grid-cols-2 border border-black mb-4 bg-white">
				{(
					[
						['device', 'This device'],
						['account', 'My account'],
					] as const
				).map(([id, label], i) => (
					<button
						key={id}
						aria-pressed={activeSource === id}
						onClick={() => setSource(id)}
						className={`py-1.5 text-[11px] font-bold uppercase cursor-pointer ${i > 0 ? 'border-l border-black' : ''} ${activeSource === id ? 'bg-yellow-200' : 'bg-white hover:bg-gray-50'}`}
					>
						{label}
					</button>
				))}
			</div>
	);

	if (activeSource === 'account') {
		return (
			<div className="relative pb-24">
				<h2 className="text-base font-bold text-black tracking-tight flex items-center gap-2 mb-3">
					<BarChart3 size={18} /> Analytics
				</h2>
				{sourceSwitch}
				<AccountAnalytics />
			</div>
		);
	}

	return (
		<div className="relative pb-24">
			{sourceSwitch}

			{/* Month Header */}
			<header className="flex items-center justify-between border border-black p-3 bg-white mb-4">
				<button
					onClick={handlePrevMonth}
					className="p-1.5 hover:bg-gray-50 border border-black transition-all cursor-pointer flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
					aria-label="Previous month"
				>
					<ChevronLeft size={18} />
				</button>
				<div className="flex items-center gap-2">
					<BarChart3 size={18} />
					<h2 className="text-base font-bold text-black tracking-tight">{formattedMonth}</h2>
				</div>
				<button
					onClick={handleNextMonth}
					className="p-1.5 hover:bg-gray-50 border border-black transition-all cursor-pointer flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
					aria-label="Next month"
				>
					<ChevronRight size={18} />
				</button>
			</header>

			{/* Tabs */}
			<div role="tablist" className="grid grid-cols-3 border border-black mb-5 bg-white">
				{TABS.map((t, i) => (
					<button
						key={t.id}
						role="tab"
						aria-selected={tab === t.id}
						onClick={() => setTab(t.id)}
						className={`py-2 text-xs font-bold uppercase tracking-wider cursor-pointer ${i > 0 ? 'border-l border-black' : ''} ${
							tab === t.id ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-50'
						}`}
					>
						{t.label}
					</button>
				))}
			</div>

			{tab === 'overview' && (
				<>
					{/* Summary cards with comparison to last month */}
					<div className="grid grid-cols-1 gap-3 mb-5">
						<div className="border border-black p-4 bg-rose-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
							<div className="flex justify-between items-center mb-1">
								<span className="text-xs font-bold uppercase tracking-wider text-rose-800">Spent</span>
								<ArrowDownRight size={16} className="text-rose-700" />
							</div>
							<div className="text-xl font-black text-black">{inr(data.expense)}</div>
							<ChangeBadge change={data.expenseChange} label={`vs ${data.prevLabel}`} />
						</div>
						<div className="grid grid-cols-2 gap-3">
							<div className="border border-black p-3 bg-emerald-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
								<div className="flex justify-between items-center mb-1">
									<span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Income</span>
									<ArrowUpRight size={16} className="text-emerald-700" />
								</div>
								<div className="text-lg font-black text-black">{inr(data.income)}</div>
								<ChangeBadge change={data.incomeChange} higherIsBetter label={`vs ${data.prevLabel}`} />
							</div>
							<div className={`border border-black p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${data.savings >= 0 ? 'bg-purple-100' : 'bg-amber-100'}`}>
								<div className="flex justify-between items-center mb-1">
									<span className="text-xs font-bold uppercase tracking-wider text-gray-800">Saved</span>
									<Wallet size={16} className="text-gray-700" />
								</div>
								<div className="text-lg font-black text-black">
									{data.savings < 0 ? '-' : ''}
									{inr(Math.abs(data.savings))}
								</div>
								<span className="text-[10px] font-bold text-gray-700">
									{data.income > 0 ? `${((data.savings / data.income) * 100).toFixed(0)}% of income` : 'No income yet'}
								</span>
							</div>
						</div>
					</div>

					{/* Plain-English insights */}
					<ChartCard title="What stands out" icon={<Lightbulb size={16} />}>
						<ul className="space-y-2">
							{data.insights.map((i) => (
								<li key={i.text} className={`border px-3 py-2 text-xs font-medium ${INSIGHT_STYLE[i.tone]}`}>
									{i.text}
								</li>
							))}
						</ul>
					</ChartCard>

					<ChartCard title="Where the money went" subtitle="Share of this month's spending" icon={<PieIcon size={16} />} empty={!hasExpenses} emptyText="No expenses this month">
						<CategoryDonut data={data.categories} centerLabel="Spent" />
					</ChartCard>

					<ChartCard
						title={`${data.curLabel} vs ${data.prevLabel}`}
						subtitle="Which categories went up or down"
						icon={<Scale size={16} />}
						empty={data.categoryCompare.length === 0}
						emptyText="Add expenses to compare months"
					>
						<CategoryCompareChart data={data.categoryCompare} currentLabel={data.curLabel} previousLabel={data.prevLabel} />
					</ChartCard>

					<ChartCard title="Accounts" subtitle="Money in and out of each account" icon={<Wallet size={16} />} empty={data.accounts.length === 0} emptyText="No transactions this month">
						<AccountChart data={data.accounts} />
					</ChartCard>
				</>
			)}

			{tab === 'trends' && (
				<>
					<ChartCard title="Last 6 months" subtitle="Income, expenses and what you kept" icon={<TrendingUp size={16} />} empty={data.trend.every((m) => m.income === 0 && m.expense === 0)} emptyText="Not enough history yet">
						<MonthlyTrendChart data={data.trend} />
						<div className="grid grid-cols-6 gap-1 mt-2 text-center">
							{data.trend.map((m) => (
								<div key={m.key} className="text-[10px]">
									<div className="text-gray-500 font-bold">{m.label}</div>
									<div className={`font-black ${m.savingsRate >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{m.income > 0 ? `${m.savingsRate.toFixed(0)}%` : '–'}</div>
								</div>
							))}
						</div>
						<p className="text-[10px] text-gray-500 text-center mt-1">Share of income saved each month</p>
					</ChartCard>

					<ChartCard title="Day by day" subtitle="Bars = spent that day, line = running total" icon={<CalendarDays size={16} />} empty={!hasExpenses} emptyText="No expenses this month">
						<DailySpendChart data={data.daily} />
					</ChartCard>

					<ChartCard title="Which days cost most" subtitle="Average spending by weekday (highest is highlighted)" icon={<BarChart3 size={16} />} empty={!hasExpenses} emptyText="No expenses this month">
						<WeekdayChart data={data.weekdays} />
					</ChartCard>
				</>
			)}

			{tab === 'budget' &&
				(data.budget && activeBudget ? (
					<>
						<section className="border border-black bg-white shadow-box p-4 mb-5">
							<div className="flex items-center justify-between mb-3">
								<h3 className="text-sm font-bold uppercase tracking-wider">Your budget</h3>
								<span className={`text-[10px] font-bold uppercase border px-2 py-0.5 ${STATUS_STYLE[data.budget.status].cls}`}>{STATUS_STYLE[data.budget.status].label}</span>
							</div>
							<div className="flex items-end justify-between mb-1.5">
								<span className="text-2xl font-black">{inr(data.budget.spent)}</span>
								<span className="text-xs text-gray-600 font-bold">of {inr(data.budget.limit)}</span>
							</div>
							<div className="w-full h-4 border border-black bg-gray-50 overflow-hidden" role="progressbar" aria-valuenow={Math.min(100, data.budget.percentUsed)} aria-valuemin={0} aria-valuemax={100}>
								<div className="h-full transition-all duration-500" style={{ width: `${Math.min(100, data.budget.percentUsed)}%`, background: STATUS_STYLE[data.budget.status].bar }} />
							</div>
							<p className="text-[11px] text-gray-600 mt-1">
								{data.budget.percentUsed.toFixed(0)}% used · {activeBudget.startDate} to {activeBudget.endDate}
							</p>

							<div className="grid grid-cols-3 gap-2 mt-4 text-center">
								<div className="border border-black/20 p-2">
									<div className="text-[10px] uppercase font-bold text-gray-500">{data.budget.remaining >= 0 ? 'Left' : 'Over by'}</div>
									<div className={`text-sm font-black ${data.budget.remaining >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{inr(Math.abs(data.budget.remaining))}</div>
								</div>
								<div className="border border-black/20 p-2">
									<div className="text-[10px] uppercase font-bold text-gray-500">Safe / day</div>
									<div className="text-sm font-black">{data.budget.daysLeft > 0 ? inr(data.budget.safePerDay) : '–'}</div>
								</div>
								<div className="border border-black/20 p-2">
									<div className="text-[10px] uppercase font-bold text-gray-500">Days left</div>
									<div className="text-sm font-black">{data.budget.daysLeft}</div>
								</div>
							</div>
							{data.budget.daysElapsed > 0 && data.budget.daysLeft > 0 && (
								<p className={`text-xs font-medium mt-3 px-3 py-2 border ${data.budget.projected > data.budget.limit ? INSIGHT_STYLE.warn : INSIGHT_STYLE.good}`}>
									At your current pace you will spend about <b>{inr(data.budget.projected)}</b> by {activeBudget.endDate}.
								</p>
							)}
						</section>

						<ChartCard title="Budget burn-down" subtitle="Stay under the dotted line to be on an even pace" icon={<CalendarRange size={16} />}>
							<BudgetBurnChart data={data.burn} limit={data.budget.limit} />
						</ChartCard>
					</>
				) : (
					<div className="border-2 border-dashed border-black/40 bg-white p-6 text-center flex flex-col items-center gap-3">
						<CalendarRange size={28} className="text-gray-400" />
						<p className="text-sm font-black uppercase">No active budget</p>
						<p className="text-xs text-gray-500">Create a budget with a date range to see how your spending compares.</p>
						<Link to="/budget" className="flex items-center gap-1.5 text-xs font-black uppercase border-2 border-black px-4 py-2 bg-black text-white">
							<PlusCircle size={14} /> Create Budget
						</Link>
					</div>
				))}
		</div>
	);
}

export default Stats;
