import type { FinanceOverview, OverviewMonth } from '../../api/financeHubApi';

function money(v: number | string | undefined): string {
	const n = typeof v === 'number' ? v : parseFloat(String(v ?? 0));
	if (isNaN(n)) return '₹0';
	return '₹' + Math.round(n).toLocaleString('en-IN');
}

function num(v: number | string | undefined): number {
	const n = typeof v === 'number' ? v : parseFloat(String(v ?? 0));
	return isNaN(n) ? 0 : n;
}

interface FinanceKPIHeroProps {
	currentMonth: OverviewMonth;
	previousMonth?: OverviewMonth;
	summary: FinanceOverview['summary'];
	onOpenAccounts?: () => void;
	onOpenSalary?: () => void;
}

export default function FinanceKPIHero({
	currentMonth,
	previousMonth,
	summary,
	onOpenAccounts,
	onOpenSalary,
}: FinanceKPIHeroProps) {
	const savingsTotal = num(summary.savingsTotal);
	const adjustedSavings = num(summary.adjustedSavings);
	const overspendTotal = num(summary.overspendTotal);

	const totalIncome = num(currentMonth.totalIncome);
	const salary = num(currentMonth.salary);
	const otherIncome = num(currentMonth.otherIncome);

	const totalSpent = num(currentMonth.totalSpent);
	const budgetSpent = num(currentMonth.budgetSpent);
	const excludedSpent = num(currentMonth.excludedSpent || totalSpent - budgetSpent);

	const left = num(currentMonth.left || totalIncome - totalSpent);
	const isSurplus = left >= 0;

	// Spend diff vs previous month
	const prevSpent = previousMonth ? num(previousMonth.totalSpent) : 0;
	const spendDiff =
		prevSpent > 0 ? Math.round(((totalSpent - prevSpent) / prevSpent) * 100) : null;

	return (
		<div className="space-y-3">
			{/* 1. Total savings Card (Dark Bento Card) */}
			<div className="bg-ink rounded-[28px] p-5 text-white shadow-sm flex flex-col justify-between">
				<div className="flex items-center justify-between">
					<span className="text-[13px] font-normal text-white/70">Total savings</span>
					{onOpenAccounts && (
						<button
							onClick={onOpenAccounts}
							type="button"
							className="text-[13px] font-medium text-mint hover:underline cursor-pointer transition-colors"
						>
							Manage
						</button>
					)}
				</div>

				<div className="text-[42px] font-bold text-white tracking-tight leading-tight my-2">
					{money(savingsTotal)}
				</div>

				{/* Rounded progress/divider bar */}
				<div className="h-2 rounded-full bg-white/10 w-full my-1.5" />

				<div className="flex items-center justify-between text-[13px] pt-1">
					<span className="text-white/70 font-normal">Adjusted net worth</span>
					<span
						className={`font-semibold ${
							adjustedSavings < 0 ? 'text-[#ff8a80]' : 'text-mint'
						}`}
					>
						{money(adjustedSavings)}
					</span>
				</div>
			</div>

			{/* 2. Month cashflow left Card (Mint Bento Card with Hatch Bar) */}
			<div className="bg-mint rounded-[28px] p-5 text-text shadow-sm flex flex-col justify-between relative overflow-hidden">
				<div className="flex items-center justify-between">
					<span className="text-[13px] font-medium text-text/75">Month cashflow left</span>
					<span className="bg-ink text-white px-3 py-1 rounded-full text-[11px] font-bold tracking-wide">
						{isSurplus ? 'Surplus' : 'Deficit'}
					</span>
				</div>

				<div className="text-[40px] font-bold text-text tracking-tight leading-tight my-1">
					{isSurplus ? '+' : ''}{money(left)}
				</div>

				{/* Hatch Pattern Graphic Line */}
				<div className="h-3 w-full rounded-full hatched my-2 opacity-75" />

				<div className="text-[12px] font-normal text-text/75 mt-0.5">
					Income {money(totalIncome)} vs expenditure {money(totalSpent)}
				</div>
			</div>

			{/* 3. Incoming & Spent (2-Column Grid) */}
			<div className="grid grid-cols-2 gap-3">
				{/* Incoming Card (Lavender) */}
				<div
					onClick={onOpenSalary}
					className={`bg-lavender rounded-[28px] p-4 text-text shadow-sm flex flex-col justify-between min-h-[148px] ${
						onOpenSalary ? 'cursor-pointer hover:opacity-95 transition-opacity' : ''
					}`}
				>
					<span className="text-[13px] font-medium text-text/70">Incoming</span>

					<div className="text-[32px] font-bold text-text tracking-tight my-1">
						{money(totalIncome)}
					</div>

					<div className="text-[12px] text-text/80 leading-relaxed font-normal space-y-0.5 mt-1">
						<div>Salary {money(salary)}</div>
						<div>Other {money(otherIncome)}</div>
					</div>
				</div>

				{/* Spent Card (Pure White) */}
				<div className="bg-white rounded-[28px] p-4 text-text shadow-sm flex flex-col justify-between min-h-[148px]">
					<div className="flex items-center justify-between">
						<span className="text-[13px] font-medium text-text/70">Spent</span>
						{spendDiff !== null && (
							<span
								className={`text-[12px] font-bold ${
									spendDiff > 0 ? 'text-danger' : 'text-mint-deep'
								}`}
							>
								{spendDiff > 0 ? `+${spendDiff}%` : `${spendDiff}%`}
							</span>
						)}
					</div>

					<div className="text-[32px] font-bold text-text tracking-tight my-1">
						{money(totalSpent)}
					</div>

					<div className="text-[12px] text-text/80 leading-relaxed font-normal space-y-0.5 mt-1">
						<div>In budget {money(budgetSpent)}</div>
						<div>Excluded {money(excludedSpent)}</div>
					</div>
				</div>
			</div>

			{/* 4. Budget overspend Banner Card */}
			{overspendTotal > 0 && (
				<div className="bg-white rounded-[24px] p-3.5 px-4 flex items-center gap-3.5 shadow-sm">
					{/* Striped hatch block */}
					<div className="w-5 h-8 rounded-md hatched shrink-0 border border-black/10" />

					<div className="min-w-0 flex-1">
						<div className="text-[13px] font-bold text-text">
							Budget overspend {money(overspendTotal)}
						</div>
						<div className="text-[11px] text-text-muted mt-0.5 font-normal">
							Deducted from savings to show real liquidity.
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
