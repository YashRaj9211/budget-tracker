import axios from 'axios';

// Default to local development server if not set, fallback to Render deployment if specified
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const apiClient = axios.create({
	baseURL: API_BASE_URL,
	headers: {
		'Content-Type': 'application/json',
	},
	timeout: 15000,
});

// Request interceptor: Automatically attach JWT Bearer token
apiClient.interceptors.request.use(
	(config) => {
		const token = localStorage.getItem('auth_token');
		if (token && config.headers) {
			config.headers.Authorization = `Bearer ${token}`;
			config.headers['x-token'] = token;
		}
		return config;
	},
	(error) => Promise.reject(error)
);

// Response interceptor: Extract errors and handle unauthorized responses
apiClient.interceptors.response.use(
	(response) => response,
	(error) => {
		if (error.response) {
			const status = error.response.status;
			const data = error.response.data;

			// Handle expired or invalid session
			if (status === 401 && !error.config?.url?.includes('/login')) {
				localStorage.removeItem('auth_token');
				localStorage.removeItem('auth_user');
				// Dispatch custom event for app-level handling if desired
				window.dispatchEvent(new Event('auth:unauthorized'));
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
