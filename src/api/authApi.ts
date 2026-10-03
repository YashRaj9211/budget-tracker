import apiClient from './client';
import type { LoginRequest, SignUpRequest, AuthResponse, User } from '../types/auth';

/**
 * Authenticates a user with email and password.
 * Returns the user profile and signed JWT token.
 */
export async function loginApi(credentials: LoginRequest): Promise<AuthResponse> {
	const response = await apiClient.post<AuthResponse>('/api/_public/v1/users/login', credentials);
	return response.data;
}

/**
 * Registers a new user account.
 */
export async function signUpApi(userData: SignUpRequest): Promise<User> {
	const response = await apiClient.post<User>('/api/_public/v1/users/signup', userData);
	return response.data;
}

export async function requestOtpApi(email: string): Promise<{message: string}> {
	const response = await apiClient.post<{message: string}>('/api/_public/v1/users/request-otp', { email });
	return response.data;
}

export async function verifyOtpApi(email: string, code: string): Promise<AuthResponse> {
	const response = await apiClient.post<AuthResponse>('/api/_public/v1/users/verify-otp', { email, code });
	return response.data;
}

export async function refreshTokenApi(token: string): Promise<AuthResponse> {
	const response = await apiClient.post<AuthResponse>('/api/_public/v1/users/refresh', { token });
	return response.data;
}

