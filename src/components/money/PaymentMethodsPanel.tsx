import { useMemo, useState, useEffect, useRef, type FormEvent, type DragEvent } from 'react';
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
	Check,
	ArrowRight,
	GripVertical,
	Undo2,
	Sparkles,
	Receipt,
	TrendingDown,
	TrendingUp,
	type LucideIcon,
} from 'lucide-react';
import { Card } from '../ui/Card';
import {
	usePaymentMethodStore,
	PAYMENT_KIND_META,
	type PaymentMethod,
	type PaymentMethodKind,
} from '../../stores/paymentMethodStore';
import { useBudgetStore } from '../../stores/budgetStore';
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
const DRAG_TYPE = 'text/pm-method';

/** Tiny haptic tap on phones that support it */
const haptic = () => {
	try {
		navigator.vibrate?.(8);
	} catch {
		/* not supported */
	}
};

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

/** Get list of all transactions belonging to a payment method (sorted latest first) */
function getMethodTransactions(method: PaymentMethod, transactions: Transaction[]): Transaction[] {
	const linked = new Set(method.transactionAccounts);
	if (linked.size === 0) return [];
	return transactions
		.filter((t) => linked.has(t.account))
		.sort((a, b) => b.date.localeCompare(a.date));
}

/** Deduct spend from an account's balance across all payment methods linked to it */
function getAccountDeduction(
	account: SavingsAccount,
	methods: PaymentMethod[],
	transactions: Transaction[]
) {
	const baseBalance = num(account.balance ?? account.openingBalance);
	const linkedMethods = methods.filter((m) => m.linkedAccountIds.includes(account.id));

	let totalSpent = 0;
	let totalIncome = 0;
	let totalTxCount = 0;

	for (const m of linkedMethods) {
		const st = methodStats(m, transactions);
		totalSpent += st.spent;
		totalIncome += st.income;
		totalTxCount += st.txCount;
	}

	const deductedBalance = baseBalance - totalSpent + totalIncome;

	return {
		baseBalance,
		totalSpent,
		totalIncome,
		totalTxCount,
		deductedBalance,
		linkedMethods,
	};
}

// ── Animations (scoped keyframes, respects reduced motion) ───────────────────

const MotionStyles = () => (
	<style>{`
		@keyframes pm-pop { 0%{transform:scale(.3);opacity:0} 60%{transform:scale(1.25);opacity:1} 100%{transform:scale(1)} }
		@keyframes pm-ring { 0%{box-shadow:0 0 0 0 rgba(16,185,129,.45)} 100%{box-shadow:0 0 0 14px rgba(16,185,129,0)} }
		@keyframes pm-dash { to { stroke-dashoffset: -12 } }
		@keyframes pm-up { from{transform:translate(-50%,24px);opacity:0} to{transform:translate(-50%,0);opacity:1} }
		@keyframes pm-in { from{transform:translateY(6px);opacity:0} to{transform:none;opacity:1} }
		@keyframes pm-shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-3px)} 75%{transform:translateX(3px)} }
		.pm-pop{animation:pm-pop .38s cubic-bezier(.2,.9,.3,1.3)}
		.pm-ring{animation:pm-ring .7s ease-out}
		.pm-dash{animation:pm-dash .6s linear infinite}
		.pm-up{animation:pm-up .3s cubic-bezier(.2,.9,.3,1.1) both}
		.pm-in{animation:pm-in .25s ease-out both}
		.pm-shake{animation:pm-shake .3s ease-in-out 2}
		@media (prefers-reduced-motion: reduce){
			.pm-pop,.pm-ring,.pm-dash,.pm-up,.pm-in,.pm-shake{animation:none}
		}
	`}</style>
);

// ── Toast with Undo ──────────────────────────────────────────────────────────

type ToastState = { id: number; message: string; undo?: () => void } | null;
type Notify = (message: string, undo?: () => void) => void;

function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
	useEffect(() => {
		if (!toast) return;
		const t = setTimeout(onClose, 4000);
		return () => clearTimeout(t);
	}, [toast, onClose]);

	if (!toast) return null;
	return (
		<div
			key={toast.id}
			role="status"
			className="pm-up fixed bottom-5 left-1/2 z-50 flex items-center gap-3 rounded-full bg-ink text-white pl-4 pr-2 py-2 shadow-lg text-[12px] font-medium"
		>
			<Check size={14} className="text-mint-deep" />
			<span>{toast.message}</span>
			{toast.undo && (
				<button
					type="button"
					onClick={() => {
						toast.undo?.();
						onClose();
					}}
					className="inline-flex items-center gap-1 rounded-full bg-white/10 hover:bg-white/20 px-3 py-1 font-semibold cursor-pointer"
				>
					<Undo2 size={12} /> Undo
				</button>
			)}
		</div>
	);
}

// ── Animated "connection" line between a method and an account ───────────────

function SyncLink({ active, color }: { active: boolean; color: string }) {
	return (
		<svg width="36" height="10" viewBox="0 0 36 10" className="shrink-0" aria-hidden>
			<line
				x1="2"
				y1="5"
				x2="34"
				y2="5"
				stroke={active ? color : 'currentColor'}
				strokeWidth="2"
				strokeLinecap="round"
				strokeDasharray="2 4"
				className={active ? 'pm-dash' : 'opacity-30'}
			/>
			<circle cx="2" cy="5" r="2" fill={active ? color : 'currentColor'} opacity={active ? 1 : 0.3} />
			<circle cx="34" cy="5" r="2" fill={active ? color : 'currentColor'} opacity={active ? 1 : 0.3} />
		</svg>
	);
}

// ── Smooth height animation ──────────────────────────────────────────────────

