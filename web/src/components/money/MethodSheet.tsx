import { useEffect, useMemo, useRef, useState } from 'react';
import { Landmark, Plus, Trash2, X } from 'lucide-react';
import { PAYMENT_KIND_META, usePaymentMethodStore, type PaymentMethod } from '../../stores/paymentMethodStore';
import type { SavingsAccount } from '../../api/financeHubApi';
import type { Transaction } from '../../types';
import { money } from './ui';
import { todayStr } from '../../utils/date';
import { PAYMENT_KIND_ICONS, getMethodTransactions, haptic, methodStats, uniqueTxAccounts } from './paymentShared';
import type { Notify } from './LinkBoard';

/** Bottom sheet with the details of one payment method (stats, aliases, delete). */
export default function MethodSheet({
	method,
	accounts,
	transactions,
	notify,
	onClose,
}: {
	method: PaymentMethod;
	accounts: SavingsAccount[];
	transactions: Transaction[];
	notify: Notify;
	onClose: () => void;
}) {
	const { removeMethod, unlinkAccount, linkAccount, setLinkDate, linkTransactionAccount, unlinkTransactionAccount } = usePaymentMethodStore();
	const [deleteArmed, setDeleteArmed] = useState(false);
	const [showAll, setShowAll] = useState(false);
	const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

	const meta = PAYMENT_KIND_META[method.kind];
	const Icon = PAYMENT_KIND_ICONS[method.kind];
	const stats = useMemo(() => methodStats(method, transactions), [method, transactions]);
	const txs = useMemo(() => getMethodTransactions(method, transactions), [method, transactions]);
	const unusedAliases = useMemo(
		() => uniqueTxAccounts(transactions).filter((a) => !method.transactionAccounts.includes(a)),
		[transactions, method.transactionAccounts],
	);
	const linked = accounts.filter((a) => method.linkedAccountIds.includes(a.id));

	useEffect(() => () => clearTimeout(timer.current), []);
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [onClose]);

	const handleDelete = () => {
		if (!deleteArmed) {
			setDeleteArmed(true);
			timer.current = setTimeout(() => setDeleteArmed(false), 3000);
			return;
		}
		removeMethod(method.id);
		notify(`Deleted ${method.name}`);
		onClose();
	};

	return (
		<div className="fixed inset-0 z-40 flex items-end justify-center">
			<div className="pm-fade absolute inset-0 bg-ink/40" onClick={onClose} aria-hidden />
			<div
				role="dialog"
				aria-label={`${method.name} details`}
				className="pm-sheet relative max-h-[78vh] w-full max-w-xl space-y-4 overflow-y-auto rounded-t-[32px] bg-card p-5 pb-8 shadow-2xl"
			>
				<div className="flex items-start justify-between gap-3">
					<div className="flex min-w-0 items-center gap-3">
						<div
							className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
							style={{ backgroundColor: meta.hexColor + '1f', color: meta.hexColor, boxShadow: `0 0 0 2px ${meta.hexColor}` }}
						>
							<Icon size={22} />
						</div>
						<div className="min-w-0">
							<p className="truncate text-[17px] font-bold text-text">{method.name}</p>
							<p className="text-[12px] text-text-muted">{meta.label}</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						aria-label="Close"
						className="cursor-pointer rounded-full p-2 text-text-muted transition-colors hover:bg-surface hover:text-text"
					>
						<X size={18} />
					</button>
				</div>

				<div className="grid grid-cols-3 gap-2">
					<div className="rounded-[18px] bg-danger-soft p-3">
						<p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Spent</p>
						<p className="text-[16px] font-bold text-danger">{money(stats.spent)}</p>
					</div>
					<div className="rounded-[18px] bg-mint p-3">
						<p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Income</p>
						<p className="text-[16px] font-bold text-mint-deep">{money(stats.income)}</p>
					</div>
					<div className="rounded-[18px] bg-surface p-3">
						<p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Txns</p>
						<p className="text-[16px] font-bold text-text">{stats.txCount}</p>
					</div>
				</div>

				{/* Linked accounts */}
				<div className="space-y-2">
					<p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Pays from</p>
					{linked.length === 0 ? (
						<p className="rounded-[16px] bg-surface p-3 text-[12px] text-text-muted">
							Not linked yet — drag this circle onto an account.
						</p>
					) : (
						<div className="flex flex-wrap gap-1.5">
							{linked.map((a) => (
								<span
									key={a.id}
									className="inline-flex items-center gap-1.5 rounded-full bg-mint/30 py-1 pl-2.5 pr-1.5 text-[12px] font-semibold text-mint-deep"
								>
									<Landmark size={12} /> {a.name}
									<label className="flex items-center gap-1 font-normal opacity-80" title="Payments before this date don't affect the account">
										since
										<input
											type="date"
											value={method.linkDates?.[a.id] ?? ''}
											max={todayStr()}
											onChange={(e) => setLinkDate(method.id, a.id, e.target.value || null)}
											className="cursor-pointer rounded bg-transparent text-[11px] outline-none"
										/>
										{!method.linkDates?.[a.id] && <span className="opacity-70">all history</span>}
									</label>
									<button
										type="button"
										aria-label={`Unlink from ${a.name}`}
										onClick={() => {
											haptic();
											const prev = method.linkDates?.[a.id] ?? null;
											unlinkAccount(method.id, a.id);
											notify(`${method.name} unlinked from ${a.name}`, () => linkAccount(method.id, a.id, prev));
										}}
										className="cursor-pointer rounded-full p-0.5 hover:bg-mint-deep/15"
									>
										<X size={12} />
									</button>
								</span>
							))}
						</div>
					)}
				</div>

				{/* Aliases */}
				<div className="space-y-2">
					<div className="flex items-baseline justify-between">
						<p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Matches transactions tagged</p>
						<p className="text-[10px] text-text-muted">decides what gets deducted</p>
					</div>
					<div className="flex flex-wrap gap-1.5">
						{method.transactionAccounts.map((acc) => (
							<span key={acc} className="inline-flex items-center gap-1 rounded-full bg-ink px-2.5 py-1 text-[11px] font-medium text-white">
								{acc}
								<button
									type="button"
									aria-label={`Remove ${acc}`}
									onClick={() => {
										unlinkTransactionAccount(method.id, acc);
										notify(`Removed tag “${acc}”`, () => linkTransactionAccount(method.id, acc));
									}}
									className="ml-0.5 cursor-pointer hover:opacity-70"
								>
									<X size={10} />
								</button>
							</span>
						))}
						{unusedAliases.map((acc) => (
							<button
								key={acc}
								type="button"
								onClick={() => {
									haptic();
									linkTransactionAccount(method.id, acc);
								}}
								className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-dashed border-canvas-soft bg-surface px-2.5 py-1 text-[11px] text-text-muted transition-all hover:text-text active:scale-95"
							>
								<Plus size={10} /> {acc}
							</button>
						))}
					</div>
				</div>

				{/* Recent transactions */}
				{txs.length > 0 && (
					<div className="space-y-1.5">
						<p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Recent</p>
						{(showAll ? txs : txs.slice(0, 4)).map((tx) => (
							<div key={tx.id} className="flex items-center justify-between gap-2 rounded-[14px] bg-surface px-3 py-2 text-[12px]">
								<div className="min-w-0">
									<p className="truncate font-semibold text-text">{tx.description || 'Untitled'}</p>
									<p className="text-[10px] text-text-muted">{tx.date}</p>
								</div>
								<span className={`shrink-0 font-bold ${tx.type === 'expense' ? 'text-danger' : 'text-mint-deep'}`}>
									{tx.type === 'expense' ? '−' : '+'}
									{money(tx.amount)}
								</span>
							</div>
						))}
						{txs.length > 4 && (
							<button
								type="button"
								onClick={() => setShowAll((v) => !v)}
								className="w-full cursor-pointer py-1 text-center text-[11px] font-semibold text-text-muted hover:text-text"
							>
								{showAll ? 'Show fewer' : `Show all ${txs.length}`}
							</button>
						)}
					</div>
				)}

				{method.note && <p className="rounded-[12px] bg-surface p-2.5 text-[12px] italic text-text-muted">{method.note}</p>}

				<button
					type="button"
					onClick={handleDelete}
					className={`flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-semibold transition-all ${
						deleteArmed ? 'pm-shake bg-danger text-white' : 'text-danger hover:bg-danger-soft'
					}`}
				>
					<Trash2 size={13} />
					{deleteArmed ? 'Tap again to delete' : 'Delete method'}
				</button>
			</div>
		</div>
	);
}
