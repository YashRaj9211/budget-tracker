import { useEffect } from 'react';

/**
 * Fires a callback at the next calendar midnight, then every 24h thereafter.
 * Uses setTimeout for precision rather than setInterval drift.
 * The callback receives the new date string 'YYYY-MM-DD'.
 */
export function useMidnightRefresh(onMidnight: () => void) {
	useEffect(() => {
		let timeoutId: ReturnType<typeof setTimeout>;

		function scheduleNext() {
			const now = new Date();
			const tomorrow = new Date(
				now.getFullYear(),
				now.getMonth(),
				now.getDate() + 1, // next day
				0, 0, 0, 0,        // exactly midnight
			);
			const msUntilMidnight = tomorrow.getTime() - now.getTime();

			timeoutId = setTimeout(() => {
				onMidnight();
				scheduleNext(); // reschedule for the following midnight
			}, msUntilMidnight);
		}

		scheduleNext();

		return () => clearTimeout(timeoutId);
	}, [onMidnight]);
}

/** Returns milliseconds until the next midnight (local time). */
export function msUntilMidnight(): number {
	const now = new Date();
	const midnight = new Date(
		now.getFullYear(),
		now.getMonth(),
		now.getDate() + 1,
		0, 0, 0, 0,
	);
	return midnight.getTime() - now.getTime();
}
