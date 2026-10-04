import { vi } from 'vitest';

vi.hoisted(() => {
	const storage: Record<string, string> = {};
	globalThis.localStorage = {
		getItem: (k: string) => storage[k] ?? null,
		setItem: (k: string, v: string) => { storage[k] = v; },
		removeItem: (k: string) => { delete storage[k]; },
		clear: () => { Object.keys(storage).forEach((k) => delete storage[k]); },
		key: (i: number) => Object.keys(storage)[i] ?? null,
		length: 0,
	};
});

import { describe, it, expect, beforeEach } from 'vitest';
import { syncService, useSyncStore } from './syncService';
import * as db from '../db';
import { groupApi, expenseApi, budgetApi } from '../api/financeHubApi';
import { useAuthStore } from '../stores/authStore';

vi.mock('../db', () => ({
	addToSyncQueue: vi.fn().mockResolvedValue(undefined),
	getSyncQueue: vi.fn().mockResolvedValue([]),
	removeSyncQueueItem: vi.fn().mockResolvedValue(undefined),
	updateSyncQueueItem: vi.fn().mockResolvedValue(undefined),
	clearSyncQueue: vi.fn().mockResolvedValue(undefined),
	getSyncQueueCount: vi.fn().mockResolvedValue(0),
	getUnsyncedTransactions: vi.fn().mockResolvedValue([]),
	markTransactionSynced: vi.fn().mockResolvedValue(undefined),
	getUnsyncedGroups: vi.fn().mockResolvedValue([]),
	markGroupSynced: vi.fn().mockResolvedValue(undefined),
	getUnsyncedSplits: vi.fn().mockResolvedValue([]),
	markSplitSynced: vi.fn().mockResolvedValue(undefined),
	getUnsyncedBudgets: vi.fn().mockResolvedValue([]),
	markBudgetSynced: vi.fn().mockResolvedValue(undefined),
	getAllTransactions: vi.fn().mockResolvedValue([]),
	getTransactionsByMonth: vi.fn().mockResolvedValue([]),
	getAllGroups: vi.fn().mockResolvedValue([]),
	getAllSplits: vi.fn().mockResolvedValue([]),
	addTransaction: vi.fn().mockResolvedValue(undefined),
	deleteTransaction: vi.fn().mockResolvedValue(undefined),
	deleteSplit: vi.fn().mockResolvedValue(undefined),
	saveBudget: vi.fn().mockResolvedValue(undefined),
	deleteBudget: vi.fn().mockResolvedValue(undefined),
	clearUserData: vi.fn().mockResolvedValue(undefined),
	getAllBudgets: vi.fn().mockResolvedValue([]),
	getActiveBudget: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../api/financeHubApi', () => ({
	groupApi: {
		create: vi.fn(),
		deleteGroup: vi.fn(),
		getOverview: vi.fn().mockResolvedValue({ groups: [], expenses: [] }),
	},
	expenseApi: {
		create: vi.fn(),
		delete: vi.fn(),
		getUserExpenses: vi.fn().mockResolvedValue([]),
	},
	budgetApi: {
		create: vi.fn().mockResolvedValue({ id: 'server-budget-1', amount: 5000, startDate: '2026-10-01', endDate: '2026-10-31' }),
		getAll: vi.fn().mockResolvedValue([]),
		update: vi.fn().mockResolvedValue({ id: 'server-budget-1' }),
		delete: vi.fn().mockResolvedValue({ message: 'Budget deleted' }),
	},
	categoryApi: {
		list: vi.fn().mockResolvedValue([
			{ id: 'cat-1', name: 'Food' },
			{ id: 'cat-2', name: 'Travel' },
		]),
	},
}));

