import React from 'react';

export interface ListRowProps {
	icon?: React.ReactNode;
	iconBg?: string;
	title: string;
	caption?: string | React.ReactNode;
	amount?: string | React.ReactNode;
	amountColor?: 'mint-deep' | 'danger' | 'ink';
	className?: string;
}

export function ListRow({
	icon,
	iconBg,
	title,
	caption,
	amount,
	amountColor = 'ink',
	className = '',
}: ListRowProps) {
	const colorClasses = {
		'mint-deep': 'text-mint-deep',
		danger: 'text-danger',
		ink: 'text-text',
	};

	return (
		<div className={`flex items-center justify-between py-2.5 ${className}`}>
			<div className="flex items-center gap-3 min-w-0">
				{icon && (
					<div
						className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
							iconBg || 'bg-surface text-text'
						}`}
					>
						{icon}
					</div>
				)}
				<div className="flex flex-col min-w-0">
					<span className="text-[14px] font-medium text-text truncate">{title}</span>
					{caption && (
						<div className="text-[12px] text-text-muted truncate mt-0.5">
							{caption}
						</div>
					)}
				</div>
			</div>
			{amount && (
				<span className={`text-[15px] font-medium shrink-0 ml-3 ${colorClasses[amountColor]}`}>
					{amount}
				</span>
			)}
		</div>
	);
}

export default ListRow;
