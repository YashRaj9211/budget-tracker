import { Card } from '../ui/Card';
import type { FinanceOverview, OverviewMonth } from '../../api/financeHubApi';
import { DeltaPill, StatTile, money, num, pctChange } from './ui';

/** Circular gauge: how much of this month's budget is used. */
function BudgetRing({ percent }: { percent: number }) {
	const r = 52;
	const circ = 2 * Math.PI * r;
	const shown = Math.min(percent, 100);
	const over = percent > 100;

	return (
		<div className="relative h-[132px] w-[132px] shrink-0">
			<svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
				<circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="10" />
				<circle
					cx="60"
					cy="60"
					r={r}
					fill="none"
					stroke={over ? '#F28B82' : '#A8F5A2'}
					strokeWidth="10"
					strokeLinecap="round"
					strokeDasharray={`${(circ * shown) / 100} ${circ}`}
					style={{ transition: 'stroke-dasharray 0.9s ease' }}
				/>
			</svg>
			<div className="absolute inset-0 flex flex-col items-center justify-center">
				<span className="text-[26px] font-semibold text-white">{Math.round(percent)}%</span>
				<span className="text-[11px] text-white/60">of budget</span>
			</div>
		</div>
	);
}

interface MoneyHeroProps {
	current?: OverviewMonth;
	previous?: OverviewMonth;
	summary: FinanceOverview['summary'];
}

/** Headline card: budget ring, what is left, and four quick stats for the month. */
export default function MoneyHero({ current, previous, summary }: MoneyHeroProps) {
	const income = num(current?.totalIncome);
	const spent = num(current?.totalSpent);
	const limit = num(current?.budgetLimit);
	const budgetSpent = num(current?.budgetSpent);
	const percent = current?.hasBudget && limit > 0 ? (budgetSpent / limit) * 100 : 0;
	const left = income - spent;

	const spentChange = previous ? pctChange(spent, num(previous.totalSpent)) : null;
	const savingsChange = previous ? pctChange(num(current?.savingsEnd), num(previous.savingsEnd)) : null;

	return (
		<Card variant="ink" className="relative overflow-hidden">
			<div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-lavender-deep/30 blur-2xl" />
			<div className="relative flex items-center gap-5">
				<BudgetRing percent={percent} />
				<div className="min-w-0">
					<p className="text-[12px] text-white/60">{current?.hasBudget ? 'Left after spending' : 'Left this month'}</p>
					<p className={`text-[28px] font-semibold tracking-tight ${left < 0 ? 'text-[#F28B82]' : 'text-white'}`}>{money(left)}</p>
					<div className="mt-2 flex flex-wrap items-center gap-2">
						<DeltaPill change={spentChange} />
						<span className="text-[11px] text-white/60">spending vs last month</span>
					</div>
				</div>
			</div>

			<div className="relative mt-5 grid grid-cols-2 gap-3">
				<StatTile label="Income" value={money(income)} tone="mint" />
				<StatTile label="Spent" value={money(spent)} tone="lavender" />
				<StatTile
					label="Savings"
					value={money(summary.savingsTotal)}
					footer={<DeltaPill change={savingsChange} goodWhenUp />}
				/>
				<StatTile
					label="After overspend"
					value={money(summary.adjustedSavings)}
					footer={
						<span className="text-[11px] font-medium text-danger">
							{num(summary.overspendTotal) > 0 ? `− ${money(summary.overspendTotal)} overspent` : 'No overspend yet'}
						</span>
					}
				/>
			</div>
		</Card>
	);
}
