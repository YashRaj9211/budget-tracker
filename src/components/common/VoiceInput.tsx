import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { parseVoiceCommand } from '../../utils/gemini';
import type { Transaction } from '../../types';

// Extend Window to support SpeechRecognition
declare global {
	interface Window {
		SpeechRecognition: any;
		webkitSpeechRecognition: any;
	}
}

interface VoiceInputProps {
	onParsed: (transaction: Partial<Transaction>) => void;
	className?: string;
}

const VoiceInput: React.FC<VoiceInputProps> = ({ onParsed, className = '' }) => {
	const [isListening, setIsListening] = useState(false);
	const [isProcessing, setIsProcessing] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const isSupported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;

	useEffect(() => {
		if (error) {
			const timer = setTimeout(() => setError(null), 5000);
			return () => clearTimeout(timer);
		}
	}, [error]);

	const handleListen = () => {
		if (!isSupported) {
			setError('Voice recognition is not supported in this browser.');
			return;
		}

		const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
		if (!apiKey) {
			setError('Please set VITE_GEMINI_API_KEY in your .env file.');
			return;
		}

		const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
		const recognition = new SpeechRecognition();

		recognition.lang = 'en-US';
		recognition.interimResults = false;
		recognition.maxAlternatives = 1;

		recognition.onstart = () => {
			setIsListening(true);
			setError(null);
		};

		recognition.onresult = async (event: any) => {
			const transcript = event.results[0][0].transcript;
			setIsListening(false);
			setIsProcessing(true);

			try {
				const parsed = await parseVoiceCommand(transcript, apiKey);
				onParsed(parsed);
			} catch (err) {
				console.error(err);
				setError('Failed to process voice command.');
			} finally {
				setIsProcessing(false);
			}
		};

		recognition.onerror = (event: any) => {
			console.error('Speech recognition error', event.error);
			setError('Microphone error: ' + event.error);
			setIsListening(false);
		};

		recognition.onend = () => {
			setIsListening(false);
		};

		recognition.start();
	};

	if (!isSupported) {
		return null; // Don't render anything if not supported
	}

	return (
		<div className={`flex flex-col items-center gap-2 ${className}`}>
			<button
				onClick={isListening ? () => {} : handleListen}
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
