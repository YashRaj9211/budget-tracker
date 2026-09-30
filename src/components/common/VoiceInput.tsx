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
				className={`relative flex items-center justify-center p-4 rounded-full transition-all duration-300 shadow-lg
					${
						isListening
							? 'bg-red-500 text-white animate-pulse shadow-red-500/50'
							: 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/30'
					}
					${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
				`}
				aria-label="Add transaction with voice"
			>
				{isProcessing ? (
					<Loader2 className="w-6 h-6 animate-spin" />
				) : isListening ? (
					<MicOff className="w-6 h-6" />
				) : (
					<Mic className="w-6 h-6" />
				)}
				{isListening && (
					<span className="absolute -top-1 -right-1 flex h-3 w-3">
						<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
						<span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
					</span>
				)}
			</button>

			{error && (
				<div className="text-red-500 text-sm mt-2 text-center bg-red-100 dark:bg-red-900/20 px-3 py-1 rounded-md">
					{error}
				</div>
			)}
			{isListening && (
				<div className="text-emerald-500 text-sm mt-2 font-medium animate-pulse">
					Listening...
				</div>
			)}
			{isProcessing && (
				<div className="text-emerald-500 text-sm mt-2 font-medium">
					Processing...
				</div>
			)}
		</div>
	);
};

export default VoiceInput;
