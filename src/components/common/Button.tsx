interface ButtonProps {
	text?: string;
	type: 'primary' | 'secondary';
	className?: string;
	children?: React.ReactNode;
	onClick?: () => void;
}

function Button({ className, text, type, children, onClick }: ButtonProps) {
	const buttonType = {
		primary: 'bg-black text-white',
		secondary: 'bg-white text-black',
	};

	return (
		<button
			className={`${buttonType[type]} ${className} px-4 py-2 `}
			onClick={onClick}
		>
			{text}
			{children}
		</button>
	);
}

export default Button;
