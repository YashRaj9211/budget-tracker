import type { ReactNode } from 'react';
import { Card } from '../ui/Card';

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

/** Soft Mint card wrapper for every chart. */
export default function ChartCard({
	title,
	subtitle,
	icon,
	action,
	empty,
	emptyText,
	children,
	className = 'mb-5',
}: ChartCardProps) {
	return (
		<Card variant="white" className={className}>
			<div className="flex items-start justify-between gap-2 mb-3">
				<div>
					<h3 className="text-[15px] font-medium text-text flex items-center gap-2">
						{icon && <span className="text-text-muted">{icon}</span>}
						{title}
					</h3>
					{subtitle && <p className="text-[12px] text-text-muted mt-0.5">{subtitle}</p>}
				</div>
				{action}
			</div>
			{empty ? (
				<div className="py-10 text-center text-[12px] text-text-muted">
					{emptyText ?? 'Nothing to show yet'}
				</div>
			) : (
				children
			)}
		</Card>
	);
}
