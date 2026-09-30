import { useMonthNavigation } from '../../hooks/useMonthNavigation';
import { MonthNavigator } from '../common/MonthNavigator';

function HomePageHeader() {
	const { formattedMonth, handlePrevMonth, handleNextMonth } = useMonthNavigation();

	return (
		<header className="w-full flex items-center border-2 border-black p-2.5 bg-white mb-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
			<MonthNavigator
				formattedMonth={formattedMonth}
				onPrev={handlePrevMonth}
				onNext={handleNextMonth}
			/>
		</header>
	);
}

export default HomePageHeader;
