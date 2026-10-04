import React from 'react';

export type ChipVariant = 'positive' | 'neutral' | 'negative' | 'info';

export interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
	children: React.ReactNode;
	variant?: ChipVariant;
}

export function Chip({ className = '', variant = 'neutral', children, ...props }: ChipProps) {
	const variantClasses: Record<ChipVariant, string> = {
		positive: 'bg-mint text-ink',
		neutral: 'bg-surface text-text',
		negative: 'bg-danger-soft text-danger',
		info: 'bg-lavender text-ink',
	};

	const baseClasses = `rounded-full px-3 py-1 text-xs font-medium inline-flex items-center justify-center ${variantClasses[variant]}`;

	return (
		<span className={`${baseClasses} ${className}`} {...props}>
			{children}
		</span>
	);
}

export default Chip;
