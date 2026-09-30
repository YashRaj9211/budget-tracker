import { useState, useEffect, useCallback } from 'react';
import { parseVoiceCommand } from '../utils/gemini';
import type { Transaction } from '../types';

declare global {
	interface Window {
		SpeechRecognition: any;
		webkitSpeechRecognition: any;
	}
}

export function useVoiceInput(onParsed: (transaction: Partial<Transaction>) => void) {
	const [isListening, setIsListening] = useState(false);
	const [isProcessing, setIsProcessing] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const isSupported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

	useEffect(() => {
		if (error) {
			const timer = setTimeout(() => setError(null), 5000);
			return () => clearTimeout(timer);
		}
	}, [error]);

	const startListening = useCallback(() => {
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
	}, [isSupported, onParsed]);

	return {
		isSupported,
		isListening,
		isProcessing,
		error,
		startListening,
	};
}
