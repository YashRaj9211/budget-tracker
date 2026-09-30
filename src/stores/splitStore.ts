import { create } from 'zustand';
import type { Group, SplitExpense, MemberBalance, Debt, GroupMemberInfo } from '../types/split';
import {
	getAllGroups,
	saveGroup,
	deleteGroup as dbDeleteGroup,
	getAllSplits,
	saveSplit,
	deleteSplit as dbDeleteSplit,
} from '../db';
import { groupApi, expenseApi, type Group as ApiGroup, type Expense as ApiExpense } from '../api/financeHubApi';
import { useAuthStore } from './authStore';
import { calculateGroupBalances } from '../utils/debtSimplification';

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
		splitAmong: splitAmong.length > 0 ? splitAmong : ['You'],
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

		// Signed in: the server is the source of truth. If it fails we show an error
		// instead of quietly showing old guest data as if it were the real thing.
		if (auth.isAuthenticated && auth.user) {
			try {
				const userId = auth.user.id;
				const overview = await groupApi.getOverview();
				const groups = (overview.groups || []).map((g) => transformApiGroup(g, userId));
				const groupById = new Map(groups.map((g) => [g.id, g]));
				const splits = (overview.expenses || []).map((e) =>
					transformApiExpense(e, userId, e.groupId ? groupById.get(e.groupId) : undefined)
				);
				set({ groups, splits, isLoading: false });
			} catch (err) {
				console.error('Failed to load split data from server:', err);
				set({ isLoading: false, error: 'Could not load your groups. Check your connection and try again.' });
			}
			return;
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

		if (auth.isAuthenticated && auth.user) {
			try {
				const created = await groupApi.create({
					name,
					description,
					simplifyDebts: false,
					memberIds,
				});

				const transformed = transformApiGroup(created, auth.user.id);
				transformed.avatarColor = avatarColor;

				set((state) => ({ groups: [transformed, ...state.groups] }));
				return;
			} catch (err) {
				console.error('Failed to create group on server:', err);
				throw err;
			}
		}

		// Fallback: local group creation
		const newGroup: Group = {
			id: crypto.randomUUID(),
			name,
			description,
			members: ['You'],
			avatarColor,
			createdAt: Date.now(),
		};
		await saveGroup(newGroup);
		set((state) => ({ groups: [newGroup, ...state.groups] }));
	},

	removeGroup: async (id) => {
		const auth = useAuthStore.getState();

		if (auth.isAuthenticated && auth.user) {
			try {
				await groupApi.deleteGroup(id);
			} catch (err) {
				console.error('Failed to delete group on server:', err);
				throw err;
			}
		} else {
			await dbDeleteGroup(id);
		}

		set((state) => ({
			groups: state.groups.filter((g) => g.id !== id),
			splits: state.splits.filter((s) => s.groupId !== id),
			selectedGroupId: state.selectedGroupId === id ? null : state.selectedGroupId,
		}));
	},

	addSplit: async (splitData) => {
		const auth = useAuthStore.getState();

		if (auth.isAuthenticated && auth.user) {
			try {
				const group = get().groups.find((g) => g.id === splitData.groupId);
				
				// Map participant IDs
				const memberDetails = group?.memberDetails || [];
const myId = auth.user.id;
				const idOf = (name: string): string => {
					if (name === 'You') return myId;
					return memberDetails.find((m) => m.name === name)?.id || '';
				};

				const payerId = splitData.paidBy === 'You' ? myId : splitData.paidById || idOf(splitData.paidBy);
				if (!payerId) throw new Error('Could not find who paid');

				const targetUserIds = (
					splitData.splitAmongIds && splitData.splitAmongIds.length === splitData.splitAmong.length
						? splitData.splitAmongIds
						: splitData.splitAmong.map(idOf)
				).filter(Boolean);
				if (targetUserIds.length === 0) throw new Error('Choose at least one person to split with');

				const totalPaise = Math.round(splitData.amount * 100);
				const count = targetUserIds.length;
				const basePaise = count > 0 ? Math.floor(totalPaise / count) : 0;
				let remainderPaise = count > 0 ? totalPaise % count : 0;

				const splitsInput = targetUserIds.map((uId) => {
					const sharePaise = basePaise + (remainderPaise > 0 ? 1 : 0);
					if (remainderPaise > 0) remainderPaise--;
					return {
						userId: uId,
						amount: (sharePaise / 100).toFixed(2),
						splitType: 'EQUAL' as const,
						isPaid: uId === payerId,
					};
				});

				const createdExpense = await expenseApi.create({
					groupId: splitData.groupId,
					description: splitData.title,
					amount: splitData.amount,
type: 'SPLIT',
					userId: payerId,
					isSettlement: !!splitData.isSettlement,
					expenseDate: splitData.date ? new Date(splitData.date).toISOString() : new Date().toISOString(),
					splits: splitsInput,
				});

				const transformed = transformApiExpense(createdExpense, auth.user.id, group);
				set((state) => ({ splits: [transformed, ...state.splits] }));
				return;
			} catch (err) {
				console.error('Failed to create split on server:', err);
				throw err;
			}
		}

		// Fallback: local IndexedDB
		const localSplit: SplitExpense = {
			id: crypto.randomUUID(),
			groupId: splitData.groupId,
			title: splitData.title,
			amount: splitData.amount,
			paidBy: splitData.paidBy,
			paidById: splitData.paidById,
			splitAmong: splitData.splitAmong,
			splitAmongIds: splitData.splitAmongIds,
			date: splitData.date,
			createdAt: Date.now(),
			isSettlement: splitData.isSettlement,
		};

		await saveSplit(localSplit);
		set((state) => ({ splits: [localSplit, ...state.splits] }));
	},

	removeSplit: async (id) => {
		const auth = useAuthStore.getState();

		if (auth.isAuthenticated && auth.user) {
			try {
				await expenseApi.delete(id);
			} catch (err) {
				console.error('Failed to delete expense on server:', err);
				throw err;
			}
		} else {
			await dbDeleteSplit(id);
		}

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