function Collapse({ open, children }: { open: boolean; children: React.ReactNode }) {
	return (
		<div
			className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
				open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
			}`}
			aria-hidden={!open}
		>
			<div className="overflow-hidden">{open && children}</div>
		</div>
	);
}

// ── Main Component ────────────────────────────────────────────────────────────

interface PaymentMethodsPanelProps {
	accounts: SavingsAccount[];
	transactions: Transaction[];
	onGoToAccounts?: () => void;
}

export default function PaymentMethodsPanel({
	accounts,
	transactions,
	onGoToAccounts,
}: PaymentMethodsPanelProps) {
	const methods = usePaymentMethodStore((s) => s.methods);
	const syncExistingAccounts = usePaymentMethodStore((s) => s.syncExistingAccounts);
	const budgetAccounts = useBudgetStore((s) => s.accounts);
	const loadBudgetAccounts = useBudgetStore((s) => s.loadAccounts);
	const [showAdd, setShowAdd] = useState(false);
	const [toast, setToast] = useState<ToastState>(null);
	const [dragId, setDragId] = useState<string | null>(null);

	const notify: Notify = (message, undo) => setToast({ id: Date.now(), message, undo });

	// Ensure budget accounts are loaded from store/IndexedDB
	useEffect(() => {
		loadBudgetAccounts();
	}, [loadBudgetAccounts]);

	// Auto-sync existing payment methods from budgetStore.accounts and transaction history
	useEffect(() => {
		const txAccs = uniqueTxAccounts(transactions);
		const combined = Array.from(new Set([...budgetAccounts, ...txAccs])).filter(Boolean);
		if (combined.length > 0) syncExistingAccounts(combined);
	}, [budgetAccounts, transactions, syncExistingAccounts]);

	// Global metrics with real-time deductions
	const metrics = useMemo(() => {
		const linkedAccountIds = new Set(methods.flatMap((m) => m.linkedAccountIds));
		const linkedAccounts = accounts.filter((a) => linkedAccountIds.has(a.id));

		const rawLinkedSavingsTotal = linkedAccounts.reduce(
			(s, a) => s + num(a.balance ?? a.openingBalance),
			0,
		);

		let totalSpent = 0;
		let totalIncome = 0;
		let totalTxCount = 0;
		let syncedCount = 0;

		for (const m of methods) {
			if (m.linkedAccountIds.length > 0) syncedCount++;
			const st = methodStats(m, transactions);
			totalSpent += st.spent;
			totalIncome += st.income;
			totalTxCount += st.txCount;
		}

		// Amount deducted from accounts
		const netLinkedSavingsTotal = Math.max(0, rawLinkedSavingsTotal - totalSpent + totalIncome);

		return {
			rawLinkedSavingsTotal,
			netLinkedSavingsTotal,
			totalSpent,
			totalIncome,
			totalTxCount,
			syncedCount,
			unsyncedCount: methods.length - syncedCount,
		};
	}, [methods, accounts, transactions]);

	const syncPct = methods.length ? Math.round((metrics.syncedCount / methods.length) * 100) : 0;
	const draggingMethod = methods.find((m) => m.id === dragId) ?? null;

	return (
		<div className="space-y-3.5">
			<MotionStyles />

			{/* Hero summary strip */}
			<div className="rounded-[28px] bg-ink text-white p-5 space-y-3.5 shadow-sm">
				<div className="flex items-start justify-between gap-3">
					<div>
						<p className="text-[11px] font-medium opacity-60 uppercase tracking-widest">Payment Hub</p>
						<p className="text-[26px] font-bold tracking-tight mt-0.5">
							{methods.length} {methods.length === 1 ? 'Method' : 'Methods'} Configured
						</p>
					</div>
					<button
						type="button"
						onClick={() => setShowAdd((v) => !v)}
						className="inline-flex items-center gap-1.5 rounded-full bg-white text-ink px-4 py-2 text-[12px] font-semibold hover:bg-slate-100 active:scale-95 transition-all cursor-pointer shadow-sm shrink-0"
					>
						<Plus
							size={14}
							className={`transition-transform duration-300 ${showAdd ? 'rotate-45' : ''}`}
						/>
						<span>{showAdd ? 'Close' : 'New Method'}</span>
					</button>
				</div>

				{/* Quick Stat Tiles with Deducted Balance */}
				<div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1 border-t border-white/10">
					<div className="rounded-2xl bg-white/5 p-3">
						<p className="text-[10px] uppercase font-semibold text-white/50 tracking-wider">Sync Status</p>
						<p className="text-[15px] font-bold mt-0.5 text-white">
							{metrics.syncedCount} / {methods.length} Synced
						</p>
						<div className="mt-1.5 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
							<div
								className="h-full rounded-full bg-mint-deep transition-all duration-700"
								style={{ width: `${syncPct}%` }}
							/>
						</div>
						<p className="text-[11px] text-white/60 mt-1">
							{metrics.unsyncedCount > 0 ? `${metrics.unsyncedCount} need sync` : 'All synced 🎉'}
						</p>
					</div>

					<div className="rounded-2xl bg-white/5 p-3">
						<p className="text-[10px] uppercase font-semibold text-white/50 tracking-wider">Net Remaining Balance</p>
						<p className="text-[15px] font-bold mt-0.5 text-mint-deep">
							{money(metrics.netLinkedSavingsTotal)}
						</p>
						<p className="text-[11px] text-white/60 mt-0.5">
							{metrics.totalSpent > 0
								? `${money(metrics.totalSpent)} deducted`
								: 'no deductions yet'}
						</p>
					</div>

					<div className="rounded-2xl bg-white/5 p-3 col-span-2 sm:col-span-1">
						<p className="text-[10px] uppercase font-semibold text-white/50 tracking-wider">Deducted Spend</p>
						<p className="text-[15px] font-bold mt-0.5 text-danger">
							{money(metrics.totalSpent)}
						</p>
						<p className="text-[11px] text-white/60 mt-0.5">
							across {metrics.totalTxCount} transactions
						</p>
					</div>
				</div>
			</div>

			{/* Existing Payment Methods Card */}
			<Card variant="white" className="p-5 space-y-4">
				<div className="flex items-center justify-between gap-3">
					<div>
						<div className="flex items-center gap-2">
							<h3 className="text-[16px] font-bold text-text">Your Payment Methods</h3>
							<span className="rounded-full bg-surface px-2.5 py-0.5 text-[11px] font-semibold text-text-muted">
								{methods.length}
							</span>
						</div>
						<p className="text-[12px] text-text-muted mt-0.5">
							Connecting a payment method automatically deducts spend from its account
						</p>
					</div>

					<button
						type="button"
						onClick={() => setShowAdd((v) => !v)}
						className="inline-flex items-center gap-1.5 rounded-full bg-ink text-white px-3.5 py-1.5 text-[12px] font-semibold hover:bg-ink-soft active:scale-95 transition-all cursor-pointer shadow-sm shrink-0"
					>
						<Plus size={13} className={showAdd ? 'rotate-45' : ''} />
						<span>{showAdd ? 'Close' : 'Add New'}</span>
					</button>
				</div>

				{/* Smooth expand for the add form */}
				<Collapse open={showAdd}>
					<AddMethodForm
						accounts={accounts}
						methods={methods}
						transactions={transactions}
						onDone={() => setShowAdd(false)}
						onGoToAccounts={onGoToAccounts}
						notify={notify}
					/>
				</Collapse>

				{/* List of Existing Payment Methods */}
				<div className="space-y-3">
					{methods.length === 0 && (
						<div className="text-center py-10 rounded-[20px] bg-surface p-6 pm-in">
							<div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-card text-text-muted">
								<WalletCards size={28} strokeWidth={1.8} />
							</div>
							<p className="text-[14px] font-semibold text-text">No payment methods yet</p>
							<p className="text-[12px] text-text-muted mt-1 max-w-sm mx-auto">
								Add a card, UPI or cash method and connect it to a savings account to track real-time deductions.
							</p>
							<button
								type="button"
								onClick={() => setShowAdd(true)}
								className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-[12px] font-semibold text-white hover:bg-ink-soft active:scale-95 transition-all cursor-pointer"
							>
								<Plus size={14} /> Create payment method
							</button>
						</div>
					)}

					{methods.map((m, i) => (
						<div key={m.id} className="pm-in" style={{ animationDelay: `${i * 35}ms` }}>
							<MethodCard
								method={m}
								methods={methods}
								accounts={accounts}
								transactions={transactions}
								onGoToAccounts={onGoToAccounts}
								notify={notify}
								isDragging={dragId === m.id}
								onDragStart={() => setDragId(m.id)}
								onDragEnd={() => setDragId(null)}
							/>
						</div>
					))}
				</div>
			</Card>

			{/* Cross-account Savings vs Spend Comparison */}
			{accounts.length > 0 && methods.length > 0 && (
				<SavingsComparisonCard accounts={accounts} methods={methods} transactions={transactions} />
			)}

			{/* Drop dock: slides up while a method is being dragged */}
			{draggingMethod && accounts.length > 0 && (
				<DropDock
					method={draggingMethod}
					methods={methods}
					accounts={accounts}
					transactions={transactions}
					notify={notify}
					onDone={() => setDragId(null)}
				/>
			)}

			<Toast toast={toast} onClose={() => setToast(null)} />
		</div>
	);
}

// ── Drop Dock (drag & drop target) ───────────────────────────────────────────

function DropDock({
	method,
	methods,
	accounts,
	transactions,
	notify,
	onDone,
}: {
	method: PaymentMethod;
	methods: PaymentMethod[];
	accounts: SavingsAccount[];
	transactions: Transaction[];
	notify: Notify;
	onDone: () => void;
}) {
	const { linkAccount, unlinkAccount } = usePaymentMethodStore();
	const [hoverId, setHoverId] = useState<string | null>(null);
	const meta = PAYMENT_KIND_META[method.kind];
	const stats = methodStats(method, transactions);

	const handleDrop = (e: DragEvent, acc: SavingsAccount) => {
		e.preventDefault();
		setHoverId(null);
		const id = e.dataTransfer.getData(DRAG_TYPE) || method.id;
		if (method.linkedAccountIds.includes(acc.id)) {
			notify(`${method.name} is already connected to ${acc.name}`);
		} else {
			linkAccount(id, acc.id);
			haptic();
			notify(
				`Connected ${method.name} → ${acc.name}. ${money(stats.spent)} deducted.`,
				() => unlinkAccount(id, acc.id),
			);
		}
		onDone();
	};

	return (
		<div className="pm-up fixed bottom-5 left-1/2 z-40 w-[min(560px,calc(100vw-32px))] rounded-[24px] bg-card border border-canvas shadow-xl p-3">
			<p className="text-[11px] font-semibold text-text-muted px-1 pb-2 flex items-center gap-1.5">
				<Sparkles size={12} style={{ color: meta.hexColor }} />
				Drop <span className="text-text font-bold">{method.name}</span> on an account to deduct{' '}
				<span className="text-danger font-bold">{money(stats.spent)}</span> ({stats.txCount} txns)
			</p>
			<div className="flex gap-2 overflow-x-auto pb-1">
				{accounts.map((acc) => {
					const already = method.linkedAccountIds.includes(acc.id);
					const hovering = hoverId === acc.id;
					const deduction = getAccountDeduction(acc, methods, transactions);
					return (
						<div
							key={acc.id}
							onDragOver={(e) => {
								e.preventDefault();
								e.dataTransfer.dropEffect = 'link';
								setHoverId(acc.id);
							}}
							onDragLeave={() => setHoverId(null)}
							onDrop={(e) => handleDrop(e, acc)}
							className={`min-w-[150px] flex-1 rounded-[16px] border-2 border-dashed px-3 py-2.5 transition-all duration-200 ${
								hovering
									? 'border-mint-deep bg-mint/30 scale-105'
									: already
										? 'border-mint/50 bg-mint/10'
										: 'border-canvas bg-surface'
							}`}
						>
							<div className="flex items-center gap-1.5">
								<Landmark size={14} className={hovering || already ? 'text-mint-deep' : 'text-text-muted'} />
								<p className="text-[12px] font-semibold text-text truncate">{acc.name}</p>
							</div>
							<p className="text-[11px] text-text-muted mt-0.5">
								{already
									? `Net: ${money(deduction.deductedBalance)}`
									: `Base: ${money(deduction.baseBalance)}`}
							</p>
						</div>
					);
				})}
			</div>
		</div>
	);
}

// ── Method Card ───────────────────────────────────────────────────────────────

function MethodCard({
	method,
	methods,
	accounts,
	transactions,
	onGoToAccounts,
	notify,
	isDragging,
	onDragStart,
	onDragEnd,
}: {
	method: PaymentMethod;
	methods: PaymentMethod[];
	accounts: SavingsAccount[];
	transactions: Transaction[];
	onGoToAccounts?: () => void;
	notify: Notify;
	isDragging: boolean;
	onDragStart: () => void;
	onDragEnd: () => void;
}) {
	const [open, setOpen] = useState(false);
	const [flashId, setFlashId] = useState<string | null>(null);
	const [showAllTx, setShowAllTx] = useState(false);
	const [deleteArmed, setDeleteArmed] = useState(false);
	const deleteTimer = useRef<ReturnType<typeof setTimeout>>();

	const { removeMethod, linkAccount, unlinkAccount, linkTransactionAccount, unlinkTransactionAccount } =
		usePaymentMethodStore();

	const meta = PAYMENT_KIND_META[method.kind];
	const Icon = PAYMENT_KIND_ICONS[method.kind] || CircleDollarSign;
	const stats = useMemo(() => methodStats(method, transactions), [method, transactions]);
	const methodTxList = useMemo(() => getMethodTransactions(method, transactions), [method, transactions]);
	const txAccounts = useMemo(() => uniqueTxAccounts(transactions), [transactions]);

	const linkedSavings = accounts.filter((a) => method.linkedAccountIds.includes(a.id));
	const isSynced = linkedSavings.length > 0;

	// Total deducted across linked accounts
	const totalDeductedBalance = useMemo(() => {
		return linkedSavings.reduce((sum, a) => {
			const d = getAccountDeduction(a, methods, transactions);
			return sum + d.deductedBalance;
		}, 0);
	}, [linkedSavings, methods, transactions]);

	useEffect(() => () => clearTimeout(deleteTimer.current), []);

	// Link / unlink with instant deduction feedback and undo toast
	const toggleAccount = (a: SavingsAccount) => {
		haptic();
		if (method.linkedAccountIds.includes(a.id)) {
			unlinkAccount(method.id, a.id);
			notify(`Restored ${money(stats.spent)} back to ${a.name}`, () => linkAccount(method.id, a.id));
		} else {
			linkAccount(method.id, a.id);
			setFlashId(a.id);
			setTimeout(() => setFlashId(null), 700);
			notify(
				`Deducted ${money(stats.spent)} (${stats.txCount} txns) from ${a.name}`,
				() => unlinkAccount(method.id, a.id),
			);
		}
	};

	// Two-tap delete
	const handleDelete = () => {
		if (!deleteArmed) {
			setDeleteArmed(true);
			deleteTimer.current = setTimeout(() => setDeleteArmed(false), 3000);
			return;
		}
		clearTimeout(deleteTimer.current);
		removeMethod(method.id);
		notify(`Deleted payment method ${method.name}`);
	};

	const displayedTx = showAllTx ? methodTxList : methodTxList.slice(0, 4);

	return (
		<div
			draggable={accounts.length > 0}
			onDragStart={(e) => {
				e.dataTransfer.setData(DRAG_TYPE, method.id);
				e.dataTransfer.effectAllowed = 'link';
				onDragStart();
			}}
			onDragEnd={onDragEnd}
			className={`rounded-[24px] bg-surface overflow-hidden border transition-all duration-200 ${
				isDragging
					? 'opacity-50 scale-[0.98] border-dashed border-ink/30'
					: 'border-canvas hover:border-canvas-soft hover:shadow-xs'
			}`}
		>
			{/* Header row */}
			<div className="p-4 flex items-start justify-between gap-3">
				<div
					onClick={() => setOpen((v) => !v)}
					className="flex flex-1 items-start gap-3 cursor-pointer select-none min-w-0"
				>
					{accounts.length > 0 && (
						<GripVertical
							size={16}
							className="mt-3.5 -ml-1 shrink-0 text-text-muted/40 cursor-grab active:cursor-grabbing hidden sm:block"
							aria-label="Drag onto an account to sync"
						/>
					)}

					{/* Icon pill with status dot */}
					<div
						className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-transform duration-200 hover:scale-105"
						style={{ backgroundColor: meta.hexColor + '18', color: meta.hexColor }}
					>
						<Icon size={20} strokeWidth={2.2} />
						<span
							className={`absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-surface transition-colors ${
								isSynced ? 'bg-mint-deep' : 'bg-amber-400'
							}`}
						/>
					</div>

					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-2 flex-wrap">
							<p className="text-[15px] font-semibold text-text truncate">{method.name}</p>
							<span
								className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
								style={{ backgroundColor: meta.hexColor }}
							>
								{meta.label}
							</span>

							{/* Immediate Sync Status Badge */}
							{isSynced ? (
								<span className="inline-flex items-center gap-1 rounded-full bg-mint/20 text-mint-deep px-2.5 py-0.5 text-[10px] font-semibold">
									<Link2 size={10} /> Synced ({linkedSavings.length})
								</span>
							) : (
								<span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 text-amber-600 px-2.5 py-0.5 text-[10px] font-semibold">
									<Link2Off size={10} /> Unsynced
								</span>
							)}
						</div>

						{/* Subtitle / Details with Deduction Summary */}
						<div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-text-muted">
							<span>
								{stats.txCount > 0
									? `${stats.txCount} ${stats.txCount === 1 ? 'transaction' : 'transactions'} · ${money(stats.spent)} spent`
									: '0 transactions'}
							</span>
							{isSynced && (
								<span className="inline-flex items-center gap-1.5 text-mint-deep font-medium">
									<SyncLink active color={meta.hexColor} />
									Deducted from {linkedSavings.map((a) => a.name).join(', ')} ({money(totalDeductedBalance)} remaining)
								</span>
							)}
						</div>
					</div>
				</div>

				<div className="flex items-center gap-1.5 shrink-0 pt-0.5">
					{!isSynced && !open && accounts.length === 1 ? (
						<button
							type="button"
							onClick={() => toggleAccount(accounts[0])}
							className="inline-flex items-center gap-1 rounded-full bg-ink text-white px-3 py-1.5 text-[11px] font-semibold hover:bg-ink-soft active:scale-95 transition-all cursor-pointer shadow-xs"
						>
							<Link2 size={12} /> Sync to {accounts[0].name}
						</button>
					) : (
						<button
							type="button"
							onClick={() => setOpen((v) => !v)}
							aria-expanded={open}
							className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
								!isSynced && !open
									? 'bg-amber-500/15 text-amber-700 hover:bg-amber-500/25'
									: 'text-text-muted hover:text-text hover:bg-card'
							}`}
						>
							<span>{open ? 'Hide' : isSynced ? 'Manage' : 'Sync'}</span>
							<ChevronDown
								size={14}
								className={`transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
							/>
						</button>
					)}
				</div>
			</div>

			{/* Expanded Detail with Real-Time Deduction & Transactions Breakdown */}
			<Collapse open={open}>
				<div className="border-t border-canvas px-4 pb-4 pt-3.5 space-y-4 bg-surface/50">
					{/* Key Spend stats summary */}
					{stats.txCount > 0 && (
						<div className="grid grid-cols-2 gap-2">
							<div className="rounded-[18px] bg-danger-soft p-3">
								<div className="flex items-center justify-between text-[11px] text-text-muted">
									<span>Spent via {method.name}</span>
									<TrendingDown size={14} className="text-danger" />
								</div>
								<p className="mt-1 text-[18px] font-bold text-danger">{money(stats.spent)}</p>
								<p className="text-[10px] text-text-muted mt-0.5">{stats.txCount} transactions deducted</p>
							</div>

							<div className="rounded-[18px] bg-mint p-3">
								<div className="flex items-center justify-between text-[11px] text-text-muted">
									<span>Income received</span>
									<TrendingUp size={14} className="text-mint-deep" />
								</div>
								<p className="mt-1 text-[18px] font-bold text-mint-deep">{money(stats.income)}</p>
								<p className="text-[10px] text-text-muted mt-0.5">credited to account</p>
							</div>
						</div>
					)}

					{/* ── Savings account tiles with live deduction ── */}
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-[12px] font-bold text-text">Funded from (Savings Accounts)</p>
								<p className="text-[11px] text-text-muted">
									Connecting deducts <span className="text-danger font-semibold">{money(stats.spent)}</span> ({stats.txCount} txns) from the balance
								</p>
							</div>
							{isSynced && (
								<span className="pm-pop text-[11px] font-semibold text-mint-deep">
									{money(totalDeductedBalance)} remaining
								</span>
							)}
						</div>

						{accounts.length > 0 ? (
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
								{accounts.map((a) => {
									const linked = method.linkedAccountIds.includes(a.id);
									const deduction = getAccountDeduction(a, methods, transactions);
									return (
										<button
											key={a.id}
											type="button"
											onClick={() => toggleAccount(a)}
											aria-pressed={linked}
											className={`group flex items-start gap-2.5 rounded-[16px] px-3 py-2.5 text-left border transition-all duration-200 active:scale-[0.98] cursor-pointer ${
												linked
													? 'bg-card border-mint shadow-xs'
													: 'bg-card/70 border-canvas hover:border-ink/20 hover:-translate-y-0.5'
											} ${flashId === a.id ? 'pm-ring' : ''}`}
										>
											{/* Visual link connection */}
											<div
												className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
												style={{ backgroundColor: meta.hexColor + '18', color: meta.hexColor }}
											>
												<Icon size={14} />
											</div>
											<span className="text-text-muted mt-1.5">
												<SyncLink active={linked} color={meta.hexColor} />
											</span>
											<div
												className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors ${
													linked ? 'bg-mint text-mint-deep' : 'bg-surface text-text-muted'
												}`}
											>
												<Landmark size={14} />
											</div>

											<div className="min-w-0 flex-1">
												<p className="text-[13px] font-semibold text-text truncate">{a.name}</p>
												{linked ? (
													<div className="space-y-0.5 mt-0.5">
														<p className="text-[11px] font-bold text-mint-deep">
															{money(deduction.deductedBalance)} remaining
														</p>
														<p className="text-[10px] text-text-muted">
															Base {money(deduction.baseBalance)} - {money(deduction.totalSpent)} deducted
														</p>
													</div>
												) : (
													<div className="space-y-0.5 mt-0.5">
														<p className="text-[11px] font-medium text-text-muted">
															Base: {money(deduction.baseBalance)}
														</p>
														{stats.spent > 0 && (
															<p className="text-[10px] text-danger font-medium">
																Will deduct {money(stats.spent)}
															</p>
														)}
													</div>
												)}
											</div>

											{/* Animated Check / Plus */}
											<span
												key={linked ? 'on' : 'off'}
												className={`pm-pop flex h-6 w-6 shrink-0 items-center justify-center rounded-full mt-1 ${
													linked
														? 'bg-mint-deep text-white'
														: 'bg-surface text-text-muted group-hover:bg-ink group-hover:text-white'
												}`}
											>
												{linked ? <Check size={13} strokeWidth={3} /> : <Plus size={13} />}
											</span>
										</button>
									);
								})}
							</div>
						) : (
							<div className="rounded-[16px] bg-card p-4 border border-canvas text-center space-y-2">
								<p className="text-[12px] text-text-muted">
									No savings accounts yet. Add one in the Accounts tab to sync.
								</p>
								{onGoToAccounts && (
									<button
										type="button"
										onClick={onGoToAccounts}
										className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-1.5 text-[11px] font-semibold text-white hover:bg-ink-soft cursor-pointer transition-all"
									>
										Go to Accounts <ArrowRight size={12} />
									</button>
								)}
							</div>
						)}
					</div>

					{/* ── Total Transactions with regards to this method (in place of transaction tags) ── */}
					<div className="space-y-2 pt-2 border-t border-canvas">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-1.5">
								<Receipt size={14} className="text-text-muted" />
								<p className="text-[12px] font-bold text-text">
									Transactions for {method.name} ({methodTxList.length})
								</p>
							</div>
							<span className="text-[11px] font-semibold text-text">
								{money(stats.spent)} total
							</span>
						</div>

						{/* Transactions list */}
						{methodTxList.length === 0 ? (
							<div className="rounded-[16px] bg-card/60 p-3 text-center border border-canvas">
								<p className="text-[12px] text-text-muted">
									No transactions recorded with this payment method yet.
								</p>
								<p className="text-[11px] text-text-muted/70 mt-0.5">
									When transactions use "{method.name}", they will appear here and deduct from the linked account.
								</p>
							</div>
						) : (
							<div className="space-y-1.5">
								{displayedTx.map((tx) => (
									<div
										key={tx.id}
										className="flex items-center justify-between gap-2.5 rounded-[14px] bg-card px-3 py-2 border border-canvas text-[12px]"
									>
										<div className="min-w-0 flex-1">
											<div className="flex items-center gap-2">
												<p className="font-semibold text-text truncate">{tx.title || 'Untitled'}</p>
												{tx.category && (
													<span className="rounded-full bg-surface px-2 py-0.2 text-[10px] text-text-muted font-medium">
														{tx.category}
													</span>
												)}
											</div>
											<p className="text-[10px] text-text-muted mt-0.5">
												{tx.date} · via {tx.account}
											</p>
										</div>

										<span
											className={`font-bold shrink-0 ${
												tx.type === 'expense' ? 'text-danger' : 'text-mint-deep'
											}`}
										>
											{tx.type === 'expense' ? '-' : '+'}
											{money(tx.amount)}
										</span>
									</div>
								))}

								{methodTxList.length > 4 && (
									<button
										type="button"
										onClick={() => setShowAllTx((v) => !v)}
										className="w-full text-center py-1.5 text-[11px] font-semibold text-text-muted hover:text-text cursor-pointer transition-colors"
									>
										{showAllTx
											? 'Show fewer transactions'
											: `Show all ${methodTxList.length} transactions (${money(stats.spent)})`}
									</button>
								)}
							</div>
						)}
					</div>

					{/* ── Transaction Account Mapping Tags ── */}
					<div className="space-y-1.5 pt-2 border-t border-canvas">
						<div className="flex items-center justify-between">
							<p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
								Account Name Aliases
							</p>
							<p className="text-[10px] text-text-muted">Matches transaction "account" tag</p>
						</div>
						<div className="flex flex-wrap gap-1.5">
							{method.transactionAccounts.map((acc) => (
								<span
									key={acc}
									className="pm-pop inline-flex items-center gap-1 rounded-full bg-ink text-white px-2.5 py-1 text-[11px] font-medium"
								>
									{acc}
									<button
										type="button"
										onClick={() => {
											unlinkTransactionAccount(method.id, acc);
											notify(`Removed tag "${acc}"`, () => linkTransactionAccount(method.id, acc));
										}}
										className="hover:opacity-70 cursor-pointer ml-0.5"
										aria-label={`Remove ${acc}`}
									>
										<X size={10} />
									</button>
								</span>
							))}
							{txAccounts
								.filter((acc) => !method.transactionAccounts.includes(acc))
								.map((acc) => (
									<button
										key={acc}
										type="button"
										onClick={() => {
											haptic();
											linkTransactionAccount(method.id, acc);
										}}
										className="inline-flex items-center gap-1 rounded-full bg-card hover:bg-canvas border border-dashed border-canvas-soft px-2.5 py-1 text-[11px] text-text-muted hover:text-text active:scale-95 transition-all cursor-pointer"
									>
										<Plus size={10} /> {acc}
									</button>
								))}
						</div>
					</div>

					{method.note && (
						<p className="text-[12px] text-text-muted italic bg-card/60 p-2.5 rounded-[12px]">
							Note: {method.note}
						</p>
					)}

					<div className="pt-2 flex items-center justify-between border-t border-canvas">
						<button
							type="button"
							onClick={handleDelete}
							className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition-all cursor-pointer ${
								deleteArmed ? 'pm-shake bg-danger text-white' : 'text-danger hover:bg-danger-soft'
							}`}
						>
							<Trash2 size={13} />
							{deleteArmed ? 'Tap again to delete' : 'Delete method'}
						</button>
						<button
							type="button"
							onClick={() => setOpen(false)}
							className="text-[12px] font-medium text-text-muted hover:text-text cursor-pointer"
						>
							Collapse
						</button>
					</div>
				</div>
			</Collapse>
		</div>
	);
}

// ── Add Method Form ───────────────────────────────────────────────────────────

function AddMethodForm({
	accounts,
	methods,
	transactions,
	onDone,
	onGoToAccounts,
	notify,
}: {
	accounts: SavingsAccount[];
	methods: PaymentMethod[];
	transactions: Transaction[];
	onDone: () => void;
	onGoToAccounts?: () => void;
	notify: Notify;
}) {
	const addMethod = usePaymentMethodStore((s) => s.addMethod);
	const addBudgetAccount = useBudgetStore((s) => s.addAccount);
	const [name, setName] = useState('');
	const [kind, setKind] = useState<PaymentMethodKind>('UPI');
	const [selectedAccountId, setSelectedAccountId] = useState<string>('');
	const [note, setNote] = useState('');
	const [nameError, setNameError] = useState(false);

	const meta = PAYMENT_KIND_META[kind];
	const PreviewIcon = PAYMENT_KIND_ICONS[kind];
	const chosenAccount = accounts.find((a) => a.id === selectedAccountId);

	const submit = (e: FormEvent) => {
		e.preventDefault();
		const trimmedName = name.trim();
		if (!trimmedName) {
			setNameError(true);
			setTimeout(() => setNameError(false), 600);
			return;
		}

		addMethod({
			name: trimmedName,
			kind,
			linkedAccountIds: selectedAccountId ? [selectedAccountId] : [],
			transactionAccounts: [trimmedName],
			note: note.trim() || undefined,
		});

		addBudgetAccount(trimmedName);
		haptic();
		notify(
			chosenAccount
				? `${trimmedName} created & connected to ${chosenAccount.name}`
				: `${trimmedName} created`,
		);

		setName('');
		setSelectedAccountId('');
		setNote('');
		onDone();
	};

	return (
		<form
			onSubmit={submit}
			onKeyDown={(e) => e.key === 'Escape' && onDone()}
			className="rounded-[24px] bg-surface p-4.5 space-y-4 border border-canvas shadow-xs"
		>
			<div className="flex items-center justify-between">
				<div>
					<p className="text-[14px] font-bold text-text">Create New Payment Method</p>
					<p className="text-[11px] text-text-muted">Press Esc to close</p>
				</div>
				<button
					type="button"
					onClick={onDone}
					className="p-1 text-text-muted hover:text-text rounded-full hover:bg-card transition-colors cursor-pointer"
				>
					<X size={16} />
				</button>
			</div>

			{/* Live preview */}
			<div className="flex items-center gap-2.5 rounded-[18px] bg-card border border-canvas p-3">
				<div
					key={kind}
					className="pm-pop flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
					style={{ backgroundColor: meta.hexColor + '18', color: meta.hexColor }}
				>
					<PreviewIcon size={18} />
				</div>
				<div className="min-w-0">
					<p className="text-[13px] font-semibold text-text truncate">{name.trim() || 'Your method'}</p>
					<p className="text-[11px] text-text-muted">{meta.label}</p>
				</div>
				<span className="ml-auto text-text-muted">
					<SyncLink active={!!chosenAccount} color={meta.hexColor} />
				</span>
				<div
					className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
						chosenAccount ? 'bg-mint text-mint-deep' : 'bg-surface text-text-muted'
					}`}
				>
					<Landmark size={12} />
					<span className="truncate max-w-[110px]">{chosenAccount?.name ?? 'No account'}</span>
				</div>
			</div>

			{/* Name input */}
			<div>
				<label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block mb-1">
					Payment Method Name
				</label>
				<input
					className={`w-full h-11 px-4 bg-card text-text placeholder:text-text-muted rounded-full text-[13px] border focus:outline-none focus:ring-2 focus:ring-ink/20 transition-colors ${
						nameError ? 'pm-shake border-danger' : 'border-canvas'
					}`}
					placeholder="e.g. HDFC Credit Card, Google Pay, Salary UPI"
					value={name}
					onChange={(e) => setName(e.target.value)}
					autoFocus
				/>
			</div>

			{/* Kind picker */}
			<div>
				<label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block mb-1.5">
					Type
				</label>
				<div className="flex flex-wrap gap-1.5">
					{ALL_KINDS.map((k) => {
						const m = PAYMENT_KIND_META[k];
						const KindIcon = PAYMENT_KIND_ICONS[k];
						const isSelected = kind === k;
						return (
							<button
								key={k}
								type="button"
								onClick={() => setKind(k)}
								className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition-all active:scale-95 cursor-pointer ${
									isSelected
										? 'bg-ink text-white shadow-xs'
										: 'bg-card text-text hover:bg-canvas border border-canvas'
								}`}
							>
								<KindIcon size={13} style={{ color: isSelected ? '#ffffff' : m.hexColor }} />
								{m.label}
							</button>
						);
					})}
				</div>
			</div>

			{/* Sync with Savings Account */}
			<div>
				<div className="flex items-center justify-between mb-1.5">
					<label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
						Fund from account (Deducts balance)
					</label>
					<span className="text-[11px] text-text-muted">Optional</span>
				</div>

				{accounts.length > 0 ? (
					<div className="flex flex-wrap gap-1.5">
						{accounts.map((acc) => {
							const isChosen = selectedAccountId === acc.id;
							const deduction = getAccountDeduction(acc, methods, transactions);
							return (
								<button
									key={acc.id}
									type="button"
									onClick={() => {
										haptic();
										setSelectedAccountId(isChosen ? '' : acc.id);
									}}
									className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium border transition-all active:scale-95 cursor-pointer ${
										isChosen
											? 'bg-mint/20 text-mint-deep border-mint font-semibold'
											: 'bg-card text-text border-canvas hover:border-ink/20'
									}`}
								>
									{isChosen ? (
										<Check key="c" size={13} className="pm-pop" strokeWidth={3} />
									) : (
										<Landmark size={13} className="text-text-muted" />
									)}
									{acc.name}
									<span className="text-[11px] opacity-60">
										({money(deduction.deductedBalance)})
									</span>
								</button>
							);
						})}
					</div>
				) : (
					<div className="rounded-[14px] bg-card p-3 border border-canvas text-[12px] text-text-muted flex items-center justify-between gap-2">
						<span>No savings accounts available to sync.</span>
						{onGoToAccounts && (
							<button
								type="button"
								onClick={onGoToAccounts}
								className="text-[11px] font-semibold text-accent hover:underline flex items-center gap-1 cursor-pointer"
							>
								Add in Accounts <ArrowRight size={12} />
							</button>
						)}
					</div>
				)}
			</div>

			{/* Note input */}
			<div>
				<label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block mb-1">
					Note (Optional)
				</label>
				<input
					className="w-full h-10 px-4 bg-card text-text placeholder:text-text-muted rounded-full text-[12px] border border-canvas focus:outline-none focus:ring-2 focus:ring-ink/20"
					placeholder="e.g. Primary card for groceries"
					value={note}
					onChange={(e) => setNote(e.target.value)}
				/>
			</div>

			<div className="flex gap-2 pt-1">
				<button
					type="submit"
					className="flex-1 rounded-full bg-ink py-2.5 text-[13px] font-semibold text-white hover:bg-ink-soft active:scale-95 transition-all cursor-pointer shadow-sm"
				>
					{chosenAccount ? `Create & connect to ${chosenAccount.name}` : 'Create method'}
				</button>
				<button
					type="button"
					onClick={onDone}
					className="rounded-full bg-card px-4 py-2.5 text-[13px] font-medium text-text-muted hover:bg-canvas active:scale-95 transition-all cursor-pointer border border-canvas"
				>
					Cancel
				</button>
			</div>
		</form>
	);
}

