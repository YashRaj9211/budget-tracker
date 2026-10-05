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
import { initDb, getAllTransactions } from '../db';
import SegmentedTabs from '../components/ui/SegmentedTabs';
import AnimatedLogo from '../components/common/AnimatedLogo';

const HomeSnapshot = lazy(() => import('../components/home/HomeSnapshot'));

function Home() {
	const selectedYear = useTransactionStore((s) => s.selectedYear);
	const selectedMonth = useTransactionStore((s) => s.selectedMonth);
	const loadMonth = useTransactionStore((s) => s.loadMonth);
	const loadAllTransactions = useTransactionStore((s) => s.loadAllTransactions);
	const isLoading = useTransactionStore((s) => s.isLoading);
	const loadError = useTransactionStore((s) => s.loadError);
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

			const auth = useAuthStore.getState();
			if (auth.isAuthenticated && navigator.onLine) {
				useTransactionStore.setState({ isLoading: true, loadError: null });
				try {
					const res = await syncService.syncAll({ force: true });
					if (res.errors.length > 0 && res.syncedCount === 0) {
						const allLocal = await getAllTransactions();
						if (allLocal.length === 0) {
							useTransactionStore.setState({
								transactions: [],
								allTransactions: [],
								isLoading: false,
								loadError: res.errors[0] || 'Failed to fetch expenses from server',
							});
							window.hideSplashScreen?.();
							return;
						}
					}
					await loadMonth(selectedYear, selectedMonth);
					await loadAllTransactions();
					await loadActiveBudget(todayStr());
				} catch (err: unknown) {
					console.error('[Home] Failed to load data from server:', err);
					const msg = err instanceof Error ? err.message : 'Failed to connect to server';
					useTransactionStore.setState({
						transactions: [],
						allTransactions: [],
						isLoading: false,
						loadError: msg,
					});
				} finally {
					useTransactionStore.setState({ isLoading: false });
				}
			} else {
				// Offline mode or guest: load local cache (contains offline added items)
				await loadMonth(selectedYear, selectedMonth);
				await loadAllTransactions();
				await loadActiveBudget(todayStr());
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
					{isLoading ? (
						<div className="my-4 p-6 bg-surface rounded-[24px] animate-pulse h-36 flex flex-col justify-between">
							<div className="flex justify-between items-center">
								<div className="w-20 h-4 bg-border/40 rounded" />
								<div className="w-6 h-6 bg-border/40 rounded-full" />
							</div>
							<div className="w-32 h-6 bg-border/40 rounded" />
							<div className="w-full h-2 bg-border/30 rounded-full" />
						</div>
					) : (
						<DailyBudgetCard />
					)}
					<Suspense fallback={null}>
						<HomeSnapshot />
					</Suspense>
					
					<div className="mt-6 mb-2">
						<h3 className="text-[15px] font-medium text-text mb-3">Transactions</h3>
						{isLoading ? (
							<div className="space-y-3">
								{[1, 2, 3].map((i) => (
									<div key={i} className="p-4 bg-surface rounded-[20px] animate-pulse flex items-center justify-between">
										<div className="flex items-center gap-3">
											<div className="w-10 h-10 rounded-full bg-border/40" />
											<div className="space-y-1.5">
												<div className="w-24 h-4 bg-border/40 rounded" />
												<div className="w-16 h-3 bg-border/30 rounded" />
											</div>
										</div>
										<div className="w-16 h-5 bg-border/40 rounded" />
									</div>
								))}
							</div>
						) : loadError ? (
							<div className="p-6 bg-surface rounded-[24px] text-center flex flex-col items-center">
								<AnimatedLogo state="error" size={56} className="mb-2" title="Could not load transactions" />
								<p className="text-sm text-danger font-medium mb-1">Could not load transactions</p>
								<p className="text-xs text-text-muted mb-3">{loadError}</p>
								<button
									onClick={() => {
										useTransactionStore.setState({ isLoading: true, loadError: null });
										syncService.syncAll({ force: true }).then(() => {
											loadMonth(selectedYear, selectedMonth);
											loadAllTransactions();
										}).finally(() => {
											useTransactionStore.setState({ isLoading: false });
										});
									}}
									className="px-4 py-1.5 text-xs font-medium bg-ink text-white rounded-full hover:opacity-90 transition-opacity"
								>
									Retry
								</button>
							</div>
						) : dayGroups.length > 0 ? (
							dayGroups.map((group) => <TransactionList key={group.date} group={group} />)
						) : (
							<div className="p-8 bg-surface rounded-[24px] text-center flex flex-col items-center justify-center">
								<AnimatedLogo state="idle" size={52} className="mb-2 opacity-85" title="No transactions yet" />
								<p className="text-sm font-medium text-text">No transactions this month</p>
								<p className="text-xs text-text-muted mt-0.5">Tap + below to add your first expense</p>
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
