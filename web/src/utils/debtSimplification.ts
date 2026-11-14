import type { MemberBalance, Debt } from '../types/split';
import type { SplitExpense } from '../types/split';

/**
 * Converts a currency amount (rupees/dollars) into integer minor units (paise/cents)
 * to avoid floating-point representation drift (e.g., 0.1 + 0.2 !== 0.3).
 */
export function toPaise(rupees: number | string): number {
	const num = typeof rupees === 'string' ? parseFloat(rupees) : rupees;
	if (isNaN(num)) return 0;
	return Math.round(num * 100);
}

/**
 * Converts integer minor units (paise/cents) back to standard currency units (rupees/dollars).
 */
export function toRupees(paise: number): number {
	return paise / 100;
}

/**
 * Calculates group member balances and simplified debts using integer paise arithmetic.
 *
 * People are identified by user ID when we have one (server data), so two members with
 * the same display name never get mixed up. Without IDs (guest/local mode) the name is the key.
 *
 * @param idToName optional map of userId -> display name for every group member
 */
export function calculateGroupBalances(
	members: string[],
	splits: SplitExpense[],
	idToName?: Record<string, string>
): { memberBalances: MemberBalance[]; debts: Debt[] } {
	const balancesInPaise: Record<string, number> = {};
	const names: Record<string, string> = {}; // key -> display name
	const ids: Record<string, string | undefined> = {}; // key -> user id

	const register = (key: string, name: string, id?: string) => {
		if (!(key in balancesInPaise)) balancesInPaise[key] = 0;
		names[key] = names[key] || name;
		if (id) ids[key] = id;
	};

	// Start every known member at 0
	if (idToName) {
		Object.entries(idToName).forEach(([id, name]) => register(id, name, id));
	}
	const knownNames = new Set(Object.values(names));
	members.forEach((m) => {
		if (!knownNames.has(m)) register(m, m);
	});

	splits.forEach((s) => {
		if (!s.splitAmong || s.splitAmong.length === 0) return;

		const totalPaise = toPaise(s.amount);
		const count = s.splitAmong.length;
		const baseShare = Math.floor(totalPaise / count);
		let remainder = totalPaise % count;

		// The payer is credited the full amount
		const payerKey = s.paidById || s.paidBy;
		register(payerKey, s.paidBy, s.paidById);
		balancesInPaise[payerKey] += totalPaise;

		// Everyone sharing it is debited their share; leftover paise go to the first few people
		s.splitAmong.forEach((name, i) => {
			const id = s.splitAmongIds?.[i];
			const key = id || name;
			register(key, name, id);
			const share = baseShare + (remainder > 0 ? 1 : 0);
			if (remainder > 0) remainder--;
			balancesInPaise[key] -= share;
		});
	});

	const memberBalances: MemberBalance[] = Object.entries(balancesInPaise).map(([key, netPaise]) => ({
		member: names[key],
		memberId: ids[key],
		netAmount: toRupees(netPaise),
	}));

	interface AccountPaise {
		member: string;
		memberId?: string;
		amountPaise: number;
	}
	const debtors: AccountPaise[] = [];
	const creditors: AccountPaise[] = [];

	Object.entries(balancesInPaise).forEach(([key, netPaise]) => {
		const acct = { member: names[key], memberId: ids[key] };
		if (netPaise < 0) debtors.push({ ...acct, amountPaise: -netPaise });
		else if (netPaise > 0) creditors.push({ ...acct, amountPaise: netPaise });
	});

	// Greedy debt simplification
	const debts: Debt[] = [];
	let dIdx = 0;
	let cIdx = 0;

	while (dIdx < debtors.length && cIdx < creditors.length) {
		const debtor = debtors[dIdx];
		const creditor = creditors[cIdx];
		const settlePaise = Math.min(debtor.amountPaise, creditor.amountPaise);

		if (settlePaise > 0) {
			debts.push({
				from: debtor.member,
				fromId: debtor.memberId,
				to: creditor.member,
				toId: creditor.memberId,
				amount: toRupees(settlePaise),
			});
		}
		debtor.amountPaise -= settlePaise;
		creditor.amountPaise -= settlePaise;
		if (debtor.amountPaise === 0) dIdx++;
		if (creditor.amountPaise === 0) cIdx++;
	}

	return { memberBalances, debts };
}
