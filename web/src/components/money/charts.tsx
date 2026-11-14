import { Area, Bar, CartesianGrid, Cell, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { OverviewMonth } from '../../api/financeHubApi';
import { inrCompact } from '../charts/format';
import { monthLabel, num } from './ui';

// Theme colours (match index.css tokens)
const C = {
	mint: '#A8F5A2',
	mintDeep: '#2E7D32',
	lavender: '#AFA0F8',
	lavenderDeep: '#5B47D6',
	ink: '#1E1E1E',
	danger: '#C62828',
	grid: '#DDE3DA',
	axis: '#6B706A',
};

const axisTick = { fontSize: 11, fill: C.axis };

interface TipItem {
	name?: string;
	value?: number | string;
	color?: string;
}

/** Dark value pill that floats over the chart on hover. */
function ValueTooltip({ active, payload, label }: { active?: boolean; payload?: readonly TipItem[]; label?: string | number }) {
	if (!active || !payload?.length) return null;
	return (
		<div className="rounded-[16px] bg-ink px-3.5 py-2.5 text-white shadow-xl">
			<p className="mb-1 text-[11px] opacity-70">{label}</p>
			{payload.map((p) => (
				<p key={String(p.name)} className="flex items-center gap-2 text-[13px] font-semibold">
					<span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color }} />
					<span className="font-normal opacity-80">{p.name}</span>
					₹{Number(p.value ?? 0).toLocaleString('en-IN')}
				</p>
			))}
		</div>
	);
}

/** Income vs spending per month. Red bars = overspent months. Dashed line = budget limit. */
export function CashFlowChart({ months }: { months: OverviewMonth[] }) {
	const data = months.map((m) => ({
		label: monthLabel(m.month),
		Income: num(m.totalIncome),
		Spent: num(m.totalSpent),
		'Budget limit': m.hasBudget ? num(m.budgetLimit) : null,
		overspent: m.overspent,
	}));

	return (
		<ResponsiveContainer width="100%" height={230}>
			<ComposedChart data={data} margin={{ top: 8, right: 4, left: -14, bottom: 0 }} barGap={4}>
				<CartesianGrid stroke={C.grid} vertical={false} />
				<XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} />
				<YAxis tick={axisTick} tickLine={false} axisLine={false} tickFormatter={inrCompact} />
				<Tooltip content={<ValueTooltip />} cursor={{ fill: 'rgba(30,30,30,0.05)' }} />
				<Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
				<Bar dataKey="Income" fill={C.mint} radius={[8, 8, 0, 0]} maxBarSize={22} />
				<Bar dataKey="Spent" radius={[8, 8, 0, 0]} maxBarSize={22}>
					{data.map((d, i) => (
						<Cell key={i} fill={d.overspent ? C.danger : C.lavender} />
					))}
				</Bar>
				<Line dataKey="Budget limit" stroke={C.ink} strokeWidth={2} strokeDasharray="4 4" dot={false} type="monotone" connectNulls={false} />
			</ComposedChart>
		</ResponsiveContainer>
	);
}

/** Savings at each month end, and the same line after deducting cumulative overspend. */
export function SavingsFlowChart({ months }: { months: OverviewMonth[] }) {
	const data = months.map((m) => ({
		label: monthLabel(m.month),
		Savings: num(m.savingsEnd),
		'After overspend': num(m.adjustedSavings),
	}));

	return (
		<ResponsiveContainer width="100%" height={230}>
			<ComposedChart data={data} margin={{ top: 8, right: 4, left: -14, bottom: 0 }}>
				<defs>
					<linearGradient id="moneySavingsFill" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stopColor={C.mint} stopOpacity={0.95} />
						<stop offset="100%" stopColor={C.mint} stopOpacity={0.15} />
					</linearGradient>
				</defs>
				<CartesianGrid stroke={C.grid} vertical={false} />
				<XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} />
				<YAxis tick={axisTick} tickLine={false} axisLine={false} tickFormatter={inrCompact} />
				<Tooltip content={<ValueTooltip />} cursor={{ stroke: C.lavenderDeep, strokeOpacity: 0.3 }} />
				<Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
				<Area dataKey="Savings" type="monotone" stroke={C.mintDeep} strokeWidth={2} fill="url(#moneySavingsFill)" />
				<Line
					dataKey="After overspend"
					type="monotone"
					stroke={C.lavenderDeep}
					strokeWidth={2.5}
					dot={{ r: 4, fill: C.lavenderDeep, strokeWidth: 0 }}
				/>
			</ComposedChart>
		</ResponsiveContainer>
	);
}
