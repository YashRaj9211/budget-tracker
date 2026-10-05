import { create } from 'zustand';
import type { Group, SplitExpense, MemberBalance, Debt, GroupMemberInfo } from '../types/split';
import {
	getAllGroups,
	saveGroup,
	deleteGroup as dbDeleteGroup,
	getAllSplits,
	saveSplit,
	deleteSplit as dbDeleteSplit,
	addTransaction,
} from '../db';
import { groupApi, expenseApi, type Group as ApiGroup, type Expense as ApiExpense } from '../api/financeHubApi';
import { useAuthStore } from './authStore';
import { calculateGroupBalances } from '../utils/debtSimplification';
import { syncService } from '../services/syncService';
import type { Transaction } from '../types';

interface SplitState {
	groups: Group[];
	splits: SplitExpense[];
	selectedGroupId: string | null;
	isAddGroupOpen: boolean;
	isAddSplitOpen: boolean;
	isSettleUpOpen: boolean;
	isLoading: boolean;
	error: string | null;

	// Actions
	loadData: () => Promise<void>;
	setSelectedGroupId: (id: string | null) => void;
	setAddGroupOpen: (open: boolean) => void;
	setAddSplitOpen: (open: boolean) => void;
	setSettleUpOpen: (open: boolean) => void;

	addGroup: (groupData: { name: string; description?: string; memberIds?: string[]; avatarColor?: string }) => Promise<void>;
	addGroupMember: (groupId: string, memberId: string) => Promise<void>;
	removeGroup: (id: string) => Promise<void>;
	addSplit: (splitData: {
		groupId: string;
		title: string;
		amount: number;
		paidBy: string;
		paidById?: string;
		splitAmong: string[];
		splitAmongIds?: string[];
		date: string;
		isSettlement?: boolean;
	}) => Promise<void>;
	removeSplit: (id: string) => Promise<void>;

	// Pure balance computation functions
	getGroupBalances: (groupId: string) => { memberBalances: MemberBalance[]; debts: Debt[] };
	getGroupUserBalance: (groupId: string) => number;
	getTotalUserBalance: () => { totalOwedToUser: number; totalUserOwes: number; netTotal: number };
}

// Convert Backend Group to Split Frontend Group
function transformApiGroup(apiGroup: ApiGroup, currentUserId?: string): Group {
// Two people can share a display name. Make each name unique ("Sam", "Sam (2)")
	// so the name pickers in the UI always point to exactly one person.
	const nameCount: Record<string, number> = {};
	const memberDetails: GroupMemberInfo[] = (apiGroup.members || []).map((m) => {
		const base = m.user?.name || m.user?.username || 'Unknown';
		const isMe = (m.userId || m.user?.id) === currentUserId;
		let name = base;
		if (!isMe) {
			nameCount[base] = (nameCount[base] || 0) + 1;
			if (nameCount[base] > 1) name = `${base} (${nameCount[base]})`;
		}
		return {
			id: m.userId || m.user?.id || '',
			name,
			username: m.user?.username,
			avatarUrl: m.user?.avatarUrl,
			role: m.role,
		};
	});

	// Display 'You' for current user, followed by other members
	const members: string[] = [];
	memberDetails.forEach((m) => {
		if (m.id === currentUserId) {
			members.unshift('You');
		} else {
			members.push(m.name);
		}
	});

	if (!members.includes('You')) {
		members.unshift('You');
	}

	const colors = ['pastel-pink', 'pastel-blue', 'pastel-purple', 'pastel-yellow', 'pastel-green'];
	const hash = apiGroup.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
	const avatarColor = colors[Math.abs(hash) % colors.length];

	return {
		id: apiGroup.id,
		name: apiGroup.name,
		description: apiGroup.description,
		members,
		memberDetails,
		avatarColor,
		simplifyDebts: apiGroup.simplifyDebts,
		createdAt: new Date(apiGroup.createdAt).getTime(),
	};
}

