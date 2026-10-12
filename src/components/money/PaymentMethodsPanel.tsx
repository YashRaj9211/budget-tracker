import { useMemo, useState, type FormEvent } from 'react';
import {
	ChevronDown,
	Link2,
	Link2Off,
	Plus,
	Trash2,
	X,
	QrCode,
	CreditCard,
	Landmark,
	Wallet,
	Banknote,
	CalendarClock,
	CircleDollarSign,
	WalletCards,
	type LucideIcon,
} from 'lucide-react';
import { Card } from '../ui/Card';
import {
	usePaymentMethodStore,
	PAYMENT_KIND_META,
	type PaymentMethod,
	type PaymentMethodKind,
} from '../../stores/paymentMethodStore';
import type { SavingsAccount } from '../../api/financeHubApi';
import type { Transaction } from '../../types';
import { SectionHead, money, num } from './ui';

// ── Helpers & Icon Mappings ──────────────────────────────────────────────────

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

const ALL_KINDS = Object.keys(PAYMENT_KIND_META) as PaymentMethodKind[];

/** All unique transaction.account values from the transaction list */
function uniqueTxAccounts(transactions: Transaction[]): string[] {
	return [...new Set(transactions.map((t) => t.account).filter(Boolean))];
}

/** Spend & income totals for transactions matching a payment method's linked tx accounts */
function methodStats(method: PaymentMethod, transactions: Transaction[]) {
	const linked = new Set(method.transactionAccounts);
	if (linked.size === 0) return { spent: 0, income: 0, txCount: 0 };
	let spent = 0;
	let income = 0;
	let txCount = 0;
	for (const t of transactions) {
		if (linked.has(t.account)) {
			txCount++;
			if (t.type === 'expense') spent += t.amount;
			else income += t.amount;
		}
	}
	return { spent, income, txCount };
}

// ── Main Component ────────────────────────────────────────────────────────────

interface PaymentMethodsPanelProps {
	accounts: SavingsAccount[];
	transactions: Transaction[];
}

export default function PaymentMethodsPanel({ accounts, transactions }: PaymentMethodsPanelProps) {
	const methods = usePaymentMethodStore((s) => s.methods);
	const [showAdd, setShowAdd] = useState(false);

	const totalLinkedSavings = useMemo(() => {
		const linked = new Set(methods.flatMap((m) => m.linkedAccountIds));
		return accounts.filter((a) => linked.has(a.id)).reduce((s, a) => s + num(a.balance ?? a.openingBalance), 0);
	}, [methods, accounts]);

	return (
		<div className="space-y-3.5">
			{/* Hero summary strip */}
			<div className="rounded-[28px] bg-ink text-white p-5 space-y-1">
				<p className="text-[11px] font-medium opacity-60 uppercase tracking-widest">Payment Methods</p>
				<p className="text-[28px] font-bold tracking-tight">{methods.length} configured</p>
				<p className="text-[13px] opacity-70">
					{totalLinkedSavings > 0
						? `${money(totalLinkedSavings)} across linked savings accounts`
						: 'Link methods to savings accounts to see totals'}
				</p>
			</div>

			{/* Per-method cards */}
			<Card variant="white">
				<SectionHead
					title="Your payment methods"
					hint="Link each method to savings accounts and transaction categories"
					action={
						<button
							type="button"
							onClick={() => setShowAdd((v) => !v)}
							className="aspect-square items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-[12px] font-semibold text-white hover:bg-ink-soft active:scale-95 transition-all cursor-pointer"
						>
							<Plus size={14} />
						</button>
					}
				/>

				{showAdd && (
					<div className="mb-4">
						<AddMethodForm onDone={() => setShowAdd(false)} />
					</div>
				)}

				<div className="space-y-3">
					{methods.length === 0 && (
						<div className="text-center py-10">
							<div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface text-text-muted">
								<WalletCards size={28} strokeWidth={1.8} />
							</div>
							<p className="text-[14px] font-semibold text-text">No payment methods yet</p>
							<p className="text-[12px] text-text-muted mt-1">Add your first method to connect cards and UPI to accounts</p>
						</div>
					)}
					{methods.map((m) => (
						<MethodCard
							key={m.id}
							method={m}
							accounts={accounts}
							transactions={transactions}
						/>
					))}
				</div>
			</Card>

			{/* Cross-account Savings Comparison */}
			{accounts.length > 1 && methods.length > 0 && (
				<SavingsComparisonCard accounts={accounts} methods={methods} transactions={transactions} />
			)}
		</div>
	);
}

