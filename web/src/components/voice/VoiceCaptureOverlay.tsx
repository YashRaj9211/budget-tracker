import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
	Mic,
	X,
	Check,
	Loader2,
	Trash2,
	RotateCcw,
	Sparkles,
	Calendar as CalendarIcon,
	ChevronDown,
	CircleDollarSign,
	Banknote,
} from 'lucide-react';
import { useVoiceInput } from '../../hooks/useVoiceInput';
import { voiceApi, type VoiceTransaction } from '../../api/voiceApi';
import { parseVoiceLocally, matchFrom } from '../../utils/voiceLocalParser';
import { useBudgetStore } from '../../stores/budgetStore';
import { useTransactionStore } from '../../stores/transactionStore';
import { useAuthStore } from '../../stores/authStore';
import { usePaymentMethodStore, inferKindFromName, PAYMENT_KIND_META } from '../../stores/paymentMethodStore';
import { PAYMENT_KIND_ICONS } from '../money/PaymentMethodsPanel';
import { Select, type SelectOption } from '../ui/Select';
import { formatFriendlyDate } from '../../utils/date';
import { todayStr } from '../../utils/date';
import { toast } from '../../stores/toastStore';
import { getCategoryVisual } from '../../utils/indianCategoryIcons';

type Phase = 'listening' | 'review';

interface Props {
	onClose: () => void;
	dateContext?: string;
	/** When set, each row gets an "Edit in form" action that hands the row to the full add form. */
	onEditInForm?: (t: VoiceTransaction) => void;
}


