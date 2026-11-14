import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ArrowRight, Check, ChevronDown, Landmark, Undo2, WalletCards, X } from 'lucide-react';
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
import { money } from './ui';
import LinkBoard, { type Notify } from './LinkBoard';
import MethodSheet from './MethodSheet';
import { PAYMENT_KIND_ICONS, getAccountDeduction, haptic, uniqueTxAccounts } from './paymentShared';

// Re-exported: other screens (e.g. voice capture) import the icon map from here.
export { PAYMENT_KIND_ICONS };

const ALL_KINDS = Object.keys(PAYMENT_KIND_META) as PaymentMethodKind[];

// ── Animations (scoped keyframes, respects reduced motion) ───────────────────

const MotionStyles = () => (
	<style>{`
		@keyframes pm-pop { 0%{transform:scale(.3);opacity:0} 60%{transform:scale(1.2);opacity:1} 100%{transform:scale(1)} }
		@keyframes pm-up { from{transform:translate(-50%,16px);opacity:0} to{transform:translate(-50%,0);opacity:1} }
		@keyframes pm-in { from{transform:translateY(6px);opacity:0} to{transform:none;opacity:1} }
		@keyframes pm-shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-3px)} 75%{transform:translateX(3px)} }
		@keyframes pm-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
		@keyframes pm-breathe { 0%,100%{transform:scale(1)} 50%{transform:scale(1.045)} }
		@keyframes pm-splash { from{transform:scale(1);opacity:.9;stroke-width:3} to{transform:scale(1.45);opacity:0;stroke-width:.5} }
		@keyframes pm-select { 0%,100%{filter:brightness(1)} 50%{filter:brightness(1.08)} }
		@keyframes pm-lift { from{transform:scale(.85)} to{transform:scale(1.12) rotate(-4deg)} }
		@keyframes pm-fade { from{opacity:0} to{opacity:1} }
		@keyframes pm-sheet { from{transform:translateY(40px);opacity:0} to{transform:none;opacity:1} }
		.pm-pop{animation:pm-pop .38s cubic-bezier(.2,.9,.3,1.3) both}
		.pm-up{animation:pm-up .25s cubic-bezier(.2,.9,.3,1.1) both}
		.pm-in{animation:pm-in .25s ease-out both}
		.pm-shake{animation:pm-shake .3s ease-in-out 2}
		.pm-float{animation:pm-float 3.6s ease-in-out infinite}
		.pm-breathe{animation:pm-breathe 1.6s ease-in-out infinite}
		.pm-splash{animation:pm-splash .8s ease-out both}
		.pm-select{animation:pm-select 1.2s ease-in-out infinite}
		.pm-lift{animation:pm-lift .18s ease-out both}
		.pm-fade{animation:pm-fade .2s ease-out both}
		.pm-sheet{animation:pm-sheet .28s cubic-bezier(.2,.9,.3,1.05) both}
		@media (prefers-reduced-motion: reduce){
			.pm-pop,.pm-up,.pm-in,.pm-shake,.pm-float,.pm-breathe,.pm-splash,.pm-select,.pm-lift,.pm-fade,.pm-sheet{animation:none}
		}
	`}</style>
);

// ── Toast with Undo ──────────────────────────────────────────────────────────

type ToastState = { id: number; message: string; undo?: () => void } | null;

function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
	useEffect(() => {
		if (!toast) return;
		const t = setTimeout(onClose, 4500);
		return () => clearTimeout(t);
	}, [toast, onClose]);

	if (!toast) return null;
	return (
		<div
			key={toast.id}
			role="status"
			className="pm-up fixed bottom-5 left-1/2 z-[70] flex max-w-[calc(100vw-24px)] items-center gap-3 rounded-full bg-ink py-2 pl-4 pr-2 text-[12px] font-medium text-white shadow-lg"
		>
			<Check size={14} className="shrink-0 text-mint-deep" />
			<span className="min-w-0 truncate">{toast.message}</span>
			{toast.undo && (
				<button
					type="button"
					onClick={() => {
						toast.undo?.();
						onClose();
					}}
					className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-full bg-white/10 px-3 py-1 font-semibold hover:bg-white/20"
				>
					<Undo2 size={12} /> Undo
				</button>
			)}
		</div>
	);
}

