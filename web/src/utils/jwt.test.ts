import { describe, it, expect } from 'vitest';
import { isJwtExpired } from './jwt';

describe('isJwtExpired', () => {
	it('returns true for null, undefined, or empty string', () => {
		expect(isJwtExpired(null)).toBe(true);
		expect(isJwtExpired(undefined)).toBe(true);
		expect(isJwtExpired('')).toBe(true);
	});

	it('returns false for mock / non-JWT tokens (does not falsely expire them)', () => {
		expect(isJwtExpired('mock-token')).toBe(false);
		expect(isJwtExpired('simple_auth_token_123')).toBe(false);
	});

	it('returns false for a valid future-expiring JWT', () => {
		const futureExp = Math.floor(Date.now() / 1000) + 3600; // 1 hour in future
		const payload = btoa(JSON.stringify({ userId: 'u1', exp: futureExp }));
		const token = `header.${payload}.signature`;
		expect(isJwtExpired(token)).toBe(false);
	});

	it('returns true for an expired JWT', () => {
		const pastExp = Math.floor(Date.now() / 1000) - 3600; // 1 hour in past
		const payload = btoa(JSON.stringify({ userId: 'u1', exp: pastExp }));
		const token = `header.${payload}.signature`;
		expect(isJwtExpired(token)).toBe(true);
	});
});

import { isBeyondGracePeriod } from './jwt';

describe('isBeyondGracePeriod', () => {
	it('returns false if token expired recently (e.g. 2 days ago, within 30-day grace)', () => {
		const twoDaysAgo = Math.floor(Date.now() / 1000) - 2 * 24 * 3600;
		const payload = btoa(JSON.stringify({ userId: 'u1', exp: twoDaysAgo }));
		const token = `header.${payload}.signature`;
		expect(isBeyondGracePeriod(token, 30)).toBe(false);
	});

	it('returns true if token expired 40 days ago (beyond 30-day grace)', () => {
		const fortyDaysAgo = Math.floor(Date.now() / 1000) - 40 * 24 * 3600;
		const payload = btoa(JSON.stringify({ userId: 'u1', exp: fortyDaysAgo }));
		const token = `header.${payload}.signature`;
		expect(isBeyondGracePeriod(token, 30)).toBe(true);
	});
});
