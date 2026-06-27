import { openDB, type IDBPDatabase } from 'idb';
import type { Transaction, Budget } from '../types';
import { DEFAULT_CATEGORIES, DEFAULT_ACCOUNTS } from '../types';

// ── Database Config ──

const DB_NAME = 'budget-tracker-db';
const DB_VERSION = 1;

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
			upgrade(db) {
				// Transactions store
				const txStore = db.createObjectStore(TRANSACTIONS, { keyPath: 'id' });
				txStore.createIndex('date', 'date');
				txStore.createIndex('monthKey', 'date'); // we'll slice 'YYYY-MM' at query time

				// Budgets store
				db.createObjectStore(BUDGETS, { keyPath: 'monthKey' });

				// Categories store (simple value store)
				db.createObjectStore(CATEGORIES, { keyPath: 'name' });

				// Accounts store (simple value store)
				db.createObjectStore(ACCOUNTS, { keyPath: 'name' });
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

export async function addTransaction(transaction: Transaction): Promise<void> {
	const db = await getDb();
	await db.put(TRANSACTIONS, transaction);
}

export async function deleteTransaction(id: string): Promise<void> {
	const db = await getDb();
	await db.delete(TRANSACTIONS, id);
}

// ── Budgets ──

export async function getBudget(monthKey: string): Promise<Budget | undefined> {
	const db = await getDb();
	return db.get(BUDGETS, monthKey);
}

export async function saveBudget(budget: Budget): Promise<void> {
	const db = await getDb();
	await db.put(BUDGETS, budget);
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
