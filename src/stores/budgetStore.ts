import { create } from 'zustand';
import type { Budget } from '../types';
import * as db from '../db';

// ── State Shape ──

interface BudgetState {
	currentBudget: Budget | null;
	categories: string[];
	accounts: string[];
	isLoading: boolean;

	// Actions
	loadBudget: (monthKey: string) => Promise<void>;
	saveBudget: (budget: Budget) => Promise<void>;
	loadCategories: () => Promise<void>;
	addCategory: (name: string) => Promise<void>;
	deleteCategory: (name: string) => Promise<void>;
	loadAccounts: () => Promise<void>;
	addAccount: (name: string) => Promise<void>;
	deleteAccount: (name: string) => Promise<void>;
}

// ── Store ──

export const useBudgetStore = create<BudgetState>((set, get) => ({
	currentBudget: null,
	categories: [],
	accounts: [],
	isLoading: false,

	async loadBudget(monthKey) {
		set({ isLoading: true });
		const budget = await db.getBudget(monthKey);
		set({ currentBudget: budget ?? null, isLoading: false });
	},

	async saveBudget(budget) {
		await db.saveBudget(budget);
		set({ currentBudget: budget });
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
