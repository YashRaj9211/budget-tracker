import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import IconButton from '../ui/IconButton';

interface MonthNavigatorProps {
	formattedMonth: string;
	onPrev: () => void;
	onNext: () => void;
	className?: string;
}

export const MonthNavigator: React.FC<MonthNavigatorProps> = ({
	formattedMonth,
	onPrev,
	onNext,
	className = '',
}) => {
	return (
		<div className={`flex items-center justify-between w-full ${className}`}>
			<IconButton onClick={onPrev} variant="surface" aria-label="Previous month">
				<ChevronLeft size={20} />
			</IconButton>
			<h2 className="text-[16px] font-medium text-text capitalize">
				{formattedMonth.toLowerCase()}
			</h2>
			<IconButton onClick={onNext} variant="surface" aria-label="Next month">
				<ChevronRight size={20} />
			</IconButton>
		</div>
	);
};
