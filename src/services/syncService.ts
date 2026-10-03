import { create } from 'zustand';
import * as db from '../db';
import { expenseApi, groupApi, categoryApi, budgetApi, type ApiCategory } from '../api/financeHubApi';
import { useAuthStore } from '../stores/authStore';
import type { SyncQueueItem, SyncStatusState, Transaction, Budget } from '../types';

// ── Zustand Store for Sync State ──

interface SyncStore extends SyncStatusState {
	setOnline: (online: boolean) => void;
	setSyncing: (syncing: boolean) => void;
	setPendingCount: (count: number) => void;
	setLastError: (error: string | null) => void;
	setLastSyncTime: (time: number) => void;
}

export const useSyncStore = create<SyncStore>((set) => ({
	isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
	isSyncing: false,
	pendingCount: 0,
	lastSyncTime: null,
	lastError: null,

	setOnline: (isOnline) => set({ isOnline }),
	setSyncing: (isSyncing) => set({ isSyncing }),
	setPendingCount: (pendingCount) => set({ pendingCount }),
	setLastError: (lastError) => set({ lastError }),
	setLastSyncTime: (lastSyncTime) => set({ lastSyncTime }),
}));

// ── Sync Service Implementation ──

class SyncService {
	private isInitialized = false;
	private syncLock = false;

	/** Initialize event listeners for online/offline changes */
	public init(): void {
		if (this.isInitialized) return;
		this.isInitialized = true;

		if (typeof window !== 'undefined') {
			window.addEventListener('online', () => {
				console.log('[SyncService] Device is back ONLINE. Triggering sync...');
				useSyncStore.getState().setOnline(true);
				this.syncAll();
			});

			window.addEventListener('offline', () => {
				console.log('[SyncService] Device is OFFLINE.');
				useSyncStore.getState().setOnline(false);
			});

			// Also trigger sync on visibility change if online
			document.addEventListener('visibilitychange', () => {
				if (document.visibilityState === 'visible' && navigator.onLine) {
					this.syncAll();
				}
			});
		}

		this.refreshPendingCount();
	}

	/** Count total pending items in sync queue and unsynced tables */
	public async refreshPendingCount(): Promise<number> {
		try {
			const queueCount = await db.getSyncQueueCount();
			const unsyncedTx = await db.getUnsyncedTransactions();
			const unsyncedBudgets = await db.getUnsyncedBudgets();
			const total = queueCount + unsyncedTx.length + unsyncedBudgets.length;
			useSyncStore.getState().setPendingCount(total);
			return total;
		} catch (err) {
			console.error('[SyncService] Failed to get pending count:', err);
			return 0;
		}
	}

	/** Add a task to the persistent sync queue */
	public async enqueue(
		item: Omit<SyncQueueItem, 'id' | 'createdAt' | 'attempts'>
	): Promise<void> {
		const queueItem: SyncQueueItem = {
			...item,
			id: crypto.randomUUID(),
			createdAt: Date.now(),
			attempts: 0,
		};

		await db.addToSyncQueue(queueItem);
		await this.refreshPendingCount();

		// If currently online and authenticated, trigger sync immediately in background
		if (navigator.onLine && useAuthStore.getState().isAuthenticated) {
			this.syncAll().catch((err) =>
				console.error('[SyncService] Background sync failed:', err)
			);
		}
	}

