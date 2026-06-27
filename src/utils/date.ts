/**
 * Date utility helpers.
 * All date strings use 'YYYY-MM-DD' format.
 * Month keys use 'YYYY-MM' format.
 */

/** Build a month key from year and 0-indexed month. */
export function toMonthKey(year: number, month: number): string {
	return `${year}-${String(month + 1).padStart(2, '0')}`;
}

/** Parse a month key back to { year, month (0-indexed) }. */
export function parseMonthKey(key: string): { year: number; month: number } {
	const [y, m] = key.split('-');
	return { year: Number(y), month: Number(m) - 1 };
}

/** Format 'YYYY-MM-DD' → '27 Jun 2026'. */
export function formatDisplayDate(dateStr: string): string {
	const d = new Date(dateStr + 'T00:00:00');
	return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Get short day name from 'YYYY-MM-DD' → 'Sat'. */
export function getDayName(dateStr: string): string {
	const d = new Date(dateStr + 'T00:00:00');
	return d.toLocaleDateString('en-US', { weekday: 'short' });
}

/** Get the day-of-month number from 'YYYY-MM-DD'. */
export function getDayNum(dateStr: string): number {
	return new Date(dateStr + 'T00:00:00').getDate();
}

/** Days in a given month (0-indexed month). */
export function getDaysInMonth(year: number, month: number): number {
	return new Date(year, month + 1, 0).getDate();
}

/** Days remaining in the month (including today). */
export function getDaysRemainingInMonth(year: number, month: number): number {
	const today = new Date();
	const total = getDaysInMonth(year, month);

	// If not the current month, return total days
	if (today.getFullYear() !== year || today.getMonth() !== month) {
		return total;
	}

	return total - today.getDate() + 1;
}

/** Get today's date string in 'YYYY-MM-DD'. */
export function todayStr(): string {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
