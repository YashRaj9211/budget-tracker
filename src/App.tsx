import './App.css';
import BottomNav from './components/common/BottomNav';
import './styles/gradient.css';
import { Outlet } from 'react-router';
import { useAuthStore } from './stores/authStore';

function App() {
	const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

	return (
		<>
			<div className="relative z-10 pb-24">
				<Outlet />
			</div>
			{isAuthenticated && <BottomNav />}
		</>
	);
}

export default App;

