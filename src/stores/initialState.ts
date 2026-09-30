import { DEFAULT_CATEGORIES, DEFAULT_ACCOUNTS } from '../types';

export const transactionsInitialState = {
	transactions: [],
	allTransactions: [],
	selectedYear: new Date().getFullYear(),
	selectedMonth: new Date().getMonth(),
	isLoading: false,
};

export const budgetsInitialState = {
	activeBudget: null,
	allBudgets: [],
	categories: [...DEFAULT_CATEGORIES],
	accounts: [...DEFAULT_ACCOUNTS],
	isLoading: false,
};