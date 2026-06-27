import './App.css';
import './styles/gradient.css';
import Home from './pages/Home';

function App() {
	return (
		<div className="relative min-h-screen overflow-hidden">
			{/* Top violet streak */}
			{/* <div className="gradient-top" /> */}

			{/* Bottom aurora */}
			{/* <div className="gradient-bottom" /> */}

			{/* Grid pattern — unchanged */}
			{/* <div
				className="absolute inset-0 pointer-events-none z-0"
				style={{
					backgroundImage: `
        linear-gradient(to right, rgba(99, 102, 241, 0.045) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(99, 102, 241, 0.045) 1px, transparent 1px)
      `,
					backgroundSize: '44px 44px',
				}}
			/> */}

			<div className="relative z-10 px-4 py-2 pb-20">
				<Home />
			</div>
		</div>
	);
}

export default App;
