import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';

export interface SelectOption {
	id: string;
	label: string;
}

interface SearchableSelectProps {
	options: SelectOption[];
	value: string;
	onChange: (val: string) => void;
	placeholder?: string;
	ariaLabel?: string;
}

export function SearchableSelect({
	options,
	value,
	onChange,
	placeholder = 'Select...',
	ariaLabel = 'Select option',
}: SearchableSelectProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [search, setSearch] = useState('');
	const containerRef = useRef<HTMLDivElement>(null);

	const selectedOption = options.find((o) => o.id === value);
	const filteredOptions = options.filter((o) =>
		o.label.toLowerCase().includes(search.toLowerCase())
	);

	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				setIsOpen(false);
			}
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	return (
		<div className={`relative ${isOpen ? 'z-50' : 'z-auto'}`} ref={containerRef}>
			<div
				className="w-full bg-surface rounded-full h-11 px-4 text-sm font-medium text-text cursor-pointer flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-ink/20"
				onClick={() => setIsOpen(!isOpen)}
				aria-label={ariaLabel}
			>
				<span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
				<ChevronDown className={`w-4 h-4 text-text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} strokeWidth={1.5} />
			</div>

			{isOpen && (
				<div className="absolute z-50 top-full left-0 right-0 mt-2 bg-card rounded-[20px] shadow-xl max-h-60 flex flex-col overflow-hidden border border-ink/5">
					<div className="p-2.5 border-b border-surface flex items-center gap-2 sticky top-0 bg-card">
						<Search className="w-4 h-4 text-text-muted" strokeWidth={1.5} />
						<input
							type="text"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Search..."
							className="w-full text-sm outline-none font-medium bg-transparent text-text"
							autoFocus
							onClick={(e) => e.stopPropagation()}
						/>
					</div>
					<div className="overflow-y-auto">
						{filteredOptions.length === 0 ? (
							<div className="p-3 text-sm text-text-muted text-center font-normal">No results found</div>
						) : (
							filteredOptions.map((opt) => (
								<div
									key={opt.id}
									className={`p-2.5 px-3.5 text-sm font-medium cursor-pointer flex items-center justify-between hover:bg-surface/60 transition-colors ${
										value === opt.id ? 'bg-mint/30 text-mint-deep' : 'text-text'
									}`}
									onClick={() => {
										onChange(opt.id);
										setIsOpen(false);
										setSearch('');
									}}
								>
									<span>{opt.label}</span>
									{value === opt.id && <Check className="w-4 h-4 text-mint-deep" strokeWidth={2} />}
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
	options: SelectOption[];
	selectedIds: string[];
	onChange: (ids: string[]) => void;
	placeholder?: string;
}

export function SearchableMultiSelect({
	options,
	selectedIds,
	onChange,
	placeholder = 'Select multiple...',
}: SearchableMultiSelectProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [search, setSearch] = useState('');
	const containerRef = useRef<HTMLDivElement>(null);

	const filteredOptions = options.filter((o) =>
		o.label.toLowerCase().includes(search.toLowerCase())
	);

	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				setIsOpen(false);
			}
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	const toggleOption = (id: string) => {
		if (selectedIds.includes(id)) {
			onChange(selectedIds.filter((item) => item !== id));
		} else {
			onChange([...selectedIds, id]);
		}
	};

	const selectAll = () => onChange(options.map((o) => o.id));
	const selectNone = () => onChange([]);

	return (
		<div className={`relative ${isOpen ? 'z-50' : 'z-auto'}`} ref={containerRef}>
			<div
				className="w-full bg-surface rounded-full h-11 px-4 text-sm font-medium text-text cursor-pointer flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-ink/20"
				onClick={() => setIsOpen(!isOpen)}
			>
				<span className="truncate">
					{selectedIds.length === 0 ? placeholder : `${selectedIds.length} selected`}
				</span>
				<ChevronDown className={`w-4 h-4 text-text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} strokeWidth={1.5} />
			</div>

			{isOpen && (
				<div className="absolute z-50 top-full left-0 right-0 mt-2 bg-card rounded-[20px] shadow-xl max-h-72 flex flex-col overflow-hidden border border-ink/5">
					<div className="p-2.5 border-b border-surface flex items-center gap-2 sticky top-0 bg-card">
						<Search className="w-4 h-4 text-text-muted" strokeWidth={1.5} />
						<input
							type="text"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Search..."
							className="w-full text-sm outline-none font-medium bg-transparent text-text"
							autoFocus
							onClick={(e) => e.stopPropagation()}
						/>
					</div>

					{options.length > 1 && (
						<div className="px-3.5 py-2 border-b border-surface flex items-center justify-between bg-surface/50 sticky top-[45px] z-10">
							<button type="button" onClick={selectAll} className="text-xs font-medium text-text hover:underline">Select all</button>
							<button type="button" onClick={selectNone} className="text-xs font-medium text-text-muted hover:underline">Clear</button>
						</div>
					)}

					<div className="overflow-y-auto">
						{filteredOptions.length === 0 ? (
							<div className="p-3 text-sm text-text-muted text-center font-normal">No results found</div>
						) : (
							filteredOptions.map((opt) => {
								const isSelected = selectedIds.includes(opt.id);
								return (
									<label
										key={opt.id}
										className={`p-2.5 px-3.5 text-sm font-medium cursor-pointer flex items-center gap-3 hover:bg-surface/60 transition-colors ${
											isSelected ? 'bg-mint/20 text-text' : 'text-text'
										}`}
										onClick={(e) => e.stopPropagation()}
									>
										<input
											type="checkbox"
											checked={isSelected}
											onChange={() => toggleOption(opt.id)}
											className="w-4 h-4 rounded accent-ink cursor-pointer"
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
