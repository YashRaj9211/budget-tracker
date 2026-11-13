import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PaymentMethodKind =
	| "UPI"
	| "DEBIT_CARD"
	| "CREDIT_CARD"
	| "NET_BANKING"
	| "WALLET"
	| "CASH"
	| "EMI"
	| "OTHER";

export interface PaymentMethod {
	id: string;
	name: string;
	kind: PaymentMethodKind;
	linkedAccountIds: string[];
	transactionAccounts: string[];
	note?: string;
	createdAt: number;
}

export interface PaymentMethodState {
	methods: PaymentMethod[];
	deletedMethodNames?: string[];
	addMethod: (data: Omit<PaymentMethod, "id" | "createdAt">) => void;
	updateMethod: (id: string, data: Partial<Omit<PaymentMethod, "id" | "createdAt">>) => void;
	removeMethod: (id: string) => void;
	syncExistingAccounts: (accountNames: string[]) => void;
	linkAccount: (methodId: string, savingsAccountId: string) => void;
	unlinkAccount: (methodId: string, savingsAccountId: string) => void;
	linkTransactionAccount: (methodId: string, txAccount: string) => void;
	unlinkTransactionAccount: (methodId: string, txAccount: string) => void;
}

export const PAYMENT_KIND_META: Record<PaymentMethodKind, { label: string; hexColor: string }> = {
	UPI:          { label: "UPI",         hexColor: "#7C3AED" },
	DEBIT_CARD:   { label: "Debit Card",  hexColor: "#2563EB" },
	CREDIT_CARD:  { label: "Credit Card", hexColor: "#DC2626" },
	NET_BANKING:  { label: "Net Banking", hexColor: "#0891B2" },
	WALLET:       { label: "Wallet",      hexColor: "#D97706" },
	CASH:         { label: "Cash",        hexColor: "#059669" },
	EMI:          { label: "EMI",         hexColor: "#9333EA" },
	OTHER:        { label: "Other",       hexColor: "#6B7280" },
};

export function inferKindFromName(name: string): PaymentMethodKind {
	const lower = name.toLowerCase();
	if (
		lower.includes("upi") ||
		lower.includes("gpay") ||
		lower.includes("google pay") ||
		lower.includes("paytm") ||
		lower.includes("phonepe") ||
		lower.includes("bhim")
	) {
		return "UPI";
	}
	if (lower.includes("cash")) {
		return "CASH";
	}
	if (lower.includes("credit")) {
		return "CREDIT_CARD";
	}
	if (lower.includes("debit") || lower.includes("card")) {
		return "DEBIT_CARD";
	}
	if (lower.includes("net") || lower.includes("bank") || lower.includes("neft") || lower.includes("rtgs")) {
		return "NET_BANKING";
	}
	if (lower.includes("wallet")) {
		return "WALLET";
	}
	if (lower.includes("emi")) {
		return "EMI";
	}
	return "OTHER";
}

export const usePaymentMethodStore = create<PaymentMethodState>()(
	persist(
		(set) => ({
			methods: [],
			deletedMethodNames: [],

			addMethod(data) {
				const method: PaymentMethod = { ...data, id: crypto.randomUUID(), createdAt: Date.now() };
				set((s) => ({
					methods: [...s.methods, method],
					deletedMethodNames: (s.deletedMethodNames || []).filter(
						(n) => n.toLowerCase() !== data.name.toLowerCase()
					),
				}));
			},

			updateMethod(id, data) {
				set((s) => ({ methods: s.methods.map((m) => (m.id === id ? { ...m, ...data } : m)) }));
			},

			removeMethod(id) {
				set((s) => {
					const target = s.methods.find((m) => m.id === id);
					return {
						methods: s.methods.filter((m) => m.id !== id),
						deletedMethodNames: target
							? [...(s.deletedMethodNames || []), target.name.toLowerCase()]
							: s.deletedMethodNames || [],
					};
				});
			},

			syncExistingAccounts(accountNames) {
				set((s) => {
					const existingNames = new Set(s.methods.map((m) => m.name.toLowerCase()));
					const deleted = new Set((s.deletedMethodNames || []).map((n) => n.toLowerCase()));
					const toAdd: PaymentMethod[] = [];

					for (const name of accountNames) {
						const trimmed = name.trim();
						if (!trimmed) continue;
						const lower = trimmed.toLowerCase();
						// Check if already covered by an existing method name or transactionAccounts
						const alreadyHandled =
							existingNames.has(lower) ||
							s.methods.some((m) => m.transactionAccounts.some((ta) => ta.toLowerCase() === lower));

						if (alreadyHandled || deleted.has(lower)) continue;

						toAdd.push({
							id: crypto.randomUUID(),
							name: trimmed,
							kind: inferKindFromName(trimmed),
							linkedAccountIds: [],
							transactionAccounts: [trimmed],
							createdAt: Date.now(),
						});
						existingNames.add(lower);
					}

					if (toAdd.length === 0) return s;
					return { methods: [...s.methods, ...toAdd] };
				});
			},

			linkAccount(methodId, savingsAccountId) {
				set((s) => ({
					methods: s.methods.map((m) =>
						m.id === methodId && !m.linkedAccountIds.includes(savingsAccountId)
							? { ...m, linkedAccountIds: [...m.linkedAccountIds, savingsAccountId] }
							: m,
					),
				}));
			},

			unlinkAccount(methodId, savingsAccountId) {
				set((s) => ({
					methods: s.methods.map((m) =>
						m.id === methodId
							? { ...m, linkedAccountIds: m.linkedAccountIds.filter((id) => id !== savingsAccountId) }
							: m,
					),
				}));
			},

			linkTransactionAccount(methodId, txAccount) {
				set((s) => ({
					methods: s.methods.map((m) =>
						m.id === methodId && !m.transactionAccounts.includes(txAccount)
							? { ...m, transactionAccounts: [...m.transactionAccounts, txAccount] }
							: m,
					),
				}));
			},

			unlinkTransactionAccount(methodId, txAccount) {
				set((s) => ({
					methods: s.methods.map((m) =>
						m.id === methodId
							? { ...m, transactionAccounts: m.transactionAccounts.filter((a) => a !== txAccount) }
							: m,
					),
				}));
			},
		}),
		{ name: "bt-payment-methods", version: 1 },
	),
);
