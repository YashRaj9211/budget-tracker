import { useSyncExternalStore } from 'react';
import {
	Banknote,
	CalendarClock,
	CircleDollarSign,
	CreditCard,
	Landmark,
	QrCode,
	Wallet,
	type LucideIcon,
} from 'lucide-react';
import type { PaymentMethod, PaymentMethodKind } from '../../stores/paymentMethodStore';
import type { SavingsAccount } from '../../api/financeHubApi';
import type { Transaction } from '../../types';
import { num } from './ui';

export const PAYMENT_KIND_ICONS: Record<PaymentMethodKind, LucideIcon> = {
	UPI: QrCode,
	DEBIT_CARD: CreditCard,
	CREDIT_CARD: CreditCard,
	NET_BANKING: Landmark,
	WALLET: Wallet,
	CASH: Banknote,
	EMI: CalendarClock,
	OTHER: CircleDollarSign,
};

/** Subscribes to the OS "reduce motion" setting. */
const motionQuery = '(prefers-reduced-motion: reduce)';
const subscribeMotion = (cb: () => void) => {
	const mq = window.matchMedia(motionQuery);
	mq.addEventListener('change', cb);
	return () => mq.removeEventListener('change', cb);
};
export const usePrefersReducedMotion = () =>
	useSyncExternalStore(
		subscribeMotion,
		() => window.matchMedia(motionQuery).matches,
		() => false,
	);

/** Tiny haptic tap on phones that support it */
export const haptic = (ms = 8) => {
	try {
		navigator.vibrate?.(ms);
	} catch {
		/* not supported */
	}
};

/** All unique transaction.account values from the transaction list */
export function uniqueTxAccounts(transactions: Transaction[]): string[] {
	return [...new Set(transactions.map((t) => t.account).filter(Boolean))];
}

/** Spend & income totals for transactions matching a payment method's aliases.
 *  `since` ('YYYY-MM-DD') ignores anything dated before it. */
export function methodStats(method: PaymentMethod, transactions: Transaction[], since?: string) {
	const linked = new Set(method.transactionAccounts);
	if (linked.size === 0) return { spent: 0, income: 0, txCount: 0 };
	let spent = 0;
	let income = 0;
	let txCount = 0;
	for (const t of transactions) {
		if (linked.has(t.account) && (!since || t.date >= since)) {
			txCount++;
			if (t.type === 'expense') spent += t.amount;
			else income += t.amount;
		}
	}
	return { spent, income, txCount };
}

/** Transactions belonging to a payment method, latest first */
export function getMethodTransactions(method: PaymentMethod, transactions: Transaction[]): Transaction[] {
	const linked = new Set(method.transactionAccounts);
	if (linked.size === 0) return [];
	return transactions.filter((t) => linked.has(t.account)).sort((a, b) => b.date.localeCompare(a.date));
}

/** Live balance of an account after spend/income from every method linked to it */
export function getAccountDeduction(account: SavingsAccount, methods: PaymentMethod[], transactions: Transaction[]) {
	const baseBalance = num(account.balance ?? account.openingBalance);
	const linkedMethods = methods.filter((m) => m.linkedAccountIds.includes(account.id));

	let totalSpent = 0;
	let totalIncome = 0;
	let totalTxCount = 0;
	for (const m of linkedMethods) {
		// Only activity from the day the method was linked moves this account
		const st = methodStats(m, transactions, m.linkDates?.[account.id]);
		totalSpent += st.spent;
		totalIncome += st.income;
		totalTxCount += st.txCount;
	}

	return {
		baseBalance,
		totalSpent,
		totalIncome,
		totalTxCount,
		deductedBalance: baseBalance - totalSpent + totalIncome,
		linkedMethods,
	};
}

/** Net change linked methods cause across all accounts (negative = money spent). */
export function linkedBalanceAdjustment(accounts: SavingsAccount[], methods: PaymentMethod[], transactions: Transaction[]) {
	let delta = 0;
	for (const a of accounts) {
		const d = getAccountDeduction(a, methods, transactions);
		delta += d.deductedBalance - d.baseBalance;
	}
	return delta;
}
