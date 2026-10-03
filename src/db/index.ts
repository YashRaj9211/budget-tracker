import { openDB, type IDBPDatabase } from 'idb';
import type { Transaction, Budget, SyncQueueItem } from '../types';
import type { Group, SplitExpense } from '../types/split';
import { DEFAULT_CATEGORIES, DEFAULT_ACCOUNTS } from '../types';

// ── Database Config ──

const DB_NAME = 'budget-tracker-db';
const DB_VERSION = 4; // bumped: added sync_queue store

// Store names
const TRANSACTIONS = 'transactions';
const BUDGETS = 'budgets';
const CATEGORIES = 'categories';
const ACCOUNTS = 'accounts';
const SPLIT_GROUPS = 'split_groups';
const SPLIT_EXPENSES = 'split_expenses';
const SYNC_QUEUE = 'sync_queue';

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

				// ── v3 → add split groups & expenses ──
				if (oldVersion < 3) {
					if (!db.objectStoreNames.contains(SPLIT_GROUPS)) {
						db.createObjectStore(SPLIT_GROUPS, { keyPath: 'id' });
					}
					if (!db.objectStoreNames.contains(SPLIT_EXPENSES)) {
						const splitStore = db.createObjectStore(SPLIT_EXPENSES, { keyPath: 'id' });
						splitStore.createIndex('groupId', 'groupId');
					}
				}

				// ── v4 → add sync queue ──
				if (oldVersion < 4) {
					if (!db.objectStoreNames.contains(SYNC_QUEUE)) {
						const syncStore = db.createObjectStore(SYNC_QUEUE, { keyPath: 'id' });
						syncStore.createIndex('createdAt', 'createdAt');
					}
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

export async function getTransaction(id: string): Promise<Transaction | undefined> {
	const db = await getDb();
	return db.get(TRANSACTIONS, id);
}

export async function addTransaction(transaction: Transaction): Promise<void> {
	const db = await getDb();
	await db.put(TRANSACTIONS, transaction);
}

export async function addTransactions(transactions: Transaction[]): Promise<void> {
	const db = await getDb();
	const tx = db.transaction(TRANSACTIONS, 'readwrite');
	for (const transaction of transactions) {
		tx.store.put(transaction);
	}
	await tx.done;
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

// ── Split Groups & Expenses ──

export async function getAllGroups(): Promise<Group[]> {
	const db = await getDb();
	const groups = await db.getAll(SPLIT_GROUPS);
	return groups.sort((a, b) => b.createdAt - a.createdAt);
}

export async function saveGroup(group: Group): Promise<void> {
	const db = await getDb();
	await db.put(SPLIT_GROUPS, group);
}

export async function deleteGroup(id: string): Promise<void> {
	const db = await getDb();
	await db.delete(SPLIT_GROUPS, id);
	// Delete associated splits as well
	const splits: SplitExpense[] = await db.getAllFromIndex(SPLIT_EXPENSES, 'groupId', id);
	const tx = db.transaction(SPLIT_EXPENSES, 'readwrite');
	for (const s of splits) {
		tx.store.delete(s.id);
	}
	await tx.done;
}

export async function getAllSplits(): Promise<SplitExpense[]> {
	const db = await getDb();
	const splits = await db.getAll(SPLIT_EXPENSES);
	return splits.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getSplitsByGroup(groupId: string): Promise<SplitExpense[]> {
	const db = await getDb();
	const splits: SplitExpense[] = await db.getAllFromIndex(SPLIT_EXPENSES, 'groupId', groupId);
	return splits.sort((a, b) => b.createdAt - a.createdAt);
}

export async function saveSplit(split: SplitExpense): Promise<void> {
	const db = await getDb();
	await db.put(SPLIT_EXPENSES, split);
}

export async function deleteSplit(id: string): Promise<void> {
	const db = await getDb();
	await db.delete(SPLIT_EXPENSES, id);
}

/** Seed demo split groups and expenses if store is empty. */
export async function seedSplitData(): Promise<void> {
	const db = await getDb();
	const groupCount = await db.count(SPLIT_GROUPS);
	if (groupCount === 0) {
		const sampleGroup1: Group = {
			id: 'demo-group-1',
			name: 'Goa Trip 🏖️',
			members: ['You', 'Alex', 'Sam', 'Rohan'],
			avatarColor: 'pastel-pink',
			createdAt: Date.now() - 86400000 * 5,
		};
		const sampleGroup2: Group = {
			id: 'demo-group-2',
			name: 'Roommates 🏠',
			members: ['You', 'Priya', 'Karan'],
			avatarColor: 'pastel-blue',
			createdAt: Date.now() - 86400000 * 10,
		};

		const today = new Date().toISOString().split('T')[0];

		const sampleSplits: SplitExpense[] = [
			{
				id: 'demo-split-1',
				groupId: 'demo-group-1',
				title: 'Beach Resort Booking',
				amount: 8000,
				paidBy: 'You',
				splitAmong: ['You', 'Alex', 'Sam', 'Rohan'],
				date: today,
				createdAt: Date.now() - 86400000 * 4,
			},
			{
				id: 'demo-split-2',
				groupId: 'demo-group-1',
				title: 'Shack Lunch & Drinks',
				amount: 2400,
				paidBy: 'Alex',
				splitAmong: ['You', 'Alex', 'Sam', 'Rohan'],
				date: today,
				createdAt: Date.now() - 86400000 * 3,
			},
			{
				id: 'demo-split-3',
				groupId: 'demo-group-2',
				title: 'Grocery Shopping',
				amount: 1500,
				paidBy: 'Priya',
				splitAmong: ['You', 'Priya', 'Karan'],
				date: today,
				createdAt: Date.now() - 86400000 * 2,
			},
		];

		const txG = db.transaction(SPLIT_GROUPS, 'readwrite');
		await txG.store.put(sampleGroup1);
		await txG.store.put(sampleGroup2);
		await txG.done;

		const txS = db.transaction(SPLIT_EXPENSES, 'readwrite');
		for (const s of sampleSplits) {
			await txS.store.put(s);
		}
		await txS.done;
	}
}

// ── Sync Queue & Synchronization Helpers ──

export async function addToSyncQueue(item: SyncQueueItem): Promise<void> {
	const db = await getDb();
	await db.put(SYNC_QUEUE, item);
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
	const db = await getDb();
	const items: SyncQueueItem[] = await db.getAll(SYNC_QUEUE);
	return items.sort((a, b) => a.createdAt - b.createdAt);
}

export async function removeSyncQueueItem(id: string): Promise<void> {
	const db = await getDb();
	await db.delete(SYNC_QUEUE, id);
}

export async function updateSyncQueueItem(item: SyncQueueItem): Promise<void> {
	const db = await getDb();
	await db.put(SYNC_QUEUE, item);
}

export async function clearSyncQueue(): Promise<void> {
	const db = await getDb();
	await db.clear(SYNC_QUEUE);
}

export async function getSyncQueueCount(): Promise<number> {
	const db = await getDb();
	return db.count(SYNC_QUEUE);
}

/** Get transactions that need to be synced to cloud (pending or not yet assigned a serverId). */
export async function getUnsyncedTransactions(): Promise<Transaction[]> {
	const db = await getDb();
	const all: Transaction[] = await db.getAll(TRANSACTIONS);
	return all.filter((t) => t.syncStatus !== 'synced' || !t.serverId);
}

export async function markTransactionSynced(localId: string, serverId?: string): Promise<void> {
	const db = await getDb();
	const existing = await db.get(TRANSACTIONS, localId);
	if (existing) {
		existing.syncStatus = 'synced';
		if (serverId) existing.serverId = serverId;
		await db.put(TRANSACTIONS, existing);
	}
}

/** Get local groups that are not yet marked as synced. */
export async function getUnsyncedGroups(): Promise<Group[]> {
	const db = await getDb();
	const all: Group[] = await db.getAll(SPLIT_GROUPS);
	// Groups without serverId or with syncStatus === 'pending', excluding demo seed groups
	return all.filter((g) => !g.id.startsWith('demo-') && (g.syncStatus !== 'synced' || !g.serverId));
}

export async function markGroupSynced(localId: string, serverId?: string): Promise<void> {
	const db = await getDb();
	const existing = await db.get(SPLIT_GROUPS, localId);
	if (existing) {
		existing.syncStatus = 'synced';
		if (serverId) existing.serverId = serverId;
		await db.put(SPLIT_GROUPS, existing);
	}
}

/** Get local splits that are not yet marked as synced. */
export async function getUnsyncedSplits(): Promise<SplitExpense[]> {
	const db = await getDb();
	const all: SplitExpense[] = await db.getAll(SPLIT_EXPENSES);
	return all.filter((s) => !s.id.startsWith('demo-') && (s.syncStatus !== 'synced' || !s.serverId));
}

export async function markSplitSynced(localId: string, serverId?: string): Promise<void> {
	const db = await getDb();
	const existing = await db.get(SPLIT_EXPENSES, localId);
	if (existing) {
		existing.syncStatus = 'synced';
		if (serverId) existing.serverId = serverId;
		await db.put(SPLIT_EXPENSES, existing);
	}
}

/** Get local budgets that are not yet marked as synced. */
export async function getUnsyncedBudgets(): Promise<Budget[]> {
	const db = await getDb();
	const all: Budget[] = await db.getAll(BUDGETS);
	return all.filter((b) => b.syncStatus !== 'synced' || !b.serverId);
}

export async function markBudgetSynced(localId: string, serverId?: string): Promise<void> {
	const db = await getDb();
	const existing = await db.get(BUDGETS, localId);
	if (existing) {
		existing.syncStatus = 'synced';
		if (serverId) existing.serverId = serverId;
		await db.put(BUDGETS, existing);
	}
}

// ── Init ──

/** Call once on app startup to seed defaults. */
export async function initDb(): Promise<void> {
	await seedCategories();
	await seedAccounts();
	await seedSplitData();
}


