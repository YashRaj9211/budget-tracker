import React, { useState } from 'react';
import { ReceiptText, Mic, Calendar as CalendarIcon, ArrowLeft, ArrowRight } from 'lucide-react';
import { useTransactionStore } from '../../stores/transactionStore';
import { useSplitDraft, errorMessage } from '../../hooks/useSplitDraft';
import CustomCalendar from '../common/Calendar';
import SplitExpenseFields from '../split/SplitExpenseFields';
import { AmountCalculatorInput } from './AmountCalculatorInput';
import { CategoryAccountSelector } from './CategoryAccountSelector';
import VoiceCaptureOverlay from '../voice/VoiceCaptureOverlay';
import type { VoiceTransaction } from '../../api/voiceApi';
import { Button } from '../common/Button';
import { BottomSheet } from '../ui/BottomSheet';
import { statusSheet } from '../../stores/statusSheetStore';
import { getCategoryVisual, suggestCategoryFromText } from '../../utils/indianCategoryIcons';
import { formatFriendlyDate } from '../../utils/date';

import { useBudgetStore } from '../../stores/budgetStore';
import { Checkbox } from '../ui';

interface AddTransactionFormProps {
	dateContext?: string;
	onClose?: () => void;
}

export const AddTransactionForm: React.FC<AddTransactionFormProps> = ({ dateContext, onClose }) => {
	const [isOpen, setIsOpen] = useState(false);
	const [voiceOpen, setVoiceOpen] = useState(false);
	const [holding, setHolding] = useState(false);
	const holdTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
	const longPressed = React.useRef(false);
	const [type, setType] = useState<'expense' | 'income' | 'split'>('expense');
	const [splitStep, setSplitStep] = useState<1 | 2>(1);
	const [description, setDescription] = useState('');
	const [amountInput, setAmountInput] = useState('');
	const [evaluatedAmount, setEvaluatedAmount] = useState<number | null>(null);

	const initialDate = dateContext || new Date().toLocaleDateString('en-CA');
	const [date, setDate] = useState(initialDate);
	const [showCalendar, setShowCalendar] = useState(false);

	const categories = useBudgetStore((s) => s.categories);
	const accounts = useBudgetStore((s) => s.accounts);
	const addCategory = useBudgetStore((s) => s.addCategory);
	const deleteCategory = useBudgetStore((s) => s.deleteCategory);
	const addAccount = useBudgetStore((s) => s.addAccount);
	const deleteAccount = useBudgetStore((s) => s.deleteAccount);

	const [selectedAccount, setSelectedAccount] = useState('Cash');
	const [selectedCategory, setSelectedCategory] = useState('Food');
	const [userOverrodeCategory, setUserOverrodeCategory] = useState(false);
	const [includeInBudget, setIncludeInBudget] = useState(true);

	// Sync defaults when accounts or categories change if currently selected is missing
	React.useEffect(() => {
		if (accounts.length > 0 && !accounts.includes(selectedAccount)) {
			setSelectedAccount(accounts[0]);
		}
	}, [accounts, selectedAccount]);

	React.useEffect(() => {
		if (categories.length > 0 && !categories.includes(selectedCategory)) {
			setSelectedCategory(categories[0]);
		}
	}, [categories, selectedCategory]);

	const [submitError, setSubmitError] = useState<string | null>(null);

	const addTransaction = useTransactionStore((s) => s.addTransaction);
	const editTransaction = useTransactionStore((s) => s.editTransaction);
	const editingTransaction = useTransactionStore((s) => s.editingTransaction);
	const setEditingTransaction = useTransactionStore((s) => s.setEditingTransaction);

	React.useEffect(() => {
		if (editingTransaction) {
			setType(editingTransaction.type === 'income' ? 'income' : 'expense');
			setDescription(editingTransaction.description);
			setAmountInput(editingTransaction.amount.toString());
			setEvaluatedAmount(null);
			if (editingTransaction.category) {
				setSelectedCategory(editingTransaction.category);
			}
			if (editingTransaction.account) {
				setSelectedAccount(editingTransaction.account);
			}
			setDate(editingTransaction.date);
			setUserOverrodeCategory(true);
			setSplitStep(1);
			setSubmitError(null);
			setIncludeInBudget(editingTransaction.includeInBudget !== false);
			setIsOpen(true);
		}
	}, [editingTransaction]);

	const isSplit = type === 'split';
	const numAmount = evaluatedAmount ?? (parseFloat(amountInput) || 0);
	const draft = useSplitDraft({ active: isOpen && isSplit, allowFriends: true, amount: numAmount });

	const detectedVisual = getCategoryVisual({
		description,
		category: selectedCategory,
		isIncome: type === 'income',
		isSplit: type === 'split',
		iconSize: 16,
	});

	const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const val = e.target.value;
		setDescription(val);

		if (!userOverrodeCategory && val.trim()) {
			const suggested = suggestCategoryFromText(val);
			if (suggested) {
				let targetCat = suggested;
				if (suggested === 'Travel' && categories.includes('Transport')) {
					targetCat = 'Transport';
				} else if (suggested === 'Groceries' && !categories.includes('Groceries')) {
					targetCat = 'Food';
				}

				if (categories.includes(targetCat)) {
					setSelectedCategory(targetCat);
				}
			}
		}
	};

	const evaluateExpression = (expr: string): number | null => {
		try {
			const sanitized = expr.replace(/[^0-9+\-*/.]/g, '');
			if (!sanitized) return null;
			if (/[+\-*/.]$/.test(sanitized)) return null;
			const fn = new Function(`'use strict'; return (${sanitized})`);
			const res = fn();
			return typeof res === 'number' && !isNaN(res) && isFinite(res) && res > 0 ? res : null;
		} catch {
			return null;
		}
	};

	const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const val = e.target.value;
		setAmountInput(val);
		if (/[+\-*/]/.test(val)) {
			setEvaluatedAmount(evaluateExpression(val));
		} else {
			setEvaluatedAmount(null);
		}
	};

	const handleAmountBlur = () => {
		if (evaluatedAmount !== null) {
			setAmountInput(evaluatedAmount.toString());
			setEvaluatedAmount(null);
		}
	};

	const handleAddCategory = async (newCat: string) => {
		await addCategory(newCat);
		setSelectedCategory(newCat);
	};

	const handleDeleteCategory = async (catToDelete: string) => {
		await deleteCategory(catToDelete);
		if (selectedCategory === catToDelete) {
			const remaining = categories.filter((c) => c !== catToDelete);
			if (remaining.length > 0) setSelectedCategory(remaining[0]);
		}
	};

	const handleAddAccount = async (newAcc: string) => {
		await addAccount(newAcc);
		setSelectedAccount(newAcc);
	};

	const handleDeleteAccount = async (accToDelete: string) => {
		await deleteAccount(accToDelete);
		if (selectedAccount === accToDelete) {
			const remaining = accounts.filter((a) => a !== accToDelete);
			if (remaining.length > 0) setSelectedAccount(remaining[0]);
		}
	};

	const handleClose = () => {
		setIsOpen(false);
		setSplitStep(1);
		setDescription('');
		setAmountInput('');
		setEvaluatedAmount(null);
		setType('expense');
		setUserOverrodeCategory(false);
		setIncludeInBudget(true);
		setEditingTransaction(null);
		setSubmitError(null);
		if (onClose) onClose();
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const finalAmount = evaluatedAmount ?? parseFloat(amountInput);
		if (!finalAmount || isNaN(finalAmount) || finalAmount <= 0) return;
		if (!description.trim()) return;

		setSubmitError(null);
		const desc = description.trim();
		const currentType = type;
		const currentCategory = selectedCategory;
		const currentAccount = selectedAccount;
		const currentDate = date;
		const activeEdit = editingTransaction;
		const currentInclude = currentType === 'expense' ? includeInBudget : true;

		handleClose();

		await statusSheet.execute({
			action: async () => {
				if (activeEdit) {
					await editTransaction(activeEdit.id, {
						amount: finalAmount,
						type: currentType as 'income' | 'expense',

						includeInBudget: currentInclude,
						category: currentCategory,
						account: currentAccount,
						date: currentDate,
						description: desc,
					});
				} else if (isSplit) {
					await draft.submit({
						description: desc,
						date: currentDate,
						amount: finalAmount,
						category: currentCategory,
						account: currentAccount,
					});
					draft.reset();
				} else {
					await addTransaction({
						amount: finalAmount,
						type: currentType as 'income' | 'expense',

						includeInBudget: currentInclude,
						category: currentCategory,
						account: currentAccount,
						date: currentDate,
						description: desc,
					});
				}
			},
			processingTitle: activeEdit ? 'Updating...' : 'Processing...',
			processingMessage: activeEdit
				? `Updating ${currentType} of ₹${finalAmount.toLocaleString()}`
				: `Recording ${currentType} of ₹${finalAmount.toLocaleString()}`,
			successTitle: activeEdit ? 'Updated!' : 'Success!',
			successMessage: activeEdit
				? `Transaction "${desc}" updated`
				: `₹${finalAmount.toLocaleString()} recorded for "${desc}"`,
			buttonText: 'Nice one!',
			onError: (err) => {
				setSubmitError(errorMessage(err));
			},
		});
	};

	// A voice row sent over from the overlay: prefill the form (creating an unknown category) and open it
	const handleVoiceParsed = async (parsed: VoiceTransaction) => {
		openAddForm();
		setVoiceOpen(false);
		if (parsed.amount) setAmountInput(parsed.amount.toString());
		setType(parsed.type);
		const cat = parsed.category?.trim();
		if (cat) {
			if (!categories.some((c) => c.toLowerCase() === cat.toLowerCase())) await addCategory(cat);
			setSelectedCategory(categories.find((c) => c.toLowerCase() === cat.toLowerCase()) ?? cat);
			setUserOverrodeCategory(true);
		}
		if (parsed.description) setDescription(parsed.description);
		if (parsed.account) setSelectedAccount(parsed.account);
		if (parsed.date) setDate(parsed.date);
		setIncludeInBudget(true);
	};

	const canProceedToStep2 = () => {
		const finalAmount = evaluatedAmount ?? parseFloat(amountInput);
		return !!(finalAmount && !isNaN(finalAmount) && finalAmount > 0 && description.trim());
	};

	const toLocalISO = (d: Date) => d.toLocaleDateString('en-CA');
	const todayISO = toLocalISO(new Date());
	const yesterdayISO = toLocalISO(new Date(Date.now() - 86400000));
	const isCustomDate = date !== todayISO && date !== yesterdayISO;
	const amountAccent = type === 'income' ? 'success' : type === 'split' ? 'ink' : 'danger';

	const chipClass = (active: boolean) =>
		`h-9 px-3.5 rounded-full text-xs font-medium whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
			active ? 'bg-ink text-white shadow-2xs' : 'bg-surface text-text-muted hover:text-text'
		}`;

	const RING = 2 * Math.PI * 26;

	React.useEffect(
		() => () => {
			if (holdTimer.current) clearTimeout(holdTimer.current);
		},
		[],
	);

	const cancelHold = () => {
		if (holdTimer.current) clearTimeout(holdTimer.current);
		holdTimer.current = null;
		setHolding(false);
	};

	const openAddForm = () => {
		setEditingTransaction(null);
		setSplitStep(1);
		setDescription('');
		setAmountInput('');
		setEvaluatedAmount(null);
		setType('expense');
		setUserOverrodeCategory(false);
		setDate(initialDate);
		setIncludeInBudget(true);
		setIsOpen(true);
	};

	return (
		<>
			{/* Single FAB: tap = add form, hold = voice entry */}
			<div
				className={`fixed bottom-24 right-4 z-10 flex flex-col items-end gap-2 transition-all duration-200 ${
					isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
				}`}
			>
				<span
					className={`px-2.5 py-1 rounded-full bg-ink text-white text-[11px] font-medium shadow-md transition-all duration-200 ${
						holding ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
					}`}
					aria-hidden="true"
				>
					Keep holding for voice…
				</span>
				<button
					onPointerDown={(e) => {
							if (e.pointerType === 'mouse' && e.button !== 0) return;
							if (holdTimer.current) clearTimeout(holdTimer.current);
						longPressed.current = false;
						setHolding(true);
						holdTimer.current = setTimeout(() => {
							longPressed.current = true;
							setHolding(false);
							navigator.vibrate?.(15);
							setVoiceOpen(true);
						}, 450);
					}}
					onPointerUp={cancelHold}
					onPointerLeave={cancelHold}
					onPointerCancel={cancelHold}
					onContextMenu={(e) => e.preventDefault()}
					onClick={() => {
						if (longPressed.current) {
							longPressed.current = false;
							return;
						}
						openAddForm();
					}}
					style={{ touchAction: 'none', WebkitTouchCallout: 'none', userSelect: 'none' }}
					className={`relative w-14 h-14 rounded-full flex items-center justify-center cursor-pointer shadow-lg transition-all duration-300 ${
						holding ? 'bg-mint text-ink scale-110' : 'bg-ink text-white hover:bg-ink-soft'
					}`}
					aria-label="Add transaction (hold for voice)"
				>
					<svg className="absolute inset-0 -rotate-90 pointer-events-none" viewBox="0 0 56 56" aria-hidden="true">
						<circle
							cx="28"
							cy="28"
							r="26"
							fill="none"
							stroke="currentColor"
							strokeWidth="2.5"
							strokeLinecap="round"
							strokeDasharray={RING}
							strokeDashoffset={holding ? 0 : RING}
							style={{ transition: holding ? 'stroke-dashoffset 450ms linear' : 'none' }}
						/>
					</svg>
					<ReceiptText
						size={24}
						strokeWidth={2}
						className={`absolute transition-all duration-300 ${holding ? 'opacity-0 scale-50 rotate-90' : 'opacity-100'}`}
					/>
					<Mic
						size={22}
						strokeWidth={2}
						className={`absolute transition-all duration-300 ${holding ? 'opacity-100' : 'opacity-0 scale-50'}`}
					/>
				</button>
			</div>

			{voiceOpen && <VoiceCaptureOverlay onClose={() => setVoiceOpen(false)} dateContext={dateContext} onEditInForm={handleVoiceParsed} />}

			{/* Form Bottom Sheet Drawer */}
			<BottomSheet
				isOpen={isOpen}
				onClose={handleClose}
				title={
					editingTransaction ? (
						'Edit transaction'
					) : isSplit ? (
						<div className="flex items-center justify-between w-full pr-4 gap-2">
							<span>Split an expense</span>
							<span className="text-xs font-normal text-text-muted">Step {splitStep} of 2</span>
						</div>
					) : (
						'Add transaction'
					)
				}
			>
				<form onSubmit={handleSubmit} className="space-y-4 text-left pb-20">
					{/* Transaction Type Selector */}
					<div
						className="flex bg-surface p-1 rounded-full gap-1"
						role="group"
						aria-label="Transaction type"
					>
						{(
							editingTransaction
								? ([
										['expense', 'Expense'],
										['income', 'Income'],
								  ] as const)
								: ([
										['expense', 'Expense'],
										['income', 'Income'],
										['split', 'Split'],
								  ] as const)
						).map(([id, label]) => (
							<button
								key={id}
								type="button"
								aria-pressed={type === id}
								onClick={() => {
									setType(id);
									setSplitStep(1);
									setSubmitError(null);
								}}
								className={`flex-1 h-10 text-sm font-medium rounded-full transition-all cursor-pointer ${
									type === id ? 'bg-ink text-white shadow-2xs' : 'text-text-muted hover:text-text'
								}`}
							>
								{label}
							</button>
						))}
					</div>

					{/* Step indicators for Split */}
					{isSplit && (
						<div className="flex items-center gap-2 pt-1 pb-1">
							<div
								className={`flex-1 h-1 rounded-full transition-all ${
									splitStep >= 1 ? 'bg-ink' : 'bg-surface'
								}`}
							/>
							<div
								className={`flex-1 h-1 rounded-full transition-all ${
									splitStep >= 2 ? 'bg-ink' : 'bg-surface'
								}`}
							/>
						</div>
					)}

					{/* STEP 1: Details (Amount, Description, Date, Category, Account) */}
					{(!isSplit || splitStep === 1) && (
						<>
							{/* Amount with live math calculation */}
							<AmountCalculatorInput
								amountInput={amountInput}
								evaluatedAmount={evaluatedAmount}
								onChange={handleAmountChange}
								onBlur={handleAmountBlur}
								accent={amountAccent}
							/>

							{/* Description Field */}
							<div>
								<label
									htmlFor="txn-description"
									className="block text-[12px] font-medium text-text-muted mb-1.5"
								>
									What was it for?
								</label>
								<div className="relative flex items-center">
									<div
										className={`absolute left-2 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
											description.trim()
												? detectedVisual.bg
												: 'bg-card text-text-muted opacity-60'
										}`}
										title={`Auto icon: ${detectedVisual.iconName}`}
									>
										{detectedVisual.icon}
									</div>
									<input
										id="txn-description"
										type="text"
										value={description}
										onChange={handleDescriptionChange}
										placeholder="e.g. Chai tapri, Auto fare, Blinkit"
										className="w-full bg-surface rounded-full h-12 pl-12 pr-4 text-sm text-text placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-ink/20"
										required
									/>
								</div>
							</div>

							{/* Date: quick chips + calendar */}
							<div>
								<label className="block text-[12px] font-medium text-text-muted mb-1.5">Date</label>
								<div className="flex items-center gap-2 overflow-x-auto">
									<button
										type="button"
										onClick={() => {
											setDate(todayISO);
											setShowCalendar(false);
										}}
										className={chipClass(date === todayISO)}
									>
										Today
									</button>
									<button
										type="button"
										onClick={() => {
											setDate(yesterdayISO);
											setShowCalendar(false);
										}}
										className={chipClass(date === yesterdayISO)}
									>
										Yesterday
									</button>
									<button
										type="button"
										onClick={() => setShowCalendar(!showCalendar)}
										aria-expanded={showCalendar}
										className={chipClass(isCustomDate || showCalendar)}
									>
										<CalendarIcon size={14} strokeWidth={1.75} />
										<span>{isCustomDate ? formatFriendlyDate(date) : 'Pick date'}</span>
									</button>
								</div>
								{showCalendar && (
									<div className="mt-2 bg-surface rounded-[20px] p-3">
										<CustomCalendar
											selectedDate={date}
											onSelectDate={(newDateStr) => {
												setDate(newDateStr);
												setShowCalendar(false);
											}}
										/>
									</div>
								)}
							</div>

							{/* Category & Payment Method selector (same across Expense, Income, and Split) */}
							<CategoryAccountSelector
								accounts={accounts}
								selectedAccount={selectedAccount}
								onSelectAccount={setSelectedAccount}
								onAddAccount={handleAddAccount}
								onDeleteAccount={handleDeleteAccount}
								categories={categories}
								selectedCategory={selectedCategory}
								onSelectCategory={(cat) => {
									setUserOverrodeCategory(true);
									setSelectedCategory(cat);
								}}
								onAddCategory={handleAddCategory}
								onDeleteCategory={handleDeleteCategory}
							/>
						</>
					)}

					{type === 'expense' && (
						<div className="bg-surface rounded-[20px] px-4 py-3 flex items-center">
							<Checkbox
								checked={includeInBudget}
								onChange={setIncludeInBudget}
								label="Count in budget"
								className="w-full"
							/>
						</div>
					)}

					{/* STEP 2: Paid by and splits management */}
					{isSplit && splitStep === 2 && <SplitExpenseFields draft={draft} hideCategory={true} />}

					{submitError && (
						<p
							role="alert"
							className="rounded-[16px] bg-danger-soft p-3 text-xs font-medium text-danger"
						>
							{submitError}
						</p>
					)}

					{/* Actions: Next button for step 1 of split, Back + Submit for step 2, or standard Submit */}
					{isSplit ? (
						splitStep === 1 ? (
							<Button
								type="button"
								variant="primary"
								disabled={!canProceedToStep2()}
								onClick={() => setSplitStep(2)}
								className="w-full py-3 font-medium flex items-center justify-center gap-2"
							>
								<span>Continue to Splits</span>
								<ArrowRight size={16} />
							</Button>
						) : (
							<div className="flex items-center gap-2">
								<Button
									type="button"
									variant="secondary"
									onClick={() => setSplitStep(1)}
									className="px-4 py-3 font-medium flex items-center justify-center gap-1.5"
								>
									<ArrowLeft size={16} />
									<span>Back</span>
								</Button>
								<Button
									type="submit"
									variant="primary"
									disabled={!!draft.error}
									className="flex-1 py-3 font-medium"
								>
									Add split
								</Button>
							</div>
						)
					) : (
						<Button type="submit" variant="primary" className="w-full py-3 font-medium">
							{editingTransaction ? 'Save changes' : 'Add transaction'}
						</Button>
					)}
				</form>
			</BottomSheet>
		</>
	);
};

export default AddTransactionForm;
