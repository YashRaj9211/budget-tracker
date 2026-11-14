import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { FINANCE_TABS, parseFinanceTab, type FinanceTab } from '../utils/financeTabs';
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
import { usePaymentMethodStore } from '../stores/paymentMethodStore';
import { linkedBalanceAdjustment } from '../components/money/paymentShared';
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

function shiftMonth(ym: string, delta: number): string {
	const { year, month } = parseMonthKey(ym);
	const d = new Date(year, month + delta, 1);
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');

export default function HubDashboard() {
	const user = useAuthStore((s) => s.user);
	const currentMonthKey = todayStr().slice(0, 7);
	const [month, setMonth] = useState(currentMonthKey);
	const [searchParams, setSearchParams] = useSearchParams();
	const activeTab: FinanceTab = parseFinanceTab(searchParams.get('tab'));
	const setActiveTab = useCallback(
		(t: FinanceTab) => setSearchParams(t === 'overview' ? {} : { tab: t }, { replace: true }),
		[setSearchParams],
	);

	const [overview, setOverview] = useState<FinanceOverview | null>(null);
	const [summary, setSummary] = useState<FinanceSummary | null>(null);
	const [salaries, setSalaries] = useState<SalaryEntry[]>([]);
	const [accounts, setAccounts] = useState<SavingsAccount[]>([]);
	const [monthTransactions, setMonthTransactions] = useState<Transaction[]>([]);
	// All-time list: balances of linked accounts depend on every payment since the link date
	const allTransactions = useTransactionStore((s) => s.allTransactions);
	const loadAllTransactions = useTransactionStore((s) => s.loadAllTransactions);
	const paymentMethods = usePaymentMethodStore((s) => s.methods);

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

	// Panels wait for the all-time list so linked balances never flash unadjusted
	const [txReady, setTxReady] = useState(false);
	useEffect(() => {
		let alive = true;
		loadAllTransactions()
			.catch(() => {})
			.finally(() => alive && setTxReady(true));
		return () => {
			alive = false;
		};
	}, [loadAllTransactions]);

	// Net effect of linked payment methods on account balances, applied to the savings totals
	const linkedDelta = useMemo(
		() => linkedBalanceAdjustment(accounts, paymentMethods, allTransactions),
		[accounts, paymentMethods, allTransactions],
	);

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

	// Layer sizes mirror the real nesting: accounts ⊃ total spent ⊃ budget spent (floored so thin layers stay visible)
	const accountTotal = Number(overview?.summary.savingsTotal ?? 0) + linkedDelta;
	const budgetSpentVal = Math.min(Number(summary?.budgetSpent ?? totalSpent), totalSpent);
	const spentRatio = accountTotal > 0 ? Math.min(Math.max(totalSpent / accountTotal, 0.3), 0.85) : 0.6;
	const budgetRatio = Math.max(totalSpent > 0 ? spentRatio * (budgetSpentVal / totalSpent) : 0, 0.15);
	const nestRatios = [1, spentRatio, budgetRatio];

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
			{/* Which section is showing (the tab picker lives in the bottom nav menu) */}
			<h1 className="px-2 text-[13px] font-semibold uppercase tracking-wider text-text-muted">
				{FINANCE_TABS.find((t) => t.id === activeTab)?.label}
			</h1>

			{/* Month switcher. Sections (Overview, Trends, ...) live in the bottom nav menu. */}
			<div className="bg-card rounded-[28px] px-3 py-2 shadow-sm">
				<div className="flex items-center justify-between">
					<button
						type="button"
						aria-label="Previous month"
						onClick={() => setMonth((m) => shiftMonth(m, -1))}
						className="h-8 w-8 rounded-full text-text/70 hover:bg-[#eef2ee] active:scale-95 transition-all cursor-pointer text-lg leading-none"
					>
						‹
					</button>
					<div className="flex items-center gap-2">
						<label
							htmlFor="finance-month-input"
							className="text-[16px] font-bold text-text cursor-pointer hover:opacity-80 transition-opacity"
							title="Click to pick a month"
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
						{month !== currentMonthKey && (
							<button
								type="button"
								onClick={() => setMonth(currentMonthKey)}
								className="bg-ink text-white rounded-full px-2.5 py-0.5 text-[10px] font-semibold active:scale-95 transition-all cursor-pointer"
							>
								Today
							</button>
						)}
					</div>
					<button
						type="button"
						aria-label="Next month"
						onClick={() => setMonth((m) => shiftMonth(m, 1))}
						className="h-8 w-8 rounded-full text-text/70 hover:bg-[#eef2ee] active:scale-95 transition-all cursor-pointer text-lg leading-none"
					>
						›
					</button>
				</div>
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
			{activeTab === 'overview' && overview && current && (
				<div className="space-y-3.5">
					{/* Image 2: Hero Bento Cards (Total savings, Month cashflow left, Incoming, Spent, Overspend) */}
					<FinanceKPIHero
						currentMonth={current}
						previousMonth={previous}
						summary={{
							...overview.summary,
							savingsTotal: String(Number(overview.summary.savingsTotal) + linkedDelta),
							adjustedSavings: String(Number(overview.summary.adjustedSavings) + linkedDelta),
						}}
						onOpenAccounts={() => setActiveTab('accounts')}
						onOpenSalary={() => setActiveTab('accounts')}
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

					<FlowChart
						title="Spent this month"
						value={totalSpent}
						delta={spendDelta}
						caption={
							previous
								? `${spendDelta >= 0 ? 'Up' : 'Down'} from ${inr(prevSpent)} last month · drag a marker to see spend so far`
								: 'Drag a marker to see spend so far'
						}
						data={spendCurve}
						markers={[0.25, 0.55, 0.9]}
						formatValue={inr}
						colors={['#3b3478', '#7d6df0', '#aa9cf5']}
						ratios={nestRatios}
						timelineLabels={[
							'1 ' + displayMonthLong(month).slice(0, 3),
							'15 ' + displayMonthLong(month).slice(0, 3),
							month === currentMonthKey ? 'Today' : 'Month end',
						]}
						budgetLimit={Number(current?.budgetLimit || 0)}
						legend={[
							{ color: '#3b3478', label: 'Total in accounts', value: inr(accountTotal) },
							{ color: '#7d6df0', label: 'Spent this month', value: inr(totalSpent) },
							{ color: '#aa9cf5', label: 'Spent from budget', value: inr(budgetSpentVal) },
						]}
						showIndicators={true}
					/>
				</div>
			)}

			{/* ========================================================================= */}
			{/* TAB 2: TRENDS (Multi-month Savings Trajectory, Overspend, Categories)     */}
			{/* ========================================================================= */}
			{activeTab === 'trends' && overview && current && (
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
			{activeTab === 'expenses' && (
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
			{activeTab === 'accounts' && txReady && (
				<div className="space-y-3.5">
					<SalaryPanel salaries={salaries} onChanged={loadData} />
					<AccountsPanel accounts={accounts} transactions={allTransactions} onChanged={loadData} />
				</div>
			)}

			{/* ========================================================================= */}
			{/* TAB 5: PAYMENTS (Payment Methods Management & Account Mapping)            */}
			{/* ========================================================================= */}
			{activeTab === 'payments' && txReady && (
				<PaymentMethodsPanel
					accounts={accounts}
					transactions={allTransactions}
					onGoToAccounts={() => setActiveTab('accounts')}
				/>
			)}

			<AddTransactionForm />
		</div>
	);
}
