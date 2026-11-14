import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'accent';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	text?: string;
	variant?: ButtonVariant;
}

export function Button({ className = '', text, variant = 'primary', children, ...props }: ButtonProps) {
	const variantClasses = {
		primary: 'bg-ink text-white',
		secondary: 'border border-ink text-ink bg-transparent',
		accent: 'bg-mint text-ink',
	};

	const baseClasses = `rounded-full px-5 py-2.5 text-sm font-medium transition-transform active:scale-[0.98] ${variantClasses[variant]}`;

	return (
		<button
			className={`${baseClasses} ${className}`}
			{...props}
		>
			{text}
			{children}
		</button>
	);
}

export default Button;
