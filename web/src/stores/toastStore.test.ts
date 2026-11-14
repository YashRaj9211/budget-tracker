import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useToastStore, toast } from './toastStore';

describe('toastStore', () => {
	beforeEach(() => {
		useToastStore.getState().clearToasts();
		vi.useFakeTimers();
	});

	it('adds a success toast correctly', () => {
		const id = toast.success('Action succeeded!');
		const toasts = useToastStore.getState().toasts;

		expect(toasts).toHaveLength(1);
		expect(toasts[0].id).toBe(id);
		expect(toasts[0].type).toBe('success');
		expect(toasts[0].message).toBe('Action succeeded!');
	});

	it('adds error, info, and warning toasts', () => {
		toast.error('Something broke');
		toast.warning('Check your input');
		toast.info('New update available');

		const toasts = useToastStore.getState().toasts;
		expect(toasts).toHaveLength(3);
		expect(toasts[0].type).toBe('error');
		expect(toasts[1].type).toBe('warning');
		expect(toasts[2].type).toBe('info');
	});

	it('auto-dismisses toast after duration', () => {
		toast.info('Temporary message', { duration: 2000 });
		expect(useToastStore.getState().toasts).toHaveLength(1);

		vi.advanceTimersByTime(1999);
		expect(useToastStore.getState().toasts).toHaveLength(1);

		vi.advanceTimersByTime(2);
		expect(useToastStore.getState().toasts).toHaveLength(0);
	});

	it('removes toast manually with dismiss', () => {
		const id = toast.success('Stay here', { duration: 0 });
		expect(useToastStore.getState().toasts).toHaveLength(1);

		toast.dismiss(id);
		expect(useToastStore.getState().toasts).toHaveLength(0);
	});

	it('clears all toasts with clear', () => {
		toast.info('One');
		toast.info('Two');
		toast.info('Three');
		expect(useToastStore.getState().toasts).toHaveLength(3);

		toast.clear();
		expect(useToastStore.getState().toasts).toHaveLength(0);
	});

	it('limits maximum visible toasts to 4', () => {
		toast.info('1');
		toast.info('2');
		toast.info('3');
		toast.info('4');
		toast.info('5');

		const toasts = useToastStore.getState().toasts;
		expect(toasts).toHaveLength(4);
		expect(toasts[toasts.length - 1].message).toBe('5');
	});
});
