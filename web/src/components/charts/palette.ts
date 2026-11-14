/** Soft, calm colours used by every chart so the app looks consistent. */
export const PALETTE = [
	'#8ecae6', // sky
	'#b8b5ff', // lavender
	'#ffc8dd', // blush
	'#b7e4c7', // mint
	'#ffe5a5', // butter
	'#ffb4a2', // peach
	'#a8dadc', // teal
	'#cdb4db', // lilac
	'#d4e09b', // lime
	'#f6bd60', // honey
];

export const COLORS = {
	income: '#8fd1a8',
	expense: '#f3a6a6',
	savings: '#7c9cd6',
	personal: '#8ecae6',
	shared: '#b8b5ff',
	lent: '#b7e4c7',
	borrowed: '#ffb4a2',
	actual: '#7c9cd6',
	ideal: '#9aa5b1',
	over: '#f08a8a',
	previous: '#d6dae1',
	current: '#8ecae6',
	grid: '#e8eaee',
	axis: '#6b7280',
};

/** Fixed colours for the default categories, so "Food" looks the same on every chart. */
const KNOWN: Record<string, string> = {
	Food: PALETTE[0],
	Travel: PALETTE[1],
	Entertainment: PALETTE[4],
	Utilities: PALETTE[3],
	Other: PALETTE[2],
	Uncategorised: '#d6dae1',
};

/**
 * Colour for a category. Default categories keep a fixed colour; any other name takes the next
 * unused colour by its position in the list, so neighbouring slices never look the same.
 */
export function colorFor(name: string, index = 0): string {
	return KNOWN[name] ?? PALETTE[(index + 5) % PALETTE.length];
}
