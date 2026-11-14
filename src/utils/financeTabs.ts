import { BarChart3, CreditCard, LayoutDashboard, Receipt, Landmark } from 'lucide-react';

export const FINANCE_TABS = [
	{ id: 'overview', label: 'Overview', icon: LayoutDashboard },
	{ id: 'trends', label: 'Trends', icon: BarChart3 },
	{ id: 'expenses', label: 'Expenses', icon: Receipt },
	{ id: 'accounts', label: 'Accounts', icon: Landmark },
	{ id: 'payments', label: 'Payments', icon: CreditCard },
] as const;

export type FinanceTab = (typeof FINANCE_TABS)[number]['id'];

export function parseFinanceTab(value: string | null): FinanceTab {
	return FINANCE_TABS.find((t) => t.id === value)?.id ?? 'overview';
}
