import React, { useState, useEffect, useRef } from 'react';
import { Plus, X, Calendar as CalendarIcon, Calculator, Check } from 'lucide-react';
import CustomCalendar from '../common/Calander';
import { useTransactionStore } from '../../stores/transactionStore';
import { useBudgetStore } from '../../stores/budgetStore';

function AddTransactionForm() {
	const [isOpen, setIsOpen] = useState(false);
	const [type, setType] = useState<'income' | 'expense'>('expense');
	const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
	const [amountInput, setAmountInput] = useState('');
	const [evaluatedAmount, setEvaluatedAmount] = useState<number | null>(null);
	const [description, setDescription] = useState('');
	const [selectedAccount, setSelectedAccount] = useState('');
	const [selectedCategory, setSelectedCategory] = useState('');
	const [newCategory, setNewCategory] = useState('');
	const [isSubmitted, setIsSubmitted] = useState(false);
	const [showCalendar, setShowCalendar] = useState(false);

	const amountInputRef = useRef<HTMLInputElement>(null);

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

	// Evaluate simple mathematical expressions in real-time
	useEffect(() => {
		const sanitized = amountInput.replace(/[^0-9+\-*/().\s]/g, '');
		if (!sanitized.trim()) {
			setEvaluatedAmount(null);
			return;
		}

		try {
			// If it contains mathematical operators
			if (/[+\-*/]/.test(sanitized)) {
				// Safe evaluation using Function constructor
				const result = new Function(`return ${sanitized}`)();
				if (typeof result === 'number' && isFinite(result) && !isNaN(result)) {
					setEvaluatedAmount(Number(result.toFixed(2)));
				} else {
					setEvaluatedAmount(null);
				}
			} else {
				const parsed = parseFloat(sanitized);
				setEvaluatedAmount(!isNaN(parsed) ? parsed : null);
			}
		} catch {
			setEvaluatedAmount(null);
		}
	}, [amountInput]);

	// Auto-resolve math expression on blur
	const handleAmountBlur = () => {
		if (evaluatedAmount !== null && /[+\-*/]/.test(amountInput)) {
			setAmountInput(String(evaluatedAmount));
		}
	};

	const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const val = e.target.value;
		// Only allow numbers, math operators (+ - * / .), parentheses, and spaces
		const sanitized = val.replace(/[^0-9+\-*/().\s]/g, '');
		setAmountInput(sanitized);
	};

	// Append operators to input
	const appendOperator = (op: string) => {
		setAmountInput(prev => {
			const trimmed = prev.trim();
			if (!trimmed) return '';
			// Don't add double operators
			if (['+', '-', '*', '/'].includes(trimmed.slice(-1))) {
				return trimmed.slice(0, -1) + op + ' ';
			}
			return trimmed + ' ' + op + ' ';
		});
		amountInputRef.current?.focus();
	};

	const handleAddCategory = (e: React.MouseEvent) => {
		e.preventDefault();
		const trimmed = newCategory.trim();
		if (trimmed && !categories.includes(trimmed)) {
			addCategory(trimmed);
			setSelectedCategory(trimmed);
			setNewCategory('');
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const finalAmount = evaluatedAmount !== null ? evaluatedAmount : parseFloat(amountInput) || 0;
		if (finalAmount <= 0) return;

		await addTransaction({
			type,
			date,
			amount: finalAmount,
			description,
			account: selectedAccount,
			category: selectedCategory,
		});

		setIsSubmitted(true);
		setTimeout(() => {
			setIsSubmitted(false);
			setIsOpen(false);
			// Reset form
			setAmountInput('');
			setDescription('');
			setType('expense');
		}, 1500);
	};

	return (
		<>
			{/* Backdrop Overlay */}
			{isOpen && (
				<div 
					className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 transition-opacity duration-300"
					onClick={() => setIsOpen(false)}
				/>
			)}

			{/* Floating Expanding Container */}
			<div 
				className={`fixed transition-all duration-700 ease-out z-50 ${
					isOpen 
						? 'inset-x-4 top-16 bottom-20 md:inset-auto md:bottom-8 md:right-6 md:w-[420px] md:h-[630px] bg-white border-2 border-black shadow-box p-6 flex flex-col justify-between origin-bottom-right scale-100 opacity-100'
						: 'bottom-8 right-6 w-12 h-12 bg-black text-white border-2 border-black flex items-center justify-center cursor-pointer shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none hover:bg-gray-900 origin-bottom-right scale-100'
				}`}
				onClick={() => !isOpen && setIsOpen(true)}
			>
				{!isOpen ? (
					// FAB Plus Icon
					<Plus size={24} className="text-white" />
				) : (
					// Expanded Form Content
					<div className="flex flex-col h-full justify-between">
						{/* Header */}
						<div className="flex items-center justify-between border-b-2 border-black pb-3 mb-4">
							<h3 className="text-base font-bold text-black tracking-tight">Add Transaction</h3>
							<button 
								onClick={(e) => {
									e.stopPropagation();
									setIsOpen(false);
								}}
								className="p-1 hover:bg-gray-100 border border-transparent hover:border-black cursor-pointer transition-all"
							>
								<X size={18} />
							</button>
						</div>

						{/* Scrollable Form Body */}
						<form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-1 space-y-4 text-left">
							{/* Transaction Type Selector */}
							<div className="grid grid-cols-2 gap-2">
								<button
									type="button"
									onClick={() => setType('expense')}
									className={`py-2 text-xs font-bold border-2 border-black transition-all ${
										type === 'expense' 
											? 'bg-rose-100 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] -translate-x-px -translate-y-px' 
											: 'bg-white text-gray-500 hover:bg-gray-50'
									}`}
								>
									Expense
								</button>
								<button
									type="button"
									onClick={() => setType('income')}
									className={`py-2 text-xs font-bold border-2 border-black transition-all ${
										type === 'income' 
											? 'bg-emerald-100 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] -translate-x-px -translate-y-px' 
											: 'bg-white text-gray-500 hover:bg-gray-50'
									}`}
								>
									Income
								</button>
							</div>

							{/* Date Field (Custom Neo-Brutalist Calendar Dropdown) */}
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

							{/* Amount Field with Calculator Logic */}
							<div>
								<div className="flex justify-between items-baseline mb-1">
									<label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider">
										Amount (₹)
									</label>
									{evaluatedAmount !== null && (
										<span className="text-xs font-bold text-emerald-600">
											= ₹{evaluatedAmount.toFixed(2)}
										</span>
									)}
								</div>
								<div className="relative">
									<span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₹</span>
									<input 
										ref={amountInputRef}
										type="text" 
										value={amountInput}
										onChange={handleAmountChange}
										onBlur={handleAmountBlur}
										placeholder="e.g. 80.0 or 80 + 20"
										className="w-full border-2 border-black p-2 pl-7 text-sm font-medium bg-white focus:outline-none"
										required
									/>
								</div>
								{/* Quick Math Helper Keys */}
								<div className="flex gap-1.5 mt-1.5">
									{['+', '-', '*', '/'].map(op => (
										<button
											key={op}
											type="button"
											onClick={() => appendOperator(op)}
											className="w-7 h-7 text-xs font-bold border border-black bg-gray-50 hover:bg-gray-100 flex items-center justify-center transition-all"
										>
											{op}
										</button>
									))}
									<span className="text-[10px] text-gray-400 self-center ml-2 flex items-center gap-1">
										<Calculator size={11} /> Supports live math
									</span>
								</div>
							</div>

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

							{/* Account Field */}
							<div>
								<label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">
									Account / Method
								</label>
								<div className="flex flex-wrap gap-1.5">
									{accounts.map((acc) => (
										<button
											key={acc}
											type="button"
											onClick={() => setSelectedAccount(acc)}
											className={`px-2.5 py-1 text-xs border border-black font-semibold transition-all ${
												selectedAccount === acc
													? 'bg-[#eedcc2] text-black font-bold shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)]'
													: 'bg-white text-gray-600 hover:bg-gray-50'
											}`}
										>
											{acc}
										</button>
									))}
								</div>
							</div>

							{/* Category Selection with Custom Category Add Option */}
							<div>
								<label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
									Category
								</label>
								
								{/* Badges Selection Grid */}
								<div className="flex flex-wrap gap-1.5 mb-2">
									{categories.map((cat) => (
										<button
											key={cat}
											type="button"
											onClick={() => setSelectedCategory(cat)}
											className={`px-2.5 py-1 text-xs border border-black font-semibold transition-all ${
												selectedCategory === cat
													? 'bg-[#eedcc2] text-black font-bold shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)]'
													: 'bg-white text-gray-600 hover:bg-gray-50'
											}`}
										>
											{cat}
										</button>
									))}
								</div>

								{/* Add custom category input */}
								<div className="flex gap-1">
									<input
										type="text"
										value={newCategory}
										onChange={(e) => setNewCategory(e.target.value)}
										placeholder="Add custom category..."
										className="flex-1 border border-black px-2 py-1 text-xs bg-white focus:outline-none"
									/>
									<button
										onClick={handleAddCategory}
										type="button"
										className="px-2.5 bg-black text-white border border-black hover:bg-gray-900 transition-all flex items-center justify-center cursor-pointer"
										aria-label="Add custom category"
									>
										<Plus size={14} />
									</button>
								</div>
							</div>

							{/* Submit Button */}
							<button
								type="submit"
								disabled={isSubmitted}
								className={`w-full py-2.5 border-2 border-black font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none cursor-pointer transition-all ${
									isSubmitted 
										? 'bg-emerald-100 text-emerald-800' 
										: 'bg-black text-white hover:bg-gray-900'
								}`}
							>
								{isSubmitted ? (
									<>
										<Check size={16} />
										Added!
									</>
								) : (
									'Add Transaction'
								)}
							</button>
						</form>
					</div>
				)}
			</div>
		</>
	);
}

export default AddTransactionForm;