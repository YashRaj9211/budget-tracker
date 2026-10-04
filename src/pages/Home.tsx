import { lazy, Suspense, useEffect, useCallback, useState } from 'react';
import DailyBudgetCard from '../components/budget/DailyBudgetCard';
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
import SegmentedTabs from '../components/ui/SegmentedTabs';

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
	
	const [activeTab, setActiveTab] = useState('daily');

	useEffect(() => {
		async function init() {
			await initDb();
			await loadCategories();
			await loadAccounts();
			await loadMonth(selectedYear, selectedMonth);
			await loadAllTransactions();
			await loadActiveBudget(todayStr());

			if (useAuthStore.getState().isAuthenticated && navigator.onLine) {
				syncService.syncAll();
			}

			window.hideSplashScreen?.();
		}
		init();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

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
				now.getDate() + 1,
				0, 0, 0, 0
			);
			const msUntilMidnight = tomorrow.getTime() - now.getTime();

			timeoutId = setTimeout(() => {
				handleMidnight();
				scheduleNext();
			}, msUntilMidnight);
		}

		scheduleNext();
		return () => clearTimeout(timeoutId);
	}, [handleMidnight]);

	return (
		<div className="relative pb-28">
			<HomePageHeader />
			
			<SegmentedTabs 
				tabs={[
					{ id: 'daily', label: 'Daily' },
					{ id: 'monthly', label: 'Monthly' },
					{ id: 'calendar', label: 'Calendar' }
				]} 
				activeId={activeTab} 
				onChange={setActiveTab} 
				className="mb-4"
			/>
			
			{activeTab === 'daily' && (
				<>
					<DailyBudgetCard />
					<Suspense fallback={null}>
						<HomeSnapshot />
					</Suspense>
					
					<div className="mt-6 mb-2">
						<h3 className="text-[15px] font-medium text-text mb-3">Transactions</h3>
						{dayGroups.length > 0 ? (
							dayGroups.map((group) => <TransactionList key={group.date} group={group} />)
						) : (
							<div className="p-6 bg-surface rounded-[20px] text-center text-sm text-text-muted">
								No transactions this month
							</div>
						)}
					</div>
				</>
			)}
			
			{activeTab === 'monthly' && (
				<div className="p-6 text-center text-sm text-text-muted">Monthly view coming soon</div>
			)}
			
			{activeTab === 'calendar' && (
				<div className="p-6 text-center text-sm text-text-muted">Calendar view coming soon</div>
			)}
			
			<AddTransactionForm />
		</div>
	);
}

export default Home;
