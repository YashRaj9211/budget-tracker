import { create } from 'zustand';
import type { User, LoginRequest, SignUpRequest, AuthResponse } from '../types/auth';
import { loginApi, signUpApi, requestOtpApi, verifyOtpApi } from '../api/authApi';
import { socketService } from '../api/socketService';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

interface AuthState {
	token: string | null;
	user: User | null;
	isAuthenticated: boolean;
	isLoading: boolean;
	error: string | null;

	login: (credentials: LoginRequest) => Promise<void>;
	signup: (userData: SignUpRequest) => Promise<void>;
	requestOtp: (email: string) => Promise<void>;
	verifyOtp: (email: string, code: string) => Promise<void>;
	logout: () => void;
	checkAuth: () => void;
	clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
	token: localStorage.getItem(TOKEN_KEY),
	user: (() => {
		const storedUser = localStorage.getItem(USER_KEY);
		if (storedUser) {
			try {
				return JSON.parse(storedUser);
			} catch {
				localStorage.removeItem(USER_KEY);
			}
		}
		return null;
	})(),
	isAuthenticated: !!localStorage.getItem(TOKEN_KEY),
	isLoading: false,
	error: null,

	checkAuth: () => {
		const token = localStorage.getItem(TOKEN_KEY);
		const storedUser = localStorage.getItem(USER_KEY);
		let user: User | null = null;
		if (storedUser) {
			try {
				user = JSON.parse(storedUser);
			} catch {
				localStorage.removeItem(USER_KEY);
			}
		}
		set({
			token,
			user,
			isAuthenticated: !!token,
		});
	},

	login: async (credentials: LoginRequest) => {
		set({ isLoading: true, error: null });
		try {
			const res = await loginApi(credentials);
			localStorage.setItem(TOKEN_KEY, res.token);
			localStorage.setItem(USER_KEY, JSON.stringify(res.user));
			set({
				token: res.token,
				user: res.user,
				isAuthenticated: true,
				isLoading: false,
			});
		} catch (err: unknown) {
			const errorMessage = err instanceof Error ? err.message : 'Login failed';
			set({ error: errorMessage, isLoading: false });
			throw err;
		}
	},

	signup: async (userData: SignUpRequest) => {
		set({ isLoading: true, error: null });
		try {
			const res = await signUpApi(userData);
			const maybeAuth = res as unknown as Partial<AuthResponse>;
			// If backend returns token on signup, store it directly.
			// If not, perform auto-login with email/password.
			if (maybeAuth.token && maybeAuth.user) {
				localStorage.setItem(TOKEN_KEY, maybeAuth.token);
				localStorage.setItem(USER_KEY, JSON.stringify(maybeAuth.user));
				set({
					token: maybeAuth.token,
					user: maybeAuth.user,
					isAuthenticated: true,
					isLoading: false,
				});
			} else {
				// Auto login after signup
				await get().login({ email: userData.email, password: userData.password });
			}
		} catch (err: unknown) {
			const errorMessage = err instanceof Error ? err.message : 'Sign up failed';
			set({ error: errorMessage, isLoading: false });
			throw err;
		}
	},

	requestOtp: async (email: string) => {
		set({ isLoading: true, error: null });
		try {
			await requestOtpApi(email);
			set({ isLoading: false });
		} catch (err: unknown) {
			const errorMessage = err instanceof Error ? err.message : 'Failed to request OTP';
			set({ error: errorMessage, isLoading: false });
			throw err;
		}
	},

	verifyOtp: async (email: string, code: string) => {
		set({ isLoading: true, error: null });
		try {
			const res = await verifyOtpApi(email, code);
			localStorage.setItem(TOKEN_KEY, res.token);
			localStorage.setItem(USER_KEY, JSON.stringify(res.user));
			set({
				token: res.token,
				user: res.user,
				isAuthenticated: true,
				isLoading: false,
			});
		} catch (err: unknown) {
			const errorMessage = err instanceof Error ? err.message : 'Failed to verify OTP';
			set({ error: errorMessage, isLoading: false });
			throw err;
		}
	},

	logout: () => {
		socketService.disconnect();
		localStorage.removeItem(TOKEN_KEY);
		localStorage.removeItem(USER_KEY);
		set({
			token: null,
			user: null,
			isAuthenticated: false,
			error: null,
		});
	},

	clearError: () => set({ error: null }),
}));
