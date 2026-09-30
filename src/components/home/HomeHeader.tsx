import { ChevronLeft, ChevronRight, User } from 'lucide-react';
import { Link } from 'react-router';
import { useTransactionStore } from '../../stores/transactionStore';
import { useAuthStore } from '../../stores/authStore';

function HomePageHeader() {
	const selectedYear = useTransactionStore((s) => s.selectedYear);
	const selectedMonth = useTransactionStore((s) => s.selectedMonth);
	const setSelectedMonth = useTransactionStore((s) => s.setSelectedMonth);
	const user = useAuthStore((s) => s.user);

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
		<header className="flex items-center justify-between border-2 border-black p-2.5 bg-white mb-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
			<div className="flex items-center gap-1.5">
				<button
					onClick={handlePrevMonth}
					className="p-1 hover:bg-gray-100 border border-black transition-all cursor-pointer flex items-center justify-center shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
					aria-label="Previous month"
				>
					<ChevronLeft size={16} />
				</button>
				<h2 className="text-xs sm:text-sm font-black text-black tracking-tight uppercase px-1">
					{formattedMonth}
				</h2>
				<button
					onClick={handleNextMonth}
					className="p-1 hover:bg-gray-100 border border-black transition-all cursor-pointer flex items-center justify-center shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
					aria-label="Next month"
				>
					<ChevronRight size={16} />
				</button>
			</div>

			<div className="flex items-center gap-2">
				<Link
					to="/profile"
					className="flex items-center gap-1.5 p-1.5 bg-[#fefed4] hover:bg-yellow-200 border border-black text-black transition-all cursor-pointer shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
					title="Profile Management"
					aria-label="Profile Management"
				>
					<User size={15} />
					{user && (
						<span className="text-[11px] font-black uppercase max-w-[70px] truncate">
							{user.name ? user.name.split(' ')[0] : user.username}
						</span>
					)}
				</Link>
			</div>
		</header>
	);
}

export default HomePageHeader;

