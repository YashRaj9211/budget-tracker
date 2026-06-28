import { openDB, type IDBPDatabase } from 'idb';
import type { Transaction, Budget } from '../types';
import { DEFAULT_CATEGORIES, DEFAULT_ACCOUNTS } from '../types';

// ── Database Config ──

const DB_NAME = 'budget-tracker-db';
const DB_VERSION = 2; // bumped: budgets store now keyed by 'id'

// Store names
const TRANSACTIONS = 'transactions';
const BUDGETS = 'budgets';
const CATEGORIES = 'categories';
const ACCOUNTS = 'accounts';

// ── Open / Upgrade ──

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
	if (!dbPromise) {
		dbPromise = openDB(DB_NAME, DB_VERSION, {
			upgrade(db, oldVersion) {
				// ── v1 → base schema ──
				if (oldVersion < 1) {
					const txStore = db.createObjectStore(TRANSACTIONS, { keyPath: 'id' });
					txStore.createIndex('date', 'date');
					txStore.createIndex('monthKey', 'date');

					db.createObjectStore(BUDGETS, { keyPath: 'monthKey' });

					db.createObjectStore(CATEGORIES, { keyPath: 'name' });
					db.createObjectStore(ACCOUNTS, { keyPath: 'name' });
				}

				// ── v2 → migrate budgets store to use 'id' as keyPath ──
				if (oldVersion < 2) {
					// Drop old month-key budget store if it exists
					if (db.objectStoreNames.contains(BUDGETS)) {
						db.deleteObjectStore(BUDGETS);
					}
					// Create new budget store keyed by UUID
					const budgetStore = db.createObjectStore(BUDGETS, { keyPath: 'id' });
					budgetStore.createIndex('startDate', 'startDate');
				}
			},
		});
	}
	return dbPromise;
}

// ── Transactions ──

export async function getAllTransactions(): Promise<Transaction[]> {
	const db = await getDb();
	return db.getAll(TRANSACTIONS);
}

export async function getTransactionsByMonth(monthKey: string): Promise<Transaction[]> {
	const db = await getDb();
	const all = await db.getAll(TRANSACTIONS);
	return all.filter((t) => t.date.startsWith(monthKey));
}

export async function getTransactionsByDateRange(startDate: string, endDate: string): Promise<Transaction[]> {
	const db = await getDb();
	const all = await db.getAll(TRANSACTIONS);
	return all.filter((t) => t.date >= startDate && t.date <= endDate);
}

export async function addTransaction(transaction: Transaction): Promise<void> {
	const db = await getDb();
	await db.put(TRANSACTIONS, transaction);
}

export async function deleteTransaction(id: string): Promise<void> {
	const db = await getDb();
	await db.delete(TRANSACTIONS, id);
}

// ── Budgets ──

/** Get the budget whose date range contains `today` (first match wins). */
export async function getActiveBudget(today: string): Promise<Budget | undefined> {
	const db = await getDb();
	const all: Budget[] = await db.getAll(BUDGETS);
	return all.find((b) => today >= b.startDate && today <= b.endDate);
}

/** Get all saved budgets, sorted by startDate descending. */
export async function getAllBudgets(): Promise<Budget[]> {
	const db = await getDb();
	const all: Budget[] = await db.getAll(BUDGETS);
	return all.sort((a, b) => b.startDate.localeCompare(a.startDate));
}

export async function saveBudget(budget: Budget): Promise<void> {
	const db = await getDb();
	await db.put(BUDGETS, budget);
}

export async function deleteBudget(id: string): Promise<void> {
	const db = await getDb();
	await db.delete(BUDGETS, id);
}

// ── Categories ──

export async function getCategories(): Promise<string[]> {
	const db = await getDb();
	const rows = await db.getAll(CATEGORIES);
	return rows.map((r) => r.name);
}

export async function addCategory(name: string): Promise<void> {
	const db = await getDb();
	await db.put(CATEGORIES, { name });
}

export async function deleteCategory(name: string): Promise<void> {
	const db = await getDb();
	await db.delete(CATEGORIES, name);
}

/** Seed default categories if store is empty. */
export async function seedCategories(): Promise<void> {
	const db = await getDb();
	const count = await db.count(CATEGORIES);
	if (count === 0) {
		const tx = db.transaction(CATEGORIES, 'readwrite');
		for (const name of DEFAULT_CATEGORIES) {
			tx.store.put({ name });
		}
		await tx.done;
	}
}

// ── Accounts ──

export async function getAccounts(): Promise<string[]> {
	const db = await getDb();
	const rows = await db.getAll(ACCOUNTS);
	return rows.map((r) => r.name);
}

export async function addAccount(name: string): Promise<void> {
	const db = await getDb();
	await db.put(ACCOUNTS, { name });
}

export async function deleteAccount(name: string): Promise<void> {
	const db = await getDb();
	await db.delete(ACCOUNTS, name);
}

/** Seed default accounts if store is empty. */
export async function seedAccounts(): Promise<void> {
	const db = await getDb();
	const count = await db.count(ACCOUNTS);
	if (count === 0) {
		const tx = db.transaction(ACCOUNTS, 'readwrite');
		for (const name of DEFAULT_ACCOUNTS) {
			tx.store.put({ name });
		}
		await tx.done;
	}
}

// ── Init ──

/** Call once on app startup to seed defaults. */
export async function initDb(): Promise<void> {
	await seedCategories();
	await seedAccounts();
}
