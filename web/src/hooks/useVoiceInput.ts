import { useState, useRef, useCallback, useEffect } from 'react';

// Minimal types for the browser Web Speech API (not in TS's DOM lib yet)
interface SpeechResultEvent {
	results: ArrayLike<ArrayLike<{ transcript: string }>>;
}
interface SpeechErrorEvent {
	error: string;
}
interface Recognizer {
	lang: string;
	interimResults: boolean;
	continuous: boolean;
	maxAlternatives: number;
	onstart: (() => void) | null;
	onresult: ((e: SpeechResultEvent) => void) | null;
	onerror: ((e: SpeechErrorEvent) => void) | null;
	onend: (() => void) | null;
	start: () => void;
	stop: () => void;
	abort: () => void;
}
type RecognizerCtor = new () => Recognizer;

const speechWindow = (typeof window !== 'undefined' ? window : {}) as {
	SpeechRecognition?: RecognizerCtor;
	webkitSpeechRecognition?: RecognizerCtor;
};
const SpeechRecognitionImpl = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;

// Android Chrome repeats text when continuous=true, so we use single-utterance mode there.
const isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);

/**
 * Live speech-to-text using the browser's built-in recogniser (free + instant).
 * `transcript` updates while the user is still speaking.
 * `onFinished(text)` runs once when listening stops (silence or user taps Done).
 */
export function useVoiceInput(onFinished: (text: string) => void) {
	const [isListening, setIsListening] = useState(false);
	const [transcript, setTranscript] = useState('');
	const [error, setError] = useState<string | null>(null);

	const recognitionRef = useRef<Recognizer | null>(null);
	const textRef = useRef('');
	const cancelledRef = useRef(false);
	const onFinishedRef = useRef(onFinished);
	useEffect(() => {
		onFinishedRef.current = onFinished;
	}, [onFinished]);

	const isSupported = !!SpeechRecognitionImpl;

	const start = useCallback(() => {
		if (!SpeechRecognitionImpl) {
			setError('Voice is not supported in this browser. Type it instead.');
			return;
		}
		recognitionRef.current?.abort();

		const recognition = new SpeechRecognitionImpl();
		recognition.lang = 'en-IN'; // understands Indian English + Hinglish better than en-US
		recognition.interimResults = true; // live words while speaking
		recognition.continuous = !isAndroid;
		recognition.maxAlternatives = 1;

		textRef.current = '';
		cancelledRef.current = false;
		setTranscript('');
		setError(null);

		recognition.onstart = () => setIsListening(true);

		recognition.onresult = (event) => {
			// Rebuild full text from all results (final + in-progress)
			let text = '';
			for (let i = 0; i < event.results.length; i++) {
				text += event.results[i][0].transcript + ' ';
			}
			textRef.current = text.trim();
			setTranscript(textRef.current);
		};

		recognition.onerror = (event) => {
			if (event.error === 'aborted' || event.error === 'no-speech') return;
			setError(
				event.error === 'not-allowed'
					? 'Microphone permission denied. Allow mic access and try again.'
					: 'Microphone error: ' + event.error
			);
		};

		recognition.onend = () => {
			// Ignore stale recognizers (aborted by a restart / StrictMode remount)
			if (recognitionRef.current !== recognition) return;
			setIsListening(false);
			recognitionRef.current = null;
			if (!cancelledRef.current && textRef.current) onFinishedRef.current(textRef.current);
		};

		recognitionRef.current = recognition;
		recognition.start();
	}, []);

	// Stop and process what was heard
	const stop = useCallback(() => recognitionRef.current?.stop(), []);

	// Stop and throw away what was heard
	const cancel = useCallback(() => {
		cancelledRef.current = true;
		recognitionRef.current?.abort();
		setIsListening(false);
	}, []);

	useEffect(() => () => recognitionRef.current?.abort(), []);

	return { isSupported, isListening, transcript, setTranscript, error, start, stop, cancel };
}
