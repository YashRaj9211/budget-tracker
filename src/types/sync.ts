export type SyncEntityType = 'transaction' | 'group' | 'split' | 'budget';
export type SyncAction = 'create' | 'update' | 'delete';

export interface SyncQueueItem {
	id: string;
	entityType: SyncEntityType;
	action: SyncAction;
	recordId: string;
	payload: any;
	createdAt: number;
	attempts: number;
	lastError?: string;
}

export interface SyncStatusState {
	isOnline: boolean;
	isSyncing: boolean;
	pendingCount: number;
	lastSyncTime: number | null;
	lastError: string | null;
}
