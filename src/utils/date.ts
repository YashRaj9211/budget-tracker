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

/** Check whether a date string falls within [startDate, endDate] inclusive. */
export function isDateInRange(date: string, startDate: string, endDate: string): boolean {
	return date >= startDate && date <= endDate;
}

/** Total number of days in a date range [startDate, endDate] inclusive. */
export function getTotalDays(startDate: string, endDate: string): number {
	const start = new Date(startDate + 'T00:00:00');
	const end = new Date(endDate + 'T00:00:00');
	const diff = end.getTime() - start.getTime();
	return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)) + 1);
}

/** Days remaining from today to endDate inclusive (clamped to 0). */
export function getDaysRemaining(endDate: string): number {
	const today = todayStr();
	if (today > endDate) return 0;
	const start = new Date(today + 'T00:00:00');
	const end = new Date(endDate + 'T00:00:00');
	return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}