// ── Savings Comparison Card with Deductions ───────────────────────────────────

function SavingsComparisonCard({
	accounts,
	methods,
	transactions,
}: {
	accounts: SavingsAccount[];
	methods: PaymentMethod[];
	transactions: Transaction[];
}) {
	const rows = useMemo(() => {
		return accounts.map((a) => {
			const deduction = getAccountDeduction(a, methods, transactions);
			return { account: a, ...deduction };
		});
	}, [accounts, methods, transactions]);

	const maxBalance = Math.max(...rows.map((r) => r.baseBalance), 1);

	return (
		<Card variant="white" className="p-5 space-y-4">
			<SectionHead
				title="Savings vs. Spend Comparison"
				hint="Deductions routed through payment methods connected to each savings account"
			/>
			<div className="space-y-3.5">
				{rows.map(({ account, baseBalance, linkedMethods, totalSpent, totalIncome, totalTxCount, deductedBalance }) => {
					const spendPct = baseBalance > 0 ? Math.min((totalSpent / baseBalance) * 100, 100) : 0;
					const balancePct = (baseBalance / maxBalance) * 100;

					return (
						<div key={account.id} className="rounded-[20px] bg-surface p-4 space-y-3 border border-canvas">
							<div className="flex items-start justify-between gap-2">
								<div>
									<p className="text-[14px] font-semibold text-text">{account.name}</p>
									<div className="mt-1 flex flex-wrap items-center gap-1.5">
										{linkedMethods.length > 0 ? (
											linkedMethods.map((m) => {
												const LinkedIcon = PAYMENT_KIND_ICONS[m.kind];
												const meta = PAYMENT_KIND_META[m.kind];
												const st = methodStats(m, transactions);
												return (
													<span
														key={m.id}
														className="pm-pop inline-flex items-center gap-1 rounded-full bg-card px-2.5 py-0.5 text-[11px] font-medium text-text border border-canvas"
													>
														<LinkedIcon size={12} style={{ color: meta.hexColor }} />
														<span>{m.name}</span>
														<span className="text-[10px] text-danger font-semibold">
															(-{money(st.spent)})
														</span>
														<span className="text-[10px] text-text-muted">
															· {st.txCount} txns
														</span>
													</span>
												);
											})
										) : (
											<span className="text-[11px] text-text-muted">No payment methods connected yet</span>
										)}
									</div>
								</div>

								{/* Remaining Deducted Balance */}
								<div className="text-right">
									<p className="text-[17px] font-bold text-text">{money(deductedBalance)}</p>
									<p className={`text-[11px] font-medium ${deductedBalance >= 0 ? 'text-mint-deep' : 'text-danger'}`}>
										{totalSpent > 0 ? `-${money(totalSpent)} deducted (${totalTxCount} txns)` : 'no deductions'}
									</p>
								</div>
							</div>

							{/* Balance breakdown bars */}
							<div className="space-y-1">
								<div className="flex justify-between text-[10px] text-text-muted font-medium">
									<span>Base Account Balance</span>
									<span>{money(baseBalance)}</span>
								</div>
								<div className="h-2 w-full overflow-hidden rounded-full bg-canvas">
									<div
										className="h-full rounded-full bg-mint-deep transition-all duration-700"
										style={{ width: `${balancePct}%` }}
									/>
								</div>
							</div>

							{totalSpent > 0 && (
								<div className="space-y-1">
									<div className="flex justify-between text-[10px] text-text-muted font-medium">
										<span>Deducted Spend ({totalTxCount} transactions)</span>
										<span className="text-danger font-semibold">-{money(totalSpent)}</span>
									</div>
									<div className="h-2 w-full overflow-hidden rounded-full bg-canvas">
										<div
											className="h-full rounded-full bg-danger transition-all duration-700"
											style={{ width: `${spendPct}%` }}
										/>
									</div>
								</div>
							)}

							{totalIncome > 0 && (
								<div className="flex items-center justify-between text-[12px] pt-1 border-t border-canvas">
									<span className="text-text-muted">Income Added via Methods</span>
									<span className="font-semibold text-mint-deep">+{money(totalIncome)}</span>
								</div>
							)}
						</div>
					);
				})}
			</div>
		</Card>
	);
}
