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
	syncStatus?: 'synced' | 'pending';
	serverId?: string;
}

export * from './sync';

export interface Budget {
	id: string; // UUID — primary key
	startDate: string; // 'YYYY-MM-DD'
	endDate: string; // 'YYYY-MM-DD'
	totalLimit: number;
	alertThreshold: number; // 50 | 80 | 90 | 100
	syncStatus?: 'synced' | 'pending';
	serverId?: string;
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

// ── Global Window Augmentations ──

declare global {
	interface Window {
		hideSplashScreen?: () => void;
	}
}
