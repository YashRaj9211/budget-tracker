import { describe, it, expect } from 'vitest';
import { calculateGroupBalances, toPaise } from './debtSimplification';
import type { SplitExpense } from '../types/split';

const base = { groupId: 'g', date: '2026-01-01', createdAt: 0 };

describe('toPaise', () => {
	it('avoids floating point drift', () => {
		expect(toPaise(0.1 + 0.2)).toBe(30);
		expect(toPaise('19.99')).toBe(1999);
		expect(toPaise('abc')).toBe(0);
	});
});

describe('calculateGroupBalances', () => {
	it('splits 100 between three people without losing a paisa', () => {
		const splits: SplitExpense[] = [
			{ ...base, id: '1', title: 'Dinner', amount: 100, paidBy: 'You', splitAmong: ['You', 'A', 'B'] },
		];
		const { memberBalances, debts } = calculateGroupBalances(['You', 'A', 'B'], splits);
		const total = memberBalances.reduce((sum, m) => sum + Math.round(m.netAmount * 100), 0);
		expect(total).toBe(0); // everything adds up to zero
		expect(memberBalances.find((m) => m.member === 'You')?.netAmount).toBe(66.66);
		expect(debts.reduce((sum, d) => sum + d.amount, 0)).toBeCloseTo(66.66, 2);
	});

	it('keeps two members with the same name separate when IDs are known', () => {
		const splits: SplitExpense[] = [
			{
				...base,
				id: '1',
				title: 'Taxi',
				amount: 100,
				paidBy: 'Sam',
				paidById: 'sam-1',
				splitAmong: ['Sam', 'Sam (2)'],
				splitAmongIds: ['sam-1', 'sam-2'],
			},
		];
		const { memberBalances } = calculateGroupBalances([], splits, { 'sam-1': 'Sam', 'sam-2': 'Sam (2)' });
		expect(memberBalances.find((m) => m.memberId === 'sam-1')?.netAmount).toBe(50);
		expect(memberBalances.find((m) => m.memberId === 'sam-2')?.netAmount).toBe(-50);
	});

	it('does not merge two different people who have the exact same name', () => {
		const splits: SplitExpense[] = [
			{
				...base,
				id: '1',
				title: 'Lunch',
				amount: 60,
				paidBy: 'Sam',
				paidById: 'a',
				splitAmong: ['Sam', 'Sam'],
				splitAmongIds: ['a', 'b'],
			},
		];
		const { memberBalances } = calculateGroupBalances([], splits);
		expect(memberBalances).toHaveLength(2);
	});

	it('a settlement cancels the debt', () => {
		const splits: SplitExpense[] = [
			{ ...base, id: '1', title: 'Trip', amount: 100, paidBy: 'You', splitAmong: ['A'] },
			{ ...base, id: '2', title: 'Settlement', amount: 100, paidBy: 'A', splitAmong: ['You'], isSettlement: true },
		];
		const { memberBalances, debts } = calculateGroupBalances(['You', 'A'], splits);
		expect(memberBalances.every((m) => m.netAmount === 0)).toBe(true);
		expect(debts).toHaveLength(0);
	});

	it('works with names only (guest mode)', () => {
		const splits: SplitExpense[] = [
			{ ...base, id: '1', title: 'Snacks', amount: 40, paidBy: 'A', splitAmong: ['You', 'A'] },
		];
		const { debts } = calculateGroupBalances(['You', 'A'], splits);
		expect(debts).toEqual([{ from: 'You', fromId: undefined, to: 'A', toId: undefined, amount: 20 }]);
	});
});
