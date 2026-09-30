import './App.css';
import BottomNav from './components/common/BottomNav';
import './styles/gradient.css';
import { Outlet } from 'react-router';
import { useAuthStore } from './stores/authStore';
import { useWebSocket } from './hooks/useWebSocket';

function App() {
	const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
	useWebSocket();

	return (
		<div className="w-full max-w-md mx-auto min-h-screen bg-white text-black relative flex flex-col overflow-x-hidden">
			<main className={`flex-1 w-full ${isAuthenticated ? 'px-3.5 pt-3 pb-24' : 'px-3.5 py-4 flex items-center justify-center'}`}>
				<Outlet />
			</main>
			{isAuthenticated && <BottomNav />}
		</div>
	);
}

export default App;