export const VoiceCaptureOverlay: React.FC<Props> = ({ onClose, dateContext, onEditInForm }) => {
	const categories = useBudgetStore((s) => s.categories);
	const budgetAccounts = useBudgetStore((s) => s.accounts);
	const loadBudgetAccounts = useBudgetStore((s) => s.loadAccounts);
	const userMethods = usePaymentMethodStore((s) => s.methods);
	const syncExistingAccounts = usePaymentMethodStore((s) => s.syncExistingAccounts);
	const transactions = useTransactionStore((s) => s.transactions);
	const addTransaction = useTransactionStore((s) => s.addTransaction);
	const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

	const [phase, setPhase] = useState<Phase>('listening');
	const [items, setItems] = useState<VoiceTransaction[]>([]);
	const [aiRefining, setAiRefining] = useState(false);
	const [saving, setSaving] = useState(false);
	const [typed, setTyped] = useState('');
	const userEditedRef = useRef(false);
	const requestIdRef = useRef(0);

	const today = dateContext || todayStr();

	// Ensure budget accounts and payment methods are loaded & synced
	useEffect(() => {
		loadBudgetAccounts();
	}, [loadBudgetAccounts]);

	useEffect(() => {
		const txAccs = transactions.map((t) => t.account).filter(Boolean);
		const combined = Array.from(new Set([...budgetAccounts, ...txAccs])).filter(Boolean);
		if (combined.length > 0) {
			syncExistingAccounts(combined);
		}
	}, [budgetAccounts, transactions, syncExistingAccounts]);

	// Build full list of all payment methods the user has
	const paymentMethodOptions = useMemo<SelectOption[]>(() => {
		const map = new Map<string, SelectOption>();

		// 1. Add all methods from user's payment method store
		for (const m of userMethods) {
			const name = m.name?.trim();
			if (!name) continue;
			const kind = m.kind || inferKindFromName(name);
			const meta = PAYMENT_KIND_META[kind] || PAYMENT_KIND_META.OTHER;
			const IconComp = PAYMENT_KIND_ICONS[kind] || CircleDollarSign;
			map.set(name.toLowerCase(), {
				value: name,
				label: name,
				sublabel: meta.label,
				icon: <IconComp size={14} style={{ color: meta.hexColor }} />,
			});
		}

		// 2. Add any from budgetStore accounts not yet registered
		for (const acc of budgetAccounts) {
			const name = acc?.trim();
			if (!name) continue;
			const lower = name.toLowerCase();
			if (!map.has(lower)) {
				const kind = inferKindFromName(name);
				const meta = PAYMENT_KIND_META[kind] || PAYMENT_KIND_META.OTHER;
				const IconComp = PAYMENT_KIND_ICONS[kind] || CircleDollarSign;
				map.set(lower, {
					value: name,
					label: name,
					sublabel: meta.label,
					icon: <IconComp size={14} style={{ color: meta.hexColor }} />,
				});
			}
		}

		// Fallback if empty
		if (map.size === 0) {
			map.set('cash', {
				value: 'Cash',
				label: 'Cash',
				sublabel: 'Cash',
				icon: <Banknote size={14} style={{ color: PAYMENT_KIND_META.CASH.hexColor }} />,
			});
		}

		return Array.from(map.values());
	}, [userMethods, budgetAccounts]);

	// List of all account/payment method names for parser matching
	const allPaymentMethodNames = useMemo(() => {
		return paymentMethodOptions.map((opt) => String(opt.value));
	}, [paymentMethodOptions]);

	// Dropdown options for categories with icons
	const categoryOptions = useMemo<SelectOption[]>(() => {
		return categories.map((cat) => {
			const visual = getCategoryVisual({ category: cat });
			return {
				value: cat,
				label: cat,
				icon: <span className="scale-75 origin-center">{visual.icon}</span>,
			};
		});
	}, [categories]);

	// Runs when the user stops talking
	const processText = async (text: string) => {
		const reqId = ++requestIdRef.current;
		userEditedRef.current = false;

		// 1) Instant result from the local parser, so the user sees rows right away
		setItems(parseVoiceLocally(text, categories, allPaymentMethodNames, today));
		setPhase('review');

		// 2) LLM refines it (better descriptions/categories, Hindi, "yesterday" etc.)
		if (!isAuthenticated || !navigator.onLine) return;
		setAiRefining(true);
		try {
			const ai = await voiceApi.parse(text, categories, allPaymentMethodNames, today);
			if (reqId !== requestIdRef.current || userEditedRef.current || ai.length === 0) return;
			const fallbackCat = categories.includes('Other') ? 'Other' : categories[0] ?? 'Other';
			setItems(
				ai.map((t) => ({
					...t,
					rawCategory: t.category,
					category: matchFrom(categories, t.category, fallbackCat),
					account: matchFrom(allPaymentMethodNames, t.account, allPaymentMethodNames[0] ?? 'Cash'),
				}))
			);
		} catch (err) {
			console.warn('[voice] AI parse failed, keeping local result', err);
		} finally {
			if (reqId === requestIdRef.current) setAiRefining(false);
		}
	};

	const { isSupported, isListening, transcript, error, start, stop, cancel } = useVoiceInput(processText);

	// Live preview while speaking
	const livePreview = useMemo(
		() => (isListening ? parseVoiceLocally(transcript, categories, allPaymentMethodNames, today) : []),
		[isListening, transcript, categories, allPaymentMethodNames, today]
	);

	// Start the mic as soon as the overlay opens (component mounts fresh each time)
	useEffect(() => {
		if (isSupported) start();
		document.body.style.overflow = 'hidden';
		return () => {
			cancel();
			document.body.style.overflow = 'unset';
		};
	}, [isSupported, start, cancel]);

	const close = () => {
		requestIdRef.current++; // ignore any late AI reply
		cancel();
		onClose();
	};

	const speakAgain = () => {
		requestIdRef.current++;
		setAiRefining(false);
		setItems([]);
		setPhase('listening');
		start();
	};

	const updateItem = (i: number, patch: Partial<VoiceTransaction>) => {
		userEditedRef.current = true;
		setItems((prev) =>
			prev.map((t, idx) =>
				idx === i ? { ...t, ...patch, ...(patch.category !== undefined ? { rawCategory: undefined } : {}) } : t,
			),
		);
	};
	const removeItem = (i: number) => {
		userEditedRef.current = true;
		setItems((prev) => prev.filter((_, idx) => idx !== i));
	};

	const valid = items.filter((t) => t.amount > 0 && t.description.trim());
	const total = valid.reduce((s, t) => s + (t.type === 'income' ? 0 : t.amount), 0);

	const editInForm = (t: VoiceTransaction) => {
		if (!onEditInForm) return;
		requestIdRef.current++;
		cancel();
		onEditInForm({ ...t, category: t.rawCategory?.trim() || t.category, date: t.date || today });
	};

	const saveAll = async () => {
		if (!valid.length) return;
		setSaving(true);
		try {
			for (const t of valid) {
				await addTransaction({
					type: t.type,
					amount: t.amount,
					description: t.description.trim(),
					category: t.category,
					account: t.account,
					date: t.date || today,
					includeInBudget: true,
				});
			}
			toast.success(`Added ${valid.length} transaction${valid.length > 1 ? 's' : ''}`);
			close();
		} catch (err) {
			console.error(err);
			toast.error('Could not save transactions');
		} finally {
			setSaving(false);
		}
	};

	return createPortal(
		<div className="fixed inset-0 z-[100] flex flex-col bg-ink text-text-on-ink animate-[fadeIn_.15s_ease-out]">
			{/* Header */}
			<div className="flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-2">
				<span className="text-sm font-medium text-text-on-ink-muted">
					{phase === 'listening' ? 'Voice entry' : 'Review transactions'}
				</span>
				<button
					onClick={close}
					className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center cursor-pointer"
					aria-label="Close voice entry"
				>
					<X size={20} />
				</button>
			</div>

			<div className="flex-1 overflow-y-auto px-5 pb-4">
				{phase === 'listening' && (
					<div className="flex flex-col items-center pt-8">
						{/* Mic orb */}
						<button
							onClick={isListening ? stop : start}
							disabled={!isSupported}
							className="relative w-28 h-28 rounded-full bg-mint text-ink flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
							aria-label={isListening ? 'Stop listening' : 'Start listening'}
						>
							{isListening && (
								<span className="absolute inset-0 rounded-full bg-mint/40 animate-ping" />
							)}
							<Mic size={40} strokeWidth={2} className="relative" />
						</button>
						<p className="mt-5 text-sm text-text-on-ink-muted">
							{isListening ? 'Listening… tap the mic when done' : isSupported ? 'Tap the mic to speak' : ''}
						</p>

						{/* Live transcript */}
						<p className="mt-8 min-h-[4rem] text-center text-2xl font-medium leading-snug">
							{transcript || (
								<span className="text-text-on-ink-muted/60">
									“20 rupees snacks, 400 dinner, 10 travel”
								</span>
							)}
						</p>

						{/* Live preview chips */}
						{livePreview.length > 0 && (
							<div className="mt-6 flex flex-wrap justify-center gap-2">
								{livePreview.map((t, i) => (
									<span key={i} className="px-3 py-1.5 rounded-full bg-white/10 text-sm">
										₹{t.amount} · {t.description}
									</span>
								))}
							</div>
						)}

						{error && (
							<p className="mt-6 text-center text-sm bg-danger-soft text-danger px-4 py-2 rounded-xl">
								{error}
							</p>
						)}

						{/* Typing fallback (no mic support / permission denied) */}
						{(!isSupported || error) && (
							<form
								className="mt-6 w-full flex gap-2"
								onSubmit={(e) => {
									e.preventDefault();
									if (typed.trim()) processText(typed.trim());
								}}
							>
								<input
									value={typed}
									onChange={(e) => setTyped(e.target.value)}
									placeholder="Type: 20 snacks 400 dinner"
									className="flex-1 rounded-xl bg-white/10 px-4 py-3 outline-none placeholder:text-text-on-ink-muted"
								/>
								<button className="px-4 rounded-xl bg-mint text-ink font-medium cursor-pointer">Go</button>
							</form>
						)}
					</div>
				)}

				{phase === 'review' && (
					<div className="pt-2">
						<p className="text-sm text-text-on-ink-muted italic mb-3">“{transcript || typed}”</p>
						<div className="flex items-center justify-between gap-2 mb-3 h-5 text-xs text-text-on-ink-muted">
							{aiRefining ? (
								<span className="flex items-center gap-1.5 text-mint">
									<Loader2 size={14} className="animate-spin" /> AI is refining…
								</span>
							) : (
								<span className="flex items-center gap-1.5">
									<Sparkles size={14} className="text-mint" /> {items.length} found · tap to edit
								</span>
							)}
							<span className="text-[11px] px-2.5 py-0.5 rounded-full bg-white/10 text-text-on-ink-muted">
								Target: {formatFriendlyDate(today)}
							</span>
						</div>

						{items.length === 0 && !aiRefining && (
							<p className="text-center py-10 text-text-on-ink-muted">
								No amounts found. Try saying “200 for lunch”.
							</p>
						)}

						<div className="flex flex-col gap-3">
							{items.map((t, i) => {
								const visual = getCategoryVisual({
									category: t.category,
									description: t.description,
									isIncome: t.type === 'income',
								});
								const itemDate = t.date || today;

								return (
									<div
										key={i}
										className="bg-card text-text rounded-[22px] p-3.5 flex flex-col gap-2.5 shadow-sm border border-black/5 transition-all"
									>
										{/* Row 1: Category icon, Description, Amount, Delete */}
										<div className="flex items-center gap-2.5">
											<div
												className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center shadow-2xs ${visual.bg}`}
											>
												{visual.icon}
											</div>
											<input
												value={t.description}
												onChange={(e) => updateItem(i, { description: e.target.value })}
												placeholder="Description..."
												className="flex-1 min-w-0 font-medium text-text text-[15px] bg-transparent outline-none px-2 py-1 -ml-1 rounded-lg hover:bg-surface/60 focus:bg-surface/80 transition-colors"
											/>
											<div className="flex items-center bg-surface px-2.5 py-1 rounded-full border border-transparent focus-within:border-ink/20 focus-within:bg-card transition-all shrink-0">
												<span
													className={`text-xs font-semibold mr-0.5 ${
														t.type === 'income' ? 'text-mint-deep' : 'text-text-muted'
													}`}
												>
													₹
												</span>
												<input
													type="number"
													inputMode="decimal"
													step="any"
													value={t.amount || ''}
													onChange={(e) => updateItem(i, { amount: parseFloat(e.target.value) || 0 })}
													placeholder="0"
													className={`w-16 text-right font-bold text-sm bg-transparent outline-none ${
														t.type === 'income' ? 'text-mint-deep' : 'text-text'
													}`}
												/>
											</div>
											{onEditInForm && (
												<button
													type="button"
													onClick={() => editInForm(t)}
													className="h-8 px-2.5 rounded-full text-[11px] font-semibold bg-surface text-text hover:bg-surface/80 transition-colors cursor-pointer shrink-0"
													aria-label="Edit in full form"
												>
													Edit
												</button>
											)}
											<button
												type="button"
												onClick={() => removeItem(i)}
												className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-danger hover:bg-danger-soft transition-colors cursor-pointer shrink-0"
												aria-label="Remove transaction"
											>
												<Trash2 size={16} />
											</button>
										</div>

										{/* Row 2: Type toggle & Category Dropdown */}
										<div className="flex items-center gap-2">
											<button
												type="button"
												onClick={() =>
													updateItem(i, { type: t.type === 'income' ? 'expense' : 'income' })
												}
												className={`h-9 px-3 rounded-full text-xs font-semibold cursor-pointer shrink-0 transition-all flex items-center gap-1.5 ${
													t.type === 'income'
														? 'bg-mint text-ink shadow-2xs'
														: 'bg-surface hover:bg-surface/80 text-text'
												}`}
											>
												<span
													className={`w-1.5 h-1.5 rounded-full ${
														t.type === 'income' ? 'bg-mint-deep' : 'bg-danger'
													}`}
												/>
												{t.type === 'income' ? 'Income' : 'Expense'}
											</button>
											<div className="flex-1 min-w-0">
												<Select
													size="sm"
													variant="surface"
													align="left"
													value={t.category}
													onChange={(val) => updateItem(i, { category: val })}
													options={categoryOptions}
													placeholder="Select category"
													ariaLabel="Category"
												/>
											</div>
										</div>

										{/* Row 3: Payment Method Dropdown & Date Picker */}
										<div className="flex items-center gap-2">
											<div className="flex-1 min-w-0">
												<Select
													size="sm"
													variant="surface"
													align="left"
													value={t.account}
													onChange={(val) => updateItem(i, { account: val })}
													options={paymentMethodOptions}
													placeholder="Select payment method"
													ariaLabel="Payment method"
												/>
											</div>

											{/* Date display & picker */}
											<label
												className={`relative flex-1 min-w-0 h-9 px-3 rounded-full bg-surface hover:bg-surface/80 flex items-center justify-between text-xs font-medium cursor-pointer transition-colors select-none ${
													itemDate !== today ? 'ring-1 ring-mint-deep/30 bg-mint/10' : ''
												}`}
												title="Click to change date"
											>
												<div className="flex items-center gap-1.5 truncate mr-1 min-w-0">
													<CalendarIcon size={13} className="text-text-muted shrink-0" strokeWidth={1.5} />
													<span className="truncate text-text font-medium">
														{formatFriendlyDate(itemDate)}
													</span>
												</div>
												<ChevronDown size={13} className="text-text-muted shrink-0" strokeWidth={1.5} />
												<input
													type="date"
													value={itemDate}
													onChange={(e) => updateItem(i, { date: e.target.value })}
													className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
												/>
											</label>
										</div>
									</div>
								);
							})}
						</div>
					</div>
				)}
			</div>

			{/* Footer actions */}
			{phase === 'review' && (
				<div className="flex gap-2 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-white/10">
					<button
						onClick={speakAgain}
						className="h-12 px-4 rounded-full bg-white/10 flex items-center gap-2 cursor-pointer"
					>
						<RotateCcw size={18} /> Again
					</button>
					<button
						onClick={saveAll}
						disabled={!valid.length || saving}
						className="flex-1 h-12 rounded-full bg-mint text-ink font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
					>
						{saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
						Add {valid.length || ''} {total > 0 && `· ₹${total.toLocaleString()}`}
					</button>
				</div>
			)}
		</div>,
		document.body
	);
};

export default VoiceCaptureOverlay;
