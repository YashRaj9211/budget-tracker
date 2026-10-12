import { useCallback, useEffect, useMemo, useState } from 'react';
import {
	financeOverviewApi,
	financeSummaryApi,
	salaryApi,
	savingsApi,
	type FinanceOverview,
	type FinanceSummary,
	type SalaryEntry,
	type SavingsAccount,
} from '../api/financeHubApi';
import { useAuthStore } from '../stores/authStore';
import { useWebSocket } from '../hooks/useWebSocket';
import { useTransactionStore } from '../stores/transactionStore';
import * as db from '../db';
import type { Transaction } from '../types';
import { parseMonthKey, todayStr } from '../utils/date';
import FinanceKPIHero from '../components/finance/FinanceKPIHero';
import {
	BudgetedVsExcludedBento,
	CategorySpendDonut,
	MonthComparisonBento,
	MonthWiseCashFlowBento,
	SavingsTrajectoryChart,
} from '../components/finance/FinanceCharts';
import ExpenseExplorer from '../components/finance/ExpenseExplorer';
import ChartCard from '../components/charts/ChartCard';
import SalaryPanel from '../components/money/SalaryPanel';
import AccountsPanel from '../components/money/AccountsPanel';
import OverspendTracker from '../components/money/OverspendTracker';
import PaymentMethodsPanel from '../components/money/PaymentMethodsPanel';
import FlowChart from '../components/charts/FlowChart';
import AddTransactionForm from '../components/transaction/AddTransactionForm';

function displayMonthLong(ym: string): string {
	const { year, month } = parseMonthKey(ym);
	return new Date(year, month).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
}

const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');

type TabType = 'Overview' | 'Trends' | 'Expenses' | 'Accounts' | 'Payments';

const TABS: TabType[] = ['Overview', 'Trends', 'Expenses', 'Accounts', 'Payments'];