// ── Main Component ────────────────────────────────────────────────────────────

interface PaymentMethodsPanelProps {
	accounts: SavingsAccount[];
	transactions: Transaction[];
	onGoToAccounts?: () => void;
}

export default function PaymentMethodsPanel({ accounts, transactions, onGoToAccounts }: PaymentMethodsPanelProps) {
	const methods = usePaymentMethodStore((s) => s.methods);
	const syncExistingAccounts = usePaymentMethodStore((s) => s.syncExistingAccounts);
	const budgetAccounts = useBudgetStore((s) => s.accounts);
	const loadBudgetAccounts = useBudgetStore((s) => s.loadAccounts);

	const [showAdd, setShowAdd] = useState(false);
	const [showBreakdown, setShowBreakdown] = useState(false);
	const [toast, setToast] = useState<ToastState>(null);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [sheetId, setSheetId] = useState<string | null>(null);

	const notify: Notify = (message, undo) => setToast({ id: Date.now(), message, undo });

	// Ensure budget accounts are loaded from store/IndexedDB
	useEffect(() => {
		loadBudgetAccounts();
	}, [loadBudgetAccounts]);

	// Auto-create methods from budget accounts and transaction history
	useEffect(() => {
		const combined = Array.from(new Set([...budgetAccounts, ...uniqueTxAccounts(transactions)])).filter(Boolean);
		if (combined.length > 0) syncExistingAccounts(combined);
	}, [budgetAccounts, transactions, syncExistingAccounts]);

	// Drop selection / sheet if the method disappears (deleted, undone, …)
	const selected = methods.find((m) => m.id === selectedId) ?? null;
	const sheetMethod = methods.find((m) => m.id === sheetId) ?? null;

	const metrics = useMemo(() => {
		const linkedAccountIds = new Set(methods.flatMap((m) => m.linkedAccountIds));
		let net = 0;
		let spent = 0;
		for (const a of accounts) {
			if (!linkedAccountIds.has(a.id)) continue;
			const d = getAccountDeduction(a, methods, transactions);
			net += d.deductedBalance;
			spent += d.totalSpent;
		}
		const linked = methods.filter((m) => m.linkedAccountIds.length > 0).length;
		return { net, spent, linked };
	}, [methods, accounts, transactions]);

	const pct = methods.length ? Math.round((metrics.linked / methods.length) * 100) : 0;

	return (
		<div className="space-y-3.5">
			<MotionStyles />

			{/* Slim summary */}
			<div className="space-y-3 rounded-[28px] bg-ink p-5 text-white shadow-sm">
				<div className="flex items-center justify-between gap-3">
					<div>
						<p className="text-[11px] font-medium uppercase tracking-widest opacity-60">Payment Hub</p>
						<p className="mt-0.5 text-[20px] font-bold tracking-tight">
							{methods.length === 0
								? 'Connect how you pay'
								: metrics.linked === methods.length
									? 'Every method is connected'
									: `${methods.length - metrics.linked} method${methods.length - metrics.linked === 1 ? '' : 's'} not connected`}
						</p>
					</div>
					<div className="relative h-12 w-12 shrink-0" aria-label={`${pct}% connected`}>
						<svg viewBox="0 0 36 36" className="h-12 w-12 -rotate-90">
							<circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="4" />
							<circle
								cx="18"
								cy="18"
								r="15"
								fill="none"
								stroke="#A8F5A2"
								strokeWidth="4"
								strokeLinecap="round"
								strokeDasharray={`${(pct / 100) * 94.25} 94.25`}
								style={{ transition: 'stroke-dasharray 700ms ease' }}
							/>
						</svg>
						<span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold">{pct}%</span>
					</div>
				</div>
				<div className="grid grid-cols-2 gap-2.5 border-t border-white/10 pt-3">
					<div className="rounded-2xl bg-white/5 p-3">
						<p className="text-[10px] font-semibold uppercase tracking-wider text-white/50">Linked balance</p>
						<p className="text-[16px] font-bold text-mint-deep">{money(metrics.net)}</p>
					</div>
					<div className="rounded-2xl bg-white/5 p-3">
						<p className="text-[10px] font-semibold uppercase tracking-wider text-white/50">Deducted spend</p>
						<p className="text-[16px] font-bold text-danger">{money(metrics.spent)}</p>
					</div>
				</div>
			</div>

			{/* Add form */}
			{showAdd && (
				<AddMethodForm
					onDone={() => setShowAdd(false)}
					onCreated={(m) => {
						setSelectedId(m.id);
						notify(`${m.name} created — drag it onto an account`);
					}}
				/>
			)}

			{accounts.length === 0 ? (
				<div className="rounded-[28px] border border-dashed border-canvas-soft bg-card/70 px-5 py-10 text-center">
					<div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-surface text-text-muted">
						<Landmark size={26} />
					</div>
					<p className="text-[14px] font-semibold text-text">Add an account first</p>
					<p className="mx-auto mt-1 max-w-xs text-[12px] text-text-muted">
						Payment methods are dropped onto accounts, so you need at least one bank account or cash balance.
					</p>
					{onGoToAccounts && (
						<button
							type="button"
							onClick={onGoToAccounts}
							className="mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-[12px] font-semibold text-white transition-all hover:bg-ink-soft active:scale-95"
						>
							Go to Accounts <ArrowRight size={13} />
						</button>
					)}
				</div>
			) : methods.length === 0 ? (
				<div className="rounded-[28px] bg-card px-5 py-10 text-center">
					<div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-surface text-text-muted">
						<WalletCards size={26} />
					</div>
					<p className="text-[14px] font-semibold text-text">No payment methods yet</p>
					<p className="mx-auto mt-1 max-w-xs text-[12px] text-text-muted">
						Add a card, UPI app or cash — each becomes a circle you can drop onto an account.
					</p>
					<button
						type="button"
						onClick={() => setShowAdd(true)}
						className="mt-4 cursor-pointer rounded-full bg-ink px-4 py-2 text-[12px] font-semibold text-white transition-all hover:bg-ink-soft active:scale-95"
					>
						Create payment method
					</button>
				</div>
			) : (
				<LinkBoard
					accounts={accounts}
					methods={methods}
					transactions={transactions}
					selectedId={selected?.id ?? null}
					onSelect={setSelectedId}
					onManage={setSheetId}
					onAdd={() => setShowAdd(true)}
					notify={notify}
				/>
			)}

			{/* Balance breakdown (secondary, collapsed) */}
			{accounts.length > 0 && methods.length > 0 && (
				<Card variant="white" className="p-0">
					<button
						type="button"
						onClick={() => setShowBreakdown((v) => !v)}
						aria-expanded={showBreakdown}
						className="flex w-full cursor-pointer items-center justify-between gap-3 p-5 text-left"
					>
						<div>
							<p className="text-[14px] font-bold text-text">Balance breakdown</p>
							<p className="text-[12px] text-text-muted">What each account has left after linked spend</p>
						</div>
						<ChevronDown size={18} className={`text-text-muted transition-transform duration-300 ${showBreakdown ? 'rotate-180' : ''}`} />
					</button>
					{showBreakdown && <Breakdown accounts={accounts} methods={methods} transactions={transactions} />}
				</Card>
			)}

			{sheetMethod && (
				<MethodSheet
					key={sheetMethod.id}
					method={sheetMethod}
					accounts={accounts}
					transactions={transactions}
					notify={notify}
					onClose={() => setSheetId(null)}
				/>
			)}

			<Toast toast={toast} onClose={() => setToast(null)} />
		</div>
	);
}

