import React, { useState, useRef } from 'react';
import { Plus, Trash2, AlertCircle } from 'lucide-react';

interface CategoryAccountSelectorProps {
	accounts: string[];
	selectedAccount: string;
	onSelectAccount: (acc: string) => void;
	onAddAccount: (newAccount: string) => void;
	onDeleteAccount?: (account: string) => void;
	categories: string[];
	selectedCategory: string;
	onSelectCategory: (cat: string) => void;
	onAddCategory: (newCategory: string) => void;
	onDeleteCategory?: (category: string) => void;
}

interface ItemToDelete {
	type: 'account' | 'category';
	name: string;
}

interface PillButtonProps {
	name: string;
	isSelected: boolean;
	onSelect: () => void;
	onLongPress: () => void;
}

const PillButton: React.FC<PillButtonProps> = ({
	name,
	isSelected,
	onSelect,
	onLongPress,
}) => {
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const isLongPressRef = useRef(false);
	const startPosRef = useRef<{ x: number; y: number } | null>(null);

	const startTimer = (clientX: number, clientY: number) => {
		isLongPressRef.current = false;
		startPosRef.current = { x: clientX, y: clientY };
		timerRef.current = setTimeout(() => {
			isLongPressRef.current = true;
			if (typeof navigator !== 'undefined' && navigator.vibrate) {
				navigator.vibrate(40);
			}
			onLongPress();
		}, 500);
	};

	const clearTimer = () => {
		if (timerRef.current) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}
		startPosRef.current = null;
	};

	const checkMovement = (clientX: number, clientY: number) => {
		if (!startPosRef.current) return;
		const dx = Math.abs(clientX - startPosRef.current.x);
		const dy = Math.abs(clientY - startPosRef.current.y);
		if (dx > 10 || dy > 10) {
			clearTimer();
		}
	};

	return (
		<button
			type="button"
			onTouchStart={(e) => {
				const touch = e.touches[0];
				startTimer(touch.clientX, touch.clientY);
			}}
			onTouchMove={(e) => {
				const touch = e.touches[0];
				checkMovement(touch.clientX, touch.clientY);
			}}
			onTouchEnd={(e) => {
				clearTimer();
				if (isLongPressRef.current) {
					e.preventDefault();
				}
			}}
			onMouseDown={(e) => {
				if (e.button !== 0) return;
				startTimer(e.clientX, e.clientY);
			}}
			onMouseMove={(e) => {
				checkMovement(e.clientX, e.clientY);
			}}
			onMouseUp={() => {
				clearTimer();
			}}
			onMouseLeave={() => {
				clearTimer();
			}}
			onClick={(e) => {
				if (isLongPressRef.current) {
					e.preventDefault();
					e.stopPropagation();
					isLongPressRef.current = false;
					return;
				}
				onSelect();
			}}
			onContextMenu={(e) => {
				e.preventDefault();
				clearTimer();
				onLongPress();
			}}
			className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer select-none active:scale-95 ${
				isSelected
					? 'bg-ink text-white shadow-2xs'
					: 'bg-surface text-text-muted hover:text-text hover:bg-surface/80'
			}`}
		>
			{name}
		</button>
	);
};

export const CategoryAccountSelector: React.FC<CategoryAccountSelectorProps> = ({
	accounts,
	selectedAccount,
	onSelectAccount,
	onAddAccount,
	onDeleteAccount,
	categories,
	selectedCategory,
	onSelectCategory,
	onAddCategory,
	onDeleteCategory,
}) => {
	const [newCategoryInput, setNewCategoryInput] = useState('');
	const [newAccountInput, setNewAccountInput] = useState('');
	const [showAddAccount, setShowAddAccount] = useState(false);
	const [showAddCategory, setShowAddCategory] = useState(false);
	const [itemToDelete, setItemToDelete] = useState<ItemToDelete | null>(null);
	const [warningMessage, setWarningMessage] = useState<string | null>(null);

	const handleAddCategorySubmit = (e: React.FormEvent | React.MouseEvent) => {
		e.preventDefault();
		const trimmed = newCategoryInput.trim();
		if (trimmed) {
			onAddCategory(trimmed);
			setNewCategoryInput('');
			setShowAddCategory(false);
		}
	};

	const handleAddAccountSubmit = (e: React.FormEvent | React.MouseEvent) => {
		e.preventDefault();
		const trimmed = newAccountInput.trim();
		if (trimmed) {
			onAddAccount(trimmed);
			setNewAccountInput('');
			setShowAddAccount(false);
		}
	};

	const handlePromptDelete = (type: 'account' | 'category', name: string) => {
		const listLength = type === 'category' ? categories.length : accounts.length;
		if (listLength <= 1) {
			setWarningMessage(`Cannot delete "${name}". At least one ${type === 'category' ? 'category' : 'payment method'} is required.`);
			return;
		}
		setItemToDelete({ type, name });
	};

	const confirmDelete = () => {
		if (!itemToDelete) return;
		if (itemToDelete.type === 'category') {
			onDeleteCategory?.(itemToDelete.name);
		} else {
			onDeleteAccount?.(itemToDelete.name);
		}
		setItemToDelete(null);
	};

	return (
		<div className="space-y-4">
			{/* Account / Payment Method Field */}
			<div>
				<div className="flex items-center justify-between mb-1.5">
					<div className="flex items-center gap-1.5">
						<label className="text-[12px] font-medium text-text-muted">
							Payment method
						</label>
						<span className="text-[10px] text-text-muted/60 font-normal">
							(hold to delete)
						</span>
					</div>
					<button
						type="button"
						onClick={() => setShowAddAccount(!showAddAccount)}
						className="text-[11px] font-medium text-ink hover:underline cursor-pointer flex items-center gap-1"
					>
						<Plus size={12} strokeWidth={2} />
						<span>{showAddAccount ? 'Cancel' : 'Add method'}</span>
					</button>
				</div>

				{showAddAccount && (
					<div className="flex gap-2 items-center mb-2.5">
						<input
							type="text"
							value={newAccountInput}
							onChange={(e) => setNewAccountInput(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === 'Enter') {
									e.preventDefault();
									handleAddAccountSubmit(e);
								}
							}}
							placeholder="e.g. Paytm, SBI, Amazon Pay..."
							className="flex-1 bg-surface rounded-full px-3.5 py-1.5 text-xs text-text focus:outline-none focus:ring-2 focus:ring-ink/20"
							autoFocus
						/>
						<button
							onClick={handleAddAccountSubmit}
							type="button"
							className="px-3 py-1.5 rounded-full bg-ink text-white hover:bg-ink-soft text-xs font-medium transition-all shrink-0 cursor-pointer"
						>
							Save
						</button>
					</div>
				)}

				<div className="flex flex-wrap gap-1.5">
					{accounts.map((acc) => (
						<PillButton
							key={acc}
							name={acc}
							isSelected={selectedAccount === acc}
							onSelect={() => onSelectAccount(acc)}
							onLongPress={() => handlePromptDelete('account', acc)}
						/>
					))}
				</div>
			</div>

			{/* Category Selection with Custom Category Add Option */}
			<div>
				<div className="flex items-center justify-between mb-1.5">
					<div className="flex items-center gap-1.5">
						<label className="text-[12px] font-medium text-text-muted">
							Category
						</label>
						<span className="text-[10px] text-text-muted/60 font-normal">
							(hold to delete)
						</span>
					</div>
					<button
						type="button"
						onClick={() => setShowAddCategory(!showAddCategory)}
						className="text-[11px] font-medium text-ink hover:underline cursor-pointer flex items-center gap-1"
					>
						<Plus size={12} strokeWidth={2} />
						<span>{showAddCategory ? 'Cancel' : 'Add category'}</span>
					</button>
				</div>

				{showAddCategory && (
					<div className="flex gap-2 items-center mb-2.5">
						<input
							type="text"
							value={newCategoryInput}
							onChange={(e) => setNewCategoryInput(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === 'Enter') {
									e.preventDefault();
									handleAddCategorySubmit(e);
								}
							}}
							placeholder="e.g. Groceries, Gym, OTT..."
							className="flex-1 bg-surface rounded-full px-3.5 py-1.5 text-xs text-text focus:outline-none focus:ring-2 focus:ring-ink/20"
							autoFocus
						/>
						<button
							onClick={handleAddCategorySubmit}
							type="button"
							className="px-3 py-1.5 rounded-full bg-ink text-white hover:bg-ink-soft text-xs font-medium transition-all shrink-0 cursor-pointer"
						>
							Save
						</button>
					</div>
				)}

				{/* Badges Selection Grid */}
				<div className="flex flex-wrap gap-1.5">
					{categories.map((cat) => (
						<PillButton
							key={cat}
							name={cat}
							isSelected={selectedCategory === cat}
							onSelect={() => onSelectCategory(cat)}
							onLongPress={() => handlePromptDelete('category', cat)}
						/>
					))}
				</div>
			</div>

			{/* Delete Confirmation Modal */}
			{itemToDelete && (
				<div
					className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs animate-in fade-in duration-150"
					onClick={() => setItemToDelete(null)}
				>
					<div
						className="bg-card rounded-[24px] p-5 max-w-xs w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 border border-border/50 text-left"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 rounded-full bg-danger-soft text-danger flex items-center justify-center shrink-0">
								<Trash2 size={18} strokeWidth={1.5} />
							</div>
							<div className="min-w-0">
								<h3 className="font-semibold text-sm text-text">
									Delete {itemToDelete.type === 'category' ? 'Category' : 'Payment Method'}?
								</h3>
								<p className="text-xs text-text-muted mt-0.5 truncate font-medium">
									"{itemToDelete.name}"
								</p>
							</div>
						</div>

						<p className="text-xs text-text-muted leading-relaxed">
							This will remove "{itemToDelete.name}" from your active {itemToDelete.type === 'category' ? 'categories' : 'payment methods'}.
						</p>

						<div className="flex gap-2 pt-1">
							<button
								type="button"
								onClick={() => setItemToDelete(null)}
								className="flex-1 py-2 rounded-full border border-border/60 text-xs font-medium text-text hover:bg-surface transition-colors cursor-pointer"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={confirmDelete}
								className="flex-1 py-2 rounded-full bg-danger text-white text-xs font-medium hover:bg-danger/90 transition-colors cursor-pointer shadow-2xs"
							>
								Delete
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Warning Modal when trying to delete the only remaining item */}
			{warningMessage && (
				<div
					className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs animate-in fade-in duration-150"
					onClick={() => setWarningMessage(null)}
				>
					<div
						className="bg-card rounded-[24px] p-5 max-w-xs w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 border border-border/50 text-left"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 rounded-full bg-surface text-text flex items-center justify-center shrink-0">
								<AlertCircle size={18} strokeWidth={1.5} />
							</div>
							<div className="min-w-0">
								<h3 className="font-semibold text-sm text-text">Cannot delete</h3>
							</div>
						</div>

						<p className="text-xs text-text-muted leading-relaxed">
							{warningMessage}
						</p>

						<div className="pt-1">
							<button
								type="button"
								onClick={() => setWarningMessage(null)}
								className="w-full py-2 rounded-full bg-ink text-white text-xs font-medium hover:bg-ink-soft transition-colors cursor-pointer"
							>
								Got it
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default CategoryAccountSelector;
