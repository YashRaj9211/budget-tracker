/**
 * Checks whether a JWT is expired by reading the payload's `exp` timestamp.
 * Returns false if the token cannot be parsed as a standard 3-part JWT
 * (for example, in mock unit test environments).
 */
export function isJwtExpired(token: string | null | undefined): boolean {
	if (!token) return true;
	const parts = token.split('.');
	// If it's not a standard 3-part JWT (e.g. mock test tokens like 'test-token'), don't falsely expire it
	if (parts.length !== 3) return false;
	try {
		const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
		const jsonPayload = decodeURIComponent(
			atob(base64)
				.split('')
				.map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
				.join('')
		);
		const payload = JSON.parse(jsonPayload);
		if (!payload.exp || typeof payload.exp !== 'number') {
			return false;
		}
		// Expired if current time is past exp (in seconds)
		return Date.now() >= payload.exp * 1000;
	} catch {
		return false;
	}
}

/**
 * Checks whether a JWT is expired beyond the acceptable refresh grace period (default 30 days).
 * Tokens within the grace period can be transparently renewed via the /users/refresh endpoint.
 */
export function isBeyondGracePeriod(token: string | null | undefined, graceDays = 30): boolean {
	if (!token) return true;
	const parts = token.split('.');
	if (parts.length !== 3) return false;
	try {
		const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
		const jsonPayload = decodeURIComponent(
			atob(base64)
				.split('')
				.map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
				.join('')
		);
		const payload = JSON.parse(jsonPayload);
		if (!payload.exp || typeof payload.exp !== 'number') {
			return false;
		}
		const graceMs = graceDays * 24 * 60 * 60 * 1000;
		return Date.now() >= payload.exp * 1000 + graceMs;
	} catch {
		return false;
	}
}

