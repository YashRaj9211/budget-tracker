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
				<label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">
					Account / Method
				</label>
				<div className="flex flex-wrap gap-1.5">
					{accounts.map((acc) => (
						<button
							key={acc}
							type="button"
							onClick={() => onSelectAccount(acc)}
							className={`px-2.5 py-1 text-xs border border-black font-semibold transition-all cursor-pointer ${
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
							onClick={() => onSelectCategory(cat)}
							className={`px-2.5 py-1 text-xs border border-black font-semibold transition-all cursor-pointer ${
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
						value={newCategoryInput}
						onChange={(e) => setNewCategoryInput(e.target.value)}
						placeholder="Add custom category..."
						className="flex-1 border border-black px-2 py-1 text-xs bg-white focus:outline-none"
					/>
					<button
						onClick={handleAdd}
						type="button"
						className="px-2.5 bg-black text-white border border-black hover:bg-gray-900 transition-all flex items-center justify-center cursor-pointer"
						aria-label="Add custom category"
					>
						<Plus size={14} />
					</button>
				</div>
			</div>
		</div>
	);
};
