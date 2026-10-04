import React from 'react';

export type CardVariant = 'ink' | 'mint' | 'lavender' | 'light' | 'white';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
	children: React.ReactNode;
	variant?: CardVariant;
	nested?: boolean;
}

const variantClasses: Record<CardVariant, string> = {
	ink: 'bg-ink text-white',
	mint: 'bg-mint text-text',
	lavender: 'bg-lavender text-text',
	light: 'bg-surface text-text',
	white: 'bg-card text-text',
};

export const Card = ({ children, className = '', variant = 'white', nested = false, ...props }: CardProps) => {
	const baseClasses = nested ? 'rounded-[20px]' : 'rounded-[28px]';
	
	// Add padding based on whether it's nested (maybe less padding) but generally p-4 or p-5 as per design.
	// We'll let the user add custom padding if needed, but default to p-5 for top level and p-4 for nested.
	const paddingClasses = nested ? 'p-4' : 'p-5';
	
	return (
		<div className={`${baseClasses} ${paddingClasses} ${variantClasses[variant]} ${className}`} {...props}>
			{children}
		</div>
	);
};
