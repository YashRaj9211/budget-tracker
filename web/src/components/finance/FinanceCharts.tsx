import {
	Area,
	CartesianGrid,
	Cell,
	ComposedChart,
	Legend,
	Line,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';
import type { MonthCategorySpend, OverviewMonth } from '../../api/financeHubApi';
import { inrCompact } from '../charts/format';

const C = {
	mint: '#A8F5A2',
	mintDeep: '#2E7D32',
	lavender: '#AFA0F8',
	lavenderDeep: '#5B47D6',
	ink: '#1E1E1E',
	grid: '#DDE3DA',
	axis: '#6B706A',
};

const axisTick = { fontSize: 11, fill: C.axis };

function num(v: number | string | undefined): number {
	const n = typeof v === 'number' ? v : parseFloat(String(v ?? 0));
	return isNaN(n) ? 0 : n;
}

function money(v: number | string | undefined): string {
	const n = typeof v === 'number' ? v : parseFloat(String(v ?? 0));
	if (isNaN(n)) return '₹0';
	return '₹' + Math.round(n).toLocaleString('en-IN');
}

function monthShortLabel(ym: string): string {
	const [, m] = ym.split('-');
	const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	const idx = parseInt(m ?? '1', 10) - 1;
	return names[idx] ?? ym;
}

function monthLongLabel(ym: string): string {
	const [y, m] = ym.split('-');
	const names = [
		'January',
		'February',
		'March',
		'April',
		'May',
		'June',
		'July',
		'August',
		'September',
		'October',
		'November',
		'December',
	];
	const idx = parseInt(m ?? '1', 10) - 1;
	return `${names[idx] ?? ym} ${y ?? ''}`.trim();
}

/** 1. Month-wise cash flow Card (Image 1 top: Dark card with 4 rounded bars, active month hatched mint) */
export function MonthWiseCashFlowBento({
	months,
	activeMonth,
}: {
	months: OverviewMonth[];
	activeMonth: string;
}) {
	// Pick the last 4 months up to activeMonth (or up to 4 months)
	const activeIdx = months.findIndex((m) => m.month === activeMonth);
	const sliceEnd = activeIdx >= 0 ? activeIdx + 1 : months.length;
	const sliceStart = Math.max(0, sliceEnd - 4);
	const displayMonths = months.slice(sliceStart, sliceEnd);

	// If fewer than 4 months, pad with earlier or existing
	const fourMonths = displayMonths.length > 0 ? displayMonths : months.slice(-4);

	const maxSpent = Math.max(...fourMonths.map((m) => num(m.totalSpent)), 100);

	return (
		<div className="bg-ink rounded-[28px] p-5 text-white shadow-sm">
			<div>
				<h2 className="text-[16px] font-bold text-white tracking-tight">Month-wise cash flow</h2>
				<p className="text-[12px] font-normal text-white/60 mt-0.5">
					Spent vs budget, last {fourMonths.length} months
				</p>
			</div>

			{/* 4 Custom Rounded Pillar Bars */}
			<div className="flex items-end justify-between gap-3 h-52 pt-6 pb-2 px-1">
				{fourMonths.map((m, idx) => {
					const spent = num(m.totalSpent);
					// Min height 14% so bar is always a visible rounded pill
					const heightPercent = Math.max(Math.round((spent / maxSpent) * 88), 14);
					const isCurrent = m.month === activeMonth || idx === fourMonths.length - 1;

					return (
						<div key={m.month} className="flex-1 flex flex-col items-center h-full justify-end">
							{/* The Bar */}
							<div
								style={{ height: `${heightPercent}%` }}
								className={`w-full max-w-[68px] min-w-[48px] rounded-[20px] transition-all duration-500 relative flex items-center justify-center ${
									isCurrent ? 'bg-mint hatched text-ink' : 'bg-lavender text-ink'
								}`}
								title={`${monthShortLabel(m.month)}: ${money(spent)}`}
							/>

							{/* Month Label */}
							<span className="text-[12px] font-semibold text-white/90 text-center mt-2.5">
								{monthShortLabel(m.month)}
							</span>
						</div>
					);
				})}
			</div>
		</div>
	);
}

/** 2. Budgeted vs excluded Card (Image 1 middle: White card with split progress bar) */
export function BudgetedVsExcludedBento({
	currentMonth,
}: {
	currentMonth: OverviewMonth;
}) {
	const totalSpent = num(currentMonth.totalSpent);
	const budgeted = num(currentMonth.budgetSpent);
	const excluded = num(currentMonth.excludedSpent || totalSpent - budgeted);

	const total = budgeted + excluded;
	const budgetedPct = total > 0 ? Math.min(Math.round((budgeted / total) * 100), 100) : 100;
	const excludedPct = total > 0 ? 100 - budgetedPct : 0;

	return (
		<div className="bg-white rounded-[28px] p-5 text-text shadow-sm">
			<div>
				<h2 className="text-[16px] font-bold text-text tracking-tight">Budgeted vs excluded</h2>
				<p className="text-[12px] font-normal text-text-muted mt-0.5 mb-4">
					{monthLongLabel(currentMonth.month).split(' ')[0]} spending split
				</p>
			</div>

			{/* Split Pill Progress Bar */}
			<div className="h-5 w-full rounded-full bg-surface overflow-hidden flex my-2">
				<div
					style={{ width: `${budgetedPct}%` }}
					className={`h-full bg-lavender transition-all duration-500 ${
						excludedPct === 0 ? 'rounded-full' : 'rounded-l-full'
					}`}
				/>
				{excludedPct > 0 && (
					<div
						style={{ width: `${excludedPct}%` }}
						className={`h-full bg-ink transition-all duration-500 ${
							budgetedPct === 0 ? 'rounded-full' : 'rounded-r-full'
						}`}
					/>
				)}
			</div>

			{/* Bottom Labels */}
			<div className="flex items-center justify-between text-[13px] font-medium pt-2">
				<span className="text-text">In budget {money(budgeted)}</span>
				<span className="text-text-muted">Excluded {money(excluded)}</span>
			</div>
		</div>
	);
}

/** 3. Avg monthly spend & Vs last month (Image 1 bottom: 2-column Mint & Lavender cards) */
export function MonthComparisonBento({
	months,
	currentMonth,
	previousMonth,
}: {
	months: OverviewMonth[];
	currentMonth: OverviewMonth;
	previousMonth?: OverviewMonth;
}) {
	// Average monthly spend across available history
	const validMonths = months.filter((m) => num(m.totalSpent) > 0);
	const avgSpend =
		validMonths.length > 0
			? Math.round(validMonths.reduce((sum, m) => sum + num(m.totalSpent), 0) / validMonths.length)
			: num(currentMonth.totalSpent);

	// Difference vs previous month
	const prevSpent = previousMonth ? num(previousMonth.totalSpent) : 0;
	const curSpent = num(currentMonth.totalSpent);
	const pctDiff =
		prevSpent > 0 ? Math.round(((curSpent - prevSpent) / prevSpent) * 100) : null;

	return (
		<div className="grid grid-cols-2 gap-3">
			{/* Avg monthly spend Card (Pastel Mint) */}
			<div className="bg-mint rounded-[24px] p-4 text-text shadow-sm flex flex-col justify-between min-h-[104px]">
				<span className="text-[12px] font-medium text-text/75">Avg monthly spend</span>
				<div className="text-[28px] font-bold text-text tracking-tight mt-1">
					{money(avgSpend)}
				</div>
			</div>

			{/* Vs last month Card (Soft Lavender) */}
			<div className="bg-lavender rounded-[24px] p-4 text-text shadow-sm flex flex-col justify-between min-h-[104px]">
				<span className="text-[12px] font-medium text-text/75">Vs last month</span>
				<div className="text-[28px] font-bold text-text tracking-tight mt-1">
					{pctDiff !== null ? `${pctDiff > 0 ? '+' : ''}${pctDiff}%` : '—'}
				</div>
			</div>
		</div>
	);
}

/** 4. Savings Trajectory & Growth Chart (for Trends tab) */
export function SavingsTrajectoryChart({ months }: { months: OverviewMonth[] }) {
	const data = months.map((m) => ({
		label: monthShortLabel(m.month),
		Savings: num(m.savingsEnd),
		'After overspend': num(m.adjustedSavings),
	}));

	return (
		<ResponsiveContainer width="100%" height={230}>
			<ComposedChart data={data} margin={{ top: 8, right: 4, left: -14, bottom: 0 }}>
				<defs>
					<linearGradient id="financeSavingsFill" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stopColor={C.mint} stopOpacity={0.95} />
						<stop offset="100%" stopColor={C.mint} stopOpacity={0.15} />
					</linearGradient>
				</defs>
				<CartesianGrid stroke={C.grid} vertical={false} />
				<XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} />
				<YAxis tick={axisTick} tickLine={false} axisLine={false} tickFormatter={inrCompact} />
				<Tooltip
					formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, '']}
					contentStyle={{ borderRadius: '16px', background: '#1E1E1E', color: '#fff', border: 'none' }}
				/>
				<Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
				<Area
					dataKey="Savings"
					type="monotone"
					stroke={C.mintDeep}
					strokeWidth={2}
					fill="url(#financeSavingsFill)"
				/>
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