describe('syncService', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		useSyncStore.setState({
			isOnline: true,
			isSyncing: false,
			pendingCount: 0,
			lastSyncTime: null,
			lastError: null,
		});
		useAuthStore.setState({
			isAuthenticated: false,
			user: null,
			token: null,
		});
	});

	it('initializes and sets event listeners without throwing', () => {
		expect(() => syncService.init()).not.toThrow();
	});

	it('enqueues an item and updates pending count', async () => {
		vi.mocked(db.getSyncQueueCount).mockResolvedValueOnce(1);
		vi.mocked(db.getUnsyncedTransactions).mockResolvedValueOnce([]);

		await syncService.enqueue({
			entityType: 'transaction',
			action: 'create',
			recordId: 'tx-123',
			payload: { amount: 500, description: 'Groceries' },
		});

		expect(db.addToSyncQueue).toHaveBeenCalledWith(
			expect.objectContaining({
				entityType: 'transaction',
				action: 'create',
				recordId: 'tx-123',
			})
		);
		expect(useSyncStore.getState().pendingCount).toBe(1);
	});

	it('does not sync when user is not authenticated', async () => {
		const res = await syncService.syncAll();
		expect(res.syncedCount).toBe(0);
		expect(groupApi.create).not.toHaveBeenCalled();
		expect(expenseApi.create).not.toHaveBeenCalled();
	});

	it('does not sync when navigator is offline', async () => {
		useAuthStore.setState({
			isAuthenticated: true,
			user: { id: 'u1', name: 'User 1', email: 'u1@example.com', username: 'u1' },
			token: 'test-token',
		});
		Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

		const res = await syncService.syncAll();
		expect(res.syncedCount).toBe(0);
		expect(groupApi.create).not.toHaveBeenCalled();

		// restore
		Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
	});

	it('syncs queued groups, splits, and transactions when authenticated and online', async () => {
		useAuthStore.setState({
			isAuthenticated: true,
			user: { id: 'u1', name: 'User 1', email: 'u1@example.com', username: 'u1' },
			token: 'test-token',
		});

		// Queue contains 1 group, 1 split, 1 transaction
		vi.mocked(db.getSyncQueue).mockResolvedValueOnce([
			{
				id: 'q-1',
				entityType: 'group',
				action: 'create',
				recordId: 'local-group-1',
				payload: { name: 'Weekend Trip', description: 'Fun' },
				createdAt: 1000,
				attempts: 0,
			},
			{
				id: 'q-2',
				entityType: 'split',
				action: 'create',
				recordId: 'local-split-1',
				payload: {
					groupId: 'local-group-1',
					amount: 1200,
					description: 'Dinner',
					splits: [{ userId: 'u1', amount: '1200' }],
				},
				createdAt: 2000,
				attempts: 0,
			},
			{
				id: 'q-3',
				entityType: 'transaction',
				action: 'create',
				recordId: 'local-tx-1',
				payload: {
					type: 'expense',
					amount: 250,
					description: 'Coffee',
					category: 'Food',
					date: '2026-10-02',
				},
				createdAt: 3000,
				attempts: 0,
			},
		]);

		vi.mocked(groupApi.create).mockResolvedValueOnce({
			id: 'server-group-999',
			name: 'Weekend Trip',
			simplifyDebts: false,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		});

		vi.mocked(expenseApi.create).mockResolvedValueOnce({
			id: 'server-expense-split-1',
			amount: '1200',
			currency: 'INR',
			description: 'Dinner',
			type: 'SPLIT',
			expenseDate: new Date().toISOString(),
			userId: 'u1',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		});

		vi.mocked(expenseApi.create).mockResolvedValueOnce({
			id: 'server-expense-tx-1',
			amount: '250',
			currency: 'INR',
			description: 'Coffee',
			type: 'PERSONAL',
			expenseDate: new Date().toISOString(),
			userId: 'u1',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		});

		const res = await syncService.syncAll();
		expect(res.syncedCount).toBe(3);
		expect(res.errors).toEqual([]);

		// Group created & mapped
		expect(groupApi.create).toHaveBeenCalledWith(
			expect.objectContaining({ name: 'Weekend Trip' })
		);
		expect(db.markGroupSynced).toHaveBeenCalledWith('local-group-1', 'server-group-999');

		// Split created with mapped server groupId
		expect(expenseApi.create).toHaveBeenCalledWith(
			expect.objectContaining({
				groupId: 'server-group-999',
				description: 'Dinner',
			})
		);
		expect(db.markSplitSynced).toHaveBeenCalledWith('local-split-1', 'server-expense-split-1');

		// Transaction created with mapped category ID
		expect(expenseApi.create).toHaveBeenCalledWith(
			expect.objectContaining({
				type: 'PERSONAL',
				amount: 250,
				categoryId: 'cat-1',
			})
		);
		expect(db.markTransactionSynced).toHaveBeenCalledWith('local-tx-1', 'server-expense-tx-1');

		// Items removed from queue
		expect(db.removeSyncQueueItem).toHaveBeenCalledWith('q-1');
		expect(db.removeSyncQueueItem).toHaveBeenCalledWith('q-2');
		expect(db.removeSyncQueueItem).toHaveBeenCalledWith('q-3');
	});

	it('syncs queued budgets when authenticated and online', async () => {
		useAuthStore.setState({
			isAuthenticated: true,
			user: { id: 'u1', name: 'User 1', email: 'u1@example.com', username: 'u1' },
			token: 'test-token',
		});

		vi.mocked(db.getSyncQueue).mockResolvedValueOnce([
			{
				id: 'q-budget-1',
				entityType: 'budget',
				action: 'create',
				recordId: 'local-budget-1',
				payload: {
					id: 'local-budget-1',
					totalLimit: 15000,
					startDate: '2026-10-01',
					endDate: '2026-10-31',
					alertThreshold: 85,
				},
				createdAt: 5000,
				attempts: 0,
			},
		]);

		const res = await syncService.syncAll();
		expect(res.syncedCount).toBe(1);
		expect(budgetApi.create).toHaveBeenCalledWith(
			expect.objectContaining({
				id: 'local-budget-1',
				amount: 15000,
				startDate: '2026-10-01',
				endDate: '2026-10-31',
				alertThreshold: 85,
			})
		);
		expect(db.markBudgetSynced).toHaveBeenCalledWith('local-budget-1', 'server-budget-1');
		expect(db.removeSyncQueueItem).toHaveBeenCalledWith('q-budget-1');
	});

	it('prunes locally cached transactions that were deleted remotely on another device', async () => {
		useAuthStore.setState({
			isAuthenticated: true,
			user: { id: 'u1', name: 'User 1', email: 'u1@example.com', username: 'u1' },
			token: 'test-token',
		});

		// Local IndexedDB has 2 transactions:
		// 1. tx-active (exists on server)
		// 2. tx-deleted (deleted on another device, no longer in server expenses)
		// 3. tx-offline-pending (created offline locally, not yet synced)
		vi.mocked(db.getAllTransactions).mockResolvedValueOnce([
			{
				id: 'local-1',
				serverId: 'server-tx-active',
				type: 'expense',
				amount: 100,
				category: 'Food',
				account: 'Default',
				description: 'Lunch',
				date: '2026-10-01',
				createdAt: 1000,
				syncStatus: 'synced',
			},
			{
				id: 'local-2',
				serverId: 'server-tx-deleted-remotely',
				type: 'expense',
				amount: 500,
				category: 'Shopping',
				account: 'Default',
				description: 'Shoes',
				date: '2026-10-02',
				createdAt: 2000,
				syncStatus: 'synced',
			},
			{
				id: 'local-3',
				type: 'expense',
				amount: 50,
				category: 'Snack',
				account: 'Default',
				description: 'Tea',
				date: '2026-10-03',
				createdAt: 3000,
				syncStatus: 'pending',
			},
		]);

		// Server only returns server-tx-active (server-tx-deleted-remotely was deleted!)
		vi.mocked(expenseApi.getUserExpenses).mockResolvedValueOnce([
			{
				id: 'server-tx-active',
				amount: '100',
				currency: 'INR',
				description: 'Lunch',
				type: 'PERSONAL',
				expenseDate: '2026-10-01T00:00:00.000Z',
				userId: 'u1',
				createdAt: '2026-10-01T00:00:00.000Z',
				updatedAt: '2026-10-01T00:00:00.000Z',
			},
		]);

		const res = await syncService.syncAll();
		expect(res.errors).toEqual([]);

		// Verify that the remotely deleted transaction was purged from local IndexedDB
		expect(db.deleteTransaction).toHaveBeenCalledWith('local-2');
		// The active one is retained/updated
		expect(db.deleteTransaction).not.toHaveBeenCalledWith('local-1');
		// The offline pending one is not purged
		expect(db.deleteTransaction).not.toHaveBeenCalledWith('local-3');
	});
});
