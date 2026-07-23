export interface Group {
	id: string;
	name: string;
	members: string[]; // Member names e.g. ['You', 'Alex', 'Sam']
	avatarColor: string; // Tailwind background / pastel color class
	createdAt: number;
}

export interface SplitExpense {
	id: string;
	groupId: string;
	title: string;
	amount: number;
	paidBy: string; // Member name who paid
	splitAmong: string[]; // Member names who share the expense
	date: string; // 'YYYY-MM-DD'
	createdAt: number;
	isSettlement?: boolean; // true if this is a settle-up transaction
}

export interface MemberBalance {
	member: string;
	netAmount: number; // positive = owed money, negative = owes money
}

export interface Debt {
	from: string;
	to: string;
	amount: number;
}
