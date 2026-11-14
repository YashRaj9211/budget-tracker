import type { ReactNode } from 'react';
import { Card } from '../ui/Card';
import type { OverviewMonth } from '../../api/financeHubApi';
import { SectionHead, money, monthLabel, num } from './ui';

/** Month-by-month budget bars. Going over the limit is deducted from savings. */
export default function OverspendTracker({ months, overspendTotal }: { months: OverviewMonth[]; overspendTotal: string }) {
	const newestFirst = [...months].reverse();

	return (
		<Card variant="white">
			<SectionHead title="Budget vs spending" hint="Going over the limit is taken out of your savings" />
			<ul className="space-y-3.5">
				{newestFirst.map((m) => {
					const limit = num(m.budgetLimit);
					const spent = num(m.budgetSpent);
					const pct = m.hasBudget && limit > 0 ? (spent / limit) * 100 : 0;

					let pill: ReactNode;
					if (!m.hasBudget) {
						pill = <span className="rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold text-text-muted">No budget</span>;
					} else if (m.overspent) {
						pill = (
							<span className="rounded-full bg-danger-soft px-2.5 py-1 text-[11px] font-semibold text-danger">
								{money(m.overspentBy)} over
							</span>
						);
					} else {
						pill = (
							<span className="rounded-full bg-mint px-2.5 py-1 text-[11px] font-semibold text-mint-deep">
								{money(m.budgetLeft)} left
							</span>
						);
					}

					return (
						<li key={m.month}>
							<div className="mb-1.5 flex items-center justify-between gap-2">
								<span className="text-[13px] font-medium text-text">{monthLabel(m.month)}</span>
								{pill}
							</div>
							<div className="h-2.5 overflow-hidden rounded-full bg-surface">
								<div
									className={`h-full rounded-full transition-all duration-700 ${m.overspent ? 'bg-danger' : 'bg-lavender-deep'}`}
									style={{ width: `${Math.min(pct, 100)}%` }}
								/>
							</div>
						</li>
					);
				})}
			</ul>

			<div className="mt-5 flex items-center justify-between rounded-[20px] bg-lavender p-4">
				<div>
					<p className="text-[12px] text-text/70">Total overspent so far</p>
					<p className="text-[20px] font-semibold text-text">{money(overspendTotal)}</p>
				</div>
				<span className="rounded-full bg-white/60 px-3 py-1.5 text-[11px] font-semibold text-lavender-deep">Taken from savings</span>
			</div>
		</Card>
	);
}