// ── Method Card ───────────────────────────────────────────────────────────────

function MethodCard({
	method,
	accounts,
	transactions,
}: {
	method: PaymentMethod;
	accounts: SavingsAccount[];
	transactions: Transaction[];
}) {
	const [open, setOpen] = useState(false);
	const { removeMethod, linkAccount, unlinkAccount, linkTransactionAccount, unlinkTransactionAccount } =
		usePaymentMethodStore();

	const meta = PAYMENT_KIND_META[method.kind];
	const Icon = PAYMENT_KIND_ICONS[method.kind] || CircleDollarSign;
	const stats = useMemo(() => methodStats(method, transactions), [method, transactions]);
	const txAccounts = useMemo(() => uniqueTxAccounts(transactions), [transactions]);

	const linkedSavings = accounts.filter((a) => method.linkedAccountIds.includes(a.id));
	const linkedSavingsTotal = linkedSavings.reduce((s, a) => s + num(a.balance ?? a.openingBalance), 0);

	return (
		<div className="rounded-[24px] bg-surface overflow-hidden">
			{/* Header row */}
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				className="flex w-full items-center gap-3 p-4 text-left cursor-pointer"
			>
				{/* Icon pill */}
				<div
					className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
					style={{ backgroundColor: meta.hexColor + '18', color: meta.hexColor }}
				>
					<Icon size={20} strokeWidth={2.2} />
				</div>

				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2">
						<p className="text-[15px] font-semibold truncate">{method.name}</p>
						<span
							className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
							style={{ backgroundColor: meta.hexColor }}
						>
							{meta.label}
						</span>
					</div>
					<p className="mt-0.5 text-[12px] text-text-muted">
						{stats.txCount > 0
							? `${stats.txCount} txns · ${money(stats.spent)} spent`
							: 'No transactions linked yet'}
						{linkedSavings.length > 0 && ` · ${money(linkedSavingsTotal)} in savings`}
					</p>
				</div>

				<ChevronDown
					size={18}
					className={`shrink-0 text-text-muted transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
				/>
			</button>

			{/* Expanded detail */}
			{open && (
				<div className="border-t border-canvas px-4 pb-4 pt-3 space-y-4">
					{/* Stats row */}
					{stats.txCount > 0 && (
						<div className="grid grid-cols-2 gap-2">
							<div className="rounded-[18px] bg-danger-soft p-3">
								<p className="text-[11px] text-text-muted">Spent</p>
								<p className="mt-1 text-[18px] font-bold text-danger">{money(stats.spent)}</p>
							</div>
							<div className="rounded-[18px] bg-mint p-3">
								<p className="text-[11px] text-text-muted">Income</p>
								<p className="mt-1 text-[18px] font-bold text-mint-deep">{money(stats.income)}</p>
							</div>
						</div>
					)}

					{/* Savings accounts linking */}
					<div>
						<p className="text-[12px] font-semibold text-text-muted mb-2">
							Linked savings accounts
						</p>
						<div className="space-y-1.5">
							{accounts.map((a) => {
								const linked = method.linkedAccountIds.includes(a.id);
								return (
									<div
										key={a.id}
										className="flex items-center justify-between gap-3 rounded-[14px] bg-card px-3.5 py-2.5"
									>
										<div className="min-w-0">
											<p className="text-[13px] font-medium truncate">{a.name}</p>
											<p className="text-[11px] text-text-muted">
												{money(num(a.balance ?? a.openingBalance))}
											</p>
										</div>
										<button
											type="button"
											onClick={() =>
												linked
													? unlinkAccount(method.id, a.id)
													: linkAccount(method.id, a.id)
											}
											className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all active:scale-95 cursor-pointer ${
												linked
													? 'bg-mint text-mint-deep'
													: 'bg-surface text-text-muted hover:bg-canvas'
											}`}
										>
											{linked ? <Link2 size={12} /> : <Link2Off size={12} />}
											{linked ? 'Linked' : 'Link'}
										</button>
									</div>
								);
							})}
							{accounts.length === 0 && (
								<p className="text-[12px] text-text-muted">No savings accounts found. Add one in the Accounts tab.</p>
							)}
						</div>
					</div>

					{/* Transaction accounts linking */}
					<div>
						<p className="text-[12px] font-semibold text-text-muted mb-2">
							Transaction accounts (for spend tracking)
						</p>
						<div className="flex flex-wrap gap-2">
							{txAccounts.map((acc) => {
								const linked = method.transactionAccounts.includes(acc);
								return (
									<button
										key={acc}
										type="button"
										onClick={() =>
											linked
												? unlinkTransactionAccount(method.id, acc)
												: linkTransactionAccount(method.id, acc)
										}
										className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition-all active:scale-95 cursor-pointer ${
											linked
												? 'bg-ink text-white'
												: 'bg-surface text-text hover:bg-canvas'
										}`}
									>
										{linked && <X size={11} />}
										{acc}
									</button>
								);
							})}
							{txAccounts.length === 0 && (
								<p className="text-[12px] text-text-muted">
									No transactions found. Add some transactions first.
								</p>
							)}
						</div>
					</div>

					{method.note && (
						<p className="text-[12px] text-text-muted italic">{method.note}</p>
					)}

					<button
						type="button"
						onClick={() => {
							if (window.confirm(`Delete "${method.name}"?`)) removeMethod(method.id);
						}}
						className="flex items-center gap-1.5 text-[12px] font-medium text-danger hover:opacity-70 transition-opacity cursor-pointer"
					>
						<Trash2 size={13} /> Delete method
					</button>
				</div>
			)}
		</div>
	);
}

// ── Add Method Form ───────────────────────────────────────────────────────────

function AddMethodForm({ onDone }: { onDone: () => void }) {
	const addMethod = usePaymentMethodStore((s) => s.addMethod);
	const [name, setName] = useState('');
	const [kind, setKind] = useState<PaymentMethodKind>('UPI');
	const [note, setNote] = useState('');

	const submit = (e: FormEvent) => {
		e.preventDefault();
		if (!name.trim()) return;
		addMethod({
			name: name.trim(),
			kind,
			linkedAccountIds: [],
			transactionAccounts: [],
			note: note.trim() || undefined,
		});
		setName('');
		setNote('');
		onDone();
	};

	return (
		<form
			onSubmit={submit}
			className="rounded-[24px] bg-surface p-4 space-y-3"
		>
			<p className="text-[14px] font-semibold">New payment method</p>

			<input
				className="w-full h-12 px-4 bg-card text-text placeholder:text-text-muted rounded-full text-[14px] focus:outline-none focus:ring-2 focus:ring-lavender-deep/40"
				placeholder="Name, e.g. GPay, HDFC Credit"
				value={name}
				onChange={(e) => setName(e.target.value)}
				required
			/>

			{/* Kind picker */}
			<div className="flex flex-wrap gap-2">
				{ALL_KINDS.map((k) => {
					const m = PAYMENT_KIND_META[k];
					const KindIcon = PAYMENT_KIND_ICONS[k];
					const isSelected = kind === k;
					return (
						<button
							key={k}
							type="button"
							onClick={() => setKind(k)}
							className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-[12px] font-medium transition-all active:scale-95 cursor-pointer ${
								isSelected ? 'bg-ink text-white' : 'bg-card text-text hover:bg-canvas'
							}`}
						>
							<KindIcon size={14} className={isSelected ? 'text-white' : 'text-text-muted'} />
							{m.label}
						</button>
					);
				})}
			</div>

			<input
				className="w-full h-11 px-4 bg-card text-text placeholder:text-text-muted rounded-full text-[13px] focus:outline-none focus:ring-2 focus:ring-lavender-deep/40"
				placeholder="Note (optional)"
				value={note}
				onChange={(e) => setNote(e.target.value)}
			/>

			<div className="flex gap-2">
				<button
					type="submit"
					className="flex-1 rounded-full bg-ink py-3 text-[14px] font-semibold text-white hover:bg-ink-soft active:scale-95 transition-all cursor-pointer"
				>
					Add method
				</button>
				<button
					type="button"
					onClick={onDone}
					className="rounded-full bg-surface px-5 py-3 text-[14px] font-medium text-text-muted hover:bg-canvas active:scale-95 transition-all cursor-pointer"
				>
					Cancel
				</button>
			</div>
		</form>
	);
}

