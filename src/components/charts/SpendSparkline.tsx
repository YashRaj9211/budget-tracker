import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import type { DayPoint } from '../../utils/analytics';
import { COLORS } from './palette';
import ChartTooltip from './ChartTooltip';

/** Tiny running-total chart for the home page: no axes, just the shape of the month. */
export default function SpendSparkline({ data, lastDay }: { data: DayPoint[]; lastDay: number }) {
	// Only draw up to today (or the end of a past month) so the line does not go flat into the future.
	const shown = data.map((d) => ({ ...d, total: d.day <= lastDay ? d.cumulative : null }));
	return (
		<ResponsiveContainer width="100%" height={96}>
			<AreaChart data={shown} margin={{ top: 6, right: 4, left: 4, bottom: 0 }}>
				<defs>
					<linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stopColor={COLORS.actual} stopOpacity={0.4} />
						<stop offset="100%" stopColor={COLORS.actual} stopOpacity={0.03} />
					</linearGradient>
				</defs>
				<XAxis dataKey="day" tick={{ fontSize: 10, fill: COLORS.axis }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={30} />
				<Tooltip content={<ChartTooltip title={(l) => `Day ${l}`} />} />
				<Area dataKey="total" name="Spent so far" stroke={COLORS.actual} strokeWidth={2} fill="url(#sparkFill)" type="monotone" connectNulls={false} />
			</AreaChart>
		</ResponsiveContainer>
	);
}
