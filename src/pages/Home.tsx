import { lazy, Suspense, useEffect, useCallback } from 'react';
import DailyBudgetCard from '../components/budget/DailyBudgetCard';
import Button from '../components/common/Button';
import TransactionList from '../components/transaction/TransactionList';
import HomePageHeader from '../components/home/HomeHeader';
import AddTransactionForm from '../components/transaction/AddTransactionForm';
import { useTransactionStore, useDayGroups } from '../stores/transactionStore';
import { useBudgetStore } from '../stores/budgetStore';
import { useAuthStore } from '../stores/authStore';
import { syncService } from '../services/syncService';
import { useWebSocket } from '../hooks/useWebSocket';
import { todayStr } from '../utils/date';
import { initDb } from '../db';

// Charts load after the first screen so Home stays fast
const HomeSnapshot = lazy(() => import('../components/home/HomeSnapshot'));

function Home() {
	const selectedYear = useTransactionStore((s) => s.selectedYear);
	const selectedMonth = useTransactionStore((s) => s.selectedMonth);
	const loadMonth = useTransactionStore((s) => s.loadMonth);
	const loadAllTransactions = useTransactionStore((s) => s.loadAllTransactions);
	const loadActiveBudget = useBudgetStore((s) => s.loadActiveBudget);
	const loadCategories = useBudgetStore((s) => s.loadCategories);
	const loadAccounts = useBudgetStore((s) => s.loadAccounts);
	const dayGroups = useDayGroups();
	const { onEvent } = useWebSocket();

	// Init DB and load data on mount, then sync with cloud
	useEffect(() => {
		async function init() {
			await initDb();
			await loadCategories();
			await loadAccounts();
			await loadMonth(selectedYear, selectedMonth);
			await loadAllTransactions();
			await loadActiveBudget(todayStr());

			// Sync offline records with cloud and pull latest records
			if (useAuthStore.getState().isAuthenticated && navigator.onLine) {
				syncService.syncAll();
			}

			// Hide the initial loading splash screen once initial load is complete
			window.hideSplashScreen?.();
		}
		init();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Listen for live updates and sync home records
	useEffect(() => {
		let timer: ReturnType<typeof setTimeout> | undefined;
		const unsubscribe = onEvent('REFETCH_EXPENSES', () => {
			clearTimeout(timer);
			timer = setTimeout(() => {
				syncService.syncAll();
			}, 500);
		});
		return () => {
			clearTimeout(timer);
			unsubscribe();
		};
	}, [onEvent]);

	// At midnight: reload transactions + re-check active budget (the date changed)
	const handleMidnight = useCallback(() => {
		const now = new Date();
		loadMonth(now.getFullYear(), now.getMonth());
		loadAllTransactions();
		loadActiveBudget(todayStr());
	}, [loadMonth, loadAllTransactions, loadActiveBudget]);

	useEffect(() => {
		let timeoutId: ReturnType<typeof setTimeout>;

		function scheduleNext() {
			const now = new Date();
			const tomorrow = new Date(
				now.getFullYear(),
				now.getMonth(),
				now.getDate() + 1, // next day
				0, 0, 0, 0,        // exactly midnight
			);
			const msUntilMidnight = tomorrow.getTime() - now.getTime();

			timeoutId = setTimeout(() => {
				handleMidnight();
				scheduleNext(); // reschedule for the following midnight
			}, msUntilMidnight);
		}

		scheduleNext();
		return () => clearTimeout(timeoutId);
	}, [handleMidnight]);

	return (
		<div className="relative space-y-3">
			<HomePageHeader />
			<div>
				<div className="flex items-center justify-between gap-2 mb-3">
					<Button text="Daily" type="primary" className="flex-1" />
					<Button text="Monthly" type="secondary" className="flex-1" />
					<Button text="Calendar" type="secondary" className="flex-1" />
				</div>
				<DailyBudgetCard />
				<div className="mt-3">
					<Suspense fallback={null}>
						<HomeSnapshot />
					</Suspense>
				</div>
				<div className="mt-3">
					{/* List of transactions */}
					{dayGroups.length > 0 ? (
						dayGroups.map((group) => (
							<TransactionList key={group.date} group={group} />
						))
					) : (
						<div className="border-2 border-black p-8 bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] text-center text-sm font-bold text-gray-500">
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
