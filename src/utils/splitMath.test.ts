import { describe, it, expect } from 'vitest';
import { computeSplits, distribute } from './splitMath';

const ppl = (...v: (string | undefined)[]) => v.map((value, i) => ({ userId: `u${i + 1}`, value }));
const total = (r: ReturnType<typeof computeSplits>) => (r.ok ? r.splits.reduce((s, x) => s + Math.round(Number(x.amount) * 100), 0) : NaN);

describe('distribute', () => {
	it('never loses a paisa', () => {
		expect(distribute(10000, [1, 1, 1])).toEqual([3334, 3333, 3333]);
		expect(distribute(1, [1, 1, 1]).reduce((a, b) => a + b)).toBe(1);
	});
});

describe('computeSplits', () => {
	it('equal split adds up exactly', () => {
		const r = computeSplits(100, 'EQUAL', ppl(undefined, undefined, undefined), 'u1');
		expect(total(r)).toBe(10000);
		expect(r.ok && r.splits.map((s) => s.amount)).toEqual(['33.34', '33.33', '33.33']);
	});

	it('marks the payer as already paid', () => {
		const r = computeSplits(50, 'EQUAL', ppl(undefined, undefined), 'u2');
		expect(r.ok && r.splits.map((s) => s.isPaid)).toEqual([false, true]);
	});

	it('shares are proportional', () => {
		const r = computeSplits(90, 'SHARES', ppl('1', '2'), 'u1');
		expect(r.ok && r.splits.map((s) => s.amount)).toEqual(['30.00', '60.00']);
	});

	it('percentages must add up to 100', () => {
		const bad = computeSplits(200, 'PERCENTAGE', ppl('60', '30'), 'u1');
		expect(bad).toEqual({ ok: false, error: 'Percentages add up to 90%. They must add up to 100%.' });
		const good = computeSplits(200, 'PERCENTAGE', ppl('60', '40'), 'u1');
		expect(good.ok && good.splits.map((s) => s.amount)).toEqual(['120.00', '80.00']);
		expect(good.ok && good.splits[0].percentage).toBe(60);
	});

	it('exact amounts must match the total', () => {
		expect(computeSplits(100, 'EXACT', ppl('60', '30'), 'u1')).toEqual({ ok: false, error: '₹10.00 still to assign' });
		expect(computeSplits(100, 'EXACT', ppl('60', '50'), 'u1')).toEqual({ ok: false, error: '₹10.00 too much' });
		expect(total(computeSplits(100, 'EXACT', ppl('60', '40'), 'u1'))).toBe(10000);
	});

	it('explains missing input', () => {
		expect(computeSplits(0, 'EQUAL', ppl(undefined), 'u1')).toEqual({ ok: false, error: 'Enter an amount first' });
		expect(computeSplits(10, 'EQUAL', [], 'u1')).toEqual({ ok: false, error: 'Choose at least one person' });
		expect(computeSplits(10, 'EXACT', ppl('5', ''), 'u1').ok).toBe(false);
	});
});
