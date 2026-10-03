import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';

interface Option {
	id: string;
	label: string;
}

interface SearchableSelectProps {
	options: Option[];
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	ariaLabel?: string;
}

export function SearchableSelect({ options, value, onChange, placeholder = 'Select...', ariaLabel }: SearchableSelectProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [search, setSearch] = useState('');
	const containerRef = useRef<HTMLDivElement>(null);

	const selectedOption = options.find((o) => o.id === value);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
				setIsOpen(false);
			}
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	const filteredOptions = options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()));

	return (
		<div className="relative" ref={containerRef}>
			<div
				className="w-full border-2 border-black p-2 pr-8 text-sm font-semibold bg-white cursor-pointer flex items-center justify-between"
				onClick={() => setIsOpen(!isOpen)}
				aria-label={ariaLabel}
			>
				<span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
				<ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
			</div>

			{isOpen && (
				<div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] max-h-60 flex flex-col">
					<div className="p-2 border-b-2 border-black flex items-center gap-2 sticky top-0 bg-white">
						<Search className="w-4 h-4 text-gray-500" />
						<input
							type="text"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Search..."
							className="w-full text-sm outline-none font-medium"
							autoFocus
							onClick={(e) => e.stopPropagation()}
						/>
					</div>
					<div className="overflow-y-auto">
						{filteredOptions.length === 0 ? (
							<div className="p-3 text-sm text-gray-500 text-center font-medium">No results found</div>
						) : (
							filteredOptions.map((opt) => (
								<div
									key={opt.id}
									className={`p-2.5 text-sm font-semibold cursor-pointer flex items-center justify-between hover:bg-yellow-50 ${
										value === opt.id ? 'bg-yellow-100' : ''
									}`}
									onClick={() => {
										onChange(opt.id);
										setIsOpen(false);
										setSearch('');
									}}
								>
									<span>{opt.label}</span>
									{value === opt.id && <Check className="w-4 h-4" />}
								</div>
							))
						)}
					</div>
				</div>
			)}
		</div>
	);
}

interface SearchableMultiSelectProps {
	options: Option[];
	selectedIds: string[];
	onChange: (selectedIds: string[]) => void;
	placeholder?: string;
}

export function SearchableMultiSelect({ options, selectedIds, onChange, placeholder = 'Select...' }: SearchableMultiSelectProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [search, setSearch] = useState('');
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
				setIsOpen(false);
			}
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	const filteredOptions = options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()));

	const toggleOption = (id: string) => {
		if (selectedIds.includes(id)) {
			onChange(selectedIds.filter((selId) => selId !== id));
		} else {
			onChange([...selectedIds, id]);
		}
	};

	const selectAll = () => onChange(options.map(o => o.id));
	const selectNone = () => onChange([]);

	return (
		<div className="relative" ref={containerRef}>
			<div
				className="w-full border-2 border-black p-2 pr-8 text-sm font-semibold bg-white cursor-pointer flex items-center justify-between"
				onClick={() => setIsOpen(!isOpen)}
			>
				<span className="truncate">
					{selectedIds.length === 0 ? placeholder : `${selectedIds.length} selected`}
				</span>
				<ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
			</div>

			{isOpen && (
				<div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] max-h-72 flex flex-col">
					<div className="p-2 border-b-2 border-black flex items-center gap-2 sticky top-0 bg-white">
						<Search className="w-4 h-4 text-gray-500" />
						<input
							type="text"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Search..."
							className="w-full text-sm outline-none font-medium"
							autoFocus
							onClick={(e) => e.stopPropagation()}
						/>
					</div>
					
					{options.length > 1 && (
						<div className="p-2 border-b-2 border-black flex items-center justify-between bg-gray-50 sticky top-[42px] z-10">
							<button type="button" onClick={selectAll} className="text-xs font-bold text-blue-600 hover:underline uppercase">Select All</button>
							<button type="button" onClick={selectNone} className="text-xs font-bold text-gray-500 hover:underline uppercase">Clear</button>
						</div>
					)}

					<div className="overflow-y-auto">
						{filteredOptions.length === 0 ? (
							<div className="p-3 text-sm text-gray-500 text-center font-medium">No results found</div>
						) : (
							filteredOptions.map((opt) => {
								const isSelected = selectedIds.includes(opt.id);
								return (
									<label
										key={opt.id}
										className={`p-2.5 text-sm font-semibold cursor-pointer flex items-center gap-3 hover:bg-yellow-50 ${
											isSelected ? 'bg-yellow-100' : ''
										}`}
										onClick={(e) => e.stopPropagation()}
									>
										<input
											type="checkbox"
											checked={isSelected}
											onChange={() => toggleOption(opt.id)}
											className="w-4 h-4 accent-black cursor-pointer"
										/>
										<span className="flex-1">{opt.label}</span>
									</label>
								);
							})
						)}
					</div>
				</div>
			)}
		</div>
	);
}
