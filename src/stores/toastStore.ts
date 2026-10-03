import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastAction {
	label: string;
	onClick: () => void;
}

export interface ToastOptions {
	title?: string;
	duration?: number; // duration in ms, defaults to 4000. 0 = persistent
	action?: ToastAction;
}

export interface ToastItem {
	id: string;
	type: ToastType;
	message: string;
	title?: string;
	duration: number;
	action?: ToastAction;
	createdAt: number;
}

interface ToastState {
	toasts: ToastItem[];
	addToast: (type: ToastType, message: string, options?: ToastOptions) => string;
	removeToast: (id: string) => void;
	clearToasts: () => void;
}

const MAX_VISIBLE_TOASTS = 4;
const DEFAULT_DURATION = 4000;

export const useToastStore = create<ToastState>((set) => ({
	toasts: [],

	addToast: (type, message, options) => {
		const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
		const duration = options?.duration ?? DEFAULT_DURATION;

		const newToast: ToastItem = {
			id,
			type,
			message,
			title: options?.title,
			duration,
			action: options?.action,
			createdAt: Date.now(),
		};

		set((state) => {
			// Limit queue to MAX_VISIBLE_TOASTS (keep most recent)
			const updated = [...state.toasts, newToast].slice(-MAX_VISIBLE_TOASTS);
			return { toasts: updated };
		});

		if (duration > 0) {
			setTimeout(() => {
				useToastStore.getState().removeToast(id);
			}, duration);
		}

		return id;
	},

	removeToast: (id) => {
		set((state) => ({
			toasts: state.toasts.filter((t) => t.id !== id),
		}));
	},

	clearToasts: () => {
		set({ toasts: [] });
	},
}));

/**
 * Global toast dispatcher for use anywhere (React components, API interceptors, stores, services).
 */
export const toast = {
	success: (message: string, options?: ToastOptions) =>
		useToastStore.getState().addToast('success', message, options),
	error: (message: string, options?: ToastOptions) =>
		useToastStore.getState().addToast('error', message, options),
	info: (message: string, options?: ToastOptions) =>
		useToastStore.getState().addToast('info', message, options),
	warning: (message: string, options?: ToastOptions) =>
		useToastStore.getState().addToast('warning', message, options),
	dismiss: (id: string) => useToastStore.getState().removeToast(id),
	clear: () => useToastStore.getState().clearToasts(),
};