// ── Balance breakdown ─────────────────────────────────────────────────────────

function Breakdown({
	accounts,
	methods,
	transactions,
}: {
	accounts: SavingsAccount[];
	methods: PaymentMethod[];
	transactions: Transaction[];
}) {
	return (
		<div className="pm-in space-y-2.5 px-5 pb-5">
			{accounts.map((a) => {
				const d = getAccountDeduction(a, methods, transactions);
				const spendPct = d.baseBalance > 0 ? Math.min((d.totalSpent / d.baseBalance) * 100, 100) : 0;
				return (
					<div key={a.id} className="space-y-2 rounded-[20px] border border-canvas bg-surface p-4">
						<div className="flex items-start justify-between gap-2">
							<div className="min-w-0">
								<p className="truncate text-[14px] font-semibold text-text">{a.name}</p>
								<p className="text-[11px] text-text-muted">
									{d.linkedMethods.length > 0 ? d.linkedMethods.map((m) => m.name).join(' · ') : 'No methods connected'}
								</p>
							</div>
							<div className="text-right">
								<p className={`text-[16px] font-bold ${d.deductedBalance < 0 ? 'text-danger' : 'text-text'}`}>{money(d.deductedBalance)}</p>
								<p className="text-[10px] text-text-muted">of {money(d.baseBalance)}</p>
							</div>
						</div>
						<div className="h-2 w-full overflow-hidden rounded-full bg-canvas">
							<div className="h-full rounded-full bg-danger transition-all duration-700" style={{ width: `${spendPct}%` }} />
						</div>
						{d.totalSpent > 0 && (
							<p className="text-[11px] font-medium text-danger">
								−{money(d.totalSpent)} across {d.totalTxCount} transactions
							</p>
						)}
					</div>
				);
			})}
		</div>
	);
}

