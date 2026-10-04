import React from 'react';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	children: React.ReactNode;
	variant?: 'outline' | 'surface';
}

export function IconButton({ className = '', variant = 'outline', children, ...props }: IconButtonProps) {
	const variantClasses = variant === 'outline' ? 'border border-ink/40 bg-transparent' : 'bg-surface border-transparent';
	
	const baseClasses = `w-10 h-10 rounded-full flex items-center justify-center transition-transform active:scale-[0.98] ${variantClasses}`;

	return (
		<button
			className={`${baseClasses} ${className}`}
			{...props}
		>
			{children}
		</button>
	);
}

export default IconButton;
