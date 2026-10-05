export interface User {
	id: string;
	email: string;
	name: string;
	username: string;
	phone?: string;
	avatarUrl?: string;
}

export interface LoginRequest {
	email: string;
	password: string;
}

export interface SignUpRequest {
	email: string;
	name: string;
	username: string;
	password: string;
	phone?: string;
	avatarUrl?: string;
	code: string;
}

export interface RequestSignupOtpRequest {
	email: string;
	username: string;
}

export interface AuthResponse {
	user: User;
	token: string;
}
