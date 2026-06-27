import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTransactionStore } from '../../stores/transactionStore';

function HomePageHeader() {
	const selectedYear = useTransactionStore((s) => s.selectedYear);
	const selectedMonth = useTransactionStore((s) => s.selectedMonth);
	const setSelectedMonth = useTransactionStore((s) => s.setSelectedMonth);

	const displayDate = new Date(selectedYear, selectedMonth);
	const formattedMonth = displayDate.toLocaleString('default', { month: 'long', year: 'numeric' });

	const handlePrevMonth = () => {
		if (selectedMonth === 0) {
			setSelectedMonth(selectedYear - 1, 11);
		} else {
			setSelectedMonth(selectedYear, selectedMonth - 1);
		}
	};

	const handleNextMonth = () => {
		if (selectedMonth === 11) {
			setSelectedMonth(selectedYear + 1, 0);
		} else {
			setSelectedMonth(selectedYear, selectedMonth + 1);
		}
	};

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