// ── Savings Comparison Card ───────────────────────────────────────────────────

function SavingsComparisonCard({
	accounts,
	methods,
	transactions,
}: {
	accounts: SavingsAccount[];
	methods: PaymentMethod[];
	transactions: Transaction[];
}) {
	// For each savings account: what is the balance, and what is total spend via linked methods?
	const rows = useMemo(() => {
		return accounts.map((a) => {
			const linkedMethods = methods.filter((m) => m.linkedAccountIds.includes(a.id));
			const totalSpent = linkedMethods.reduce((sum, m) => sum + methodStats(m, transactions).spent, 0);
			const totalIncome = linkedMethods.reduce((sum, m) => sum + methodStats(m, transactions).income, 0);
			const balance = num(a.balance ?? a.openingBalance);
			return { account: a, balance, linkedMethods, totalSpent, totalIncome };
		});
	}, [accounts, methods, transactions]);

	const maxBalance = Math.max(...rows.map((r) => r.balance), 1);

	return (
		<Card variant="white">
			<SectionHead
				title="Savings vs. Spend comparison"
				hint="Per account — balance vs. spend routed through linked payment methods"
			/>
			<div className="space-y-4">
				{rows.map(({ account, balance, linkedMethods, totalSpent, totalIncome }) => {
					const spendPct = balance > 0 ? Math.min((totalSpent / balance) * 100, 100) : 0;
					const balancePct = (balance / maxBalance) * 100;
					const net = balance - totalSpent;

					return (
						<div key={account.id} className="rounded-[20px] bg-surface p-4 space-y-3">
							{/* Account header */}
							<div className="flex items-start justify-between gap-2">
								<div>
									<p className="text-[14px] font-semibold">{account.name}</p>
									<div className="mt-1 flex flex-wrap items-center gap-1.5">
										{linkedMethods.length > 0 ? (
											linkedMethods.map((m) => {
												const LinkedIcon = PAYMENT_KIND_ICONS[m.kind];
												const meta = PAYMENT_KIND_META[m.kind];
												return (
													<span
														key={m.id}
														className="inline-flex items-center gap-1 rounded-full bg-card px-2 py-0.5 text-[11px] font-medium text-text border border-canvas"
													>
														<LinkedIcon size={12} style={{ color: meta.hexColor }} />
														{m.name}
													</span>
												);
											})
										) : (
											<span className="text-[11px] text-text-muted">No methods linked</span>
										)}
									</div>
								</div>
								<div className="text-right">
									<p className="text-[17px] font-bold">{money(balance)}</p>
									<p className={`text-[11px] font-medium ${net >= 0 ? 'text-mint-deep' : 'text-danger'}`}>
										{net >= 0 ? '+' : ''}{money(net)} net
									</p>
								</div>
							</div>

							{/* Balance bar */}
							<div className="space-y-1">
								<div className="flex justify-between text-[10px] text-text-muted">
									<span>Balance</span>
									<span>{money(balance)}</span>
								</div>
								<div className="h-2.5 w-full overflow-hidden rounded-full bg-canvas">
									<div
										className="h-full rounded-full bg-mint-deep transition-all duration-700"
										style={{ width: `${balancePct}%` }}
									/>
								</div>
							</div>

							{/* Spend bar */}
							{totalSpent > 0 && (
								<div className="space-y-1">
									<div className="flex justify-between text-[10px] text-text-muted">
										<span>Spend via linked methods</span>
										<span className="text-danger">{money(totalSpent)}</span>
									</div>
									<div className="h-2.5 w-full overflow-hidden rounded-full bg-canvas">
										<div
											className="h-full rounded-full bg-danger transition-all duration-700"
											style={{ width: `${spendPct}%` }}
										/>
									</div>
								</div>
							)}

							{/* Income */}
							{totalIncome > 0 && (
								<div className="flex items-center justify-between text-[12px]">
									<span className="text-text-muted">Income via methods</span>
									<span className="font-semibold text-mint-deep">{money(totalIncome)}</span>
								</div>
							)}
						</div>
					);
				})}
			</div>
		</Card>
	);
}
