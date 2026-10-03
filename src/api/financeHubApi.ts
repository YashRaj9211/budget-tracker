import apiClient from './client';

// -------------------------------------------------------------
// TYPES
// -------------------------------------------------------------

export type ExpenseType = 'PERSONAL' | 'SPLIT' | 'INCOME';
export type SplitType = 'EQUAL' | 'EXACT' | 'PERCENTAGE' | 'SHARES';

export interface ExpenseSplitInput {
	userId: string;
	amount: string | number;
	splitType: SplitType;
	percentage?: number;
	isPaid?: boolean;
}

export interface ExpenseSplit {
	id: string;
	expenseId: string;
	userId: string;
	amount: string;
	splitType: SplitType;
	percentage?: string;
	isPaid: boolean;
	user?: {
		id: string;
		name: string;
		username: string;
		email: string;
		avatarUrl?: string;
	};
}

export interface CreateExpensePayload {
	amount: string | number;
	currency?: string;
	description: string;
	note?: string;
	type: ExpenseType;
	expenseDate?: string;
	categoryId?: string | null;
	groupId?: string | null;
	/** Payer. Leave empty for "me". Inside a group it may be another member. */
	userId?: string;
	/** True for a "settle up" payment between two members. */
	isSettlement?: boolean;
	splits?: ExpenseSplitInput[];
}

export interface Expense {
	id: string;
	amount: string;
	currency: string;
	description: string;
	note?: string;
	type: ExpenseType;
	expenseDate: string;
	userId: string;
	categoryId?: string;
	groupId?: string;
	isSettlement?: boolean;
	createdAt: string;
	updatedAt: string;
	splits?: ExpenseSplit[];
}

export interface DailySpendStat {
	date: string;
	day: string;
	personal: number;
	borrowed: number;
	lent: number;
	total: number;
}

export interface FriendBalance {
	id: string;
	name: string;
	username: string;
	avatarUrl?: string;
	amount: string;
}

export interface FriendsBalanceResponse {
	youOwe: FriendBalance[];
	owesYou: FriendBalance[];
}

export interface ExpensesSummary {
	totalExpenses: string;
	personalExpenses: string;
	totalBorrowed: string;
	totalLent: string;
}

export interface ExpenseBreakdownItem {
	id: string;
	amount: string;
	description: string;
	type: ExpenseType;
	tag: 'PERSONAL' | 'BORROWED' | 'MY_SHARES';
	paidBy?: {
		id: string;
		username: string;
	};
	createdAt: string;
}

export interface DailyExpenseBreakdownResponse {
	expenseBreakdown: Record<string, ExpenseBreakdownItem[]>;
}

export interface FriendItem {
	user_id: string;
	name: string;
}

export interface Friendship {
	id: string;
	userId: string;
	friendId: string;
	status: 'PENDING' | 'ACCEPTED' | 'BLOCKED';
	createdAt: string;
	user?: {
		id: string;
		name: string;
		username: string;
		avatarUrl?: string;
	};
	friend?: {
		id: string;
		name: string;
		username: string;
		avatarUrl?: string;
	};
}

export interface Group {
	id: string;
	name: string;
	description?: string;
	imageUrl?: string;
	simplifyDebts: boolean;
	createdAt: string;
	updatedAt: string;
	members?: GroupMember[];
}

export interface GroupMember {
	id: string;
	groupId: string;
	userId: string;
	role: 'ADMIN' | 'MEMBER';
	joinedAt: string;
	user?: {
		id: string;
		name: string;
		username: string;
		avatarUrl?: string;
	};
}

export interface CreateGroupPayload {
	name: string;
	description: string;
	simplifyDebts: boolean;
	imageUrl?: string;
	memberIds?: string[];
}

export interface AnalyticsMonth {
	month: string; // '2026-09'
	label: string; // 'Sep'
	personal: number;
	shared: number;
	lent: number;
	income: number;
	spent: number;
}

