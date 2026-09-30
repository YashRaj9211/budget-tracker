import type { ExpenseSplitInput, SplitType } from '../api/financeHubApi';

/**
 * Turns "who shares this bill and how" into the exact amounts the server expects.
 * Works in paise (integers) so the shares always add up to the total, with no rounding drift.
 */

export interface SplitPerson {
	userId: string;
	/** EXACT: amount in rupees. PERCENTAGE: percent. SHARES: number of shares. EQUAL: ignored. */
	value?: string;
}

export type SplitResult =
	| { ok: true; splits: ExpenseSplitInput[] }
	| { ok: false; error: string };

const toPaise = (rupees: number) => Math.round(rupees * 100);
const fmt = (paise: number) => (paise / 100).toFixed(2);
const inr = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Split `total` between `people`. `payerId` only sets isPaid (the payer's own share is already paid).
 * Returns an error message in plain English when the numbers do not work.
 */
export function computeSplits(total: number, type: SplitType, people: SplitPerson[], payerId: string): SplitResult {
	const totalPaise = toPaise(total);
	if (!(totalPaise > 0)) return { ok: false, error: 'Enter an amount first' };
	if (people.length === 0) return { ok: false, error: 'Choose at least one person' };

	let shares: number[]; // paise per person, same order as `people`
	let percentages: (number | undefined)[] = [];

	if (type === 'EQUAL') {
		shares = distribute(totalPaise, people.map(() => 1));
	} else if (type === 'SHARES') {
		const weights = people.map((p) => Number(p.value ?? 1));
		if (weights.some((w) => !Number.isFinite(w) || w <= 0)) return { ok: false, error: 'Every share must be more than 0' };
		shares = distribute(totalPaise, weights);
	} else if (type === 'PERCENTAGE') {
		const pcts = people.map((p) => Number(p.value));
		if (pcts.some((p) => !Number.isFinite(p) || p <= 0)) return { ok: false, error: 'Enter a percentage for everyone' };
		const sum = Math.round(pcts.reduce((a, b) => a + b, 0) * 100);
		if (sum !== 10000) return { ok: false, error: `Percentages add up to ${sum / 100}%. They must add up to 100%.` };
		shares = distribute(totalPaise, pcts);
		percentages = pcts;
	} else {
		const exact = people.map((p) => toPaise(Number(p.value)));
		if (people.some((p) => !(Number(p.value) > 0))) return { ok: false, error: 'Enter an amount for everyone' };
		const diff = totalPaise - exact.reduce((a, b) => a + b, 0);
		if (diff > 0) return { ok: false, error: `${inr(diff)} still to assign` };
		if (diff < 0) return { ok: false, error: `${inr(-diff)} too much` };
		shares = exact;
	}

	return {
		ok: true,
		splits: people.map((p, i) => ({
			userId: p.userId,
			amount: fmt(shares[i]),
			splitType: type,
			percentage: percentages[i],
			isPaid: p.userId === payerId,
		})),
	};
}

/** Split `totalPaise` in proportion to `weights`; leftover paise go to the largest remainders. */
export function distribute(totalPaise: number, weights: number[]): number[] {
	const sum = weights.reduce((a, b) => a + b, 0);
	const raw = weights.map((w) => (totalPaise * w) / sum);
	const base = raw.map(Math.floor);
	let left = totalPaise - base.reduce((a, b) => a + b, 0);
	const order = raw.map((r, i) => ({ i, frac: r - Math.floor(r) })).sort((a, b) => b.frac - a.frac || a.i - b.i);
	for (let k = 0; left > 0; k = (k + 1) % order.length, left--) base[order[k].i]++;
	return base;
}
