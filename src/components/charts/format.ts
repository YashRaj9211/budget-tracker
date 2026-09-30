/** ₹1,23,456 */
export function inr(value: number): string {
	return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

/** Short money for chart axes: 1.2k, 3.4L, 1.1Cr */
export function inrCompact(value: number): string {
	const abs = Math.abs(value);
	const sign = value < 0 ? '-' : '';
	const trim = (n: number) => String(Math.round(n * 10) / 10);
	if (abs >= 1e7) return `${sign}₹${trim(abs / 1e7)}Cr`;
	if (abs >= 1e5) return `${sign}₹${trim(abs / 1e5)}L`;
	if (abs >= 1e3) return `${sign}₹${trim(abs / 1e3)}k`;
	return `${sign}₹${Math.round(abs)}`;
}
