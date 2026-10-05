import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.hoisted(() => {
	const storage: Record<string, string> = {};
	globalThis.localStorage = {
		getItem: (k: string) => storage[k] ?? null,
		setItem: (k: string, v: string) => { storage[k] = v; },
		removeItem: (k: string) => { delete storage[k]; },
		clear: () => { Object.keys(storage).forEach((k) => delete storage[k]); },
		key: (i: number) => Object.keys(storage)[i] ?? null,
		length: 0,
	};
});

import { useAuthStore } from './authStore';
import * as authApi from '../api/authApi';

vi.mock('../api/authApi', () => ({
	loginApi: vi.fn(),
	signUpApi: vi.fn(),
	requestSignupOtpApi: vi.fn(),
	requestOtpApi: vi.fn(),
	verifyOtpApi: vi.fn(),
}));

vi.mock('../db', () => ({
	clearUserData: vi.fn().mockResolvedValue(undefined),
}));

describe('authStore - Signup verification flow', () => {
	beforeEach(() => {
		localStorage.clear();
		useAuthStore.setState({
			token: null,
			user: null,
			isAuthenticated: false,
			isLoading: false,
			error: null,
		});
		vi.clearAllMocks();
	});

	it('requestSignupOtp calls requestSignupOtpApi with email and username', async () => {
		vi.mocked(authApi.requestSignupOtpApi).mockResolvedValue({ message: 'Verification OTP sent successfully' });

		await useAuthStore.getState().requestSignupOtp('test@example.com', 'testuser');

		expect(authApi.requestSignupOtpApi).toHaveBeenCalledWith({
			email: 'test@example.com',
			username: 'testuser',
		});
		expect(useAuthStore.getState().isLoading).toBe(false);
		expect(useAuthStore.getState().error).toBeNull();
	});

	it('requestSignupOtp records error when api fails', async () => {
		vi.mocked(authApi.requestSignupOtpApi).mockRejectedValue(new Error('An account with this email already exists'));

		await expect(
			useAuthStore.getState().requestSignupOtp('existing@example.com', 'existinguser')
		).rejects.toThrow('An account with this email already exists');

		expect(useAuthStore.getState().error).toBe('An account with this email already exists');
		expect(useAuthStore.getState().isLoading).toBe(false);
	});

	it('signup successfully stores token and user when OTP code is valid', async () => {
		const mockResponse = {
			token: 'test-jwt-token',
			user: {
				id: 'user_123',
				email: 'test@example.com',
				name: 'Test User',
				username: 'testuser',
			},
		};

		vi.mocked(authApi.signUpApi).mockResolvedValue(mockResponse);

		await useAuthStore.getState().signup({
			name: 'Test User',
			username: 'testuser',
			email: 'test@example.com',
			password: 'password123',
			code: '123456',
		});

		expect(authApi.signUpApi).toHaveBeenCalledWith({
			name: 'Test User',
			username: 'testuser',
			email: 'test@example.com',
			password: 'password123',
			code: '123456',
		});
		expect(useAuthStore.getState().token).toBe('test-jwt-token');
		expect(useAuthStore.getState().user).toEqual(mockResponse.user);
		expect(useAuthStore.getState().isAuthenticated).toBe(true);
		expect(localStorage.getItem('auth_token')).toBe('test-jwt-token');
	});

	it('signup records error when verification code fails', async () => {
		vi.mocked(authApi.signUpApi).mockRejectedValue(new Error('Invalid verification code'));

		await expect(
			useAuthStore.getState().signup({
				name: 'Test User',
				username: 'testuser',
				email: 'test@example.com',
				password: 'password123',
				code: '000000',
			})
		).rejects.toThrow('Invalid verification code');

		expect(useAuthStore.getState().error).toBe('Invalid verification code');
		expect(useAuthStore.getState().isAuthenticated).toBe(false);
	});
});
