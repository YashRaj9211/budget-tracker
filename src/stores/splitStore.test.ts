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
import { useSplitStore } from './splitStore';

vi.mock('../db', () => ({
	getAllGroups: vi.fn().mockResolvedValue([]),
	saveGroup: vi.fn().mockResolvedValue(undefined),
	deleteGroup: vi.fn().mockResolvedValue(undefined),
	getAllSplits: vi.fn().mockResolvedValue([]),
	saveSplit: vi.fn().mockResolvedValue(undefined),
	deleteSplit: vi.fn().mockResolvedValue(undefined),
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
}));

vi.mock('../api/financeHubApi', () => ({
	groupApi: {
		create: vi.fn(),
		deleteGroup: vi.fn(),
		getOverview: vi.fn(),
	},
	expenseApi: {
		create: vi.fn(),
		delete: vi.fn(),
	},
}));

describe('splitStore group creation', () => {
	beforeEach(() => {
		useSplitStore.setState({ groups: [], splits: [], selectedGroupId: null, isAddGroupOpen: false });
	});

	it('creates a new group in local mode when not authenticated', async () => {
		const store = useSplitStore.getState();
		await store.addGroup({
			name: 'Road Trip 🚗',
			description: 'Fuel and Snacks',
			avatarColor: 'pastel-blue',
		});

		const updatedGroups = useSplitStore.getState().groups;
		expect(updatedGroups.length).toBe(1);
		expect(updatedGroups[0].name).toBe('Road Trip 🚗');
		expect(updatedGroups[0].description).toBe('Fuel and Snacks');
		expect(updatedGroups[0].avatarColor).toBe('pastel-blue');
		expect(updatedGroups[0].members).toEqual(['You']);
		expect(updatedGroups[0].id).toBeDefined();
	});

	it('removes a group and clears selectedGroupId if active', async () => {
		const store = useSplitStore.getState();
		await store.addGroup({ name: 'Group 1' });
		const gid = useSplitStore.getState().groups[0].id;
		useSplitStore.setState({ selectedGroupId: gid });

		await useSplitStore.getState().removeGroup(gid);
		expect(useSplitStore.getState().groups.length).toBe(0);
		expect(useSplitStore.getState().selectedGroupId).toBeNull();
	});
});
