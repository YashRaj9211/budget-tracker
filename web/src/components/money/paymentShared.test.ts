import { describe, expect, it } from 'vitest';
import { getAccountDeduction, linkedBalanceAdjustment } from './paymentShared';
import type { PaymentMethod } from '../../stores/paymentMethodStore';
import type { SavingsAccount } from '../../api/financeHubApi';
import type { Transaction } from '../../types';

const acc = { id: 'a1', name: 'HDFC', balance: '10000', openingBalance: '10000' } as unknown as SavingsAccount;
const tx = (id: string, account: string, amount: number, date: string, type: 'expense' | 'income' = 'expense') =>
	({ id, account, amount, date, type, description: '', category: '', createdAt: 0 }) as Transaction;
const method = (over: Partial<PaymentMethod> = {}): PaymentMethod => ({
	id: 'm1',
	name: 'GPay',
	kind: 'UPI',
	linkedAccountIds: ['a1'],
	transactionAccounts: ['GPay'],
	createdAt: 0,
	...over,
});

const txs = [
	tx('1', 'GPay', 500, '2026-10-01'),
	tx('2', 'GPay', 200, '2026-11-10'),
	tx('3', 'GPay', 100, '2026-11-12', 'income'),
	tx('4', 'Cash', 999, '2026-11-12'),
];

describe('getAccountDeduction', () => {
	it('legacy link (no date) counts all history', () => {
		const d = getAccountDeduction(acc, [method()], txs);
		expect(d.totalSpent).toBe(700);
		expect(d.deductedBalance).toBe(10000 - 700 + 100);
	});
	it('only counts transactions on/after the link date', () => {
		const d = getAccountDeduction(acc, [method({ linkDates: { a1: '2026-11-10' } })], txs);
		expect(d.totalSpent).toBe(200);
		expect(d.totalIncome).toBe(100);
		expect(d.deductedBalance).toBe(9900);
	});
	it('ignores unlinked methods and other tags', () => {
		const d = getAccountDeduction(acc, [method({ linkedAccountIds: [] })], txs);
		expect(d.deductedBalance).toBe(10000);
	});
	it('sums the adjustment across accounts', () => {
		expect(linkedBalanceAdjustment([acc], [method({ linkDates: { a1: '2026-11-10' } })], txs)).toBe(-100);
	});
});

describe('paymentMethodStore link dates', () => {
	it('links with default/explicit/null dates, unlink and relink clean linkDates', async () => {
		const { usePaymentMethodStore } = await import('../../stores/paymentMethodStore');
		const s = usePaymentMethodStore;
		s.getState().addMethod({ name: 'T', kind: 'UPI', linkedAccountIds: [], transactionAccounts: [] });
		const id = s.getState().methods[0].id;
		const m = () => s.getState().methods.find((x) => x.id === id)!;
		s.getState().linkAccount(id, 'a1');
		expect(m().linkDates?.a1).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		s.getState().unlinkAccount(id, 'a1');
		expect(m().linkDates?.a1).toBeUndefined();
		s.getState().linkAccount(id, 'a1', null);
		expect(m().linkedAccountIds).toEqual(['a1']);
		expect(m().linkDates?.a1).toBeUndefined();
		s.getState().unlinkAccount(id, 'a1');
		s.getState().linkAccount(id, 'a1', '2026-01-01');
		expect(m().linkDates?.a1).toBe('2026-01-01');
	});
});
