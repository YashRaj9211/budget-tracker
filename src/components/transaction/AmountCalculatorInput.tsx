import React, { useRef } from 'react';
import { Calculator } from 'lucide-react';

interface AmountCalculatorInputProps {
	amountInput: string;
	evaluatedAmount: number | null;
	onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	onBlur: () => void;
	onAppendOperator: (op: string) => void;
}

export const AmountCalculatorInput: React.FC<AmountCalculatorInputProps> = ({
	amountInput,
	evaluatedAmount,
	onChange,
	onBlur,
	onAppendOperator,
}) => {
	const inputRef = useRef<HTMLInputElement>(null);

	const handleOpClick = (op: string) => {
		onAppendOperator(op);
		inputRef.current?.focus();
	};

	return (
		<div>
			<div className="flex justify-between items-baseline mb-1.5">
				<label className="block text-[12px] font-medium text-text-muted">
					Amount (₹)
				</label>
				{evaluatedAmount !== null && (
					<span className="text-xs font-medium text-mint-deep">
						= ₹{evaluatedAmount.toFixed(2)}
					</span>
				)}
			</div>
			<div className="relative">
				<span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted font-medium text-sm">₹</span>
				<input
					ref={inputRef}
					type="text"
					value={amountInput}
					onChange={onChange}
					onBlur={onBlur}
					placeholder="e.g. 80.0 or 80 + 20"
					className="w-full bg-surface rounded-full h-11 pl-8 pr-4 text-sm font-medium text-text focus:outline-none focus:ring-2 focus:ring-ink/20"
					required
				/>
			</div>
			{/* Quick Math Helper Keys */}
			<div className="flex gap-2 mt-2 items-center">
				{['+', '-', '*', '/'].map((op) => (
					<button
						key={op}
						type="button"
						onClick={() => handleOpClick(op)}
						className="w-7 h-7 rounded-full text-xs font-medium bg-surface hover:bg-surface/80 text-text flex items-center justify-center transition-all cursor-pointer"
					>
						{op}
					</button>
				))}
				<span className="text-[11px] text-text-muted ml-1 flex items-center gap-1">
					<Calculator size={12} strokeWidth={1.5} /> Live math
				</span>
			</div>
		</div>
	);
};
