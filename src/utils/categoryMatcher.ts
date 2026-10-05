import type { ApiCategory } from '../api/financeHubApi';

/**
 * Maps a category name or freeform string to the most suitable ApiCategory ID.
 * Handles exact case-insensitive matches, common Indian/finance aliases, and fallbacks.
 */
export function matchCategoryToApi(
	categoryName: string | undefined | null,
	categories: ApiCategory[]
): string | null {
	if (!categoryName || !categories || categories.length === 0) return null;
	const lower = categoryName.trim().toLowerCase();
	if (!lower) return null;

	// 1. Exact match (case-insensitive)
	const exact = categories.find((c) => c.name.toLowerCase() === lower);
	if (exact) return exact.id;

	// 2. Synonyms and domain aliases
	const aliasMap: Record<string, string[]> = {
		food: ['groceries', 'dining', 'restaurant', 'cafe', 'snack', 'drink', 'dinner', 'lunch', 'breakfast', 'tea', 'coffee'],
		groceries: ['food', 'kirana', 'supermarket', 'rashan', 'veggies', 'vegetables'],
		travel: ['transport', 'transit', 'commute', 'cab', 'auto', 'taxi', 'fuel', 'petrol', 'diesel', 'metro', 'flight', 'train'],
		transport: ['travel', 'transit', 'commute', 'cab', 'auto'],
		utilities: ['bills', 'electricity', 'water', 'recharge', 'wifi', 'broadband', 'gas', 'lpg'],
		bills: ['utilities', 'electricity', 'water', 'recharge'],
		shopping: ['clothing', 'clothes', 'electronics', 'fashion', 'ecommerce'],
		health: ['medical', 'medicine', 'doctor', 'pharmacy', 'hospital', 'clinic'],
		entertainment: ['movies', 'fun', 'games', 'leisure', 'ott', 'netflix'],
		rent: ['housing', 'flat', 'room'],
	};

	// Check if lower matches a known key or any alias
	for (const [canonicalKey, aliases] of Object.entries(aliasMap)) {
		if (lower === canonicalKey || aliases.includes(lower)) {
			// Find if canonicalKey or any alias exists in the categories list
			const match = categories.find((c) => {
				const cLower = c.name.toLowerCase();
				return cLower === canonicalKey || aliases.includes(cLower);
			});
			if (match) return match.id;
		}
	}

	// 3. Fallback to 'Other' if present in categories
	const other = categories.find((c) => c.name.toLowerCase() === 'other');
	return other ? other.id : null;
}
