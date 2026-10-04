import { create } from 'zustand';

export type StatusSheetState = 'idle' | 'processing' | 'success' | 'error';

export interface StatusSheetConfig {
	state: StatusSheetState;
	title?: string;
	message?: string;
	buttonText?: string;
	onConfirm?: () => void;
	onClose?: () => void;
	error?: string;
}

interface StatusSheetStore {
	isOpen: boolean;
	config: StatusSheetConfig;
	showProcessing: (options?: { title?: string; message?: string }) => void;
	showSuccess: (options?: {
		title?: string;
		message?: string;
		buttonText?: string;
		onConfirm?: () => void;
	}) => void;
	showError: (options?: { title?: string; message?: string; error?: string }) => void;
	close: () => void;
	execute: <T>(options: {
		action: () => Promise<T>;
		processingTitle?: string;
		processingMessage?: string;
		successTitle?: string;
		successMessage?: string;
		buttonText?: string;
		onSuccess?: (result: T) => void;
		onError?: (err: any) => void;
		minProcessingMs?: number;
	}) => Promise<T | null>;
}

const DEFAULT_PROCESSING_TITLE = 'Processing...';
const DEFAULT_PROCESSING_MSG = 'Your transfer is processing';
const DEFAULT_SUCCESS_TITLE = 'Success!';
const DEFAULT_SUCCESS_MSG = 'Your transfer was successful';
const DEFAULT_BUTTON_TEXT = 'Nice one!';

export const useStatusSheetStore = create<StatusSheetStore>((set, get) => ({
	isOpen: false,
	config: {
		state: 'idle',
		title: '',
		message: '',
		buttonText: DEFAULT_BUTTON_TEXT,
	},

	showProcessing: (options) => {
		set({
			isOpen: true,
			config: {
				state: 'processing',
				title: options?.title || DEFAULT_PROCESSING_TITLE,
				message: options?.message || DEFAULT_PROCESSING_MSG,
				buttonText: DEFAULT_BUTTON_TEXT,
			},
		});
	},

	showSuccess: (options) => {
		set({
			isOpen: true,
			config: {
				state: 'success',
				title: options?.title || DEFAULT_SUCCESS_TITLE,
				message: options?.message || DEFAULT_SUCCESS_MSG,
				buttonText: options?.buttonText || DEFAULT_BUTTON_TEXT,
				onConfirm: options?.onConfirm,
			},
		});
	},

	showError: (options) => {
		set({
			isOpen: true,
			config: {
				state: 'error',
				title: options?.title || 'Something went wrong',
				message: options?.message || 'Could not complete the action.',
				error: options?.error,
				buttonText: 'Close',
			},
		});
	},

	close: () => {
		const currentOnClose = get().config.onClose;
		if (currentOnClose) {
			currentOnClose();
		}
		set({
			isOpen: false,
			config: {
				state: 'idle',
				title: '',
				message: '',
				buttonText: DEFAULT_BUTTON_TEXT,
			},
		});
	},

	execute: async ({
		action,
		processingTitle = DEFAULT_PROCESSING_TITLE,
		processingMessage = DEFAULT_PROCESSING_MSG,
		successTitle = DEFAULT_SUCCESS_TITLE,
		successMessage = DEFAULT_SUCCESS_MSG,
		buttonText = DEFAULT_BUTTON_TEXT,
		onSuccess,
		onError,
		minProcessingMs = 900,
	}) => {
		set({
			isOpen: true,
			config: {
				state: 'processing',
				title: processingTitle,
				message: processingMessage,
				buttonText,
			},
		});

		const startTime = Date.now();
		try {
			const result = await action();
			const elapsed = Date.now() - startTime;
			if (elapsed < minProcessingMs) {
				await new Promise((resolve) => setTimeout(resolve, minProcessingMs - elapsed));
			}

			set({
				isOpen: true,
				config: {
					state: 'success',
					title: successTitle,
					message: successMessage,
					buttonText,
					onConfirm: () => {
						get().close();
						if (onSuccess) onSuccess(result);
					},
				},
			});

			return result;
		} catch (err: any) {
			const elapsed = Date.now() - startTime;
			if (elapsed < minProcessingMs) {
				await new Promise((resolve) => setTimeout(resolve, minProcessingMs - elapsed));
			}

			const errorMessage = err?.message || 'Action failed to complete';
			set({
				isOpen: true,
				config: {
					state: 'error',
					title: 'Failed',
					message: errorMessage,
					buttonText: 'Got it',
					onConfirm: () => {
						get().close();
						if (onError) onError(err);
					},
				},
			});
			return null;
		}
	},
}));

export const statusSheet = {
	showProcessing: (opts?: { title?: string; message?: string }) =>
		useStatusSheetStore.getState().showProcessing(opts),
	showSuccess: (opts?: {
		title?: string;
		message?: string;
		buttonText?: string;
		onConfirm?: () => void;
	}) => useStatusSheetStore.getState().showSuccess(opts),
	showError: (opts?: { title?: string; message?: string; error?: string }) =>
		useStatusSheetStore.getState().showError(opts),
	close: () => useStatusSheetStore.getState().close(),
	execute: <T>(opts: {
		action: () => Promise<T>;
		processingTitle?: string;
		processingMessage?: string;
		successTitle?: string;
		successMessage?: string;
		buttonText?: string;
		onSuccess?: (res: T) => void;
		onError?: (err: any) => void;
		minProcessingMs?: number;
	}) => useStatusSheetStore.getState().execute(opts),
};