const PALETTE = ['#A8F5A2', '#AFA0F8', '#FFD166', '#4D96FF', '#FF6B6B', '#6BCB77', '#C77DFF', '#74C0FC'];

/** 5. Category Distribution Donut for Selected Month */
export function CategorySpendDonut({ categories }: { categories: MonthCategorySpend[] }) {
	const validCats = categories.filter((c) => num(c.amount) > 0);
	const total = validCats.reduce((sum, c) => sum + num(c.amount), 0);

	if (validCats.length === 0 || total === 0) {
		return (
			<div className="py-8 text-center text-[12px] text-text-muted">
				No categorised expenses recorded in this month.
			</div>
		);
	}

	const data = validCats.map((c, i) => ({
		name: c.name,
		value: num(c.amount),
		budgeted: num(c.budgeted),
		excluded: num(c.excluded),
		color: c.color || PALETTE[i % PALETTE.length],
	}));

	return (
		<div className="space-y-4">
			<div className="relative h-44 w-full">
				<ResponsiveContainer width="100%" height="100%">
					<PieChart>
						<Pie
							data={data}
							dataKey="value"
							nameKey="name"
							cx="50%"
							cy="50%"
							innerRadius={46}
							outerRadius={68}
							paddingAngle={3}
						>
							{data.map((entry, index) => (
								<Cell key={`cell-${index}`} fill={entry.color} />
							))}
						</Pie>
						<Tooltip
							formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Amount']}
							contentStyle={{ borderRadius: '16px', background: '#1E1E1E', color: '#fff', border: 'none' }}
						/>
					</PieChart>
				</ResponsiveContainer>
				<div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
					<span className="text-[10px] text-text-muted">Spent</span>
					<span className="text-[15px] font-semibold text-text">
						₹{Math.round(total).toLocaleString('en-IN')}
					</span>
				</div>
			</div>

			{/* Category Legend & Breakdown List */}
			<div className="space-y-2 max-h-52 overflow-y-auto pr-1">
				{data.map((cat) => {
					const pct = Math.round((cat.value / total) * 100);
					return (
						<div
							key={cat.name}
							className="flex items-center justify-between text-[12px] p-2 rounded-[14px] bg-surface"
						>
							<div className="flex items-center gap-2 min-w-0">
								<span
									className="w-2.5 h-2.5 rounded-full shrink-0"
									style={{ backgroundColor: cat.color }}
								/>
								<span className="font-medium text-text truncate">{cat.name}</span>
								<span className="text-[10px] text-text-muted shrink-0">{pct}%</span>
							</div>
							<div className="flex items-center gap-2 shrink-0">
								{cat.excluded > 0 && (
									<span className="text-[10px] px-1.5 py-0.5 rounded-full bg-ink text-white font-medium">
										₹{Math.round(cat.excluded).toLocaleString('en-IN')} excl
									</span>
								)}
								<span className="font-semibold text-text">
									₹{Math.round(cat.value).toLocaleString('en-IN')}
								</span>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
