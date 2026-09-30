import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
			<button
				onClick={onPrev}
				className="p-1 hover:bg-gray-100 border border-black transition-all cursor-pointer flex items-center justify-center shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
				aria-label="Previous month"
			>
				<ChevronLeft size={16} />
			</button>
			<h2 className="text-xs sm:text-sm font-black text-black tracking-tight uppercase px-1 text-center">
				{formattedMonth}
			</h2>
			<button
				onClick={onNext}
				className="p-1 hover:bg-gray-100 border border-black transition-all cursor-pointer flex items-center justify-center shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
				aria-label="Next month"
			>
				<ChevronRight size={16} />
			</button>
		</div>
	);
};
