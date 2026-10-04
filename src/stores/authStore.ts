import { create } from 'zustand';
import type { User, LoginRequest, SignUpRequest } from '../types/auth';
import { loginApi, signUpApi, requestOtpApi, verifyOtpApi } from '../api/authApi';
import { socketService } from '../api/socketService';
import { isBeyondGracePeriod } from '../utils/jwt';
import { toast } from './toastStore';

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
	logout: (reason?: string) => void;
	checkAuth: () => void;
	clearError: () => void;
}

function getInitialAuth(): {
	token: string | null;
	user: User | null;
	isAuthenticated: boolean;
	initialError: string | null;
} {
	const storedToken = localStorage.getItem(TOKEN_KEY);
	if (!storedToken) {
		return { token: null, user: null, isAuthenticated: false, initialError: null };
	}

	// If the token is beyond the 30-day grace period, it can no longer be refreshed
	if (isBeyondGracePeriod(storedToken)) {
		localStorage.removeItem(TOKEN_KEY);
		localStorage.removeItem(USER_KEY);
		return {
			token: null,
			user: null,
			isAuthenticated: false,
			initialError: 'Your session has expired. Please log in again.',
		};
	}

	const storedUser = localStorage.getItem(USER_KEY);
	let user: User | null = null;
	if (storedUser) {
		try {
			user = JSON.parse(storedUser);
		} catch {
			localStorage.removeItem(USER_KEY);
		}
	}

	return {
		token: storedToken,
		user,
		isAuthenticated: true,
		initialError: null,
	};
}

const initialAuth = getInitialAuth();

export const useAuthStore = create<AuthState>((set, get) => ({
	token: initialAuth.token,
	user: initialAuth.user,
	isAuthenticated: initialAuth.isAuthenticated,
	isLoading: false,
	error: initialAuth.initialError,

	checkAuth: () => {
		const auth = getInitialAuth();
		set({
			token: auth.token,
			user: auth.user,
			isAuthenticated: auth.isAuthenticated,
			error: auth.initialError,
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
			toast.success(`Welcome back, ${res.user.name || 'friend'}!`, { title: 'Signed In' });
		} catch (err: unknown) {
			const errorMessage = err instanceof Error ? err.message : 'Login failed';
			set({ error: errorMessage, isLoading: false });
			toast.error(errorMessage, { title: 'Sign In Failed' });
			throw err;
		}
	},

	signup: async (userData: SignUpRequest) => {
		set({ isLoading: true, error: null });
		try {
			const res = await signUpApi(userData);
			if (res.token && res.user) {
				localStorage.setItem(TOKEN_KEY, res.token);
				localStorage.setItem(USER_KEY, JSON.stringify(res.user));
				set({
					token: res.token,
					user: res.user,
					isAuthenticated: true,
					isLoading: false,
				});
				toast.success('Your account has been created!', { title: 'Welcome to Divvit' });
			} else {
				// Auto login after signup fallback
				await get().login({ email: userData.email, password: userData.password });
			}
		} catch (err: unknown) {
			const errorMessage = err instanceof Error ? err.message : 'Sign up failed';
			set({ error: errorMessage, isLoading: false });
			toast.error(errorMessage, { title: 'Sign Up Failed' });
			throw err;
		}
	},

	requestOtp: async (email: string) => {
		set({ isLoading: true, error: null });
		try {
			await requestOtpApi(email);
			set({ isLoading: false });
			toast.info('A 6-digit OTP code has been sent to your email.', { title: 'Code Sent' });
		} catch (err: unknown) {
			const errorMessage = err instanceof Error ? err.message : 'Failed to request OTP';
			set({ error: errorMessage, isLoading: false });
			toast.error(errorMessage, { title: 'OTP Request Failed' });
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
			toast.success(`Welcome, ${res.user.name || 'friend'}!`, { title: 'Signed In' });
		} catch (err: unknown) {
			const errorMessage = err instanceof Error ? err.message : 'Failed to verify OTP';
			set({ error: errorMessage, isLoading: false });
			toast.error(errorMessage, { title: 'Verification Failed' });
			throw err;
		}
	},

	logout: (reason?: string) => {
		socketService.disconnect();
		localStorage.removeItem(TOKEN_KEY);
		localStorage.removeItem(USER_KEY);
		set({
			token: null,
			user: null,
			isAuthenticated: false,
			error: reason || null,
		});
	},

	clearError: () => set({ error: null }),
}));

if (typeof window !== 'undefined') {
	window.addEventListener('auth:unauthorized', (event: Event) => {
		const customEvent = event as CustomEvent<{ message?: string }>;
		const reason = customEvent.detail?.message || 'Your session has expired. Please log in again.';
		useAuthStore.getState().logout(reason);
		toast.warning(reason, { title: 'Session Expired' });
	});

	window.addEventListener('auth:refreshed', (event: Event) => {
		const customEvent = event as CustomEvent<{ token: string; user: User }>;
		if (customEvent.detail?.token) {
			useAuthStore.setState({
				token: customEvent.detail.token,
				user: customEvent.detail.user || useAuthStore.getState().user,
				isAuthenticated: true,
				error: null,
			});
		}
	});
}
