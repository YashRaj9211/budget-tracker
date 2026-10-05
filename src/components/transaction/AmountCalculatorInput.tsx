import React, { useRef } from 'react';

interface AmountCalculatorInputProps {
	amountInput: string;
	evaluatedAmount: number | null;
	onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	onBlur: () => void;
	onAppendOperator?: (op: string) => void;
}

export const AmountCalculatorInput: React.FC<AmountCalculatorInputProps> = ({
	amountInput,
	evaluatedAmount,
	onChange,
	onBlur,
}) => {
	const inputRef = useRef<HTMLInputElement>(null);

	return (
		<div>
			<div className="flex justify-between items-baseline mb-1.5">
				<label className="block text-[12px] font-medium text-text-muted">
					Amount
				</label>
				{evaluatedAmount !== null && (
					<span className="text-xs font-semibold text-mint-deep bg-mint/20 px-2 py-0.5 rounded-full">
						= ₹{evaluatedAmount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
					</span>
				)}
			</div>
			<div className="relative flex items-center">
				<span className="absolute left-4 text-xl font-bold text-text-muted pointer-events-none select-none">
					₹
				</span>
				<input
					ref={inputRef}
					type="text"
					inputMode="decimal"
					value={amountInput}
					onChange={onChange}
					onBlur={onBlur}
					placeholder="0.00"
					className="w-full bg-surface rounded-[20px] h-14 pl-10 pr-4 text-2xl font-bold text-text placeholder:text-text-muted/40 focus:outline-none focus:ring-2 focus:ring-ink/20 transition-all tracking-tight"
					required
				/>
			</div>
		</div>
	);
};

export default AmountCalculatorInput;
