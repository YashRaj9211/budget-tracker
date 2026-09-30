import { describe, it, expect } from 'vitest';
import {
	percentChange,
	monthlyTrend,
	categoryTotals,
	compareCategories,
	dailySeries,
	weekdayTotals,
	budgetProgress,
	budgetBurn,
	buildInsights,
} from './analytics';
import type { Budget, Transaction } from '../types';

let n = 0;
const tx = (date: string, amount: number, type: 'income' | 'expense' = 'expense', category = 'Food'): Transaction => ({
	id: String(++n),
	type,
	amount,
	description: '',
	category,
	account: 'Cash',
	date,
	createdAt: 0,
});

describe('percentChange', () => {
	it('calculates growth and drop', () => {
		expect(percentChange(150, 100)).toBe(50);
		expect(percentChange(50, 100)).toBe(-50);
	});
	it('returns null when there is nothing to compare with', () => {
		expect(percentChange(100, 0)).toBeNull();
	});
});

describe('monthlyTrend', () => {
	it('returns N months, oldest first, including empty months', () => {
		const all = [tx('2026-09-05', 100), tx('2026-09-10', 1000, 'income'), tx('2026-07-01', 40)];
		const t = monthlyTrend(all, 2026, 8, 3); // Sep 2026
		expect(t.map((p) => p.key)).toEqual(['2026-07', '2026-08', '2026-09']);
		expect(t[0].expense).toBe(40);
		expect(t[1].expense).toBe(0);
		expect(t[2]).toMatchObject({ expense: 100, income: 1000, savings: 900, savingsRate: 90 });
	});
	it('handles the year boundary', () => {
		const t = monthlyTrend([], 2026, 0, 2);
		expect(t.map((p) => p.key)).toEqual(['2025-12', '2026-01']);
	});
});

describe('categories', () => {
	it('totals and shares, biggest first', () => {
		const c = categoryTotals([tx('2026-09-01', 300, 'expense', 'Food'), tx('2026-09-02', 100, 'expense', 'Travel'), tx('2026-09-03', 999, 'income')]);
		expect(c).toEqual([
			{ name: 'Food', amount: 300, share: 75 },
			{ name: 'Travel', amount: 100, share: 25 },
		]);
	});
	it('compares two periods, including categories that only exist in one', () => {
		const cur = [tx('2026-09-01', 200, 'expense', 'Food')];
		const prev = [tx('2026-08-01', 100, 'expense', 'Food'), tx('2026-08-02', 50, 'expense', 'Travel')];
		const r = compareCategories(cur, prev);
		expect(r.find((x) => x.name === 'Food')).toMatchObject({ current: 200, previous: 100, change: 100 });
		expect(r.find((x) => x.name === 'Travel')).toMatchObject({ current: 0, previous: 50, change: -100 });
	});
});

describe('dailySeries', () => {
	it('has a point for every day and a running total', () => {
		const d = dailySeries([tx('2026-02-01', 10), tx('2026-02-03', 5)], 2026, 1);
		expect(d).toHaveLength(28);
		expect(d[0].cumulative).toBe(10);
		expect(d[1]).toMatchObject({ spent: 0, cumulative: 10 });
		expect(d[27].cumulative).toBe(15);
	});
});

describe('weekdayTotals', () => {
	it('puts spending on the right weekday (Monday first)', () => {
		// 2026-09-28 is a Monday, 2026-09-27 is a Sunday
		const w = weekdayTotals([tx('2026-09-28', 100), tx('2026-09-28', 50), tx('2026-09-27', 30)]);
		expect(w[0]).toMatchObject({ day: 'Mon', total: 150, average: 150, count: 1 });
		expect(w[6]).toMatchObject({ day: 'Sun', total: 30 });
	});
});

describe('budget', () => {
	const budget: Budget = { id: 'b', startDate: '2026-09-01', endDate: '2026-09-10', totalLimit: 1000, alertThreshold: 80 };

	it('calculates progress and projection', () => {
		const p = budgetProgress(budget, [tx('2026-09-01', 300), tx('2026-09-02', 200), tx('2026-08-31', 999)], '2026-09-05');
		expect(p).toMatchObject({ spent: 500, remaining: 500, percentUsed: 50, totalDays: 10, daysElapsed: 5, daysLeft: 5, idealPerDay: 100, averagePerDay: 100, projected: 1000, safePerDay: 100 });
		expect(p.status).toBe('safe');
	});
	it('warns when the pace will go over the limit', () => {
		const p = budgetProgress(budget, [tx('2026-09-01', 700)], '2026-09-03');
		expect(p.projected).toBeGreaterThan(1000);
		expect(p.status).toBe('watch');
	});
	it('flags over budget', () => {
		const p = budgetProgress(budget, [tx('2026-09-01', 1200)], '2026-09-04');
		expect(p.status).toBe('over');
		expect(p.remaining).toBe(-200);
	});
	it('handles a budget that has not started or already ended', () => {
		expect(budgetProgress(budget, [], '2026-08-20')).toMatchObject({ daysElapsed: 0, projected: 0 });
		expect(budgetProgress(budget, [], '2026-10-20')).toMatchObject({ daysElapsed: 10, daysLeft: 0, safePerDay: 0 });
	});
	it('burn-down has an even pace line and stops "actual" at today', () => {
		const b = budgetBurn(budget, [tx('2026-09-01', 100), tx('2026-09-02', 100)], '2026-09-02');
		expect(b).toHaveLength(10);
		expect(b[0]).toMatchObject({ ideal: 100, actual: 100 });
		expect(b[1]).toMatchObject({ ideal: 200, actual: 200 });
		expect(b[2].actual).toBeNull();
		expect(b[9].ideal).toBe(1000);
	});
});

describe('buildInsights', () => {
	it('says so when there is no spending', () => {
		expect(buildInsights({ current: [], previous: [] })[0].text).toMatch(/No spending/);
	});
	it('explains the change from last month in plain words', () => {
		const out = buildInsights({ current: [tx('2026-09-01', 150)], previous: [tx('2026-08-01', 100)] });
		expect(out.some((i) => i.tone === 'warn' && /50% more/.test(i.text))).toBe(true);
		expect(out.some((i) => /Food is your biggest category/.test(i.text))).toBe(true);
	});
});
