import { useState, useEffect } from 'react';

/**
 * Custom hook to safely evaluate mathematical expressions in real-time
 * for transaction amount inputs (e.g. "80 + 20 - 5 * 2").
 */
export function useMathAmountInput(initialValue: string = '') {
	const [amountInput, setAmountInput] = useState(initialValue);
	const [evaluatedAmount, setEvaluatedAmount] = useState<number | null>(null);

	useEffect(() => {
		const sanitized = amountInput.replace(/[^0-9+\-*/().\s]/g, '');
		if (!sanitized.trim()) {
			setEvaluatedAmount(null);
			return;
		}

		try {
			if (/[+\-*/]/.test(sanitized)) {
				// Evaluate safely
				const result = new Function(`return ${sanitized}`)();
				if (typeof result === 'number' && isFinite(result) && !isNaN(result)) {
					setEvaluatedAmount(Number(result.toFixed(2)));
				} else {
					setEvaluatedAmount(null);
				}
			} else {
				const parsed = parseFloat(sanitized);
				setEvaluatedAmount(!isNaN(parsed) ? parsed : null);
			}
		} catch {
			setEvaluatedAmount(null);
		}
	}, [amountInput]);

	const handleAmountBlur = () => {
		if (evaluatedAmount !== null && /[+\-*/]/.test(amountInput)) {
			setAmountInput(String(evaluatedAmount));
		}
	};

	const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const val = e.target.value;
		const sanitized = val.replace(/[^0-9+\-*/().\s]/g, '');
		setAmountInput(sanitized);
	};

	const appendOperator = (op: string) => {
		setAmountInput((prev) => {
			const trimmed = prev.trim();
			if (!trimmed) return '';
			if (['+', '-', '*', '/'].includes(trimmed.slice(-1))) {
				return trimmed.slice(0, -1) + op + ' ';
			}
			return trimmed + ' ' + op + ' ';
		});
	};

	const resetAmount = () => {
		setAmountInput('');
		setEvaluatedAmount(null);
	};

	return {
		amountInput,
		setAmountInput,
		evaluatedAmount,
		handleAmountChange,
		handleAmountBlur,
		appendOperator,
		resetAmount,
	};
}