	/**
	 * Perform full synchronization of all offline-saved records to the server,
	 * and pull latest server expenses down into local IndexedDB.
	 */
	public async syncAll(): Promise<{ syncedCount: number; errors: string[] }> {
		if (this.syncLock) {
			console.log('[SyncService] Sync already in progress. Skipping.');
			return { syncedCount: 0, errors: [] };
		}

		const auth = useAuthStore.getState();
		if (!auth.isAuthenticated || !auth.user) {
			console.log('[SyncService] User is not authenticated. Records stay offline.');
			return { syncedCount: 0, errors: [] };
		}

		if (typeof navigator !== 'undefined' && !navigator.onLine) {
			console.log('[SyncService] Device is offline. Cannot sync.');
			return { syncedCount: 0, errors: [] };
		}

		this.syncLock = true;
		const store = useSyncStore.getState();
		store.setSyncing(true);
		store.setLastError(null);

		let syncedCount = 0;
		const errors: string[] = [];
		const idMap = new Map<string, string>(); // maps local group ID -> server group ID

		try {
			// Fetch categories to map category names to backend category IDs
			let categories: ApiCategory[] = [];
			try {
				categories = await categoryApi.list();
			} catch (catErr) {
				console.warn('[SyncService] Could not fetch server categories:', catErr);
			}

			const categoryByName = new Map<string, string>();
			for (const c of categories) {
				categoryByName.set(c.name.toLowerCase(), c.id);
			}

			// ── STEP 1: Process items in `sync_queue` ──
			const queue = await db.getSyncQueue();
			for (const item of queue) {
				try {
					if (item.attempts >= 5) {
						// Don't loop infinitely on permanently failing items
						continue;
					}

					// ── Handle Groups ──
					if (item.entityType === 'group') {
						if (item.action === 'create') {
							const res = await groupApi.create({
								name: item.payload.name,
								description: item.payload.description || '',
								simplifyDebts: !!item.payload.simplifyDebts,
								memberIds: item.payload.memberIds || [],
							});
							idMap.set(item.recordId, res.id);
							await db.markGroupSynced(item.recordId, res.id);
							await db.removeSyncQueueItem(item.id);
							syncedCount++;
						} else if (item.action === 'delete') {
							const targetId = item.payload.serverId || item.recordId;
							await groupApi.deleteGroup(targetId);
							await db.removeSyncQueueItem(item.id);
							syncedCount++;
						}
					}

					// ── Handle Split Expenses ──
					else if (item.entityType === 'split') {
						if (item.action === 'create') {
							const payload = { ...item.payload };
							// If groupId was local, map to newly created server groupId
							if (payload.groupId && idMap.has(payload.groupId)) {
								payload.groupId = idMap.get(payload.groupId);
							}
							const res = await expenseApi.create(payload);
							await db.markSplitSynced(item.recordId, res.id);
							await db.removeSyncQueueItem(item.id);
							syncedCount++;
						} else if (item.action === 'delete') {
							const targetId = item.payload.serverId || item.recordId;
							await expenseApi.delete(targetId);
							await db.removeSyncQueueItem(item.id);
							syncedCount++;
						}
					}

					// ── Handle Personal Transactions ──
					else if (item.entityType === 'transaction') {
						if (item.action === 'create') {
							const t: Transaction = item.payload;
							const catId = t.category
								? categoryByName.get(t.category.toLowerCase())
								: null;

							const res = await expenseApi.create({
								type: t.type === 'income' ? 'INCOME' : 'PERSONAL',
								amount: t.amount,
								description: t.description || 'Personal Transaction',
								currency: 'INR',
								expenseDate: t.date
									? new Date(t.date).toISOString()
									: new Date().toISOString(),
								categoryId: catId || null,
							});
							await db.markTransactionSynced(item.recordId, res.id);
							await db.removeSyncQueueItem(item.id);
							syncedCount++;
						} else if (item.action === 'delete') {
							if (item.payload?.serverId) {
								await expenseApi.delete(item.payload.serverId);
							}
							await db.removeSyncQueueItem(item.id);
							syncedCount++;
						}
					}

					// ── Handle Budgets ──
					else if (item.entityType === 'budget') {
						if (item.action === 'create') {
							const b: Budget = item.payload;
							const res = await budgetApi.create({
								id: b.id,
								amount: b.totalLimit,
								startDate: b.startDate,
								endDate: b.endDate,
								alertThreshold: b.alertThreshold,
							});
							await db.markBudgetSynced(item.recordId, res.id);
							await db.removeSyncQueueItem(item.id);
							syncedCount++;
						} else if (item.action === 'delete') {
							const targetId = item.payload?.serverId || item.recordId;
							await budgetApi.delete(targetId);
							await db.removeSyncQueueItem(item.id);
							syncedCount++;
						}
					}
				} catch (err: unknown) {
					console.error(`[SyncService] Failed to sync queue item ${item.id}:`, err);
					const msg = err instanceof Error ? err.message : String(err);
					errors.push(msg);
					item.attempts = (item.attempts || 0) + 1;
					item.lastError = msg;
					await db.updateSyncQueueItem(item);
				}
			}

			// ── STEP 2: Process any unsynced local Transactions & Budgets not in queue ──
			const unsyncedTx = await db.getUnsyncedTransactions();
			for (const t of unsyncedTx) {
				try {
					const catId = t.category
						? categoryByName.get(t.category.toLowerCase())
						: null;

					const res = await expenseApi.create({
						type: t.type === 'income' ? 'INCOME' : 'PERSONAL',
						amount: t.amount,
						description: t.description || 'Personal Transaction',
						currency: 'INR',
						expenseDate: t.date
							? new Date(t.date).toISOString()
							: new Date().toISOString(),
						categoryId: catId || null,
					});

					await db.markTransactionSynced(t.id, res.id);
					syncedCount++;
				} catch (err: unknown) {
					console.error(`[SyncService] Failed to sync transaction ${t.id}:`, err);
					const msg = err instanceof Error ? err.message : String(err);
					errors.push(msg);
				}
			}

			const unsyncedBudgets = await db.getUnsyncedBudgets();
			for (const b of unsyncedBudgets) {
				try {
					const res = await budgetApi.create({
						id: b.id,
						amount: b.totalLimit,
						startDate: b.startDate,
						endDate: b.endDate,
						alertThreshold: b.alertThreshold,
					});
					await db.markBudgetSynced(b.id, res.id);
					syncedCount++;
				} catch (err: unknown) {
					console.error(`[SyncService] Failed to sync budget ${b.id}:`, err);
					const msg = err instanceof Error ? err.message : String(err);
					errors.push(msg);
				}
			}

			const unsyncedGroups = await db.getUnsyncedGroups();
			for (const g of unsyncedGroups) {
				try {
					const res = await groupApi.create({
						name: g.name,
						description: g.description || '',
						simplifyDebts: !!g.simplifyDebts,
						memberIds: [],
					});
					idMap.set(g.id, res.id);
					await db.markGroupSynced(g.id, res.id);
					syncedCount++;
				} catch (err: unknown) {
					console.error(`[SyncService] Failed to sync group ${g.id}:`, err);
					const msg = err instanceof Error ? err.message : String(err);
					errors.push(msg);
				}
			}

			const unsyncedSplits = await db.getUnsyncedSplits();
			for (const s of unsyncedSplits) {
				try {
					const mappedGroupId = s.groupId && idMap.has(s.groupId) ? idMap.get(s.groupId) : s.groupId;
					const res = await expenseApi.create({
						type: 'SPLIT',
						amount: s.amount,
						description: s.title,
						currency: 'INR',
						expenseDate: s.date ? new Date(s.date).toISOString() : new Date().toISOString(),
						groupId: mappedGroupId || null,
						userId: auth.user.id,
						splits: [{ userId: auth.user.id, amount: String(s.amount), splitType: 'EQUAL' }],
					});
					await db.markSplitSynced(s.id, res.id);
					syncedCount++;
				} catch (err: unknown) {
					console.error(`[SyncService] Failed to sync split ${s.id}:`, err);
					const msg = err instanceof Error ? err.message : String(err);
					errors.push(msg);
				}
			}

			// ── STEP 3: Downstream Sync — pull user's cloud expenses and budgets into IndexedDB ──
			try {
				const userExpenses = await expenseApi.getUserExpenses();
				const localTxMap = new Map<string, Transaction>();
				const allLocal = await db.getAllTransactions();
				for (const lt of allLocal) {
					if (lt.serverId) localTxMap.set(lt.serverId, lt);
					localTxMap.set(lt.id, lt);
				}

				const categoryById = new Map<string, string>();
				for (const c of categories) {
					categoryById.set(c.id, c.name);
				}

				for (const exp of userExpenses) {
					// We store PERSONAL & INCOME expenses in local transactions
					if (exp.type === 'PERSONAL' || exp.type === 'INCOME') {
						if (!localTxMap.has(exp.id)) {
							const newLocal: Transaction = {
								id: exp.id,
								type: exp.type === 'INCOME' ? 'income' : 'expense',
								amount: parseFloat(exp.amount) || 0,
								description: exp.description || '',
								category: (exp.categoryId && categoryById.get(exp.categoryId)) || 'Other',
								account: 'Default',
								date: exp.expenseDate
									? exp.expenseDate.split('T')[0]
									: exp.createdAt.split('T')[0],
								createdAt: new Date(exp.createdAt).getTime(),
								syncStatus: 'synced',
								serverId: exp.id,
							};
							await db.addTransaction(newLocal);
						}
					}
				}
			} catch (downstreamErr) {
				console.warn('[SyncService] Downstream expenses sync skipped:', downstreamErr);
			}

			try {
				const serverBudgets = await budgetApi.getAll();
				for (const sb of serverBudgets) {
					const localBudget: Budget = {
						id: sb.id,
						startDate: sb.startDate ? sb.startDate.slice(0, 10) : '',
						endDate: sb.endDate ? sb.endDate.slice(0, 10) : '',
						totalLimit: parseFloat(String(sb.amount)) || 0,
						alertThreshold: sb.alertThreshold ?? 80,
						syncStatus: 'synced',
						serverId: sb.id,
					};
					await db.saveBudget(localBudget);
				}
			} catch (downstreamBudgetErr) {
				console.warn('[SyncService] Downstream budgets sync skipped:', downstreamBudgetErr);
			}

			// ── STEP 4: Instantly reload active frontend stores (Home, Budget, Split) ──
			try {
				const { useTransactionStore } = await import('../stores/transactionStore');
				await useTransactionStore.getState().reloadAll();
			} catch (reloadErr) {
				console.warn('[SyncService] Failed to reload transactionStore:', reloadErr);
			}

			try {
				const { useBudgetStore } = await import('../stores/budgetStore');
				const { todayStr } = await import('../utils/date');
				await useBudgetStore.getState().loadAllBudgets();
				await useBudgetStore.getState().loadActiveBudget(todayStr());
			} catch (reloadBudgetErr) {
				console.warn('[SyncService] Failed to reload budgetStore:', reloadBudgetErr);
			}

			try {
				const { useSplitStore } = await import('../stores/splitStore');
				await useSplitStore.getState().loadData();
			} catch (reloadSplitErr) {
				console.warn('[SyncService] Failed to reload splitStore:', reloadSplitErr);
			}

			store.setLastSyncTime(Date.now());
			if (errors.length > 0) {
				store.setLastError(errors[0]);
			}
		} catch (globalErr: unknown) {
			console.error('[SyncService] Global sync error:', globalErr);
			const msg = globalErr instanceof Error ? globalErr.message : String(globalErr);
			store.setLastError(msg);
			errors.push(msg);
		} finally {
			this.syncLock = false;
			store.setSyncing(false);
			await this.refreshPendingCount();
		}

		return { syncedCount, errors };
	}
}

export const syncService = new SyncService();
