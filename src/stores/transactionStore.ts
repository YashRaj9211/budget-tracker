import { create } from 'zustand';
import type { Transaction, DayGroup } from '../types';
import * as db from '../db';
import { toMonthKey, getDayName, getDayNum } from '../utils/date';

// ── State Shape ──

interface TransactionState {
	transactions: Transaction[];
	selectedYear: number;
	selectedMonth: number; // 0-indexed
	isLoading: boolean;

	// Actions
	loadMonth: (year: number, month: number) => Promise<void>;
	setSelectedMonth: (year: number, month: number) => Promise<void>;
	addTransaction: (data: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>;
	deleteTransaction: (id: string) => Promise<void>;
	editTransaction: (id: string, data: Partial<Transaction>) => Promise<void>;
}

// ── Store ──

export const useTransactionStore = create<TransactionState>((set, get) => ({
	transactions: [],
	selectedYear: new Date().getFullYear(),
	selectedMonth: new Date().getMonth(),
	isLoading: false,

	async loadMonth(year, month) {
		set({ isLoading: true });
		const monthKey = toMonthKey(year, month);
		const transactions = await db.getTransactionsByMonth(monthKey);
		// Sort newest first within each day, days descending
		transactions.sort((a, b) => b.createdAt - a.createdAt);
		set({ transactions, selectedYear: year, selectedMonth: month, isLoading: false });
	},

	async setSelectedMonth(year, month) {
		set({ selectedYear: year, selectedMonth: month });
		await get().loadMonth(year, month);
	},

	async addTransaction(data) {
		const transaction: Transaction = {
			...data,
			id: crypto.randomUUID(),
			createdAt: Date.now(),
		};
		await db.addTransaction(transaction);
		// Reload if the transaction belongs to the currently viewed month
		const { selectedYear, selectedMonth } = get();
		const txMonthKey = data.date.slice(0, 7); // 'YYYY-MM'
		if (txMonthKey === toMonthKey(selectedYear, selectedMonth)) {
			await get().loadMonth(selectedYear, selectedMonth);
		}
	},

	async deleteTransaction(_id) {
		// TODO: implement later
	},

	async editTransaction(_id, _data) {
		// TODO: implement later
	},
}));

// ── Derived Selectors ──

/** Group transactions by date, sorted by date descending. */
export function useDayGroups(): DayGroup[] {
	const transactions = useTransactionStore((s) => s.transactions);

	const groupMap = new Map<string, Transaction[]>();
	for (const t of transactions) {
		const list = groupMap.get(t.date) ?? [];
		list.push(t);
		groupMap.set(t.date, list);
	}

	const groups: DayGroup[] = [];
	for (const [date, txns] of groupMap) {
		groups.push({
			date,
			dayNum: getDayNum(date),
			dayName: getDayName(date),
			transactions: txns,
			income: txns.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
			expense: txns.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
		});
	}

	// Sort by date descending (newest day first)
	groups.sort((a, b) => b.date.localeCompare(a.date));
	return groups;
}

/** Monthly totals for the current selection. */
export function useMonthlyTotals(): { income: number; expense: number } {
	const transactions = useTransactionStore((s) => s.transactions);
	let income = 0;
	let expense = 0;
	for (const t of transactions) {
		if (t.type === 'income') income += t.amount;
		else expense += t.amount;
	}
	return { income, expense };
}
