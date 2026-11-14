import { useTransactionStore } from '../stores/transactionStore';

export function useMonthNavigation() {
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

	return {
		selectedYear,
		selectedMonth,
		formattedMonth,
		handlePrevMonth,
		handleNextMonth,
	};
}
