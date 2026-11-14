import { useMonthNavigation } from '../../hooks/useMonthNavigation';
import { MonthNavigator } from '../common/MonthNavigator';

function HomePageHeader() {
	const { formattedMonth, handlePrevMonth, handleNextMonth } = useMonthNavigation();

	return (
		<header className="w-full flex items-center mb-4">
			<MonthNavigator
				formattedMonth={formattedMonth}
				onPrev={handlePrevMonth}
				onNext={handleNextMonth}
			/>
		</header>
	);
}

export default HomePageHeader;
