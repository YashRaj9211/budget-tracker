import {
	Area,
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	ComposedChart,
	Legend,
	Line,
	Pie,
	PieChart,
	ReferenceLine,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';
import type { BurnPoint, CategoryCompare, DayPoint, MonthPoint, WeekdayPoint } from '../../utils/analytics';
import { COLORS, PALETTE, colorFor } from './palette';
import { inr, inrCompact } from './format';
import ChartTooltip from './ChartTooltip';

const axisProps = {
	tick: { fontSize: 11, fill: COLORS.axis },
	tickLine: false,
	axisLine: false,
} as const;

const legendStyle = { fontSize: 11 } as const;

// ── Income vs expense per month + savings line ──

export function MonthlyTrendChart({ data }: { data: MonthPoint[] }) {
	return (
		<ResponsiveContainer width="100%" height={240}>
			<ComposedChart data={data} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
				<CartesianGrid stroke={COLORS.grid} vertical={false} />
				<XAxis dataKey="label" {...axisProps} />
				<YAxis {...axisProps} tickFormatter={inrCompact} />
				<Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
				<Legend wrapperStyle={legendStyle} iconType="circle" />
				<Bar dataKey="income" name="Income" fill={COLORS.income} radius={[4, 4, 0, 0]} maxBarSize={22} />
				<Bar dataKey="expense" name="Expenses" fill={COLORS.expense} radius={[4, 4, 0, 0]} maxBarSize={22} />
				<Line dataKey="savings" name="Savings" stroke={COLORS.savings} strokeWidth={2} dot={{ r: 3 }} type="monotone" />
			</ComposedChart>
		</ResponsiveContainer>
	);
}

// ── Donut with a legend list (works for local categories and server categories) ──

export interface SliceItem {
	name: string;
	amount: number;
	color?: string;
}

export function CategoryDonut({ data, centerLabel = 'Total' }: { data: SliceItem[]; centerLabel?: string }) {
	const total = data.reduce((s, d) => s + d.amount, 0);
	// Keep the chart readable: top 6 + "Others"
	const top = data.slice(0, 6);
	const rest = data.slice(6).reduce((s, d) => s + d.amount, 0);
	const slices = rest > 0 ? [...top, { name: 'Others', amount: rest }] : top;
	const colorOf = (d: SliceItem, i: number) => d.color || (d.name === 'Others' ? '#d6dae1' : colorFor(d.name, i));

	return (
		<div>
			<div className="relative">
				<ResponsiveContainer width="100%" height={200}>
					<PieChart>
						<Pie data={slices} dataKey="amount" nameKey="name" innerRadius={58} outerRadius={86} paddingAngle={2} stroke="#fff" strokeWidth={2}>
							{slices.map((d, i) => (
								<Cell key={d.name} fill={colorOf(d, i)} />
							))}
						</Pie>
						<Tooltip content={<ChartTooltip />} />
					</PieChart>
				</ResponsiveContainer>
				<div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
					<span className="text-[10px] uppercase font-bold text-gray-500">{centerLabel}</span>
					<span className="text-lg font-black text-black">{inrCompact(total)}</span>
				</div>
			</div>
			<ul className="mt-2 space-y-1.5">
				{slices.map((d, i) => (
					<li key={d.name} className="flex items-center gap-2 text-xs">
						<span className="w-3 h-3 border border-black/30 shrink-0" style={{ background: colorOf(d, i) }} />
						<span className="font-bold text-black truncate">{d.name}</span>
						<span className="ml-auto text-gray-700">{inr(d.amount)}</span>
						<span className="w-10 text-right font-bold text-black">{total > 0 ? Math.round((d.amount / total) * 100) : 0}%</span>
					</li>
				))}
			</ul>
		</div>
	);
}

// ── Daily spending bars + running total ──

export function DailySpendChart({ data, budgetLimit }: { data: DayPoint[]; budgetLimit?: number }) {
	return (
		<ResponsiveContainer width="100%" height={230}>
			<ComposedChart data={data} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
				<CartesianGrid stroke={COLORS.grid} vertical={false} />
				<XAxis dataKey="day" {...axisProps} interval="preserveStartEnd" minTickGap={14} />
				<YAxis yAxisId="day" {...axisProps} tickFormatter={inrCompact} />
				<YAxis yAxisId="total" orientation="right" {...axisProps} tickFormatter={inrCompact} />
				<Tooltip content={<ChartTooltip title={(l) => `Day ${l}`} />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
				<Legend wrapperStyle={legendStyle} iconType="circle" />
				<Bar yAxisId="day" dataKey="spent" name="Spent that day" fill={COLORS.expense} radius={[3, 3, 0, 0]} maxBarSize={14} />
				<Line yAxisId="total" dataKey="cumulative" name="Running total" stroke={COLORS.savings} strokeWidth={2} dot={false} type="monotone" />
				{budgetLimit ? (
					<ReferenceLine yAxisId="total" y={budgetLimit} stroke={COLORS.over} strokeDasharray="4 4" label={{ value: 'Budget', fontSize: 10, fill: COLORS.over, position: 'insideTopRight' }} />
				) : null}
			</ComposedChart>
		</ResponsiveContainer>
	);
}

// ── Which weekday costs the most ──

export function WeekdayChart({ data }: { data: WeekdayPoint[] }) {
	const max = Math.max(...data.map((d) => d.average), 0);
	return (
		<ResponsiveContainer width="100%" height={190}>
			<BarChart data={data} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
				<CartesianGrid stroke={COLORS.grid} vertical={false} />
				<XAxis dataKey="day" {...axisProps} />
				<YAxis {...axisProps} tickFormatter={inrCompact} />
				<Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
				<Bar dataKey="average" name="Average per day" radius={[4, 4, 0, 0]} maxBarSize={30}>
					{data.map((d) => (
						<Cell key={d.day} fill={d.average === max && max > 0 ? COLORS.expense : COLORS.current} />
					))}
				</Bar>
			</BarChart>
		</ResponsiveContainer>
	);
}

// ── This month vs last month by category ──

export function CategoryCompareChart({ data, currentLabel, previousLabel }: { data: CategoryCompare[]; currentLabel: string; previousLabel: string }) {
	const rows = data.slice(0, 6);
	return (
		<ResponsiveContainer width="100%" height={Math.max(180, rows.length * 52)}>
			<BarChart data={rows} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 0 }} barGap={2}>
				<CartesianGrid stroke={COLORS.grid} horizontal={false} />
				<XAxis type="number" {...axisProps} tickFormatter={inrCompact} />
				<YAxis type="category" dataKey="name" width={92} {...axisProps} />
				<Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
				<Legend wrapperStyle={legendStyle} iconType="circle" />
				<Bar dataKey="previous" name={previousLabel} fill={COLORS.previous} radius={[0, 4, 4, 0]} maxBarSize={14} />
				<Bar dataKey="current" name={currentLabel} fill={COLORS.current} radius={[0, 4, 4, 0]} maxBarSize={14} />
			</BarChart>
		</ResponsiveContainer>
	);
}

