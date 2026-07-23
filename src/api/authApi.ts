import type { LoginRequest, SignUpRequest, AuthResponse, User } from '../types/auth';

const BASE_URL = 'https://divvit.onrender.com/api/_public/v1/users';

export async function loginApi(credentials: LoginRequest): Promise<AuthResponse> {
	const res = await fetch(`${BASE_URL}/login`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(credentials),
	});

	const data = await res.json();

	if (!res.ok) {
		throw new Error(data.error || data.message || 'Login failed. Please check your credentials.');
	}

	return data as AuthResponse;
}

export async function signUpApi(userData: SignUpRequest): Promise<{ user: User } | AuthResponse> {
	const res = await fetch(`${BASE_URL}/signup`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(userData),
	});

	const data = await res.json();

	if (!res.ok) {
		throw new Error(data.error || data.message || 'Sign up failed. Please try again.');
	}

	return data;
}
