// ── Types & Interfaces ──

export type TransactionType = 'income' | 'expense';

export interface Transaction {
	id: string;
	type: TransactionType;
	amount: number;
	description: string;
	category: string;
	account: string;
	date: string; // 'YYYY-MM-DD'
	createdAt: number; // Date.now()
}

export interface Budget {
	monthKey: string; // 'YYYY-MM' — also the primary key
	monthlyLimit: number;
	alertThreshold: number; // 50 | 80 | 90 | 100
}

export interface DayGroup {
	date: string; // 'YYYY-MM-DD'
	dayNum: number;
	dayName: string;
	transactions: Transaction[];
	income: number;
	expense: number;
}

// ── Defaults ──

export const DEFAULT_CATEGORIES = [
	'Food',
	'Travel',
	'Entertainment',
	'Utilities',
	'Other',
];

export const DEFAULT_ACCOUNTS = ['GPay', 'Cash', 'Card'];
