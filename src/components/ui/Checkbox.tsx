import React, { useId, useState } from 'react';
import { Check } from 'lucide-react';

export interface CheckboxProps {
	checked?: boolean;
	defaultChecked?: boolean;
	onChange?: (checked: boolean) => void;
	label?: React.ReactNode;
	description?: React.ReactNode;
	disabled?: boolean;
	id?: string;
	className?: string;
}

export function Checkbox({
	checked: controlledChecked,
	defaultChecked = true,
	onChange,
	label,
	description,
	disabled = false,
	id,
	className = '',
}: CheckboxProps) {
	const autoId = useId();
	const checkboxId = id || autoId;
	const [internalChecked, setInternalChecked] = useState(defaultChecked);

	const isChecked = controlledChecked !== undefined ? controlledChecked : internalChecked;

	const handleToggle = () => {
		if (!disabled) {
			const next = !isChecked;
			if (controlledChecked === undefined) {
				setInternalChecked(next);
			}
			onChange?.(next);
		}
	};

	return (
		<div
			className={`inline-flex items-start gap-2.5 select-none ${
				disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
			} ${className}`}
			onClick={handleToggle}
		>
			<button
				id={checkboxId}
				type="button"
				role="checkbox"
				aria-checked={isChecked}
				disabled={disabled}
				onClick={(e) => {
					e.stopPropagation();
					handleToggle();
				}}
				className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-150 shrink-0 mt-0.5 focus:outline-none focus:ring-2 focus:ring-ink/20 ${
					isChecked
						? 'bg-ink border-ink text-white shadow-2xs'
						: 'bg-card border-text-muted/40 hover:border-ink/50'
				} ${disabled ? 'cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
			>
				{isChecked && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
			</button>

			{(label || description) && (
				<div className="flex flex-col text-left">
					{label && (
						<label
							htmlFor={checkboxId}
							className={`text-sm font-medium leading-tight ${
								disabled ? 'cursor-not-allowed' : 'cursor-pointer'
							} text-text`}
							onClick={(e) => e.preventDefault()}
						>
							{label}
						</label>
					)}
					{description && (
						<span className="text-[11px] text-text-muted mt-0.5 leading-tight">
							{description}
						</span>
					)}
				</div>
			)}
		</div>
	);
}

export default Checkbox;