// Convert Backend Expense to Split Frontend SplitExpense
function transformApiExpense(exp: ApiExpense, currentUserId?: string, group?: Group): SplitExpense {
	const isUserPayer = exp.userId === currentUserId;
	const payerName = isUserPayer
		? 'You'
		: group?.memberDetails?.find((m) => m.id === exp.userId)?.name || 'Member';

	const splitAmong: string[] = [];
	const splitAmongIds: string[] = [];
	const splitIds: string[] = [];

	(exp.splits || []).forEach((s) => {
		splitIds.push(s.id);
		splitAmongIds.push(s.userId);
		if (s.userId === currentUserId) {
			splitAmong.push('You');
		} else {
const memberName =
				group?.memberDetails?.find((m) => m.id === s.userId)?.name ||
				s.user?.name ||
				'Member';
			splitAmong.push(memberName);
		}
	});

	const numAmount = parseFloat(exp.amount) || 0;
const isSettlement = !!exp.isSettlement;

	return {
		id: exp.id,
		groupId: exp.groupId || '',
		title: exp.description,
		amount: numAmount,
		paidBy: payerName,
		paidById: exp.userId,
		splitAmong,
		splitAmongIds,
		splitIds,
		date: exp.expenseDate ? exp.expenseDate.split('T')[0] : new Date(exp.createdAt).toISOString().split('T')[0],
		createdAt: new Date(exp.createdAt).getTime(),
		isSettlement,
	};
}