// ── Budget burn-down: your spending vs an even pace ──

export function BudgetBurnChart({ data, limit }: { data: BurnPoint[]; limit: number }) {
	return (
		<ResponsiveContainer width="100%" height={240}>
			<ComposedChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
				<defs>
					<linearGradient id="burnFill" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stopColor={COLORS.actual} stopOpacity={0.35} />
						<stop offset="100%" stopColor={COLORS.actual} stopOpacity={0.03} />
					</linearGradient>
				</defs>
				<CartesianGrid stroke={COLORS.grid} vertical={false} />
				<XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={24} />
				<YAxis {...axisProps} tickFormatter={inrCompact} domain={[0, (max: number) => Math.max(max, limit) * 1.05]} />
				<Tooltip content={<ChartTooltip />} />
				<Legend wrapperStyle={legendStyle} iconType="circle" />
				<ReferenceLine y={limit} stroke={COLORS.over} strokeDasharray="4 4" label={{ value: 'Limit', fontSize: 10, fill: COLORS.over, position: 'insideTopLeft' }} />
				<Line dataKey="ideal" name="Even pace" stroke={COLORS.ideal} strokeWidth={2} strokeDasharray="5 4" dot={false} type="linear" />
				<Area dataKey="actual" name="You spent" stroke={COLORS.actual} strokeWidth={2.5} fill="url(#burnFill)" connectNulls={false} type="monotone" />
			</ComposedChart>
		</ResponsiveContainer>
	);
}

// ── Income and expense per account ──

export function AccountChart({ data }: { data: { name: string; income: number; expense: number }[] }) {
	return (
		<ResponsiveContainer width="100%" height={Math.max(160, data.length * 56)}>
			<BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 0 }} barGap={2}>
				<CartesianGrid stroke={COLORS.grid} horizontal={false} />
				<XAxis type="number" {...axisProps} tickFormatter={inrCompact} />
				<YAxis type="category" dataKey="name" width={64} {...axisProps} />
				<Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
				<Legend wrapperStyle={legendStyle} iconType="circle" />
				<Bar dataKey="income" name="In" fill={COLORS.income} radius={[0, 4, 4, 0]} maxBarSize={14} />
				<Bar dataKey="expense" name="Out" fill={COLORS.expense} radius={[0, 4, 4, 0]} maxBarSize={14} />
			</BarChart>
		</ResponsiveContainer>
	);
}

export { PALETTE };
