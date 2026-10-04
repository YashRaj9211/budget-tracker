import React, { useState } from 'react';
import { Plus } from 'lucide-react';

interface CategoryAccountSelectorProps {
	accounts: string[];
	selectedAccount: string;
	onSelectAccount: (acc: string) => void;
	categories: string[];
	selectedCategory: string;
	onSelectCategory: (cat: string) => void;
	onAddCategory: (newCategory: string) => void;
}

export const CategoryAccountSelector: React.FC<CategoryAccountSelectorProps> = ({
	accounts,
	selectedAccount,
	onSelectAccount,
	categories,
	selectedCategory,
	onSelectCategory,
	onAddCategory,
}) => {
	const [newCategoryInput, setNewCategoryInput] = useState('');

	const handleAdd = (e: React.MouseEvent) => {
		e.preventDefault();
		const trimmed = newCategoryInput.trim();
		if (trimmed) {
			onAddCategory(trimmed);
			setNewCategoryInput('');
		}
	};

	return (
		<div className="space-y-4">
			{/* Account Field */}
			<div>
				<label className="block text-[12px] font-medium text-text-muted mb-1.5">
					Account / Method
				</label>
				<div className="flex flex-wrap gap-1.5">
					{accounts.map((acc) => (
						<button
							key={acc}
							type="button"
							onClick={() => onSelectAccount(acc)}
							className={`px-3 py-1.5 text-xs rounded-full font-medium transition-all cursor-pointer ${
								selectedAccount === acc
									? 'bg-ink text-white shadow-2xs'
									: 'bg-surface text-text-muted hover:text-text hover:bg-surface/80'
							}`}
						>
							{acc}
						</button>
					))}
				</div>
			</div>

			{/* Category Selection with Custom Category Add Option */}
			<div>
				<label className="block text-[12px] font-medium text-text-muted mb-1.5">
					Category
				</label>

				{/* Badges Selection Grid */}
				<div className="flex flex-wrap gap-1.5 mb-2.5">
					{categories.map((cat) => (
						<button
							key={cat}
							type="button"
							onClick={() => onSelectCategory(cat)}
							className={`px-3 py-1.5 text-xs rounded-full font-medium transition-all cursor-pointer ${
								selectedCategory === cat
									? 'bg-ink text-white shadow-2xs'
									: 'bg-surface text-text-muted hover:text-text hover:bg-surface/80'
							}`}
						>
							{cat}
						</button>
					))}
				</div>

				{/* Add custom category input */}
				<div className="flex gap-2 items-center">
					<input
						type="text"
						value={newCategoryInput}
						onChange={(e) => setNewCategoryInput(e.target.value)}
						placeholder="Add custom category..."
						className="flex-1 bg-surface rounded-full px-3.5 py-1.5 text-xs text-text focus:outline-none focus:ring-2 focus:ring-ink/20"
					/>
					<button
						onClick={handleAdd}
						type="button"
						className="w-7 h-7 rounded-full bg-ink text-white hover:bg-ink-soft transition-all flex items-center justify-center shrink-0 cursor-pointer"
						aria-label="Add custom category"
					>
						<Plus size={14} strokeWidth={1.5} />
					</button>
				</div>
			</div>
		</div>
	);
};
