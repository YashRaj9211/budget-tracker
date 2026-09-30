import { addDays, addMonths, differenceInCalendarDays, format, getDaysInMonth, parseISO } from 'date-fns';
import type { Budget, Transaction } from '../types';

/**
 * Pure helpers that turn raw transactions into chart-ready numbers.
 * Nothing here touches React or the database, so every function is easy to test.
 * All dates are 'YYYY-MM-DD' strings; months are 0-indexed like JavaScript dates.
 */

const round2 = (n: number) => Math.round(n * 100) / 100;

export const sum = (list: Transaction[]) => round2(list.reduce((s, t) => s + t.amount, 0));
export const expensesOf = (list: Transaction[]) => list.filter((t) => t.type === 'expense');
export const incomeOf = (list: Transaction[]) => list.filter((t) => t.type === 'income');

/** 'YYYY-MM' for a year + 0-indexed month. */
export function monthKey(year: number, month: number): string {
	return format(new Date(year, month, 1), 'yyyy-MM');
}

/** Transactions that fall in one month. */
export function inMonth(all: Transaction[], year: number, month: number): Transaction[] {
	const key = monthKey(year, month);
	return all.filter((t) => t.date.startsWith(key));
}

/** The month before (year, month). */
export function previousMonth(year: number, month: number): { year: number; month: number } {
	const d = addMonths(new Date(year, month, 1), -1);
	return { year: d.getFullYear(), month: d.getMonth() };
}

/**
 * % change from `previous` to `current`. Returns null when there is nothing to compare with
 * (previous is 0), so the UI can show "new" instead of "Infinity%".
 */
export function percentChange(current: number, previous: number): number | null {
	if (previous <= 0) return null;
	return round2(((current - previous) / previous) * 100);
}

// ── Monthly trend ──

export interface MonthPoint {
	key: string; // '2026-09'
	label: string; // 'Sep'
	income: number;
	expense: number;
	savings: number; // income - expense (can be negative)
	savingsRate: number; // % of income kept, 0 when there was no income
}

/** The last `count` months ending at (year, month), oldest first. Empty months are included as 0. */
export function monthlyTrend(all: Transaction[], year: number, month: number, count = 6): MonthPoint[] {
	const points: MonthPoint[] = [];
	for (let i = count - 1; i >= 0; i--) {
		const d = addMonths(new Date(year, month, 1), -i);
		const txs = inMonth(all, d.getFullYear(), d.getMonth());
		const income = sum(incomeOf(txs));
		const expense = sum(expensesOf(txs));
		points.push({
			key: format(d, 'yyyy-MM'),
			label: format(d, 'MMM'),
			income,
			expense,
			savings: round2(income - expense),
			savingsRate: income > 0 ? round2(((income - expense) / income) * 100) : 0,
		});
	}
	return points;
}

// ── Categories ──

export interface CategoryTotal {
	name: string;
	amount: number;
	share: number; // % of total expenses
}

export function categoryTotals(txs: Transaction[]): CategoryTotal[] {
	const totals = new Map<string, number>();
	for (const t of expensesOf(txs)) {
		const name = t.category || 'Other';
		totals.set(name, (totals.get(name) ?? 0) + t.amount);
	}
	const all = [...totals.values()].reduce((a, b) => a + b, 0);
	return [...totals.entries()]
		.map(([name, amount]) => ({ name, amount: round2(amount), share: all > 0 ? round2((amount / all) * 100) : 0 }))
		.sort((a, b) => b.amount - a.amount);
}

export interface CategoryCompare {
	name: string;
	current: number;
	previous: number;
	change: number | null; // % change, null when there was no spending before
}

/** Side-by-side category totals for two periods, biggest current spenders first. */
export function compareCategories(current: Transaction[], previous: Transaction[]): CategoryCompare[] {
	const cur = new Map(categoryTotals(current).map((c) => [c.name, c.amount]));
	const prev = new Map(categoryTotals(previous).map((c) => [c.name, c.amount]));
	const names = new Set([...cur.keys(), ...prev.keys()]);
	return [...names]
		.map((name) => {
			const c = cur.get(name) ?? 0;
			const p = prev.get(name) ?? 0;
			return { name, current: c, previous: p, change: percentChange(c, p) };
		})
		.sort((a, b) => b.current + b.previous - (a.current + a.previous));
}

// ── Daily + weekday patterns ──

export interface DayPoint {
	day: number; // 1..31
	date: string;
	spent: number;
	income: number;
	cumulative: number; // running total of spending
}

