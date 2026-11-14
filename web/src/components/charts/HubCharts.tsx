import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { COLORS } from './palette';
import { inrCompact } from './format';
import ChartTooltip from './ChartTooltip';

const axisProps = {
	tick: { fontSize: 11, fill: COLORS.axis },
	tickLine: false,
	axisLine: false,
} as const;
const legendStyle = { fontSize: 11 } as const;

export interface ServerMonth {
	month: string;
	label: string;
	personal: number;
	shared: number;
	lent: number;
	income: number;
	spent: number;
}

/** My spending per month, split into "paid for myself" and "my share of split bills". */
export function ServerTrendChart({ data }: { data: ServerMonth[] }) {
	return (
		<ResponsiveContainer width="100%" height={240}>
			<ComposedChart data={data} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
				<CartesianGrid stroke={COLORS.grid} vertical={false} />
				<XAxis dataKey="label" {...axisProps} />
				<YAxis {...axisProps} tickFormatter={inrCompact} />
				<Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
				<Legend wrapperStyle={legendStyle} iconType="circle" />
				<Bar dataKey="personal" name="Personal" stackId="spend" fill={COLORS.personal} maxBarSize={28} />
				<Bar dataKey="shared" name="My share of splits" stackId="spend" fill={COLORS.shared} radius={[4, 4, 0, 0]} maxBarSize={28} />
				<Line dataKey="lent" name="Paid for others" stroke={COLORS.lent} strokeWidth={2} dot={{ r: 3 }} type="monotone" />
			</ComposedChart>
		</ResponsiveContainer>
	);
}

/** Horizontal bars: my share vs group total, one row per group. */
export function GroupSpendChart({ data }: { data: { name: string; amount: number; total: number }[] }) {
	const rows = data.slice(0, 6);
	return (
		<ResponsiveContainer width="100%" height={Math.max(150, rows.length * 56)}>
			<BarChart data={rows} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 0 }} barGap={2}>
				<CartesianGrid stroke={COLORS.grid} horizontal={false} />
				<XAxis type="number" {...axisProps} tickFormatter={inrCompact} />
				<YAxis type="category" dataKey="name" width={92} {...axisProps} />
				<Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
				<Legend wrapperStyle={legendStyle} iconType="circle" />
				<Bar dataKey="total" name="Group total" fill={COLORS.previous} radius={[0, 4, 4, 0]} maxBarSize={14} />
				<Bar dataKey="amount" name="My share" fill={COLORS.shared} radius={[0, 4, 4, 0]} maxBarSize={14} />
			</BarChart>
		</ResponsiveContainer>
	);
}

/** Diverging bars: green to the right = they owe you, red to the left = you owe them. */
export function FriendBalanceChart({ data }: { data: { name: string; balance: number }[] }) {
	const rows = data.slice(0, 8);
	return (
		<ResponsiveContainer width="100%" height={Math.max(150, rows.length * 38)}>
			<BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }} stackOffset="sign">
				<CartesianGrid stroke={COLORS.grid} horizontal={false} />
				<XAxis type="number" {...axisProps} tickFormatter={inrCompact} />
				<YAxis type="category" dataKey="name" width={70} {...axisProps} />
				<Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
				<ReferenceLine x={0} stroke="#000" strokeWidth={1} />
				<Bar dataKey="balance" name="Balance" radius={4} maxBarSize={18}>
					{rows.map((r) => (
						<Cell key={r.name} fill={r.balance >= 0 ? COLORS.income : COLORS.expense} />
					))}
				</Bar>
			</BarChart>
		</ResponsiveContainer>
	);
}

/** Daily stacked bars for the last 7 / 30 days. */
export function DailyTimelineChart({ data }: { data: { date: string; day: string; personal: number; borrowed: number }[] }) {
	return (
		<ResponsiveContainer width="100%" height={210}>
			<BarChart data={data} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
				<CartesianGrid stroke={COLORS.grid} vertical={false} />
				<XAxis dataKey="date" {...axisProps} tickFormatter={(d: string) => d.slice(8)} interval="preserveStartEnd" minTickGap={12} />
				<YAxis {...axisProps} tickFormatter={inrCompact} />
				<Tooltip content={<ChartTooltip title={(l) => String(l)} />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
				<Legend wrapperStyle={legendStyle} iconType="circle" />
				<Bar dataKey="personal" name="Personal" stackId="d" fill={COLORS.personal} maxBarSize={16} />
				<Bar dataKey="borrowed" name="Split / borrowed" stackId="d" fill={COLORS.borrowed} radius={[3, 3, 0, 0]} maxBarSize={16} />
			</BarChart>
		</ResponsiveContainer>
	);
}