export default function HubDashboard() {
	const user = useAuthStore((s) => s.user);
	const currentMonthKey = todayStr().slice(0, 7);
	const [month, setMonth] = useState(currentMonthKey);
	const [activeTab, setActiveTab] = useState<TabType>('Overview');

	const [overview, setOverview] = useState<FinanceOverview | null>(null);
	const [summary, setSummary] = useState<FinanceSummary | null>(null);
	const [salaries, setSalaries] = useState<SalaryEntry[]>([]);
	const [accounts, setAccounts] = useState<SavingsAccount[]>([]);
	const [monthTransactions, setMonthTransactions] = useState<Transaction[]>([]);

	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const { onEvent } = useWebSocket();
	const setEditingTransaction = useTransactionStore((s) => s.setEditingTransaction);

	const loadData = useCallback(async () => {
		if (!user?.id) return;
		setIsLoading(true);
		setError(null);
		try {
			const [ovRes, sumRes, salRes, accRes, txRes] = await Promise.all([
				financeOverviewApi.get(month, 6),
				financeSummaryApi.get(month),
				salaryApi.list(),
				savingsApi.listAccounts(),
				db.getTransactionsByMonth(month),
			]);
			setOverview(ovRes);
			setSummary(sumRes);
			setSalaries(salRes);
			setAccounts(accRes);
			setMonthTransactions(txRes || []);
		} catch (err: any) {
			setError(err.message || 'Failed to load finance data');
		} finally {
			setIsLoading(false);
		}
	}, [user?.id, month]);

	useEffect(() => {
		loadData();
		window.hideSplashScreen?.();
	}, [loadData]);

	useEffect(() => {
		const unsub = onEvent('REFETCH_EXPENSES', () => {
			loadData();
		});
		return () => unsub();
	}, [onEvent, loadData]);

	const months = overview?.months ?? [];
	const current = months.find((m) => m.month === month) || months[months.length - 1];
	const currentIndex = months.findIndex((m) => m.month === current?.month);
	const previous = currentIndex > 0 ? months[currentIndex - 1] : undefined;

	const totalSpent = Number(current?.totalSpent || 0);
	const prevSpent = previous ? Number(previous.totalSpent || 0) : 0;
	const spendDelta = prevSpent > 0 ? Math.round(((totalSpent - prevSpent) / prevSpent) * 100) : 0;

	const spendCurve = useMemo(() => {
		if (totalSpent <= 0) {
			return [0, 0, 0, 0, 0, 0, 0];
		}
		const expenseTxns = (monthTransactions || [])
			.filter((t) => t.type === 'expense')
			.sort((a, b) => a.date.localeCompare(b.date));

		if (expenseTxns.length === 0) {
			return [
				0,
				Math.round(totalSpent * 0.18),
				Math.round(totalSpent * 0.38),
				Math.round(totalSpent * 0.62),
				Math.round(totalSpent * 0.82),
				Math.round(totalSpent * 0.95),
				totalSpent,
			];
		}

		let running = 0;
		const cumulative = expenseTxns.map((t) => {
			running += Number(t.amount || 0);
			return running;
		});

		const points = 7;
		const curveData: number[] = [0];
		for (let i = 1; i < points; i++) {
			const idx = Math.min(
				Math.floor((i / (points - 1)) * (cumulative.length - 1)),
				cumulative.length - 1
			);
			curveData.push(cumulative[idx] || 0);
		}
		curveData[curveData.length - 1] = totalSpent;
		return curveData;
	}, [monthTransactions, totalSpent]);

	return (
		<div className="w-full space-y-3.5 pb-28 pt-1">
			{/* 1. Top Segmented Tabs Bar (Image 1 top) */}
			<div className="bg-[#eef2ee] rounded-full p-1 flex items-center gap-0.5 overflow-x-auto shadow-sm scrollbar-width-none">
				{TABS.map((tab) => {
					const isActive = activeTab === tab;
					return (
						<button
							key={tab}
							type="button"
							onClick={() => setActiveTab(tab)}
							className={`shrink-0 rounded-full px-3 py-2 text-[12px] transition-all cursor-pointer whitespace-nowrap ${
								isActive
									? 'bg-ink text-white font-semibold shadow-sm'
									: 'text-text/70 hover:text-text font-medium'
							}`}
						>
							{tab}
						</button>
					);
				})}
			</div>

			{/* 2. Month Header Card (Image 2 top) */}
			<div className="bg-card rounded-[28px] p-3.5 px-4 flex items-center justify-between shadow-sm">
				<div>
					<span className="text-[11px] font-medium text-text-muted block">Overview</span>
					<label
						htmlFor="finance-month-input"
						className="text-[17px] font-bold text-text cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1.5"
						title="Click to change month"
					>
						{displayMonthLong(month)}
					</label>
					<input
						type="month"
						id="finance-month-input"
						aria-label="Select month"
						value={month}
						onChange={(e) => e.target.value && setMonth(e.target.value)}
						className="sr-only"
					/>
				</div>

				<button
					type="button"
					onClick={() => setMonth(currentMonthKey)}
					className="bg-ink text-white rounded-full px-5 py-1.5 text-[12px] font-semibold hover:bg-black active:scale-95 transition-all cursor-pointer shadow-sm"
				>
					Current
				</button>
			</div>

			{error && (
				<div className="p-3 bg-danger-soft text-danger rounded-[20px] text-xs">
					{error}
				</div>
			)}

			{isLoading && !overview && (
				<div className="h-64 animate-pulse rounded-[28px] bg-card/60" />
			)}

			{/* ========================================================================= */}
			{/* TAB 1: OVERVIEW (Full visual matching Image 2 top & Image 1 bottom)     */}
			{/* ========================================================================= */}
			{activeTab === 'Overview' && overview && current && (
				<div className="space-y-3.5">
					{/* Image 2: Hero Bento Cards (Total savings, Month cashflow left, Incoming, Spent, Overspend) */}
					<FinanceKPIHero
						currentMonth={current}
						previousMonth={previous}
						summary={overview.summary}
						onOpenAccounts={() => setActiveTab('Accounts')}
						onOpenSalary={() => setActiveTab('Accounts')}
					/>

					{/* Image 1: Month-wise cash flow Card (Dark with 4 rounded pillar bars, active hatched mint) */}
					<MonthWiseCashFlowBento months={months} activeMonth={month} />

					{/* Image 1: Budgeted vs excluded Card (White with lavender & ink split pill bar) */}
					<BudgetedVsExcludedBento currentMonth={current} />

					{/* Image 1: Avg monthly spend & Vs last month (2-Column Mint & Lavender cards) */}
					<MonthComparisonBento
						months={months}
						currentMonth={current}
						previousMonth={previous}
					/>

					{/* Layered FlowChart stream with draggable value markers */}
					<FlowChart
						title="Spending Velocity"
						value={totalSpent}
						delta={spendDelta}
						caption={previous ? `Compared to ${inr(prevSpent)} last month` : undefined}
						data={spendCurve}
						markers={[0.2, 0.55, 0.9]}
						formatValue={inr}
						colors={['#1d1b3a', '#3b3478', '#7d6df0', '#aa9cf5']}
						timelineLabels={['1st ' + displayMonthLong(month).slice(0, 3), '15th Mid', 'Today']}
						budgetLimit={Number(current?.budgetLimit || 0)}
						showIndicators={true}
					/>
				</div>
			)}

			{/* ========================================================================= */}
			{/* TAB 2: TRENDS (Multi-month Savings Trajectory, Overspend, Categories)     */}
			{/* ========================================================================= */}
			{activeTab === 'Trends' && overview && current && (
				<div className="space-y-3.5">
					{/* Layered FlowChart stream with draggable value markers */}
					<FlowChart
						title="Spending Progression"
						value={totalSpent}
						delta={spendDelta}
						caption={`Month velocity · ${displayMonthLong(month)}`}
						data={spendCurve}
						markers={[0.25, 0.55, 0.9]}
						formatValue={inr}
						colors={['#1d1b3a', '#3b3478', '#7d6df0', '#aa9cf5']}
						timelineLabels={['Start', 'Halfway', 'Month end']}
						budgetLimit={Number(current?.budgetLimit || 0)}
						showIndicators={true}
					/>

					{/* Savings Trajectory Chart */}
					<ChartCard
						title="Savings growth trajectory"
						subtitle="Green area = total savings · Violet line = after budget overspends"
						empty={months.length === 0}
						emptyText="No savings accounts recorded yet"
					>
						<SavingsTrajectoryChart months={months} />
					</ChartCard>

					{/* Category Spend Distribution for Month */}
					<ChartCard
						title={`Spending by category · ${displayMonthLong(month)}`}
						subtitle="All expenses including budget-excluded items"
						empty={!summary || !summary.categories || summary.categories.length === 0}
						emptyText="No categorised expenses this month"
					>
						{summary?.categories && <CategorySpendDonut categories={summary.categories} />}
					</ChartCard>

					{/* Month-by-month Overspend Tracker */}
					<OverspendTracker
						months={months}
						overspendTotal={overview.summary.overspendTotal}
					/>
				</div>
			)}

			{/* ========================================================================= */}
			{/* TAB 3: EXPENSES (Audit All Transactions, Budgeted, Excluded, Income)       */}
			{/* ========================================================================= */}
			{activeTab === 'Expenses' && (
				<div className="space-y-3.5">
					<ExpenseExplorer
						transactions={monthTransactions}
						onEditTransaction={setEditingTransaction}
					/>
				</div>
			)}

			{/* ========================================================================= */}
			{/* TAB 4: ACCOUNTS (Salary Management & Savings Accounts)                    */}
			{/* ========================================================================= */}
			{activeTab === 'Accounts' && (
				<div className="space-y-3.5">
					<SalaryPanel salaries={salaries} onChanged={loadData} />
					<AccountsPanel accounts={accounts} onChanged={loadData} />
				</div>
			)}

			{/* ========================================================================= */}
			{/* TAB 5: PAYMENTS (Payment Methods Management & Account Mapping)            */}
			{/* ========================================================================= */}
			{activeTab === 'Payments' && (
				<PaymentMethodsPanel
					accounts={accounts}
					transactions={monthTransactions}
				/>
			)}

			<AddTransactionForm />
		</div>
	);
}
