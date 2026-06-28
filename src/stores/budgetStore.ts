import { create } from 'zustand';
import type { Budget } from '../types';
import * as db from '../db';

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
	activeBudget: null,
	allBudgets: [],
	categories: [],
	accounts: [],
	isLoading: false,

	async loadActiveBudget(today) {
		set({ isLoading: true });
		const budget = await db.getActiveBudget(today);
		set({ activeBudget: budget ?? null, isLoading: false });
	},

	async loadAllBudgets() {
		const budgets = await db.getAllBudgets();
		set({ allBudgets: budgets });
	},

	async saveBudget(budget) {
		await db.saveBudget(budget);
		// Refresh both lists
		await get().loadAllBudgets();
		// Re-check if the saved budget is now the active one
		const { todayStr } = await import('../utils/date');
		await get().loadActiveBudget(todayStr());
	},

	async deleteBudget(id) {
		await db.deleteBudget(id);
		set((s) => ({
			allBudgets: s.allBudgets.filter((b) => b.id !== id),
			// If the deleted budget was the active one, clear it
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
