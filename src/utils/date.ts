import {
	format,
	getDaysInMonth as dfGetDaysInMonth,
	getDate,
	differenceInDays,
	isWithinInterval,
	parseISO,
} from 'date-fns';

/**
 * Date utility helpers using date-fns.
 * All date strings use 'YYYY-MM-DD' format.
 * Month keys use 'YYYY-MM' format.
 */

/** Build a month key from year and 0-indexed month. */
export function toMonthKey(year: number, month: number): string {
	return format(new Date(year, month), 'yyyy-MM');
}

/** Parse a month key back to { year, month (0-indexed) }. */
export function parseMonthKey(key: string): { year: number; month: number } {
	const [y, m] = key.split('-');
	return { year: Number(y), month: Number(m) - 1 };
}

/** Format 'YYYY-MM-DD' → '27 Jun 2026'. */
export function formatDisplayDate(dateStr: string): string {
	return format(parseISO(dateStr), 'dd MMM yyyy');
}

/** Get short day name from 'YYYY-MM-DD' → 'Sat'. */
export function getDayName(dateStr: string): string {
	return format(parseISO(dateStr), 'EEE');
}

/** Get the day-of-month number from 'YYYY-MM-DD'. */
export function getDayNum(dateStr: string): number {
	return getDate(parseISO(dateStr));
}

/** Days in a given month (0-indexed month). */
export function getDaysInMonth(year: number, month: number): number {
	return dfGetDaysInMonth(new Date(year, month));
}

/** Days remaining in the month (including today). */
export function getDaysRemainingInMonth(year: number, month: number): number {
	const today = new Date();
	const total = dfGetDaysInMonth(new Date(year, month));

	// If not the current month, return total days
	if (today.getFullYear() !== year || today.getMonth() !== month) {
		return total;
	}

	return total - today.getDate() + 1;
}

/** Get today's date string in 'YYYY-MM-DD'. */
export function todayStr(): string {
	return format(new Date(), 'yyyy-MM-dd');
}

/** Check whether a date string falls within [startDate, endDate] inclusive. */
export function isDateInRange(date: string, startDate: string, endDate: string): boolean {
	return isWithinInterval(parseISO(date), {
		start: parseISO(startDate),
		end: parseISO(endDate),
	});
}

/** Total number of days in a date range [startDate, endDate] inclusive. */
export function getTotalDays(startDate: string, endDate: string): number {
	return Math.max(1, differenceInDays(parseISO(endDate), parseISO(startDate)) + 1);
}

/** Days remaining from today to endDate inclusive (clamped to 0). */
export function getDaysRemaining(endDate: string): number {
	const today = todayStr();
	if (today > endDate) return 0;
	return differenceInDays(parseISO(endDate), parseISO(today)) + 1;
}
