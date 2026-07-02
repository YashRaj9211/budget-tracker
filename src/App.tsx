import './App.css';
import './styles/gradient.css';
import { Outlet } from 'react-router';
// import BottomNav from './components/common/BottomNav';

function App() {
	return (
		<>
			<div className="relative z-10 pb-24">
				<Outlet />
			</div>
			{/* <BottomNav /> */}
		</>
	);
}

export default App;
