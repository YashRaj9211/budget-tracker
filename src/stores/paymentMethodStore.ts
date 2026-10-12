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
	addMethod: (data: Omit<PaymentMethod, "id" | "createdAt">) => void;
	updateMethod: (id: string, data: Partial<Omit<PaymentMethod, "id" | "createdAt">>) => void;
	removeMethod: (id: string) => void;
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

export const usePaymentMethodStore = create<PaymentMethodState>()(
	persist(
		(set) => ({
			methods: [],

			addMethod(data) {
				const method: PaymentMethod = { ...data, id: crypto.randomUUID(), createdAt: Date.now() };
				set((s) => ({ methods: [...s.methods, method] }));
			},

			updateMethod(id, data) {
				set((s) => ({ methods: s.methods.map((m) => (m.id === id ? { ...m, ...data } : m)) }));
			},

			removeMethod(id) {
				set((s) => ({ methods: s.methods.filter((m) => m.id !== id) }));
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
