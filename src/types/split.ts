export interface GroupMemberInfo {
	id: string; // User ID
	name: string;
	username?: string;
	avatarUrl?: string;
	role?: 'ADMIN' | 'MEMBER';
}

export interface Group {
	id: string;
	name: string;
	description?: string;
	members: string[]; // Member names e.g. ['You', 'Alex', 'Sam']
	memberDetails?: GroupMemberInfo[]; // Rich server user details
	avatarColor: string; // Tailwind background / pastel color class
	simplifyDebts?: boolean;
	createdAt: number;
}

export interface SplitExpense {
	id: string;
	groupId: string;
	title: string;
	amount: number;
	paidBy: string; // Member name who paid (e.g. 'You' or member name)
	paidById?: string; // Payer user ID
	splitAmong: string[]; // Member names who share the expense
	splitAmongIds?: string[]; // Member user IDs
	splitIds?: string[]; // Server ExpenseSplit IDs for settling
	date: string; // 'YYYY-MM-DD'
	createdAt: number;
	isSettlement?: boolean; // true if this is a settle-up transaction
}

export interface MemberBalance {
	member: string;
	memberId?: string;
	netAmount: number; // positive = owed money, negative = owes money
}

export interface Debt {
	from: string;
	fromId?: string;
	to: string;
	toId?: string;
	amount: number;
	splitId?: string;
}
