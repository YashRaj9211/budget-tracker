interface ButtonProps {
	text?: string;
	type: 'primary' | 'secondary';
	className?: string;
	children?: React.ReactNode;
	onClick?: () => void;
}

function Button({ className = '', text, type, children, onClick }: ButtonProps) {
	const buttonType = {
		primary: 'bg-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
		secondary: 'bg-white text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-50',
	};

	return (
		<button
			className={`border-2 border-black font-black text-xs py-2 px-1 text-center transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer tracking-wider uppercase ${buttonType[type]} ${className}`}
			onClick={onClick}
		>
			{text}
			{children}
		</button>
	);
}

export default Button;
