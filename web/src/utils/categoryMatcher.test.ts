import { describe, it, expect } from 'vitest';
import { matchCategoryToApi } from './categoryMatcher';
import type { ApiCategory } from '../api/financeHubApi';

describe('matchCategoryToApi', () => {
	const sampleCategories: ApiCategory[] = [
		{ id: 'cat-1', name: 'Food' },
		{ id: 'cat-2', name: 'Travel' },
		{ id: 'cat-3', name: 'Entertainment' },
		{ id: 'cat-4', name: 'Utilities' },
		{ id: 'cat-5', name: 'Other' },
	];

	it('matches exact name case-insensitively', () => {
		expect(matchCategoryToApi('Food', sampleCategories)).toBe('cat-1');
		expect(matchCategoryToApi('food', sampleCategories)).toBe('cat-1');
		expect(matchCategoryToApi('TRAVEL', sampleCategories)).toBe('cat-2');
	});

	it('maps aliases like Groceries to Food when Groceries is not a distinct category', () => {
		expect(matchCategoryToApi('Groceries', sampleCategories)).toBe('cat-1');
		expect(matchCategoryToApi('Dining', sampleCategories)).toBe('cat-1');
	});

	it('maps Bills to Utilities', () => {
		expect(matchCategoryToApi('Bills', sampleCategories)).toBe('cat-4');
		expect(matchCategoryToApi('Electricity', sampleCategories)).toBe('cat-4');
	});

	it('maps Transport or Cab to Travel', () => {
		expect(matchCategoryToApi('Transport', sampleCategories)).toBe('cat-2');
		expect(matchCategoryToApi('Cab', sampleCategories)).toBe('cat-2');
	});

	it('falls back to Other if unknown category', () => {
		expect(matchCategoryToApi('Unicorn', sampleCategories)).toBe('cat-5');
	});

	it('returns null for empty string or empty categories', () => {
		expect(matchCategoryToApi('', sampleCategories)).toBeNull();
		expect(matchCategoryToApi('Food', [])).toBeNull();
	});
});
