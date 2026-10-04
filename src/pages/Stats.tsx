import { useEffect, useMemo, useState, useTransition } from 'react';
import { Link } from 'react-router';
import {
	BarChart3,
	CalendarDays,
	CalendarRange,
	LightbulbIcon,
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
import { Card } from '../components/ui/Card';
import SegmentedTabs from '../components/ui/SegmentedTabs';
import { MonthNavigator } from '../components/common/MonthNavigator';
import Chip from '../components/ui/Chip';
import ProgressBar from '../components/ui/ProgressBar';

type Tab = 'overview' | 'trends' | 'budget';
type Source = 'device' | 'account';

const TABS: { id: Tab; label: string }[] = [
	{ id: 'overview', label: 'Overview' },
	{ id: 'trends', label: 'Trends' },
	{ id: 'budget', label: 'Budget' },
];


const INSIGHT_BG = {
	good: 'bg-mint/20',
	warn: 'bg-warning-soft',
	info: 'bg-surface',
};

function Stats() {
	const allTransactions = useTransactionStore((s) => s.allTransactions);
	const loadAllTransactions = useTransactionStore((s) => s.loadAllTransactions);
	const activeBudget = useBudgetStore((s) => s.activeBudget);
	const loadActiveBudget = useBudgetStore((s) => s.loadActiveBudget);
	const { selectedYear, selectedMonth, formattedMonth, handlePrevMonth, handleNextMonth } =
		useMonthNavigation();
	const [tab, setTab] = useState<Tab>('overview');
	const [source, setSource] = useState<Source | null>(null);
	const [, startTransition] = useTransition();

	useEffect(() => {
		loadAllTransactions();
		loadActiveBudget(todayStr());
		window.hideSplashScreen?.();
	}, [loadAllTransactions, loadActiveBudget]);

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
	const hasDeviceData = allTransactions.length > 0;
	const activeSource: Source = source ?? (hasDeviceData ? 'device' : 'account');

	const sourceSwitch = (
		<SegmentedTabs
			tabs={[
				{ id: 'device', label: 'This device' },
				{ id: 'account', label: 'My account' },
			]}
			activeId={activeSource}
			onChange={(id) => startTransition(() => setSource(id as Source))}
			className="mb-4"
		/>
	);

	if (activeSource === 'account') {
		return (
			<div className="relative pb-24">
				<div className="flex items-center gap-2 mb-4">
					<BarChart3 size={20} className="text-text-muted" strokeWidth={1.5} />
					<h2 className="text-[20px] font-medium text-text">Analytics</h2>
				</div>
				{sourceSwitch}
				<AccountAnalytics />
			</div>
		);
	}

	return (
		<div className="relative pb-24">
			<div className="flex items-center gap-2 mb-4">
				<BarChart3 size={20} className="text-text-muted" strokeWidth={1.5} />
				<h2 className="text-[20px] font-medium text-text">Analytics</h2>
			</div>

			{sourceSwitch}

			<MonthNavigator
				formattedMonth={formattedMonth}
				onPrev={handlePrevMonth}
				onNext={handleNextMonth}
				className="mb-4"
			/>

			<SegmentedTabs
				tabs={TABS}
				activeId={tab}
				onChange={(id) => startTransition(() => setTab(id as Tab))}
				className="mb-5"
			/>

			{tab === 'overview' && (
				<>
					{/* Summary cards */}
					<div className="space-y-3 mb-5">
						<Card variant="mint">
							<p className="text-[12px] text-text-muted mb-1">Spent</p>
							<div className="flex items-end justify-between">
								<p className="text-[28px] font-medium text-text">{inr(data.expense)}</p>
								<ChangeBadge change={data.expenseChange} label={`vs ${data.prevLabel}`} />
							</div>
						</Card>
						<div className="grid grid-cols-2 gap-3">
							<Card variant="white" nested>
								<p className="text-[12px] text-text-muted mb-1">Income</p>
								<p className="text-[22px] font-medium text-text">{inr(data.income)}</p>
								<ChangeBadge change={data.incomeChange} higherIsBetter label={`vs ${data.prevLabel}`} />
							</Card>
							<Card variant="lavender" nested>
								<p className="text-[12px] text-text-muted mb-1">Saved</p>
								<p className="text-[22px] font-medium text-text">
									{data.savings < 0 ? '-' : ''}{inr(Math.abs(data.savings))}
								</p>
								<span className="text-[12px] text-text-muted">
									{data.income > 0
										? `${((data.savings / data.income) * 100).toFixed(0)}% of income`
										: 'No income yet'}
								</span>
							</Card>
						</div>
					</div>

					{/* Insights */}
					<ChartCard title="What stands out" icon={<LightbulbIcon size={16} strokeWidth={1.5} />}>
						<ul className="space-y-2">
							{data.insights.map((i) => (
								<li
									key={i.text}
									className={`rounded-[16px] px-3 py-2 text-[13px] font-medium text-text ${INSIGHT_BG[i.tone]}`}
								>
									{i.text}
								</li>
							))}
						</ul>
					</ChartCard>

					<ChartCard
						title="Where the money went"
						subtitle="Share of this month's spending"
						icon={<PieIcon size={16} strokeWidth={1.5} />}
						empty={!hasExpenses}
						emptyText="No expenses this month"
					>
						<CategoryDonut data={data.categories} centerLabel="Spent" />
					</ChartCard>

					<ChartCard
						title={`${data.curLabel} vs ${data.prevLabel}`}
						subtitle="Which categories went up or down"
						icon={<Scale size={16} strokeWidth={1.5} />}
						empty={data.categoryCompare.length === 0}
						emptyText="Add expenses to compare months"
					>
						<CategoryCompareChart
							data={data.categoryCompare}
							currentLabel={data.curLabel}
							previousLabel={data.prevLabel}
						/>
					</ChartCard>

					<ChartCard
						title="Accounts"
						subtitle="Money in and out of each account"
						icon={<Wallet size={16} strokeWidth={1.5} />}
						empty={data.accounts.length === 0}
						emptyText="No transactions this month"
					>
						<AccountChart data={data.accounts} />
					</ChartCard>
				</>
			)}

			{tab === 'trends' && (
				<>
					<ChartCard
						title="Last 6 months"
						subtitle="Income, expenses and what you kept"
						icon={<TrendingUp size={16} strokeWidth={1.5} />}
						empty={data.trend.every((m) => m.income === 0 && m.expense === 0)}
						emptyText="Not enough history yet"
					>
						<MonthlyTrendChart data={data.trend} />
						<div className="grid grid-cols-6 gap-1 mt-2 text-center">
							{data.trend.map((m) => (
								<div key={m.key} className="text-[10px]">
									<div className="text-text-muted">{m.label}</div>
									<div
										className={`font-medium ${m.savingsRate >= 0 ? 'text-mint-deep' : 'text-danger'}`}
									>
										{m.income > 0 ? `${m.savingsRate.toFixed(0)}%` : '–'}
									</div>
								</div>
							))}
						</div>
						<p className="text-[12px] text-text-muted text-center mt-1">
							Share of income saved each month
						</p>
					</ChartCard>

					<ChartCard
						title="Day by day"
						subtitle="Bars = spent that day, line = running total"
						icon={<CalendarDays size={16} strokeWidth={1.5} />}
						empty={!hasExpenses}
						emptyText="No expenses this month"
					>
						<DailySpendChart data={data.daily} />
					</ChartCard>

					<ChartCard
						title="Which days cost most"
						subtitle="Average spending by weekday (highest is highlighted)"
						icon={<BarChart3 size={16} strokeWidth={1.5} />}
						empty={!hasExpenses}
						emptyText="No expenses this month"
					>
						<WeekdayChart data={data.weekdays} />
					</ChartCard>
				</>
			)}

			{tab === 'budget' &&
				(data.budget && activeBudget ? (
					<>
						<Card variant="ink" className="mb-5">
							<div className="flex items-center justify-between mb-4">
								<h3 className="text-[15px] font-medium text-white">Your budget</h3>
								<Chip variant={data.budget.status === 'safe' ? 'positive' : data.budget.status === 'over' ? 'negative' : 'neutral'}>
									{data.budget.status === 'safe' ? 'On track' : data.budget.status === 'over' ? 'Over budget' : 'Watch out'}
								</Chip>
							</div>
							<div className="flex items-end justify-between mb-3">
								<span className="text-[32px] font-medium text-white">{inr(data.budget.spent)}</span>
								<span className="text-[12px] text-text-on-ink-muted">of {inr(data.budget.limit)}</span>
							</div>
							<ProgressBar progress={data.budget.percentUsed} variant="ink" className="mb-3" />
							<p className="text-[12px] text-text-on-ink-muted">
								{data.budget.percentUsed.toFixed(0)}% used · {activeBudget.startDate} to {activeBudget.endDate}
							</p>

							<div className="grid grid-cols-3 gap-2 mt-4">
								{[
									{ label: data.budget.remaining >= 0 ? 'Left' : 'Over by', value: inr(Math.abs(data.budget.remaining)), colored: true, positive: data.budget.remaining >= 0 },
									{ label: 'Safe / day', value: data.budget.daysLeft > 0 ? inr(data.budget.safePerDay) : '–', colored: false, positive: true },
									{ label: 'Days left', value: String(data.budget.daysLeft), colored: false, positive: true },
								].map((s) => (
									<div key={s.label} className="bg-ink-soft rounded-[16px] p-3 text-center">
										<div className="text-[12px] text-text-on-ink-muted mb-1">{s.label}</div>
										<div className={`text-[15px] font-medium ${s.colored ? (s.positive ? 'text-mint' : 'text-danger') : 'text-white'}`}>
											{s.value}
										</div>
									</div>
								))}
							</div>

							{data.budget.daysElapsed > 0 && data.budget.daysLeft > 0 && (
								<p className={`text-[13px] font-medium mt-4 px-3 py-2 rounded-[16px] ${data.budget.projected > data.budget.limit ? 'bg-warning-soft text-text' : 'bg-mint text-ink'}`}>
									At your current pace you will spend about <b>{inr(data.budget.projected)}</b> by {activeBudget.endDate}.
								</p>
							)}
						</Card>

						<ChartCard
							title="Budget burn-down"
							subtitle="Stay under the dotted line to be on an even pace"
							icon={<CalendarRange size={16} strokeWidth={1.5} />}
						>
							<BudgetBurnChart data={data.burn} limit={data.budget.limit} />
						</ChartCard>
					</>
				) : (
					<Card variant="white" className="flex flex-col items-center justify-center gap-3 text-center py-8">
						<CalendarRange size={28} className="text-text-muted" />
						<p className="text-[15px] font-medium text-text">No active budget</p>
						<p className="text-[12px] text-text-muted">
							Create a budget with a date range to see how your spending compares.
						</p>
						<Link
							to="/budget"
							className="flex items-center gap-1.5 text-sm font-medium bg-ink text-white rounded-full px-5 py-2.5 mt-1 active:scale-[0.98] transition-transform"
						>
							<PlusCircle size={14} /> Create Budget
						</Link>
					</Card>
				))}
		</div>
	);
}

export default Stats;