// ── Add Method Form (linking now happens by drag & drop) ──────────────────────

function AddMethodForm({ onDone, onCreated }: { onDone: () => void; onCreated: (m: PaymentMethod) => void }) {
	const addMethod = usePaymentMethodStore((s) => s.addMethod);
	const addBudgetAccount = useBudgetStore((s) => s.addAccount);
	const [name, setName] = useState('');
	const [kind, setKind] = useState<PaymentMethodKind>('UPI');
	const [nameError, setNameError] = useState(false);

	const meta = PAYMENT_KIND_META[kind];
	const PreviewIcon = PAYMENT_KIND_ICONS[kind];

	const submit = (e: FormEvent) => {
		e.preventDefault();
		const trimmed = name.trim();
		if (!trimmed) {
			setNameError(true);
			setTimeout(() => setNameError(false), 600);
			return;
		}
		addMethod({ name: trimmed, kind, linkedAccountIds: [], transactionAccounts: [trimmed] });
		addBudgetAccount(trimmed);
		haptic();
		// Newly added method is the last one in the store
		const created = usePaymentMethodStore.getState().methods.at(-1);
		if (created) onCreated(created);
		setName('');
		onDone();
	};

	return (
		<form
			onSubmit={submit}
			onKeyDown={(e) => e.key === 'Escape' && onDone()}
			className="pm-in space-y-4 rounded-[28px] border border-canvas bg-card p-5 shadow-xs"
		>
			<div className="flex items-center gap-3">
				<div
					key={kind}
					className="pm-pop flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-card"
					style={{ color: meta.hexColor, boxShadow: `0 0 0 2px ${meta.hexColor}` }}
				>
					<PreviewIcon size={22} />
				</div>
				<input
					className={`h-11 min-w-0 flex-1 rounded-full border bg-surface px-4 text-[13px] text-text transition-colors placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-ink/20 ${
						nameError ? 'pm-shake border-danger' : 'border-canvas'
					}`}
					placeholder="Name — e.g. HDFC Credit Card, Google Pay"
					value={name}
					onChange={(e) => setName(e.target.value)}
					autoFocus
				/>
				<button
					type="button"
					onClick={onDone}
					aria-label="Close"
					className="cursor-pointer rounded-full p-2 text-text-muted transition-colors hover:bg-surface hover:text-text"
				>
					<X size={16} />
				</button>
			</div>

			<div className="flex flex-wrap gap-1.5">
				{ALL_KINDS.map((k) => {
					const m = PAYMENT_KIND_META[k];
					const KindIcon = PAYMENT_KIND_ICONS[k];
					const on = kind === k;
					return (
						<button
							key={k}
							type="button"
							onClick={() => setKind(k)}
							className={`flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition-all active:scale-95 ${
								on ? 'bg-ink text-white shadow-xs' : 'border border-canvas bg-surface text-text hover:bg-canvas'
							}`}
						>
							<KindIcon size={13} style={{ color: on ? '#fff' : m.hexColor }} />
							{m.label}
						</button>
					);
				})}
			</div>

			<button
				type="submit"
				className="w-full cursor-pointer rounded-full bg-ink py-2.5 text-[13px] font-semibold text-white shadow-sm transition-all hover:bg-ink-soft active:scale-[0.98]"
			>
				Create — then drag it onto an account
			</button>
		</form>
	);
}