export interface AnalyticsCategory {
	categoryId: string;
	name: string;
	color: string;
	amount: number;
}

export interface AnalyticsGroup {
	groupId: string;
	name: string;
	amount: number; // my share
	total: number; // whole group
}

export interface AnalyticsResponse {
	months: number;
	trend: AnalyticsMonth[];
	categories: AnalyticsCategory[];
	groups: AnalyticsGroup[];
	comparison: { thisMonth: number; lastMonth: number; changePercent: number };
}

// -------------------------------------------------------------
// DASHBOARD APIS
// -------------------------------------------------------------

export const dashboardApi = {
	getSummary: async (): Promise<ExpensesSummary> => {
		const res = await apiClient.get<ExpensesSummary>('/api/_private/v1/dashboard');
		return res.data;
	},

	getDailyBreakdown: async (): Promise<DailyExpenseBreakdownResponse> => {
		const res = await apiClient.get<DailyExpenseBreakdownResponse>('/api/_private/v1/dashboard/expenses');
		return res.data;
	},

	getFriendsBalance: async (): Promise<FriendsBalanceResponse> => {
		const res = await apiClient.get<FriendsBalanceResponse>('/api/_private/v1/dashboard/friends');
		return res.data;
	},

	getAnalytics: async (months = 6): Promise<AnalyticsResponse> => {
		const res = await apiClient.get<AnalyticsResponse>('/api/_private/v1/dashboard/analytics', {
			params: { months },
		});
		return res.data;
	},

	getSpendOverviewGraph: async (period: 'WEEK' | 'MONTH' = 'MONTH'): Promise<DailySpendStat[]> => {
		const res = await apiClient.get<DailySpendStat[]>('/api/_private/v1/dashboard/graph', {
			params: { period },
		});
		return res.data;
	},
};

// -------------------------------------------------------------
// EXPENSES APIS
// -------------------------------------------------------------

export const expenseApi = {
	create: async (payload: CreateExpensePayload): Promise<Expense> => {
		const res = await apiClient.post<Expense>('/api/_private/v1/expenses', payload);
		return res.data;
	},

	getUserExpenses: async (): Promise<Expense[]> => {
		const res = await apiClient.get<Expense[]>('/api/_private/v1/expenses');
		return res.data;
	},

	update: async (expenseId: string, payload: Partial<CreateExpensePayload>): Promise<Expense> => {
		const res = await apiClient.put<Expense>(`/api/_private/v1/expenses/${expenseId}`, payload);
		return res.data;
	},

	settleSplit: async (splitId: string): Promise<{ message: string; split: ExpenseSplit }> => {
		const res = await apiClient.put(`/api/_private/v1/expenses/settle/${splitId}`);
		return res.data;
	},

	delete: async (expenseId: string): Promise<{ message: string }> => {
		const res = await apiClient.delete(`/api/_private/v1/expenses/${expenseId}`);
		return res.data;
	},
};

// -------------------------------------------------------------
// CATEGORIES APIS
// -------------------------------------------------------------

export interface ApiCategory {
	id: string;
	name: string;
	icon?: string;
	color?: string;
}

export const categoryApi = {
	list: async (): Promise<ApiCategory[]> => {
		const res = await apiClient.get<ApiCategory[]>('/api/_private/v1/categories');
		return res.data;
	},
};

// -------------------------------------------------------------
// FRIENDSHIPS APIS
// -------------------------------------------------------------

export const friendshipApi = {
	sendRequest: async (email: string): Promise<{ message: string }> => {
		const res = await apiClient.post('/api/_private/v1/friendships/send', { email });
		return res.data;
	},

	getAllFriendships: async (): Promise<Friendship[]> => {
		const res = await apiClient.get<Friendship[]>('/api/_private/v1/friendships');
		return res.data;
	},

	getAcceptedFriends: async (): Promise<FriendItem[]> => {
		const res = await apiClient.get<FriendItem[]>('/api/_private/v1/friends');
		return res.data;
	},

	acceptRequest: async (friendId: string): Promise<{ message: string }> => {
		const res = await apiClient.post(`/api/_private/v1/friendships/accept/${friendId}`);
		return res.data;
	},

	rejectRequest: async (friendId: string): Promise<{ message: string }> => {
		const res = await apiClient.post(`/api/_private/v1/friendships/reject/${friendId}`);
		return res.data;
	},
};

