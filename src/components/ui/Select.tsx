import React, { useState, useRef, useEffect, useId } from 'react';
import { ChevronDown, Search, Check, X } from 'lucide-react';

export interface SelectOption {
	value?: string | number;
	id?: string;
	label: string;
	sublabel?: string;
	icon?: React.ReactNode;
	disabled?: boolean;
}

const getOptionValue = (opt: SelectOption): string => {
	if (opt.value !== undefined) return String(opt.value);
	if (opt.id !== undefined) return String(opt.id);
	return '';
};

/* -------------------------------------------------------------------------- */
/*                                Single Select                               */
/* -------------------------------------------------------------------------- */

export interface SelectProps {
	options: SelectOption[];
	value?: string | number | null;
	onChange: (value: string) => void;
	placeholder?: string;
	label?: string;
	error?: string;
	disabled?: boolean;
	searchable?: boolean;
	searchPlaceholder?: string;
	ariaLabel?: string;
	id?: string;
	className?: string;
	triggerClassName?: string;
	variant?: 'surface' | 'card';
	size?: 'sm' | 'md';
	emptyMessage?: string;
	icon?: React.ReactNode;
}

export function Select({
	options,
	value,
	onChange,
	placeholder = 'Select an option...',
	label,
	error,
	disabled = false,
	searchable,
	searchPlaceholder = 'Search...',
	ariaLabel,
	id,
	className = '',
	triggerClassName = '',
	variant = 'surface',
	size = 'md',
	emptyMessage = 'No options found',
	icon,
}: SelectProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [search, setSearch] = useState('');
	const containerRef = useRef<HTMLDivElement>(null);
	const searchInputRef = useRef<HTMLInputElement>(null);
	const autoId = useId();
	const selectId = id || autoId;

	const stringValue = value !== undefined && value !== null ? String(value) : '';
	const selectedOption = options.find((opt) => getOptionValue(opt) === stringValue);

	// Auto-enable search if more than 6 options unless explicitly set to false
	const shouldShowSearch = searchable !== undefined ? searchable : options.length > 6;

	const filteredOptions = options.filter((opt) => {
		if (!search.trim()) return true;
		const query = search.toLowerCase();
		const matchLabel = opt.label.toLowerCase().includes(query);
		const matchSublabel = opt.sublabel?.toLowerCase().includes(query) ?? false;
		return matchLabel || matchSublabel;
	});

	// Close on outside click or Escape
	useEffect(() => {
		if (!isOpen) return;

		const handleClickOutside = (e: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				setIsOpen(false);
				setSearch('');
			}
		};

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				setIsOpen(false);
				setSearch('');
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		document.addEventListener('keydown', handleKeyDown);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
			document.removeEventListener('keydown', handleKeyDown);
		};
	}, [isOpen]);

	// Auto-focus search input when opened
	useEffect(() => {
		if (isOpen && shouldShowSearch) {
			const timer = setTimeout(() => searchInputRef.current?.focus(), 50);
			return () => clearTimeout(timer);
		}
	}, [isOpen, shouldShowSearch]);

	const sizeClasses =
		size === 'sm' ? 'h-9 px-3 text-xs' : 'h-11 px-4 text-sm';

	const variantClasses =
		variant === 'card'
			? 'bg-card border border-ink/5 shadow-2xs hover:bg-card/90'
			: 'bg-surface hover:bg-surface/80';

	return (
		<div className={`flex flex-col gap-1 w-full ${className}`}>
			{label && (
				<label
					htmlFor={selectId}
					className="text-[12px] font-medium text-text-muted mb-0.5 select-none"
				>
					{label}
				</label>
			)}

			<div className={`relative ${isOpen ? 'z-50' : 'z-auto'}`} ref={containerRef}>
				{/* Trigger */}
				<button
					id={selectId}
					type="button"
					disabled={disabled}
					aria-label={ariaLabel || label || placeholder}
					aria-expanded={isOpen}
					aria-haspopup="listbox"
					onClick={() => {
						if (!disabled) {
							setIsOpen(!isOpen);
							if (isOpen) setSearch('');
						}
					}}
					className={`w-full rounded-full font-medium text-text cursor-pointer flex items-center justify-between text-left transition-all focus:outline-none focus:ring-2 focus:ring-ink/20 ${sizeClasses} ${variantClasses} ${
						disabled ? 'opacity-60 cursor-not-allowed pointer-events-none' : ''
					} ${triggerClassName}`}
				>
					<div className="flex items-center gap-2 truncate flex-1 min-w-0 mr-2">
						{icon && <span className="shrink-0 text-text-muted">{icon}</span>}
						{selectedOption?.icon && (
							<span className="shrink-0">{selectedOption.icon}</span>
						)}
						<span
							className={`truncate ${
								selectedOption ? 'text-text font-medium' : 'text-text-muted font-normal'
							}`}
						>
							{selectedOption ? selectedOption.label : placeholder}
						</span>
					</div>

					<ChevronDown
						className={`w-4 h-4 text-text-muted shrink-0 transition-transform duration-200 ${
							isOpen ? 'rotate-180' : ''
						}`}
						strokeWidth={1.5}
					/>
				</button>

				{/* Floating Options Popover */}
				{isOpen && (
					<div className="absolute z-50 top-full left-0 right-0 mt-1.5 bg-card rounded-[20px] shadow-xl border border-ink/5 max-h-64 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
						{shouldShowSearch && (
							<div className="p-2.5 border-b border-surface flex items-center gap-2 bg-card shrink-0">
								<Search className="w-4 h-4 text-text-muted shrink-0" strokeWidth={1.5} />
								<input
									ref={searchInputRef}
									type="text"
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									placeholder={searchPlaceholder}
									className="w-full text-xs font-medium outline-none bg-transparent text-text placeholder:text-text-muted"
									onClick={(e) => e.stopPropagation()}
								/>
								{search && (
									<button
										type="button"
										onClick={() => setSearch('')}
										className="p-1 hover:bg-surface rounded-full text-text-muted"
									>
										<X className="w-3.5 h-3.5" />
									</button>
								)}
							</div>
						)}

						<div className="overflow-y-auto py-1 divide-y divide-transparent flex-1" role="listbox">
							{filteredOptions.length === 0 ? (
								<div className="p-3 text-xs text-text-muted text-center font-normal">
									{emptyMessage}
								</div>
							) : (
								filteredOptions.map((opt) => {
									const optVal = getOptionValue(opt);
									const isSelected = optVal === stringValue;
									const isDisabled = opt.disabled;

									return (
										<div
											key={optVal}
											role="option"
											aria-selected={isSelected}
											className={`p-2.5 px-3.5 text-xs font-medium cursor-pointer flex items-center justify-between transition-colors ${
												isSelected
													? 'bg-mint/30 text-mint-deep font-semibold'
													: 'text-text hover:bg-surface/80'
											} ${isDisabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}
											onClick={() => {
												if (!isDisabled) {
													onChange(optVal);
													setIsOpen(false);
													setSearch('');
												}
											}}
										>
											<div className="flex items-center gap-2 truncate flex-1 min-w-0 mr-2">
												{opt.icon && <span className="shrink-0">{opt.icon}</span>}
												<div className="truncate flex flex-col">
													<span className="truncate">{opt.label}</span>
													{opt.sublabel && (
														<span className="text-[10px] text-text-muted font-normal leading-tight truncate">
															{opt.sublabel}
														</span>
													)}
												</div>
											</div>
											{isSelected && (
												<Check
													className="w-4 h-4 text-mint-deep shrink-0 ml-2"
													strokeWidth={2}
												/>
											)}
										</div>
									);
								})
							)}
						</div>
					</div>
				)}
			</div>

			{error && <span className="text-xs text-danger font-medium mt-0.5">{error}</span>}
		</div>
	);
}

/* -------------------------------------------------------------------------- */
/*                                Multi Select                                */
/* -------------------------------------------------------------------------- */

export interface MultiSelectProps {
	options: SelectOption[];
	selectedValues?: string[];
	selectedIds?: string[];
	onChange: (values: string[]) => void;
	placeholder?: string;
	label?: string;
	error?: string;
	disabled?: boolean;
	searchable?: boolean;
	searchPlaceholder?: string;
	ariaLabel?: string;
	id?: string;
	className?: string;
	triggerClassName?: string;
	variant?: 'surface' | 'card';
	size?: 'sm' | 'md';
	emptyMessage?: string;
	icon?: React.ReactNode;
	maxDisplayCount?: number;
}

export function MultiSelect({
	options,
	selectedValues,
	selectedIds,
	onChange,
	placeholder = 'Select options...',
	label,
	error,
	disabled = false,
	searchable,
	searchPlaceholder = 'Search...',
	ariaLabel,
	id,
	className = '',
	triggerClassName = '',
	variant = 'surface',
	size = 'md',
	emptyMessage = 'No options found',
	icon,
	maxDisplayCount = 2,
}: MultiSelectProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [search, setSearch] = useState('');
	const containerRef = useRef<HTMLDivElement>(null);
	const searchInputRef = useRef<HTMLInputElement>(null);
	const autoId = useId();
	const selectId = id || autoId;

	const values = selectedValues || selectedIds || [];

	const shouldShowSearch = searchable !== undefined ? searchable : options.length > 6;

	const filteredOptions = options.filter((opt) => {
		if (!search.trim()) return true;
		const query = search.toLowerCase();
		const matchLabel = opt.label.toLowerCase().includes(query);
		const matchSublabel = opt.sublabel?.toLowerCase().includes(query) ?? false;
		return matchLabel || matchSublabel;
	});

	useEffect(() => {
		if (!isOpen) return;

		const handleClickOutside = (e: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				setIsOpen(false);
				setSearch('');
			}
		};

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				setIsOpen(false);
				setSearch('');
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		document.addEventListener('keydown', handleKeyDown);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
			document.removeEventListener('keydown', handleKeyDown);
		};
	}, [isOpen]);

	useEffect(() => {
		if (isOpen && shouldShowSearch) {
			const timer = setTimeout(() => searchInputRef.current?.focus(), 50);
			return () => clearTimeout(timer);
		}
	}, [isOpen, shouldShowSearch]);

	const toggleOption = (val: string) => {
		if (values.includes(val)) {
			onChange(values.filter((item) => item !== val));
		} else {
			onChange([...values, val]);
		}
	};

	const selectAll = () => {
		const allEnabled = options
			.filter((o) => !o.disabled)
			.map((o) => getOptionValue(o));
		onChange(allEnabled);
	};

	const selectNone = () => {
		onChange([]);
	};

	const sizeClasses =
		size === 'sm' ? 'h-9 px-3 text-xs' : 'h-11 px-4 text-sm';

	const variantClasses =
		variant === 'card'
			? 'bg-card border border-ink/5 shadow-2xs hover:bg-card/90'
			: 'bg-surface hover:bg-surface/80';

	// Compute summary text
	const renderTriggerText = () => {
		if (values.length === 0) {
			return <span className="text-text-muted font-normal">{placeholder}</span>;
		}
		if (values.length <= maxDisplayCount) {
			const selectedLabels = values
				.map((v) => options.find((o) => getOptionValue(o) === v)?.label || v)
				.join(', ');
			return <span className="text-text font-medium truncate">{selectedLabels}</span>;
		}
		return <span className="text-text font-medium">{values.length} selected</span>;
	};

	return (
		<div className={`flex flex-col gap-1 w-full ${className}`}>
			{label && (
				<label
					htmlFor={selectId}
					className="text-[12px] font-medium text-text-muted mb-0.5 select-none"
				>
					{label}
				</label>
			)}

			<div className={`relative ${isOpen ? 'z-50' : 'z-auto'}`} ref={containerRef}>
				{/* Trigger */}
				<button
					id={selectId}
					type="button"
					disabled={disabled}
					aria-label={ariaLabel || label || placeholder}
					aria-expanded={isOpen}
					aria-haspopup="listbox"
					onClick={() => {
						if (!disabled) {
							setIsOpen(!isOpen);
							if (isOpen) setSearch('');
						}
					}}
					className={`w-full rounded-full font-medium text-text cursor-pointer flex items-center justify-between text-left transition-all focus:outline-none focus:ring-2 focus:ring-ink/20 ${sizeClasses} ${variantClasses} ${
						disabled ? 'opacity-60 cursor-not-allowed pointer-events-none' : ''
					} ${triggerClassName}`}
				>
					<div className="flex items-center gap-2 truncate flex-1 min-w-0 mr-2">
						{icon && <span className="shrink-0 text-text-muted">{icon}</span>}
						{renderTriggerText()}
					</div>

					<ChevronDown
						className={`w-4 h-4 text-text-muted shrink-0 transition-transform duration-200 ${
							isOpen ? 'rotate-180' : ''
						}`}
						strokeWidth={1.5}
					/>
				</button>

				{/* Floating Options Popover */}
				{isOpen && (
					<div className="absolute z-50 top-full left-0 right-0 mt-1.5 bg-card rounded-[20px] shadow-xl border border-ink/5 max-h-72 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
						{shouldShowSearch && (
							<div className="p-2.5 border-b border-surface flex items-center gap-2 bg-card shrink-0">
								<Search className="w-4 h-4 text-text-muted shrink-0" strokeWidth={1.5} />
								<input
									ref={searchInputRef}
									type="text"
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									placeholder={searchPlaceholder}
									className="w-full text-xs font-medium outline-none bg-transparent text-text placeholder:text-text-muted"
									onClick={(e) => e.stopPropagation()}
								/>
								{search && (
									<button
										type="button"
										onClick={() => setSearch('')}
										className="p-1 hover:bg-surface rounded-full text-text-muted"
									>
										<X className="w-3.5 h-3.5" />
									</button>
								)}
							</div>
						)}

						{options.length > 1 && (
							<div className="px-3.5 py-2 border-b border-surface flex items-center justify-between bg-surface/50 shrink-0">
								<button
									type="button"
									onClick={selectAll}
									className="text-xs font-medium text-text hover:underline cursor-pointer"
								>
									Select all
								</button>
								<button
									type="button"
									onClick={selectNone}
									className="text-xs font-medium text-text-muted hover:underline cursor-pointer"
								>
									Clear
								</button>
							</div>
						)}

						<div className="overflow-y-auto py-1 divide-y divide-transparent flex-1">
							{filteredOptions.length === 0 ? (
								<div className="p-3 text-xs text-text-muted text-center font-normal">
									{emptyMessage}
								</div>
							) : (
								filteredOptions.map((opt) => {
									const optVal = getOptionValue(opt);
									const isSelected = values.includes(optVal);
									const isDisabled = opt.disabled;

									return (
										<label
											key={optVal}
											className={`p-2.5 px-3.5 text-xs font-medium cursor-pointer flex items-center gap-3 transition-colors ${
												isSelected ? 'bg-mint/20 text-text' : 'text-text hover:bg-surface/80'
											} ${isDisabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}
											onClick={(e) => e.stopPropagation()}
										>
											<input
												type="checkbox"
												checked={isSelected}
												disabled={isDisabled}
												onChange={() => toggleOption(optVal)}
												className="w-4 h-4 rounded accent-ink cursor-pointer shrink-0"
											/>
											{opt.icon && <span className="shrink-0">{opt.icon}</span>}
											<div className="truncate flex-1 min-w-0 flex flex-col">
												<span className="truncate">{opt.label}</span>
												{opt.sublabel && (
													<span className="text-[10px] text-text-muted font-normal leading-tight truncate">
														{opt.sublabel}
													</span>
												)}
											</div>
										</label>
									);
								})
							)}
						</div>
					</div>
				)}
			</div>

			{error && <span className="text-xs text-danger font-medium mt-0.5">{error}</span>}
		</div>
	);
}

/* -------------------------------------------------------------------------- */
/*                                   Aliases                                  */
/* -------------------------------------------------------------------------- */

export const Dropdown = Select;
export const SearchableSelect = Select;
export const SearchableMultiSelect = MultiSelect;
