import { inr } from './format';

interface TooltipItem {
	name?: string | number;
	value?: number | string | ReadonlyArray<number | string>;
	color?: string;
	dataKey?: string | number;
}

interface ChartTooltipProps {
	active?: boolean;
	payload?: ReadonlyArray<TooltipItem>;
	label?: string | number;
	/** Turn a value into text. Defaults to ₹ format. */
	format?: (value: number) => string;
	/** Optional title override (e.g. full date instead of the short axis label). */
	title?: (label: string | number | undefined) => string;
}

/** Soft rounded tooltip used by all charts. */
export default function ChartTooltip({ active, payload, label, format = inr, title }: ChartTooltipProps) {
	if (!active || !payload || payload.length === 0) return null;
	const rows = payload.filter((p) => typeof p.value === 'number' || typeof p.value === 'string');
	if (rows.length === 0) return null;
	return (
		<div className="bg-card rounded-[14px] px-3.5 py-2.5 text-xs shadow-lg border border-ink/5 text-text">
			{label !== undefined && label !== '' && (
				<div className="font-medium text-text mb-1">{title ? title(label) : label}</div>
			)}
			{rows.map((p, i) => (
				<div key={`${p.dataKey ?? p.name}-${i}`} className="flex items-center gap-2 py-0.5">
					<span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
					<span className="text-text-muted">{p.name}</span>
					<span className="ml-auto font-medium text-text pl-3">{format(Number(p.value))}</span>
				</div>
			))}
		</div>
	);
}
