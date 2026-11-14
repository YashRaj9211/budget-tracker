import { DEFAULT_CATEGORIES, DEFAULT_ACCOUNTS, type Transaction } from '../types';

export const transactionsInitialState = {
	transactions: [],
	allTransactions: [],
	selectedYear: new Date().getFullYear(),
	selectedMonth: new Date().getMonth(),
	isLoading: false,
	loadError: null as string | null,
	editingTransaction: null as Transaction | null,
};

export const budgetsInitialState = {
	activeBudget: null,
	allBudgets: [],
	categories: [...DEFAULT_CATEGORIES],
	accounts: [...DEFAULT_ACCOUNTS],
	isLoading: false,
};