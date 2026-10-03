import { create } from 'zustand';
import type { Transaction, DayGroup } from '../types';
import * as db from '../db';
import { toMonthKey, getDayName, getDayNum } from '../utils/date';
import { transactionsInitialState } from './initialState';
import { expenseApi } from '../api/financeHubApi';
import { useAuthStore } from './authStore';
import { syncService } from '../services/syncService';

// ── State Shape ──

interface TransactionState {
	transactions: Transaction[]; // current month's transactions
	allTransactions: Transaction[]; // all transactions (for date-range budget calculations)
	selectedYear: number;
	selectedMonth: number; // 0-indexed
	isLoading: boolean;


	// Actions
	loadMonth: (year: number, month: number) => Promise<void>;
	loadAllTransactions: () => Promise<void>;
	setSelectedMonth: (year: number, month: number) => Promise<void>;
	addTransaction: (data: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>;
	deleteTransaction: (id: string) => Promise<void>;
	editTransaction: (id: string, data: Partial<Transaction>) => Promise<void>;
	reloadAll: () => Promise<void>;
}

// ── Store ──

export const useTransactionStore = create<TransactionState>((set, get) => ({
	//all the initial states here
	...transactionsInitialState,

	async loadMonth(year, month) {
		set({ isLoading: true });
		const monthKey = toMonthKey(year, month);
		const transactions = await db.getTransactionsByMonth(monthKey);
		// Sort newest first within each day, days descending
		transactions.sort((a, b) => b.createdAt - a.createdAt);
		set({ transactions, selectedYear: year, selectedMonth: month, isLoading: false });
	},

	async loadAllTransactions() {
		const all = await db.getAllTransactions();
		set({ allTransactions: all });
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
			syncStatus: 'pending',
		};
		// Save locally immediately for 100% offline-first availability
		await db.addTransaction(transaction);

		// If online and authenticated, attempt immediate cloud sync
		const auth = useAuthStore.getState();
		if (auth.isAuthenticated && navigator.onLine) {
			try {
				const created = await expenseApi.create({
					type: data.type === 'income' ? 'INCOME' : 'PERSONAL',
					amount: data.amount,
					description: data.description || 'Personal Transaction',
					currency: 'INR',
					expenseDate: data.date ? new Date(data.date).toISOString() : new Date().toISOString(),
				});
				transaction.syncStatus = 'synced';
				transaction.serverId = created.id;
				await db.addTransaction(transaction);
			} catch (err) {
				console.warn('[transactionStore] Immediate sync failed. Enqueuing for background sync:', err);
				await syncService.enqueue({
					entityType: 'transaction',
					action: 'create',
					recordId: transaction.id,
					payload: transaction,
				});
			}
		} else {
			// Enqueue for background sync once online/authenticated
			await syncService.enqueue({
				entityType: 'transaction',
				action: 'create',
				recordId: transaction.id,
				payload: transaction,
			});
		}

		// Reload current month if the transaction belongs to it
		const { selectedYear, selectedMonth } = get();
		const txMonthKey = data.date.slice(0, 7); // 'YYYY-MM'
		if (txMonthKey === toMonthKey(selectedYear, selectedMonth)) {
			await get().loadMonth(selectedYear, selectedMonth);
		}
		// Always refresh allTransactions so the budget card stays in sync
		await get().loadAllTransactions();
	},

	async deleteTransaction(id) {
		const existing = await db.getTransaction(id);
		if (existing?.serverId) {
			const auth = useAuthStore.getState();
			if (auth.isAuthenticated && navigator.onLine) {
				try {
					await expenseApi.delete(existing.serverId);
				} catch (err) {
					console.warn('[transactionStore] Cloud delete failed. Enqueuing:', err);
					await syncService.enqueue({
						entityType: 'transaction',
						action: 'delete',
						recordId: id,
						payload: { serverId: existing.serverId },
					});
				}
			} else {
				await syncService.enqueue({
					entityType: 'transaction',
					action: 'delete',
					recordId: id,
					payload: { serverId: existing.serverId },
				});
			}
		}

		await db.deleteTransaction(id);
		const { selectedYear, selectedMonth } = get();
		await get().loadMonth(selectedYear, selectedMonth);
		await get().loadAllTransactions();
	},

	async editTransaction(id, data) {
		const existing = await db.getTransaction(id);
		if (!existing) throw new Error('Transaction not found');
		// id and createdAt never change; everything else can be edited
		const updated: Transaction = {
			...existing,
			...data,
			id: existing.id,
			createdAt: existing.createdAt,
			syncStatus: 'pending',
		};
		if (!(updated.amount > 0) || !updated.date) throw new Error('Amount and date are required');
		await db.addTransaction(updated); // IndexedDB "put" replaces the old record

		const auth = useAuthStore.getState();
		if (existing.serverId) {
			if (auth.isAuthenticated && navigator.onLine) {
				try {
					await expenseApi.update(existing.serverId, {
						amount: updated.amount,
						description: updated.description,
						expenseDate: updated.date ? new Date(updated.date).toISOString() : new Date().toISOString(),
					});
					updated.syncStatus = 'synced';
					await db.addTransaction(updated);
				} catch (err) {
					console.warn('[transactionStore] Cloud update failed. Enqueuing:', err);
					await syncService.enqueue({
						entityType: 'transaction',
						action: 'update',
						recordId: id,
						payload: { serverId: existing.serverId, ...updated },
					});
				}
			} else {
				await syncService.enqueue({
					entityType: 'transaction',
					action: 'update',
					recordId: id,
					payload: { serverId: existing.serverId, ...updated },
				});
			}
		} else {
			// Created offline, not yet synced: enqueue create
			await syncService.enqueue({
				entityType: 'transaction',
				action: 'create',
				recordId: id,
				payload: updated,
			});
		}

		await get().reloadAll();
	},

	async reloadAll() {
		const { selectedYear, selectedMonth } = get();
		await get().loadMonth(selectedYear, selectedMonth);
		await get().loadAllTransactions();
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

/** Today's expense total — used to show over/under daily allowance. */
export function useTodayExpense(todayDateStr: string): number {
	const allTransactions = useTransactionStore((s) => s.allTransactions);
	return allTransactions
		.filter((t) => t.type === 'expense' && t.date === todayDateStr)
		.reduce((sum, t) => sum + t.amount, 0);
}

/** Totals for transactions within a date range, drawn from the full allTransactions list. */
export function useDateRangeTotals(
	startDate: string | null | undefined,
	endDate: string | null | undefined,
): { income: number; expense: number } {
	const allTransactions = useTransactionStore((s) => s.allTransactions);
	if (!startDate || !endDate) return { income: 0, expense: 0 };
	let income = 0;
	let expense = 0;
	for (const t of allTransactions) {
		if (t.date >= startDate && t.date <= endDate) {
			if (t.type === 'income') income += t.amount;
			else expense += t.amount;
		}
	}
	return { income, expense };
}
