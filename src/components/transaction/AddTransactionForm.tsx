import React, { useState } from 'react';
import { Plus, Calendar as CalendarIcon } from 'lucide-react';
import { useTransactionStore } from '../../stores/transactionStore';
import { useSplitDraft, errorMessage } from '../../hooks/useSplitDraft';
import CustomCalendar from '../common/Calendar';
import SplitExpenseFields from '../split/SplitExpenseFields';
import { AmountCalculatorInput } from './AmountCalculatorInput';
import { CategoryAccountSelector } from './CategoryAccountSelector';
import VoiceInput from '../common/VoiceInput';
import { Button } from '../common/Button';
import { BottomSheet } from '../ui/BottomSheet';
import { statusSheet } from '../../stores/statusSheetStore';
import { getCategoryVisual, suggestCategoryFromText } from '../../utils/indianCategoryIcons';

interface AddTransactionFormProps {
	dateContext?: string;
	onClose?: () => void;
}

export const AddTransactionForm: React.FC<AddTransactionFormProps> = ({ dateContext }) => {
	const [isOpen, setIsOpen] = useState(false);
	const [type, setType] = useState<'expense' | 'income' | 'split'>('expense');
	const [description, setDescription] = useState('');
	const [amountInput, setAmountInput] = useState('');
	const [evaluatedAmount, setEvaluatedAmount] = useState<number | null>(null);

	const initialDate = dateContext || new Date().toISOString().split('T')[0];
	const [date, setDate] = useState(initialDate);
	const [showCalendar, setShowCalendar] = useState(false);

	const [selectedAccount, setSelectedAccount] = useState('Personal');
	const [selectedCategory, setSelectedCategory] = useState('Food');
	const [userOverrodeCategory, setUserOverrodeCategory] = useState(false);
	const [categories, setCategories] = useState<string[]>([
		'Food',
		'Transport',
		'Shopping',
		'Entertainment',
		'Bills',
		'Health',
	]);

	const accounts = ['Personal', 'HDFC Bank', 'Cash', 'Credit Card'];

	const [submitError, setSubmitError] = useState<string | null>(null);

	const addTransaction = useTransactionStore((s) => s.addTransaction);

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

	const appendOperator = (op: string) => {
		if (!amountInput) return;
		if (/[+\-*/]$/.test(amountInput)) {
			setAmountInput(amountInput.slice(0, -1) + op);
		} else {
			setAmountInput(amountInput + op);
		}
	};

	const handleAddCategory = (newCat: string) => {
		if (!categories.includes(newCat)) {
			setCategories([...categories, newCat]);
			setSelectedCategory(newCat);
		}
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

		// Close input bottom sheet
		setIsOpen(false);
		setDescription('');
		setAmountInput('');
		setEvaluatedAmount(null);
		setType('expense');
		setUserOverrodeCategory(false);

		await statusSheet.execute({
			action: async () => {
				if (isSplit) {
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
			processingTitle: 'Processing...',
			processingMessage: `Recording ${currentType} of ₹${finalAmount.toLocaleString()}`,
			successTitle: 'Success!',
			successMessage: `₹${finalAmount.toLocaleString()} recorded for "${desc}"`,
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
				setCategories((prev) => [...prev, parsed.category!]);
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
					else if (suggested === 'Groceries' && !categories.includes('Groceries')) targetCat = 'Food';
					if (categories.includes(targetCat)) setSelectedCategory(targetCat);
				}
			}
		}
		if (parsed.account) setSelectedAccount(parsed.account);
		if (parsed.date) setDate(parsed.date);

		setIsOpen(true);
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
					onClick={() => setIsOpen(true)}
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
				onClose={() => setIsOpen(false)}
				title={isSplit ? 'Split an expense' : 'Add transaction'}
			>
				<form onSubmit={handleSubmit} className="space-y-4 text-left pb-20">
					{/* Transaction Type Selector */}
					<div className="flex bg-surface p-1 rounded-full gap-1" role="group" aria-label="Transaction type">
						{(
							[
								['expense', 'Expense'],
								['income', 'Income'],
								['split', 'Split'],
							] as const
						).map(([id, label]) => (
							<button
								key={id}
								type="button"
								aria-pressed={type === id}
								onClick={() => {
									setType(id);
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

					{/* Date Field */}
					<div className="relative">
						<label className="block text-[12px] font-medium text-text-muted mb-1.5">
							Date
						</label>
						<button
							type="button"
							onClick={() => setShowCalendar(!showCalendar)}
							className="w-full bg-surface rounded-full h-11 px-4 text-sm font-medium text-text flex items-center justify-between cursor-pointer focus:outline-none focus:ring-2 focus:ring-ink/20"
						>
							<span>{date}</span>
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
						onAppendOperator={appendOperator}
					/>

					{/* Description Field */}
					<div>
						<div className="flex items-center justify-between mb-1.5">
							<label className="text-[12px] font-medium text-text-muted">
								Description
							</label>
							{description.trim() && (
								<span className="text-[11px] text-text-muted flex items-center gap-1.5">
									<span>Auto icon:</span>
									<span
										className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all ${detectedVisual.bg}`}
									>
										{detectedVisual.icon}
										<span>{detectedVisual.iconName}</span>
									</span>
								</span>
							)}
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

					{/* Account and Category (own tracker) or Split details (shared with others) */}
					{isSplit ? (
						<SplitExpenseFields draft={draft} />
					) : (
						<CategoryAccountSelector
							accounts={accounts}
							selectedAccount={selectedAccount}
							onSelectAccount={setSelectedAccount}
							categories={categories}
							selectedCategory={selectedCategory}
							onSelectCategory={(cat) => {
								setUserOverrodeCategory(true);
								setSelectedCategory(cat);
							}}
							onAddCategory={handleAddCategory}
						/>
					)}

					{submitError && (
						<p role="alert" className="rounded-[16px] bg-danger-soft p-3 text-xs font-medium text-danger">
							{submitError}
						</p>
					)}

					{/* Submit Button */}
					<Button
						type="submit"
						variant="primary"
						disabled={isSplit && !!draft.error}
						className="w-full py-3 font-medium"
					>
						{isSplit ? 'Add split' : 'Add transaction'}
					</Button>
				</form>
			</BottomSheet>
		</>
	);
};

export default AddTransactionForm;
