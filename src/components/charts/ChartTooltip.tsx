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

/** Small white tooltip used by all charts. */
export default function ChartTooltip({ active, payload, label, format = inr, title }: ChartTooltipProps) {
	if (!active || !payload || payload.length === 0) return null;
	const rows = payload.filter((p) => typeof p.value === 'number' || typeof p.value === 'string');
	if (rows.length === 0) return null;
	return (
		<div className="border border-black bg-white px-2.5 py-2 text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
			{label !== undefined && label !== '' && (
				<div className="font-bold text-black mb-1">{title ? title(label) : label}</div>
			)}
			{rows.map((p, i) => (
				<div key={`${p.dataKey ?? p.name}-${i}`} className="flex items-center gap-2">
					<span className="inline-block w-2.5 h-2.5 border border-black/30" style={{ background: p.color }} />
					<span className="text-gray-600">{p.name}</span>
					<span className="ml-auto font-bold text-black pl-3">{format(Number(p.value))}</span>
				</div>
			))}
		</div>
	);
}
