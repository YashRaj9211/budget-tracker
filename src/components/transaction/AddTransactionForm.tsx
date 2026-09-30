import React, { useState, useEffect } from 'react';
import { Plus, X, Calendar as CalendarIcon, Check } from 'lucide-react';
import CustomCalendar from '../common/Calendar';
import { useTransactionStore } from '../../stores/transactionStore';
import { useBudgetStore } from '../../stores/budgetStore';
import VoiceInput from '../common/VoiceInput';
import { useMathAmountInput } from '../../hooks/useMathAmountInput';
import { AmountCalculatorInput } from './AmountCalculatorInput';
import { CategoryAccountSelector } from './CategoryAccountSelector';
import type { Transaction } from '../../types';
import SplitExpenseFields from '../split/SplitExpenseFields';
import { errorMessage, useSplitDraft } from '../../hooks/useSplitDraft';

function AddTransactionForm() {
	const [isOpen, setIsOpen] = useState(false);
	const [type, setType] = useState<'income' | 'expense' | 'split'>('expense');
	const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
	const [description, setDescription] = useState('');
	const [selectedAccount, setSelectedAccount] = useState('');
	const [selectedCategory, setSelectedCategory] = useState('');
	const [isSubmitted, setIsSubmitted] = useState(false);
	const [showCalendar, setShowCalendar] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);

	const {
		amountInput,
		setAmountInput,
		evaluatedAmount,
		handleAmountChange,
		handleAmountBlur,
		appendOperator,
		resetAmount,
	} = useMathAmountInput();

	const finalAmount = evaluatedAmount !== null ? evaluatedAmount : parseFloat(amountInput) || 0;
	const isSplit = type === 'split';

	// Split state (group / friends / who paid / how to divide). Only loads when the Split tab is open.
	const draft = useSplitDraft({ active: isOpen && isSplit, amount: finalAmount });

	// Store data
	const addTransaction = useTransactionStore((s) => s.addTransaction);
	const categories = useBudgetStore((s) => s.categories);
	const accounts = useBudgetStore((s) => s.accounts);
	const addCategory = useBudgetStore((s) => s.addCategory);

	// Set defaults when data loads
	useEffect(() => {
		if (categories.length > 0 && !selectedCategory) {
			setSelectedCategory(categories[0]);
		}
	}, [categories, selectedCategory]);

	useEffect(() => {
		if (accounts.length > 0 && !selectedAccount) {
			setSelectedAccount(accounts[0]);
		}
	}, [accounts, selectedAccount]);

	const handleAddCategory = (newCat: string) => {
		if (!categories.includes(newCat)) {
			addCategory(newCat);
			setSelectedCategory(newCat);
		}
	};

	const finishAndReset = () => {
		setIsSubmitted(true);
		setTimeout(() => {
			setIsSubmitted(false);
			setIsOpen(false);
			resetAmount();
			setDescription('');
			setType('expense');
			draft.reset();
		}, 1500);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (finalAmount <= 0 || isSaving) return;
		setSubmitError(null);

		if (isSplit) {
			// Split expenses are saved on the server so your friends see them too
			setIsSaving(true);
			try {
				await draft.submit({ description: description.trim(), date, amount: finalAmount });
				finishAndReset();
			} catch (err) {
				setSubmitError(errorMessage(err));
			} finally {
				setIsSaving(false);
			}
			return;
		}

		await addTransaction({
			type: type as 'income' | 'expense',
			date,
			amount: finalAmount,
			description,
			account: selectedAccount,
			category: selectedCategory,
		});
		finishAndReset();
	};

	const handleVoiceParsed = (parsed: Partial<Transaction>) => {
		if (parsed.type) setType(parsed.type);
		if (parsed.amount) setAmountInput(String(parsed.amount));
		if (parsed.description) setDescription(parsed.description);
		if (parsed.account) {
			const match = accounts.find((acc) => acc.toLowerCase() === parsed.account?.toLowerCase());
			if (match) setSelectedAccount(match);
		}
		if (parsed.category) {
			const match = categories.find((cat) => cat.toLowerCase() === parsed.category?.toLowerCase());
			if (match) setSelectedCategory(match);
		}
		if (parsed.date) setDate(parsed.date);
		setIsOpen(true);
	};

	return (
		<>
			{/* Backdrop Overlay */}
			<div
				className={`fixed inset-0 bg-black/45 backdrop-blur-xs z-50 transition-opacity duration-300 ${
					isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
				}`}
				onClick={() => setIsOpen(false)}
			/>

			{/* Floating Action Button (FAB) */}
			<div
				className={`fixed bottom-20 right-4 sm:right-[max(1rem,calc(50%-14rem+1rem))] flex flex-col items-end gap-2.5 z-40 transition-all duration-300 ease-out ${
					isOpen ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100 pointer-events-auto'
				}`}
			>
				<button
					onClick={() => setIsOpen(true)}
					className="w-12 h-12 bg-black text-white border-2 border-black flex items-center justify-center cursor-pointer shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none hover:bg-gray-900 transition-all"
					aria-label="Open add transaction form"
				>
					<Plus size={22} className="text-white" />
				</button>

				<VoiceInput onParsed={handleVoiceParsed} />
			</div>

			{/* Form Container */}
			<div
				className={`fixed z-50 transition-all duration-300 ease-out inset-x-3.5 top-10 bottom-20 max-w-md mx-auto bg-white border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-5 flex flex-col justify-between ${
					isOpen
						? 'scale-100 opacity-100 translate-y-0 pointer-events-auto'
						: 'scale-90 opacity-0 translate-y-8 pointer-events-none'
				}`}
			>
				<div className="flex flex-col h-full justify-between">
					{/* Header */}
					<div className="flex items-center justify-between border-b-2 border-black pb-3 mb-4">
						<h3 className="text-base font-bold text-black tracking-tight">{isSplit ? 'Split an Expense' : 'Add Transaction'}</h3>
						<button
							type="button"
							onClick={() => setIsOpen(false)}
							className="p-1 hover:bg-gray-100 border border-transparent hover:border-black cursor-pointer transition-all"
						>
							<X size={18} />
						</button>
					</div>

					{/* Scrollable Form Body */}
					<form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-1 space-y-4 text-left">
						{/* Transaction Type Selector */}
						<div className="grid grid-cols-3 gap-2" role="group" aria-label="Transaction type">
							{(
								[
									['expense', 'Expense', 'bg-rose-100'],
									['income', 'Income', 'bg-emerald-100'],
									['split', 'Split', 'bg-purple-100'],
								] as const
							).map(([id, text, color]) => (
								<button
									key={id}
									type="button"
									aria-pressed={type === id}
									onClick={() => {
										setType(id);
										setSubmitError(null);
									}}
									className={`py-2 text-xs font-bold border-2 border-black transition-all cursor-pointer ${
										type === id ? `${color} text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] -translate-x-px -translate-y-px` : 'bg-white text-gray-500 hover:bg-gray-50'
									}`}
								>
									{text}
								</button>
							))}
						</div>

						{/* Date Field */}
						<div className="relative">
							<label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
								Date
							</label>
							<button
								type="button"
								onClick={() => setShowCalendar(!showCalendar)}
								className="w-full border-2 border-black p-2 bg-white text-sm font-semibold text-black text-left flex items-center justify-between cursor-pointer"
							>
								<span>{date}</span>
								<CalendarIcon size={16} className="text-gray-500" />
							</button>
							{showCalendar && (
								<div className="absolute left-0 right-0 mt-1 border-2 border-black shadow-box z-50 bg-white">
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
							<label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">
								Description
							</label>
							<input
								type="text"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								placeholder="e.g. Afternoon Lunch"
								className="w-full border-2 border-black p-2 bg-white text-sm font-medium focus:outline-none"
								required
							/>
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
								onSelectCategory={setSelectedCategory}
								onAddCategory={handleAddCategory}
							/>
						)}

						{submitError && (
							<p role="alert" className="border-2 border-rose-400 bg-rose-50 p-2 text-xs font-bold text-rose-800">
								{submitError}
							</p>
						)}

						{/* Submit Button */}
						<button
							type="submit"
							disabled={isSubmitted || isSaving || (isSplit && !!draft.error)}
							className={`w-full py-2.5 border-2 border-black font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer transition-all ${
								isSubmitted
									? 'bg-emerald-100 text-emerald-800'
									: 'bg-black text-white hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed'
							}`}
						>
							{isSubmitted ? (
								<>
									<Check size={16} />
									Added!
								</>
							) : (
								isSaving ? 'Saving…' : isSplit ? 'Add Split' : 'Add Transaction'
							)}
						</button>
					</form>
				</div>
			</div>
		</>
	);
}

export default AddTransactionForm;
