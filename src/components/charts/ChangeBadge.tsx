import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';

interface ChangeBadgeProps {
	/** % change, or null when there is nothing to compare with. */
	change: number | null;
	/** For spending, a rise is bad. For income/savings, a rise is good. */
	higherIsBetter?: boolean;
	label?: string;
}

/** Little ▲ 12% / ▼ 5% pill. Green = good news, red = bad news, grey = no real change. */
export default function ChangeBadge({ change, higherIsBetter = false, label = 'vs last month' }: ChangeBadgeProps) {
	if (change === null) {
		return <span className="text-[10px] font-bold text-gray-500">New · no data {label.replace('vs ', 'for ')}</span>;
	}
	const flat = Math.abs(change) < 1;
	const up = change > 0;
	const good = flat ? null : up === higherIsBetter;
	const color = flat ? 'text-gray-600' : good ? 'text-emerald-700' : 'text-rose-700';
	const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
	return (
		<span className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${color}`}>
			<Icon size={12} />
			{flat ? 'No change' : `${Math.abs(change).toFixed(0)}% ${up ? 'higher' : 'lower'}`} {label}
		</span>
	);
}
