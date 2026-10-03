import axios, { type InternalAxiosRequestConfig } from 'axios';
import { isBeyondGracePeriod } from '../utils/jwt';

// Default to local development server if not set, fallback to Render deployment if specified
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const apiClient = axios.create({
	baseURL: API_BASE_URL,
	headers: {
		'Content-Type': 'application/json',
	},
	timeout: 15000,
});

let isRefreshing = false;
let failedQueue: Array<{
	resolve: (token: string) => void;
	reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
	failedQueue.forEach((prom) => {
		if (error) {
			prom.reject(error);
		} else if (token) {
			prom.resolve(token);
		}
	});
	failedQueue = [];
};

interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
	_retry?: boolean;
}

// Request interceptor: Automatically attach JWT Bearer token
apiClient.interceptors.request.use(
	(config) => {
		const token = localStorage.getItem('auth_token');
		if (token) {
			if (isBeyondGracePeriod(token)) {
				localStorage.removeItem('auth_token');
				localStorage.removeItem('auth_user');
				if (typeof window !== 'undefined') {
					window.dispatchEvent(
						new CustomEvent('auth:unauthorized', {
							detail: { message: 'Your session has expired. Please log in again.' },
						})
					);
				}
				return Promise.reject(new Error('Session expired beyond grace period'));
			}

			if (config.headers) {
				config.headers.Authorization = `Bearer ${token}`;
				config.headers['x-token'] = token;
			}
		}
		return config;
	},
	(error) => Promise.reject(error)
);

// Response interceptor: Extract errors and handle unauthorized responses with silent token refresh
apiClient.interceptors.response.use(
	(response) => response,
	async (error) => {
		const originalRequest = error.config as CustomAxiosRequestConfig | undefined;

		if (error.response) {
			const status = error.response.status;
			const data = error.response.data;

			const isAuthPath =
				originalRequest?.url?.includes('/users/login') ||
				originalRequest?.url?.includes('/users/signup') ||
				originalRequest?.url?.includes('/users/request-otp') ||
				originalRequest?.url?.includes('/users/verify-otp') ||
				originalRequest?.url?.includes('/users/refresh');

			// If 401 on an authenticated endpoint and we haven't retried yet, attempt refresh
			if (status === 401 && !isAuthPath && originalRequest && !originalRequest._retry) {
				originalRequest._retry = true;
				const currentToken = localStorage.getItem('auth_token');

				if (currentToken) {
					if (isRefreshing) {
						return new Promise<string>((resolve, reject) => {
							failedQueue.push({ resolve, reject });
						})
							.then((token) => {
								if (originalRequest.headers) {
									originalRequest.headers.Authorization = `Bearer ${token}`;
									originalRequest.headers['x-token'] = token;
								}
								return apiClient(originalRequest);
							})
							.catch((err) => Promise.reject(err));
					}

					isRefreshing = true;

					try {
						// Use raw axios instance to prevent interceptor loops
						const refreshRes = await axios.post<{
							token: string;
							user: unknown;
						}>(
							`${API_BASE_URL}/api/_public/v1/users/refresh`,
							{ token: currentToken },
							{ headers: { 'Content-Type': 'application/json' }, timeout: 10000 }
						);

						const { token: newToken, user: newUser } = refreshRes.data;
						localStorage.setItem('auth_token', newToken);
						if (newUser) {
							localStorage.setItem('auth_user', JSON.stringify(newUser));
						}

						if (typeof window !== 'undefined') {
							window.dispatchEvent(
								new CustomEvent('auth:refreshed', {
									detail: { token: newToken, user: newUser },
								})
							);
						}

						processQueue(null, newToken);

						if (originalRequest.headers) {
							originalRequest.headers.Authorization = `Bearer ${newToken}`;
							originalRequest.headers['x-token'] = newToken;
						}
						return apiClient(originalRequest);
					} catch (refreshErr) {
						processQueue(refreshErr, null);
						localStorage.removeItem('auth_token');
						localStorage.removeItem('auth_user');
						if (typeof window !== 'undefined') {
							window.dispatchEvent(
								new CustomEvent('auth:unauthorized', {
									detail: { message: 'Your session has expired. Please log in again.' },
								})
							);
						}
						return Promise.reject(refreshErr);
					} finally {
						isRefreshing = false;
					}
				} else {
					if (typeof window !== 'undefined') {
						window.dispatchEvent(
							new CustomEvent('auth:unauthorized', {
								detail: { message: 'Please log in to continue.' },
							})
						);
					}
				}
			}

			const errorMessage = data?.error || data?.message || `Request failed with status ${status}`;
			return Promise.reject(new Error(errorMessage));
		} else if (error.request) {
			return Promise.reject(new Error('Cannot reach the server. Please check your backend connection.'));
		}
		return Promise.reject(error);
	}
);

export default apiClient;
