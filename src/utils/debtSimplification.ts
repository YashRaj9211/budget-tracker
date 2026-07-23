import type { MemberBalance, Debt } from '../types/split';
import type { SplitExpense } from '../types/split';

export function calculateGroupBalances(
	members: string[],
	splits: SplitExpense[]
): { memberBalances: MemberBalance[]; debts: Debt[] } {
	const balances: Record<string, number> = {};

	// Initialize 0 balance for all members
	members.forEach((m) => {
		balances[m] = 0;
	});

	// Calculate net impact for each split
	splits.forEach((s) => {
		if (!s.splitAmong || s.splitAmong.length === 0) return;
		const shareAmount = s.amount / s.splitAmong.length;

		// The person who paid gets credited the total amount
		balances[s.paidBy] = (balances[s.paidBy] || 0) + s.amount;

		// Everyone who shares the expense gets debited their share
		s.splitAmong.forEach((member) => {
			balances[member] = (balances[member] || 0) - shareAmount;
		});
	});

	const memberBalances: MemberBalance[] = Object.entries(balances).map(
		([member, netAmount]) => ({
			member,
			netAmount: Math.round(netAmount),
		})
	);

	// Calculate simplified debts (who pays whom)
	const debtors = memberBalances.filter((b) => b.netAmount < -0.5).map((b) => ({ ...b }));
	const creditors = memberBalances.filter((b) => b.netAmount > 0.5).map((b) => ({ ...b }));

	const debts: Debt[] = [];
	let dIdx = 0;
	let cIdx = 0;

	while (dIdx < debtors.length && cIdx < creditors.length) {
		const debtor = debtors[dIdx];
		const creditor = creditors[cIdx];

		const amountToSettle = Math.min(-debtor.netAmount, creditor.netAmount);

		if (amountToSettle > 0) {
			debts.push({
				from: debtor.member,
				to: creditor.member,
				amount: Math.round(amountToSettle),
			});
		}

		debtor.netAmount += amountToSettle;
		creditor.netAmount -= amountToSettle;

		if (Math.abs(debtor.netAmount) < 0.5) dIdx++;
		if (Math.abs(creditor.netAmount) < 0.5) cIdx++;
	}

	return { memberBalances, debts };
}
