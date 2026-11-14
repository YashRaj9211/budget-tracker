import type { VoiceTransaction } from '../api/voiceApi';
import { suggestCategoryFromText } from './indianCategoryIcons';

/**
 * Instant, offline parser. Used for the live preview while the user speaks,
 * and as a fallback if the LLM call fails or the user is offline.
 * "20rs for snacks 400 for dinner 10rs travel" -> 3 transactions.
 */

// Words that carry no meaning for the description
const FILLER = new Set([
	'add', 'added', 'transaction', 'transactions', 'expense', 'expenses', 'of', 'for', 'rs', 'rs.', 'rupees',
	'rupee', 'rupaye', 'rupay', 'inr', 'and', 'aur', 'then', 'plus', 'also', 'spent', 'spend', 'on', 'paid',
	'pay', 'kharch', 'kiye', 'kiya', 'ka', 'ki', 'ke', 'pe', 'par', 'the', 'a', 'an', 'to', 'mein', 'me', 'i',
	'have', 'has', 'with', 'via', 'using', 'it', 'is', 'was', 'bucks', 'today', 'aaj',
]);

const INCOME_WORDS = /\b(salary|income|received|got|credited|refund|cashback|aaya|aayi|mila|mili)\b/i;

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function matchFrom(list: string[], value: string | undefined, fallback: string): string {
	if (!value) return fallback;
	const found = list.find((x) => x.toLowerCase() === value.toLowerCase());
	return found ?? fallback;
}

export function parseVoiceLocally(
	text: string,
	categories: string[],
	accounts: string[],
	today: string
): VoiceTransaction[] {
	// Normalise: "₹1,200" -> "1200", "20rs" -> "20 rs"
	const clean = text
		.replace(/₹\s*/g, ' ')
		.replace(/(\d),(\d)/g, '$1$2')
		.replace(/(\d)(rs|rupees?|rupaye|\/-)/gi, '$1 $2')
		.toLowerCase();

	const tokens = clean.split(/[\s,;]+/).filter(Boolean);
	const isNum = (t: string) => /^\d+(\.\d+)?$/.test(t);
	if (!tokens.some(isNum)) return [];

	// If the first meaningful word is a number, descriptions come AFTER amounts ("20 snacks"),
	// otherwise they come BEFORE ("snacks 20").
	const firstMeaningful = tokens.find((t) => !FILLER.has(t));
	const amountFirst = firstMeaningful ? isNum(firstMeaningful) : true;

	const groups: { amount: number; words: string[] }[] = [];
	let pending: string[] = [];
	for (const t of tokens) {
		if (isNum(t)) {
			if (amountFirst) {
				groups.push({ amount: parseFloat(t), words: [] });
			} else {
				groups.push({ amount: parseFloat(t), words: pending });
				pending = [];
			}
		} else if (!FILLER.has(t) && !t.startsWith('/')) {
			if (amountFirst && groups.length) groups[groups.length - 1].words.push(t);
			else pending.push(t);
		}
	}
	// Leftover words after the last amount (desc-first style) belong to the last item
	if (!amountFirst && pending.length && groups.length && groups[groups.length - 1].words.length === 0) {
		groups[groups.length - 1].words = pending;
	}

	const fallbackCat = categories.includes('Other') ? 'Other' : categories[0] ?? 'Other';
	const defaultAccount = accounts.includes('Cash') ? 'Cash' : accounts[0] ?? 'Cash';

	return groups
		.filter((g) => g.amount > 0)
		.map((g) => {
			// Account words like "gpay", "card" are removed from the description
			const accountWord = g.words.find((w) => accounts.some((a) => a.toLowerCase() === w));
			const words = g.words.filter((w) => w !== accountWord);
			const desc = words.join(' ').replace(/[.,!?;:]+$/, '').trim();
			let category = suggestCategoryFromText(desc) ?? fallbackCat;
			if (category === 'Travel' && !categories.includes('Travel') && categories.includes('Transport'))
				category = 'Transport';
			return {
				type: INCOME_WORDS.test(desc) ? 'income' : 'expense',
				amount: g.amount,
				description: desc ? capitalize(desc) : category,
				category: matchFrom(categories, category, fallbackCat),
				account: matchFrom(accounts, accountWord, defaultAccount),
				date: today,
			} as VoiceTransaction;
		});
}
