import { create } from 'zustand';
import type { Budget } from '../types';
import * as db from '../db';
import { todayStr } from '../utils/date';
import { budgetsInitialState } from './initialState';
import { budgetApi } from '../api/financeHubApi';
import { useAuthStore } from './authStore';
import { syncService } from '../services/syncService';

// ── State Shape ──

interface BudgetState {
	activeBudget: Budget | null; // budget active for today
	allBudgets: Budget[]; // all saved budgets (for settings page)
	categories: string[];
	accounts: string[];
	isLoading: boolean;

	// Actions
	loadActiveBudget: (today: string) => Promise<void>;
	loadAllBudgets: () => Promise<void>;
	saveBudget: (budget: Budget) => Promise<void>;
	deleteBudget: (id: string) => Promise<void>;
	loadCategories: () => Promise<void>;
	addCategory: (name: string) => Promise<void>;
	deleteCategory: (name: string) => Promise<void>;
	loadAccounts: () => Promise<void>;
	addAccount: (name: string) => Promise<void>;
	deleteAccount: (name: string) => Promise<void>;
}

// ── Store ──

export const useBudgetStore = create<BudgetState>((set, get) => ({
	...budgetsInitialState,

	async loadActiveBudget(today) {
		set({ isLoading: true });
		const budget = await db.getActiveBudget(today);
		set({ activeBudget: budget ?? null, isLoading: false });
	},

	async loadAllBudgets() {
		const auth = useAuthStore.getState();
		if (auth.isAuthenticated && navigator.onLine) {
			try {
				const serverBudgets = await budgetApi.getAll();
				const serverBudgetIds = new Set<string>(serverBudgets.map((sb) => sb.id));
				const localBudgets = await db.getAllBudgets();

				for (const lb of localBudgets) {
					const isSynced = !!lb.serverId || lb.syncStatus === 'synced';
					const matchesServer = (lb.serverId && serverBudgetIds.has(lb.serverId)) || serverBudgetIds.has(lb.id);
					if (isSynced && !matchesServer && lb.syncStatus !== 'pending') {
						await db.deleteBudget(lb.id);
					}
				}

				for (const sb of serverBudgets) {
					const localBudget: Budget = {
						id: sb.id,
						startDate: sb.startDate ? sb.startDate.slice(0, 10) : '',
						endDate: sb.endDate ? sb.endDate.slice(0, 10) : '',
						totalLimit: parseFloat(String(sb.amount)) || 0,
						alertThreshold: sb.alertThreshold ?? 80,
						syncStatus: 'synced',
						serverId: sb.id,
					};
					await db.saveBudget(localBudget);
				}
			} catch (err) {
				console.warn('[budgetStore] Could not fetch server budgets. Using local data:', err);
			}
		}

		const budgets = await db.getAllBudgets();
		set({ allBudgets: budgets });
	},

	async saveBudget(budget) {
		const toSave: Budget = {
			...budget,
			syncStatus: 'pending',
		};
		await db.saveBudget(toSave);

		const auth = useAuthStore.getState();
		if (auth.isAuthenticated && navigator.onLine) {
			try {
				const created = await budgetApi.create({
					id: budget.id,
					amount: budget.totalLimit,
					startDate: budget.startDate,
					endDate: budget.endDate,
					alertThreshold: budget.alertThreshold,
				});
				toSave.syncStatus = 'synced';
				toSave.serverId = created.id;
				await db.saveBudget(toSave);
			} catch (err) {
				console.warn('[budgetStore] Cloud save failed. Enqueuing:', err);
				await syncService.enqueue({
					entityType: 'budget',
					action: 'create',
					recordId: budget.id,
					payload: budget,
				});
			}
		} else {
			await syncService.enqueue({
				entityType: 'budget',
				action: 'create',
				recordId: budget.id,
				payload: budget,
			});
		}

		// Refresh both lists
		await get().loadAllBudgets();
		// Re-check if the saved budget is now the active one
		await get().loadActiveBudget(todayStr());
	},

	async deleteBudget(id) {
		const existing = (await db.getAllBudgets()).find((b) => b.id === id);
		const serverId = existing?.serverId || id;

		const auth = useAuthStore.getState();
		if (auth.isAuthenticated && navigator.onLine) {
			try {
				await budgetApi.delete(serverId);
			} catch (err) {
				console.warn('[budgetStore] Cloud delete failed. Enqueuing:', err);
				await syncService.enqueue({
					entityType: 'budget',
					action: 'delete',
					recordId: id,
					payload: { serverId },
				});
			}
		} else {
			await syncService.enqueue({
				entityType: 'budget',
				action: 'delete',
				recordId: id,
				payload: { serverId },
			});
		}

		await db.deleteBudget(id);
		set((s) => ({
			allBudgets: s.allBudgets.filter((b) => b.id !== id),
			activeBudget: s.activeBudget?.id === id ? null : s.activeBudget,
		}));
	},

	async loadCategories() {
		const categories = await db.getCategories();
		set({ categories });
	},

	async addCategory(name) {
		const trimmed = name.trim();
		if (!trimmed || get().categories.includes(trimmed)) return;
		await db.addCategory(trimmed);
		set((s) => ({ categories: [...s.categories, trimmed] }));
	},

	async deleteCategory(name) {
		await db.deleteCategory(name);
		set((s) => ({ categories: s.categories.filter((c) => c !== name) }));
	},

	async loadAccounts() {
		const accounts = await db.getAccounts();
		set({ accounts });
	},

	async addAccount(name) {
		const trimmed = name.trim();
		if (!trimmed || get().accounts.includes(trimmed)) return;
		await db.addAccount(trimmed);
		set((s) => ({ accounts: [...s.accounts, trimmed] }));
	},

	async deleteAccount(name) {
		await db.deleteAccount(name);
		set((s) => ({ accounts: s.accounts.filter((a) => a !== name) }));
	},
}));
