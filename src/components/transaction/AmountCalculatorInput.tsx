import React, { useRef } from 'react';

interface AmountCalculatorInputProps {
	amountInput: string;
	evaluatedAmount: number | null;
	onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	onBlur: () => void;
	onAppendOperator?: (op: string) => void;
	accent?: 'danger' | 'success' | 'ink';
}

const ACCENT_TEXT: Record<NonNullable<AmountCalculatorInputProps['accent']>, string> = {
	danger: 'text-danger',
	success: 'text-mint-deep',
	ink: 'text-ink',
};

export const AmountCalculatorInput: React.FC<AmountCalculatorInputProps> = ({
	amountInput,
	evaluatedAmount,
	onChange,
	onBlur,
	accent = 'ink',
}) => {
	const inputRef = useRef<HTMLInputElement>(null);

	return (
		<div
			className="bg-surface rounded-[24px] px-4 pt-3 pb-4 text-center cursor-text focus-within:ring-2 focus-within:ring-ink/20 transition-all"
			onClick={() => inputRef.current?.focus()}
		>
			<label
				htmlFor="txn-amount"
				className="block text-[11px] font-medium uppercase tracking-wider text-text-muted"
			>
				Amount
			</label>
			<div className="flex items-center justify-center gap-1 mt-1">
				<span className={`text-3xl font-bold select-none ${ACCENT_TEXT[accent]} opacity-60`}>₹</span>
				<input
					id="txn-amount"
					ref={inputRef}
					type="text"
					inputMode="decimal"
					value={amountInput}
					onChange={onChange}
					onBlur={onBlur}
					placeholder="0"
					size={Math.max(amountInput.length, 1)}
					className={`min-w-[2ch] max-w-full bg-transparent text-center text-4xl font-bold tracking-tight placeholder:text-text-muted/30 focus:outline-none ${ACCENT_TEXT[accent]}`}
					required
				/>
			</div>
			<div className="h-6 mt-1 flex items-center justify-center">
				{evaluatedAmount !== null ? (
					<span className="text-xs font-semibold text-mint-deep bg-mint/20 px-2.5 py-0.5 rounded-full">
						= ₹
						{evaluatedAmount.toLocaleString('en-IN', {
							minimumFractionDigits: 0,
							maximumFractionDigits: 2,
						})}
					</span>
				) : (
					<span className="text-[11px] text-text-muted/60">Tip: type 120+45*2 to calculate</span>
				)}
			</div>
		</div>
	);
};

export default AmountCalculatorInput;