export const useSplitStore = create<SplitState>((set, get) => ({
	groups: [],
	splits: [],
	selectedGroupId: null,
	isAddGroupOpen: false,
	isAddSplitOpen: false,
	isSettleUpOpen: false,
	isLoading: false,
	error: null,

	loadData: async () => {
		set({ isLoading: true, error: null });
		const auth = useAuthStore.getState();

		// Signed in: try server first, but fall back to local IndexedDB if offline
		if (auth.isAuthenticated && auth.user) {
			try {
				const userId = auth.user.id;
				const overview = await groupApi.getOverview();
				const groups = (overview.groups || []).map((g) => transformApiGroup(g, userId));
				const groupById = new Map(groups.map((g) => [g.id, g]));
				const splits = (overview.expenses || []).map((e) =>
					transformApiExpense(e, userId, e.groupId ? groupById.get(e.groupId) : undefined)
				);

				const serverGroupIds = new Set(groups.map((g) => g.id));
				const serverSplitIds = new Set(splits.map((s) => s.id));

				// Prune local groups and splits that were deleted remotely
				const [localGroups, localSplits] = await Promise.all([getAllGroups(), getAllSplits()]);
				for (const lg of localGroups) {
					if (!lg.id.startsWith('demo-') && (lg.serverId || lg.syncStatus === 'synced')) {
						const match = (lg.serverId && serverGroupIds.has(lg.serverId)) || serverGroupIds.has(lg.id);
						if (!match && lg.syncStatus !== 'pending') {
							await dbDeleteGroup(lg.id);
						}
					}
				}
				for (const ls of localSplits) {
					if (!ls.id.startsWith('demo-') && (ls.serverId || ls.syncStatus === 'synced')) {
						const match = (ls.serverId && serverSplitIds.has(ls.serverId)) || serverSplitIds.has(ls.id);
						if (!match && ls.syncStatus !== 'pending') {
							await dbDeleteSplit(ls.id);
						}
					}
				}

				// Cache in local IndexedDB for seamless offline availability
				for (const g of groups) {
					await saveGroup({ ...g, syncStatus: 'synced', serverId: g.id });
				}
				for (const s of splits) {
					await saveSplit({ ...s, syncStatus: 'synced', serverId: s.id });
				}

				set({ groups, splits, isLoading: false });
				return;
			} catch (err) {
				console.warn('Could not load from server, falling back to local offline data:', err);
				// Offline or server unreachable: fall back to local IndexedDB
				try {
					const [localGroups, localSplits] = await Promise.all([getAllGroups(), getAllSplits()]);
					set({ groups: localGroups, splits: localSplits, isLoading: false, error: null });
					return;
				} catch (dbErr) {
					console.error('Failed to load local split data:', dbErr);
					set({ isLoading: false, error: 'Could not load your groups. Check your connection and try again.' });
					return;
				}
			}
		}

		// Fallback to local IndexedDB (for guest/offline mode)
		try {
			const [groups, splits] = await Promise.all([getAllGroups(), getAllSplits()]);
			set({ groups, splits, isLoading: false });
		} catch (error) {
			console.error('Failed to load local split data:', error);
			set({ isLoading: false, error: 'Failed to load split data' });
		}
	},

	setSelectedGroupId: (id) => set({ selectedGroupId: id }),
	setAddGroupOpen: (open) => set({ isAddGroupOpen: open }),
	setAddSplitOpen: (open) => set({ isAddSplitOpen: open }),
	setSettleUpOpen: (open) => set({ isSettleUpOpen: open }),

	addGroup: async ({ name, description = '', memberIds = [], avatarColor = 'pastel-pink' }) => {
		const auth = useAuthStore.getState();

		if (auth.isAuthenticated && auth.user && navigator.onLine) {
			try {
				const created = await groupApi.create({
					name,
					description,
					simplifyDebts: false,
					memberIds,
				});

				const transformed = transformApiGroup(created, auth.user.id);
				transformed.avatarColor = avatarColor;
				await saveGroup({ ...transformed, syncStatus: 'synced', serverId: created.id });

				set((state) => ({ groups: [transformed, ...state.groups] }));
				return;
			} catch (err: any) {
				if (err?.response?.status >= 400 && err?.response?.status < 500) {
					throw err;
				}
				console.warn('Failed to create group on server. Saving offline:', err);
			}
		}

		// Local / Offline group creation
		const newGroup: Group = {
			id: crypto.randomUUID(),
			name,
			description,
			members: ['You'],
			avatarColor,
			createdAt: Date.now(),
			syncStatus: 'pending',
		};
		await saveGroup(newGroup);
		await syncService.enqueue({
			entityType: 'group',
			action: 'create',
			recordId: newGroup.id,
			payload: { name, description, simplifyDebts: false, memberIds },
		});
		set((state) => ({ groups: [newGroup, ...state.groups] }));
	},

	addGroupMember: async (groupId: string, memberId: string) => {
		const auth = useAuthStore.getState();
		if (auth.isAuthenticated && auth.user && navigator.onLine) {
			await groupApi.addMember(groupId, memberId);
			await get().loadData();
		}
	},

	removeGroup: async (id) => {
		const auth = useAuthStore.getState();
		const group = get().groups.find((g) => g.id === id);
		const serverId = group?.serverId || id;

		// Collect all splits belonging to this group BEFORE deleting
		const groupSplits = get().splits.filter((s) => s.groupId === id);

		if (auth.isAuthenticated && auth.user && navigator.onLine) {
			try {
				await groupApi.deleteGroup(serverId);
			} catch (err) {
				console.warn('Failed to delete group on server. Enqueuing offline delete:', err);
				await syncService.enqueue({
					entityType: 'group',
					action: 'delete',
					recordId: id,
					payload: { serverId },
				});
			}
		} else {
			await syncService.enqueue({
				entityType: 'group',
				action: 'delete',
				recordId: id,
				payload: { serverId },
			});
		}

		await dbDeleteGroup(id);

		// BUG FIX #2: Delete the mirrored Transaction records for every split in this group
		// so they stop showing in Home feed, Stats charts, and Budget calculations.
		if (groupSplits.length > 0) {
			const { deleteTransaction } = await import('../db');
			for (const s of groupSplits) {
				try {
					await deleteTransaction(s.id);
				} catch {
					// best-effort — transaction mirror may not exist for old/demo splits
				}
			}
			// Reload transaction store so Home + Stats + Budget update immediately
			const { useTransactionStore } = await import('./transactionStore');
			await useTransactionStore.getState().reloadAll();
		}

		set((state) => ({
			groups: state.groups.filter((g) => g.id !== id),
			splits: state.splits.filter((s) => s.groupId !== id),
			selectedGroupId: state.selectedGroupId === id ? null : state.selectedGroupId,
		}));
	},

	addSplit: async (splitData) => {
		const auth = useAuthStore.getState();
		const group = get().groups.find((g) => g.id === splitData.groupId);
		const myId = auth.user?.id || 'me';

		// Map participant IDs
		const memberDetails = group?.memberDetails || [];
		const idOf = (name: string): string => {
			if (name === 'You') return myId;
			return memberDetails.find((m) => m.name === name)?.id || '';
		};

		const payerId = splitData.paidBy === 'You' ? myId : splitData.paidById || idOf(splitData.paidBy) || myId;

		const targetUserIds = (
			splitData.splitAmongIds && splitData.splitAmongIds.length === splitData.splitAmong.length
				? splitData.splitAmongIds
				: splitData.splitAmong.map(idOf)
		).filter(Boolean);

		const totalPaise = Math.round(splitData.amount * 100);
		const count = targetUserIds.length > 0 ? targetUserIds.length : 1;
		const basePaise = Math.floor(totalPaise / count);
		let remainderPaise = totalPaise % count;

		const splitsInput = targetUserIds.length === 0 ? [] : targetUserIds.map((uId) => {
			const sharePaise = basePaise + (remainderPaise > 0 ? 1 : 0);
			if (remainderPaise > 0) remainderPaise--;
			return {
				userId: uId,
				amount: (sharePaise / 100).toFixed(2),
				splitType: 'EQUAL' as const,
				isPaid: uId === payerId,
			};
		});

		const expensePayload = {
			groupId: splitData.groupId,
			description: splitData.title,
			amount: splitData.amount,
			type: 'SPLIT' as const,
			userId: payerId,
			isSettlement: !!splitData.isSettlement,
			expenseDate: splitData.date ? new Date(splitData.date).toISOString() : new Date().toISOString(),
			splits: splitsInput,
		};

		if (auth.isAuthenticated && auth.user && navigator.onLine) {
			try {
				const createdExpense = await expenseApi.create(expensePayload);
				const transformed = transformApiExpense(createdExpense, auth.user.id, group);
				await saveSplit({ ...transformed, syncStatus: 'synced', serverId: createdExpense.id });
				
				if (!splitData.isSettlement) {
					const totalAmount = parseFloat(createdExpense.amount) || 0;
					let myShare = 0;
					const paidByMe = createdExpense.userId === auth.user?.id;
					let lentAmount = 0;
					if (createdExpense.splits) {
						const mySplit = createdExpense.splits.find((s: any) => s.userId === auth.user?.id);
						if (mySplit) myShare = parseFloat(mySplit.amount) || 0;
					}
					if (paidByMe) lentAmount = totalAmount - myShare;
					
					const newLocal: Transaction = {
						id: createdExpense.id,
						type: 'expense',
						amount: myShare,
						description: createdExpense.description || '',
						category: 'Split',
						account: 'Default',
						date: splitData.date,
						createdAt: new Date(createdExpense.createdAt).getTime(),
						syncStatus: 'synced',
						serverId: createdExpense.id,
						isSplit: true,
						groupId: splitData.groupId,
						paidByMe,
						totalAmount,
						lentAmount,
					};
					await addTransaction(newLocal);
					// trigger transaction load
					const { useTransactionStore } = await import('./transactionStore');
					await useTransactionStore.getState().reloadAll();
				}

				set((state) => ({ splits: [transformed, ...state.splits] }));
				return;
			} catch (err) {
				console.warn('Failed to create split on server. Saving offline:', err);
			}
		}

		// Fallback: local IndexedDB + sync queue
		const localSplit: SplitExpense = {
			id: crypto.randomUUID(),
			groupId: splitData.groupId,
			title: splitData.title,
			amount: splitData.amount,
			paidBy: splitData.paidBy,
			paidById: payerId,
			splitAmong: splitData.splitAmong,
			splitAmongIds: targetUserIds,
			date: splitData.date,
			createdAt: Date.now(),
			isSettlement: splitData.isSettlement,
			syncStatus: 'pending',
		};

		await saveSplit(localSplit);
		await syncService.enqueue({
			entityType: 'split',
			action: 'create',
			recordId: localSplit.id,
			payload: expensePayload,
		});

		if (!splitData.isSettlement) {
			const totalAmount = splitData.amount;
			let myShare = 0;
			const paidByMe = payerId === myId;
			let lentAmount = 0;

			const mySplitIndex = targetUserIds.indexOf(myId);
			if (mySplitIndex !== -1 && splitsInput[mySplitIndex]) {
				myShare = parseFloat(splitsInput[mySplitIndex].amount as string) || 0;
			}
			if (paidByMe) lentAmount = totalAmount - myShare;

			const newLocal: Transaction = {
				id: localSplit.id,
				type: 'expense',
				amount: myShare,
				description: splitData.title,
				category: 'Split',
				account: 'Default',
				date: splitData.date,
				createdAt: Date.now(),
				syncStatus: 'pending',
				isSplit: true,
				groupId: splitData.groupId,
				paidByMe,
				totalAmount,
				lentAmount,
			};
			await addTransaction(newLocal);
			const { useTransactionStore } = await import('./transactionStore');
			await useTransactionStore.getState().reloadAll();
		}

		set((state) => ({ splits: [localSplit, ...state.splits] }));
	},

	removeSplit: async (id) => {
		const auth = useAuthStore.getState();
		const split = get().splits.find((s) => s.id === id);
		// BUG FIX #5: only use serverId if it actually came from the server;
		// never pass a local UUID to the remote API.
		const serverId = split?.serverId;

		if (auth.isAuthenticated && auth.user && navigator.onLine) {
			if (serverId) {
				// Only call the API when we have a confirmed server-side ID
				try {
					await expenseApi.delete(serverId);
				} catch (err) {
					console.warn('Failed to delete expense on server. Enqueuing offline delete:', err);
					await syncService.enqueue({
						entityType: 'split',
						action: 'delete',
						recordId: id,
						payload: { serverId },
					});
				}
			}
			// If no serverId the expense was never synced to the server, nothing to delete remotely.
		} else if (serverId) {
			// Offline but has a server record — queue the delete for later
			await syncService.enqueue({
				entityType: 'split',
				action: 'delete',
				recordId: id,
				payload: { serverId },
			});
		}

		await dbDeleteSplit(id);

		// BUG FIX #1: Also delete the mirrored Transaction record that was created by addSplit.
		// Without this, the expense keeps showing in Home feed, Stats charts, and Budget.
		try {
			const { deleteTransaction } = await import('../db');
			await deleteTransaction(id); // split id === transaction id (set in addSplit)
		} catch {
			// best-effort — transaction mirror may not exist for demo/old splits
		}

		// Reload transaction store so Home + Stats + Budget update immediately
		const { useTransactionStore } = await import('./transactionStore');
		await useTransactionStore.getState().reloadAll();

		set((state) => ({ splits: state.splits.filter((s) => s.id !== id) }));
	},

	getGroupBalances: (groupId: string) => {
		const { groups, splits } = get();
		const group = groups.find((g) => g.id === groupId);
		if (!group) return { memberBalances: [], debts: [] };

const groupSplits = splits.filter((s) => s.groupId === groupId);

		// Map user IDs to the names shown in the UI ("You" for the signed-in user)
		const myId = useAuthStore.getState().user?.id;
		let idToName: Record<string, string> | undefined;
		if (group.memberDetails && group.memberDetails.length > 0) {
			const map: Record<string, string> = {};
			group.memberDetails.forEach((m) => {
				if (m.id) map[m.id] = m.id === myId ? 'You' : m.name;
			});
			idToName = map;
		}
		return calculateGroupBalances(group.members, groupSplits, idToName);
	},

	getGroupUserBalance: (groupId: string) => {
		const { getGroupBalances } = get();
		const { memberBalances } = getGroupBalances(groupId);
		const userBalance = memberBalances.find((b) => b.member === 'You');
		return userBalance ? userBalance.netAmount : 0;
	},

	getTotalUserBalance: () => {
		const { groups, getGroupUserBalance } = get();
		let totalOwedToUserPaise = 0;
		let totalUserOwesPaise = 0;

		groups.forEach((g) => {
			const userBal = getGroupUserBalance(g.id);
			const balPaise = Math.round(userBal * 100);
			if (balPaise > 0) {
				totalOwedToUserPaise += balPaise;
			} else if (balPaise < 0) {
				totalUserOwesPaise += Math.abs(balPaise);
			}
		});

		const totalOwedToUser = totalOwedToUserPaise / 100;
		const totalUserOwes = totalUserOwesPaise / 100;

		return {
			totalOwedToUser,
			totalUserOwes,
			netTotal: (totalOwedToUserPaise - totalUserOwesPaise) / 100,
		};
	},
}));
