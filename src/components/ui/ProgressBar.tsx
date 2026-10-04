
export interface ProgressBarProps {
	progress: number; // 0 to 100
	splitProgress?: number; // 0 to 100
	variant?: 'mint' | 'ink'; // What card is this on?
	className?: string;
}

export function ProgressBar({ progress, splitProgress = 0, variant = 'ink', className = '' }: ProgressBarProps) {
	const isInkCard = variant === 'ink';
	const trackClass = isInkCard ? 'hatched-ink' : 'hatched';
	const outlineClass = isInkCard ? '' : 'border border-ink';
	const fillClass = isInkCard ? 'bg-mint' : 'bg-ink';
	const splitClass = 'bg-lavender';

	return (
		<div className={`h-5 w-full rounded-full flex overflow-hidden ${trackClass} ${outlineClass} ${className}`}>
			<div className={`h-full ${fillClass}`} style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
			{splitProgress > 0 && (
				<div className={`h-full ${splitClass}`} style={{ width: `${Math.max(0, Math.min(100, splitProgress))}%` }} />
			)}
		</div>
	);
}

export default ProgressBar;
