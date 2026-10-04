import React from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useVoiceInput } from '../../hooks/useVoiceInput';
import type { Transaction } from '../../types';

interface VoiceInputProps {
	onParsed: (transaction: Partial<Transaction>) => void;
	className?: string;
}

const VoiceInput: React.FC<VoiceInputProps> = ({ onParsed, className = '' }) => {
	const { isSupported, isListening, isProcessing, error, startListening } = useVoiceInput(onParsed);

	if (!isSupported) {
		return null;
	}

	return (
		<div className={`flex flex-col items-center gap-2 ${className}`}>
			<button
				onClick={isListening ? () => {} : startListening}
				disabled={isProcessing}
				className={`relative flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200 shadow-md active:scale-[0.95]
					${
						isListening
							? 'bg-danger text-white animate-pulse'
							: 'bg-mint text-ink hover:bg-mint/80'
					}
					${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
				`}
				aria-label="Add transaction with voice"
			>
				{isProcessing ? (
					<Loader2 className="w-5 h-5 animate-spin" strokeWidth={2} />
				) : isListening ? (
					<MicOff className="w-5 h-5" strokeWidth={2} />
				) : (
					<Mic className="w-5 h-5" strokeWidth={2} />
				)}
				{isListening && (
					<span className="absolute -top-1 -right-1 flex h-3 w-3">
						<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75"></span>
						<span className="relative inline-flex rounded-full h-3 w-3 bg-danger"></span>
					</span>
				)}
			</button>

			{error && (
				<div className="text-danger text-xs mt-1 text-center bg-danger-soft px-3 py-1 rounded-full">
					{error}
				</div>
			)}
			{isListening && (
				<div className="text-text text-xs mt-1 font-medium bg-card px-3 py-1 rounded-full shadow-sm animate-pulse">
					Listening…
				</div>
			)}
			{isProcessing && (
				<div className="text-text text-xs mt-1 font-medium bg-card px-3 py-1 rounded-full shadow-sm">
					Processing…
				</div>
			)}
		</div>
	);
};

export default VoiceInput;