// -------------------------------------------------------------
// GROUPS APIS
// -------------------------------------------------------------

export const groupApi = {
	/** One call that returns every group (with members) and all their expenses. */
	getOverview: async (): Promise<{ groups: Group[]; expenses: Expense[] }> => {
		const res = await apiClient.get<{ groups: Group[]; expenses: Expense[] }>('/api/_private/v1/split/overview');
		return res.data;
	},

	create: async (payload: CreateGroupPayload): Promise<Group> => {
		const res = await apiClient.post<Group>('/api/_private/v1/groups', payload);
		return res.data;
	},

	getUserGroups: async (): Promise<{ groups: Group[] }> => {
		const res = await apiClient.get<{ groups: Group[] }>('/api/_private/v1/groups');
		return res.data;
	},

	getGroupExpenses: async (groupId: string): Promise<Expense[]> => {
		const res = await apiClient.get<Expense[]>(`/api/_private/v1/groups/${groupId}`);
		return res.data;
	},

	toggleSimplifyDebts: async (groupId: string): Promise<{ message: string }> => {
		const res = await apiClient.put(`/api/_private/v1/groups/${groupId}/toggle-simplify`);
		return res.data;
	},

	getMembers: async (groupId: string): Promise<GroupMember[]> => {
		const res = await apiClient.get<GroupMember[]>(`/api/_private/v1/groups/${groupId}/members`);
		return res.data;
	},

	addMember: async (groupId: string, userId: string): Promise<{ message: string }> => {
		const res = await apiClient.post(`/api/_private/v1/groups/${groupId}/members/${userId}`);
		return res.data;
	},

	removeMember: async (groupId: string, userId: string): Promise<{ message: string }> => {
		const res = await apiClient.delete(`/api/_private/v1/groups/${groupId}/members/${userId}`);
		return res.data;
	},

	leave: async (groupId: string): Promise<{ message: string }> => {
		const res = await apiClient.delete(`/api/_private/v1/groups/${groupId}/leave`);
		return res.data;
	},

	deleteGroup: async (groupId: string): Promise<{ message: string }> => {
		const res = await apiClient.delete(`/api/_private/v1/groups/${groupId}`);
		return res.data;
	},
};

// -------------------------------------------------------------
// BUDGETS APIS
// -------------------------------------------------------------

export interface ApiBudget {
	id: string;
	amount: string | number;
	period: string;
	startDate: string;
	endDate: string;
	categoryId?: string | null;
	alertThreshold?: number;
}

export const budgetApi = {
	getAll: async (): Promise<ApiBudget[]> => {
		const res = await apiClient.get<ApiBudget[]>('/api/_private/v1/budgets');
		return res.data;
	},

	create: async (payload: {
		id?: string;
		amount: number;
		startDate: string;
		endDate: string;
		period?: string;
		categoryId?: string | null;
		alertThreshold?: number;
	}): Promise<ApiBudget> => {
		const res = await apiClient.post<ApiBudget>('/api/_private/v1/budgets', payload);
		return res.data;
	},

	update: async (
		budgetId: string,
		payload: Partial<{
			amount: number;
			startDate: string;
			endDate: string;
			period?: string;
			categoryId?: string | null;
			alertThreshold?: number;
		}>
	): Promise<ApiBudget> => {
		const res = await apiClient.put<ApiBudget>(`/api/_private/v1/budgets/${budgetId}`, payload);
		return res.data;
	},

	delete: async (budgetId: string): Promise<{ message: string }> => {
		const res = await apiClient.delete(`/api/_private/v1/budgets/${budgetId}`);
		return res.data;
	},
};

