import type { ReactNode } from 'react';

interface ChartCardProps {
	title: string;
	subtitle?: string;
	icon?: ReactNode;
	action?: ReactNode;
	/** Show the "no data" message instead of the chart. */
	empty?: boolean;
	emptyText?: string;
	children: ReactNode;
	/** Spacing below the card. Defaults to mb-5. */
	className?: string;
}

/** White card with a title, matching the rest of the app. Wraps every chart. */
export default function ChartCard({ title, subtitle, icon, action, empty, emptyText, children, className = 'mb-5' }: ChartCardProps) {
	return (
		<section className={`border border-black bg-white shadow-box p-4 ${className}`}>
			<div className="flex items-start justify-between gap-2 border-b border-black pb-2 mb-3">
				<div>
					<h3 className="text-sm font-bold text-black uppercase tracking-wider flex items-center gap-2">
						{icon} {title}
					</h3>
					{subtitle && <p className="text-[11px] text-gray-500 mt-0.5">{subtitle}</p>}
				</div>
				{action}
			</div>
			{empty ? (
				<div className="py-10 text-center text-sm text-gray-400">{emptyText ?? 'Nothing to show yet'}</div>
			) : (
				children
			)}
		</section>
	);
}