/** One point for every day of the month, even days with no spending. */
export function dailySeries(all: Transaction[], year: number, month: number): DayPoint[] {
	const days = getDaysInMonth(new Date(year, month, 1));
	const txs = inMonth(all, year, month);
	const points: DayPoint[] = [];
	let running = 0;
	for (let day = 1; day <= days; day++) {
		const date = format(new Date(year, month, day), 'yyyy-MM-dd');
		const todays = txs.filter((t) => t.date === date);
		const spent = sum(expensesOf(todays));
		running = round2(running + spent);
		points.push({ day, date, spent, income: sum(incomeOf(todays)), cumulative: running });
	}
	return points;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export interface WeekdayPoint {
	day: string;
	total: number;
	average: number; // average spend on that weekday (over the days of that weekday that exist in the data)
	count: number;
}

/** Spending by day of the week (Mon..Sun). Shows which days you tend to spend more. */
export function weekdayTotals(txs: Transaction[]): WeekdayPoint[] {
	const totals = new Array(7).fill(0) as number[];
	const dates: Set<string>[] = WEEKDAYS.map(() => new Set<string>());
	for (const t of expensesOf(txs)) {
		const idx = (parseISO(t.date).getDay() + 6) % 7; // Monday = 0
		totals[idx] += t.amount;
		dates[idx].add(t.date);
	}
	return WEEKDAYS.map((day, i) => ({
		day,
		total: round2(totals[i]),
		average: dates[i].size > 0 ? round2(totals[i] / dates[i].size) : 0,
		count: dates[i].size,
	}));
}

// ── Accounts ──

export interface AccountPoint {
	name: string;
	income: number;
	expense: number;
}

export function accountTotals(txs: Transaction[]): AccountPoint[] {
	const map = new Map<string, AccountPoint>();
	for (const t of txs) {
		const name = t.account || 'Cash';
		const row = map.get(name) ?? { name, income: 0, expense: 0 };
		if (t.type === 'income') row.income += t.amount;
		else row.expense += t.amount;
		map.set(name, row);
	}
	return [...map.values()]
		.map((r) => ({ ...r, income: round2(r.income), expense: round2(r.expense) }))
		.sort((a, b) => b.expense + b.income - (a.expense + a.income));
}

// ── Budget ──

export type BudgetStatus = 'safe' | 'watch' | 'over';

export interface BudgetProgress {
	limit: number;
	spent: number;
	remaining: number; // can be negative
	percentUsed: number;
	totalDays: number;
	daysElapsed: number; // 0..totalDays
	daysLeft: number;
	idealPerDay: number; // limit / totalDays
	averagePerDay: number; // spent so far / days elapsed
	projected: number; // where spending ends if the current daily average continues
	safePerDay: number; // what you can spend per remaining day and still stay within the limit
	status: BudgetStatus;
}

/** Everything the budget screens need, calculated for `today`. */
export function budgetProgress(budget: Budget, all: Transaction[], today: string): BudgetProgress {
	const start = parseISO(budget.startDate);
	const end = parseISO(budget.endDate);
	const totalDays = Math.max(1, differenceInCalendarDays(end, start) + 1);
	const elapsedRaw = differenceInCalendarDays(parseISO(today), start) + 1;
	const daysElapsed = Math.min(totalDays, Math.max(0, elapsedRaw));
	const daysLeft = totalDays - daysElapsed;

	const spent = sum(
		expensesOf(all).filter((t) => t.date >= budget.startDate && t.date <= budget.endDate)
	);
	const remaining = round2(budget.totalLimit - spent);
	const percentUsed = budget.totalLimit > 0 ? round2((spent / budget.totalLimit) * 100) : 0;
	const idealPerDay = round2(budget.totalLimit / totalDays);
	const averagePerDay = daysElapsed > 0 ? round2(spent / daysElapsed) : 0;
	const projected = daysElapsed > 0 ? round2(averagePerDay * totalDays) : 0;
	const safePerDay = daysLeft > 0 ? round2(Math.max(0, remaining) / daysLeft) : 0;

	let status: BudgetStatus = 'safe';
	if (spent > budget.totalLimit) status = 'over';
	else if (projected > budget.totalLimit || percentUsed >= budget.alertThreshold) status = 'watch';

	return {
		limit: budget.totalLimit,
		spent,
		remaining,
		percentUsed,
		totalDays,
		daysElapsed,
		daysLeft,
		idealPerDay,
		averagePerDay,
		projected,
		safePerDay,
		status,
	};
}

export interface BurnPoint {
	date: string;
	label: string; // '5 Oct'
	ideal: number; // where you'd be if you spent evenly
	actual: number | null; // null for days that have not happened yet
}

/** Budget burn-down: spent so far vs an even pace, one point per day of the budget period. */
export function budgetBurn(budget: Budget, all: Transaction[], today: string): BurnPoint[] {
	const start = parseISO(budget.startDate);
	const totalDays = Math.max(1, differenceInCalendarDays(parseISO(budget.endDate), start) + 1);
	const perDay = budget.totalLimit / totalDays;
	const spendByDate = new Map<string, number>();
	for (const t of expensesOf(all)) {
		if (t.date >= budget.startDate && t.date <= budget.endDate) {
			spendByDate.set(t.date, (spendByDate.get(t.date) ?? 0) + t.amount);
		}
	}
	const points: BurnPoint[] = [];
	let running = 0;
	for (let i = 0; i < totalDays; i++) {
		const d = addDays(start, i);
		const date = format(d, 'yyyy-MM-dd');
		const isPast = date <= today;
		running += spendByDate.get(date) ?? 0;
		points.push({
			date,
			label: format(d, 'd MMM'),
			ideal: round2(perDay * (i + 1)),
			actual: isPast ? round2(running) : null,
		});
	}
	return points;
}

// ── Plain-English insights ──

export interface Insight {
	tone: 'good' | 'warn' | 'info';
	text: string;
}

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

export interface InsightInput {
	current: Transaction[];
	previous: Transaction[];
	budget?: BudgetProgress | null;
}

/** A few short sentences that explain the charts in words. */
export function buildInsights({ current, previous, budget }: InsightInput): Insight[] {
	const out: Insight[] = [];
	const spent = sum(expensesOf(current));
	const prevSpent = sum(expensesOf(previous));
	const income = sum(incomeOf(current));

	if (spent === 0) return [{ tone: 'info', text: 'No spending recorded this month yet.' }];

	const change = percentChange(spent, prevSpent);
	if (change !== null) {
		const diff = inr(Math.abs(spent - prevSpent));
		if (change > 5) out.push({ tone: 'warn', text: `You spent ${change.toFixed(0)}% more than last month (${diff} more).` });
		else if (change < -5) out.push({ tone: 'good', text: `You spent ${Math.abs(change).toFixed(0)}% less than last month (${diff} less).` });
		else out.push({ tone: 'info', text: 'Your spending is about the same as last month.' });
	}

	const cats = categoryTotals(current);
	if (cats.length > 0) {
		out.push({ tone: 'info', text: `${cats[0].name} is your biggest category: ${cats[0].share.toFixed(0)}% of spending (${inr(cats[0].amount)}).` });
	}

	const biggestJump = compareCategories(current, previous)
		.filter((c) => c.change !== null && c.current - c.previous >= 200 && (c.change as number) >= 25)
		.sort((a, b) => b.current - b.previous - (a.current - a.previous))[0];
	if (biggestJump) {
		out.push({ tone: 'warn', text: `${biggestJump.name} is up ${(biggestJump.change as number).toFixed(0)}% compared with last month.` });
	}

	const days = weekdayTotals(current).filter((d) => d.count > 0);
	if (days.length >= 3) {
		const top = [...days].sort((a, b) => b.average - a.average)[0];
		out.push({ tone: 'info', text: `You usually spend the most on ${top.day}s (about ${inr(top.average)} a day).` });
	}

	if (income > 0) {
		const rate = ((income - spent) / income) * 100;
		if (rate >= 20) out.push({ tone: 'good', text: `You saved ${rate.toFixed(0)}% of your income this month. Nice.` });
		else if (rate < 0) out.push({ tone: 'warn', text: `You spent ${inr(spent - income)} more than you earned this month.` });
	}

	if (budget) {
		if (budget.status === 'over') {
			out.push({ tone: 'warn', text: `You are over budget by ${inr(-budget.remaining)}.` });
		} else if (budget.daysElapsed > 0 && budget.daysLeft > 0) {
			if (budget.projected > budget.limit) {
				out.push({ tone: 'warn', text: `At this pace you will spend about ${inr(budget.projected)} — ${inr(budget.projected - budget.limit)} over your budget. Try to stay under ${inr(budget.safePerDay)} a day.` });
			} else {
				out.push({ tone: 'good', text: `You are on track. You can spend about ${inr(budget.safePerDay)} a day and stay within budget.` });
			}
		}
	}

	return out;
}
