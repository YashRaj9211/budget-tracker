import { useEffect, useCallback } from 'react';
import DailyBudgetCard from '../components/budget/DailyBudgetCard';
import Button from '../components/common/Button';
import TransactionList from '../components/transaction/TransactionList';
import HomePageHeader from '../components/home/HomeHeader';
import AddTransactionForm from '../components/transaction/AddTransactionForm';
import { useTransactionStore, useDayGroups } from '../stores/transactionStore';
import { useBudgetStore } from '../stores/budgetStore';
import { toMonthKey } from '../utils/date';
import { initDb } from '../db';
import { useMidnightRefresh } from '../utils/midnight';

function Home() {
	const selectedYear = useTransactionStore((s) => s.selectedYear);
	const selectedMonth = useTransactionStore((s) => s.selectedMonth);
	const loadMonth = useTransactionStore((s) => s.loadMonth);
	const loadBudget = useBudgetStore((s) => s.loadBudget);
	const loadCategories = useBudgetStore((s) => s.loadCategories);
	const loadAccounts = useBudgetStore((s) => s.loadAccounts);
	const dayGroups = useDayGroups();

	// Init DB and load data on mount
	useEffect(() => {
		async function init() {
			await initDb();
			await loadCategories();
			await loadAccounts();
			await loadMonth(selectedYear, selectedMonth);
			await loadBudget(toMonthKey(selectedYear, selectedMonth));
		}
		init();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Reload when month changes
	useEffect(() => {
		loadBudget(toMonthKey(selectedYear, selectedMonth));
	}, [selectedYear, selectedMonth, loadBudget]);

	// At midnight: reload transactions so the daily budget recalculates for the new day
	const handleMidnight = useCallback(() => {
		const now = new Date();
		loadMonth(now.getFullYear(), now.getMonth());
		loadBudget(toMonthKey(now.getFullYear(), now.getMonth()));
	}, [loadMonth, loadBudget]);

	useMidnightRefresh(handleMidnight);

	return (
		<div className="relative">
			<HomePageHeader />
			<div>
				<div>
					<div className="flex items-center justify-between gap-4 my-2">
						<Button text="Daily" type="primary" className="flex-1" />
						<Button text="Monthly" type="secondary" className="flex-1" />
						<Button text="Calender" type="secondary" className="flex-1" />
					</div>
				</div>
				<DailyBudgetCard />
				<div className='border'>
					{/* List of transactions */}
					{dayGroups.length > 0 ? (
						dayGroups.map((group) => (
							<TransactionList key={group.date} group={group} />
						))
					) : (
						<div className="py-8 text-center text-sm text-gray-400">
							No transactions this month
						</div>
					)}
				</div>
			</div>
			{/* Expanding Add Transaction Form and FAB */}
			<AddTransactionForm />
		</div>
	);
}

export default Home;
