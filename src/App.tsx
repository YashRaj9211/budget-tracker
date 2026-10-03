import { useEffect } from 'react';
import './App.css';
import BottomNav from './components/common/BottomNav';
import SyncStatusBanner from './components/common/SyncStatusBanner';
import './styles/gradient.css';
import { Outlet } from 'react-router';
import ToastContainer from './components/common/ToastContainer';
import { useAuthStore } from './stores/authStore';
import { useWebSocket } from './hooks/useWebSocket';
import { syncService } from './services/syncService';

import { toast } from './stores/toastStore';

function App() {
	const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
	const { onEvent } = useWebSocket();

	useEffect(() => {
		syncService.init();
		if (isAuthenticated) {
			syncService.syncAll();
		}
	}, [isAuthenticated]);

	// Global live notification toasts
	useEffect(() => {
		if (!isAuthenticated) return;

		const unsubReq = onEvent('FRIEND_REQUEST_RECEIVED', () => {
			toast.info('You have received a new friend request!', { title: 'Friend Request' });
		});

		const unsubAcc = onEvent('FRIEND_REQUEST_ACCEPTED', () => {
			toast.success('Your friend request was accepted!', { title: 'Friends' });
		});

		return () => {
			unsubReq();
			unsubAcc();
		};
	}, [isAuthenticated, onEvent]);

	return (
		<div className="w-full max-w-md mx-auto min-h-screen bg-white text-black relative flex flex-col overflow-x-hidden">
			<ToastContainer />
			<main className={`flex-1 w-full ${isAuthenticated ? 'px-3.5 pt-3 pb-24' : 'px-3.5 py-4 flex items-center justify-center'}`}>
				<SyncStatusBanner />
				<Outlet />
			</main>
			{isAuthenticated && <BottomNav />}
		</div>
	);
}

export default App;

