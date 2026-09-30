import { create } from 'zustand';
import type { Group, SplitExpense, MemberBalance, Debt } from '../types/split';
import {
	getAllGroups,
	saveGroup,
	deleteGroup as dbDeleteGroup,
	getAllSplits,
	saveSplit,
	deleteSplit as dbDeleteSplit,
} from '../db';
import { calculateGroupBalances } from '../utils/debtSimplification';

interface SplitState {
	groups: Group[];
	splits: SplitExpense[];
	selectedGroupId: string | null;
	isAddGroupOpen: boolean;
	isAddSplitOpen: boolean;
	isSettleUpOpen: boolean;
	isLoading: boolean;

	// Actions
	loadData: () => Promise<void>;
	setSelectedGroupId: (id: string | null) => void;
	setAddGroupOpen: (open: boolean) => void;
	setAddSplitOpen: (open: boolean) => void;
	setSettleUpOpen: (open: boolean) => void;

	addGroup: (group: Group) => Promise<void>;
	removeGroup: (id: string) => Promise<void>;
	addSplit: (split: SplitExpense) => Promise<void>;
	removeSplit: (id: string) => Promise<void>;

	// Pure balance computation functions
	getGroupBalances: (groupId: string) => { memberBalances: MemberBalance[]; debts: Debt[] };
	getGroupUserBalance: (groupId: string) => number;
	getTotalUserBalance: () => { totalOwedToUser: number; totalUserOwes: number; netTotal: number };
}

export const useSplitStore = create<SplitState>((set, get) => ({
	groups: [],
	splits: [],
	selectedGroupId: null,
	isAddGroupOpen: false,
	isAddSplitOpen: false,
	isSettleUpOpen: false,
	isLoading: false,

	loadData: async () => {
		set({ isLoading: true });
		try {
			const [groups, splits] = await Promise.all([getAllGroups(), getAllSplits()]);
			set({ groups, splits, isLoading: false });
		} catch (error) {
			console.error('Failed to load split data:', error);
			set({ isLoading: false });
		}
	},

	setSelectedGroupId: (id) => set({ selectedGroupId: id }),
	setAddGroupOpen: (open) => set({ isAddGroupOpen: open }),
	setAddSplitOpen: (open) => set({ isAddSplitOpen: open }),
	setSettleUpOpen: (open) => set({ isSettleUpOpen: open }),

	addGroup: async (group) => {
		await saveGroup(group);
		set((state) => ({ groups: [group, ...state.groups] }));
	},

	removeGroup: async (id) => {
		await dbDeleteGroup(id);
		set((state) => ({
			groups: state.groups.filter((g) => g.id !== id),
			splits: state.splits.filter((s) => s.groupId !== id),
			selectedGroupId: state.selectedGroupId === id ? null : state.selectedGroupId,
		}));
	},

	addSplit: async (split) => {
		await saveSplit(split);
		set((state) => ({ splits: [split, ...state.splits] }));
	},

	removeSplit: async (id) => {
		await dbDeleteSplit(id);
		set((state) => ({ splits: state.splits.filter((s) => s.id !== id) }));
	},

	getGroupBalances: (groupId: string) => {
		const { groups, splits } = get();
		const group = groups.find((g) => g.id === groupId);
		if (!group) return { memberBalances: [], debts: [] };

		const groupSplits = splits.filter((s) => s.groupId === groupId);
		
		return calculateGroupBalances(group.members, groupSplits);
	},

	getGroupUserBalance: (groupId: string) => {
		const { getGroupBalances } = get();
		const { memberBalances } = getGroupBalances(groupId);
		const userBalance = memberBalances.find((b) => b.member === 'You');
		return userBalance ? userBalance.netAmount : 0;
	},

	getTotalUserBalance: () => {
		const { groups, getGroupUserBalance } = get();
		let totalOwedToUser = 0;
		let totalUserOwes = 0;

		groups.forEach((g) => {
			const userBal = getGroupUserBalance(g.id);
			if (userBal > 0) {
				totalOwedToUser += userBal;
			} else if (userBal < 0) {
				totalUserOwes += Math.abs(userBal);
			}
		});

		return {
			totalOwedToUser,
			totalUserOwes,
			netTotal: totalOwedToUser - totalUserOwes,
		};
	},
}));
