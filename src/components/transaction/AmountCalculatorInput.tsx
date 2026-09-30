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
			<div className="flex justify-between items-baseline mb-1">
				<label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider">
					Amount (₹)
				</label>
				{evaluatedAmount !== null && (
					<span className="text-xs font-bold text-emerald-600">
						= ₹{evaluatedAmount.toFixed(2)}
					</span>
				)}
			</div>
			<div className="relative">
				<span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₹</span>
				<input
					ref={inputRef}
					type="text"
					value={amountInput}
					onChange={onChange}
					onBlur={onBlur}
					placeholder="e.g. 80.0 or 80 + 20"
					className="w-full border-2 border-black p-2 pl-7 text-sm font-medium bg-white focus:outline-none"
					required
				/>
			</div>
			{/* Quick Math Helper Keys */}
			<div className="flex gap-1.5 mt-1.5">
				{['+', '-', '*', '/'].map((op) => (
					<button
						key={op}
						type="button"
						onClick={() => handleOpClick(op)}
						className="w-7 h-7 text-xs font-bold border border-black bg-gray-50 hover:bg-gray-100 flex items-center justify-center transition-all cursor-pointer"
					>
						{op}
					</button>
				))}
				<span className="text-[10px] text-gray-400 self-center ml-2 flex items-center gap-1">
					<Calculator size={11} /> Supports live math
				</span>
			</div>
		</div>
	);
};
