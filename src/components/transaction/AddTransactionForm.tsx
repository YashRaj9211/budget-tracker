import React, { useState } from 'react';
import { Plus, Calendar as CalendarIcon, ArrowLeft, ArrowRight } from 'lucide-react';
import { useTransactionStore } from '../../stores/transactionStore';
import { useSplitDraft, errorMessage } from '../../hooks/useSplitDraft';
import CustomCalendar from '../common/Calendar';
import SplitExpenseFields from '../split/SplitExpenseFields';
import { AmountCalculatorInput } from './AmountCalculatorInput';
import { CategoryAccountSelector } from './CategoryAccountSelector';
import { Select } from '../ui/Select';
import VoiceInput from '../common/VoiceInput';
import { Button } from '../common/Button';
import { BottomSheet } from '../ui/BottomSheet';
import { statusSheet } from '../../stores/statusSheetStore';
import { getCategoryVisual, suggestCategoryFromText } from '../../utils/indianCategoryIcons';
import { formatFriendlyDate } from '../../utils/date';

import { useBudgetStore } from '../../stores/budgetStore';

interface AddTransactionFormProps {
	dateContext?: string;
	onClose?: () => void;
}

export const AddTransactionForm: React.FC<AddTransactionFormProps> = ({ dateContext, onClose }) => {
	const [isOpen, setIsOpen] = useState(false);
	const [type, setType] = useState<'expense' | 'income' | 'split'>('expense');
	const [splitStep, setSplitStep] = useState<1 | 2>(1);
	const [description, setDescription] = useState('');
	const [amountInput, setAmountInput] = useState('');
	const [evaluatedAmount, setEvaluatedAmount] = useState<number | null>(null);

	const initialDate = dateContext || new Date().toISOString().split('T')[0];
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

		handleClose();

		await statusSheet.execute({
			action: async () => {
				if (activeEdit) {
					await editTransaction(activeEdit.id, {
						amount: finalAmount,
						type: currentType as 'income' | 'expense',
						category: currentCategory,
						account: currentAccount,
						date: currentDate,
						description: desc,
					});
				} else if (isSplit) {
					await draft.submit({ description: desc, date: currentDate, amount: finalAmount });
					draft.reset();
				} else {
					await addTransaction({
						amount: finalAmount,
						type: currentType as 'income' | 'expense',
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

	const handleVoiceParsed = (parsed: {
		amount?: number;
		type?: 'expense' | 'income' | 'split';
		category?: string;
		description?: string;
		account?: string;
		date?: string;
	}) => {
		if (parsed.amount) setAmountInput(parsed.amount.toString());
		if (parsed.type) setType(parsed.type);
		if (parsed.category) {
			if (!categories.includes(parsed.category)) {
				addCategory(parsed.category);
			}
			setSelectedCategory(parsed.category);
			setUserOverrodeCategory(true);
		}
		if (parsed.description) {
			setDescription(parsed.description);
			if (!parsed.category && !userOverrodeCategory) {
				const suggested = suggestCategoryFromText(parsed.description);
				if (suggested) {
					let targetCat = suggested;
					if (suggested === 'Travel' && categories.includes('Transport')) targetCat = 'Transport';
					else if (suggested === 'Groceries' && !categories.includes('Groceries'))
						targetCat = 'Food';
					if (categories.includes(targetCat)) setSelectedCategory(targetCat);
				}
			}
		}
		if (parsed.account) setSelectedAccount(parsed.account);
		if (parsed.date) setDate(parsed.date);

		setIsOpen(true);
	};

	const canProceedToStep2 = () => {
		const finalAmount = evaluatedAmount ?? parseFloat(amountInput);
		return !!(finalAmount && !isNaN(finalAmount) && finalAmount > 0 && description.trim());
	};

	return (
		<>
			{/* Floating Action Buttons */}
			<div
				className={`fixed bottom-24 right-4 z-40 flex flex-col items-end gap-2.5 transition-all duration-200 ${
					isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
				}`}
			>
				<button
					onClick={() => {
						setEditingTransaction(null);
						setSplitStep(1);
						setDescription('');
						setAmountInput('');
						setEvaluatedAmount(null);
						setType('expense');
						setUserOverrodeCategory(false);
						setDate(initialDate);
						setIsOpen(true);
					}}
					className="w-12 h-12 rounded-full bg-ink text-white flex items-center justify-center cursor-pointer shadow-lg hover:bg-ink-soft active:scale-[0.95] transition-all"
					aria-label="Open add transaction form"
				>
					<Plus size={22} strokeWidth={2} />
				</button>

				<VoiceInput onParsed={handleVoiceParsed} />
			</div>

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
								className={`flex-1 py-2 text-xs font-medium rounded-full transition-all cursor-pointer ${
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

					{/* STEP 1: Details (Date, Amount, Description, Category) */}
					{(!isSplit || splitStep === 1) && (
						<>
							{/* Date Field */}
							<div className="relative">
								<label className="block text-[12px] font-medium text-text-muted mb-1.5">Date</label>
								<button
									type="button"
									onClick={() => setShowCalendar(!showCalendar)}
									className="w-full bg-surface rounded-full h-11 px-4 text-sm font-medium text-text flex items-center justify-between cursor-pointer focus:outline-none focus:ring-2 focus:ring-ink/20"
								>
									<span className="text-text font-medium">{formatFriendlyDate(date)}</span>
									<CalendarIcon size={16} className="text-text-muted" strokeWidth={1.5} />
								</button>
								{showCalendar && (
									<div className="absolute left-0 right-0 mt-2 bg-card rounded-[20px] shadow-xl p-3 z-50">
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

							{/* Amount with live math calculation */}
							<AmountCalculatorInput
								amountInput={amountInput}
								evaluatedAmount={evaluatedAmount}
								onChange={handleAmountChange}
								onBlur={handleAmountBlur}
							/>

							{/* Description Field */}
							<div>
								<div className="flex items-center justify-between mb-1.5">
									<label className="text-[12px] font-medium text-text-muted">Description</label>
								</div>
								<div className="relative flex items-center">
									<input
										type="text"
										value={description}
										onChange={handleDescriptionChange}
										placeholder="e.g. Chai tapri, Auto fare, Biryani, Blinkit"
										className="w-full bg-surface rounded-full h-11 pl-4 pr-11 text-sm font-normal text-text focus:outline-none focus:ring-2 focus:ring-ink/20"
										required
									/>
									<div
										className={`absolute right-2 w-7 h-7 rounded-full flex items-center justify-center transition-all ${
											description.trim()
												? detectedVisual.bg
												: 'bg-surface text-text-muted opacity-40'
										}`}
										title={`Auto icon: ${detectedVisual.iconName}`}
									>
										{detectedVisual.icon}
									</div>
								</div>
							</div>

							{/* Category selection for Split tab */}
							{isSplit && draft.categories.length > 0 && (
								<div>
									<label className="block text-[12px] font-medium text-text-muted mb-1.5">
										Category
									</label>
									<Select
										ariaLabel="Category"
										value={draft.categoryId}
										onChange={draft.setCategoryId}
										options={[
											{ id: '', label: 'No category' },
											...draft.categories.map((c) => ({ id: c.id, label: c.name })),
										]}
										placeholder="No category"
									/>
								</div>
							)}

							{/* Category & Account for normal expense/income */}
							{!isSplit && (
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
							)}
						</>
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
