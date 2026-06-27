import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

function HomePageHeader() {
	const [currentDate, setCurrentDate] = useState(new Date(2026, 5)); // June 2026

	const handlePrevMonth = () => {
		setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1));
	};

	const handleNextMonth = () => {
		setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1));
	};

	const formattedMonth = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
	return (
		<header className="flex items-center justify-between border border-black p-3 bg-white mb-4">
			<button
				onClick={handlePrevMonth}
				className="p-1.5 hover:bg-gray-50 border border-black transition-all cursor-pointer flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
				aria-label="Previous month"
			>
				<ChevronLeft size={18} />
			</button>
			<h2 className="text-base font-bold text-black tracking-tight">{formattedMonth}</h2>
			<button
				onClick={handleNextMonth}
				className="p-1.5 hover:bg-gray-50 border border-black transition-all cursor-pointer flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
				aria-label="Next month"
			>
				<ChevronRight size={18} />
			</button>
		</header>
	);
}

export default HomePageHeader;
