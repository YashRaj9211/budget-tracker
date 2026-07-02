import { NavLink } from 'react-router';
import { Home, BarChart3, Sliders } from 'lucide-react';

export default function BottomNav() {
	return (
		<nav className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md bg-white border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-50 flex items-stretch">
			{/* Home Link */}
			<NavLink
				to="/"
				className={({ isActive }) =>
					`flex-1 flex flex-col items-center justify-center py-2 text-xs font-black uppercase tracking-wider text-black border-r-3 border-black transition-all ${
						isActive ? 'bg-[#bde2ff]' : 'bg-white hover:bg-gray-50'
					}`
				}
			>
				<Home size={18} className="mb-0.5 stroke-[2.5]" />
				<span>Home</span>
			</NavLink>

			{/* Stats Link */}
			<NavLink
				to="/stats"
				className={({ isActive }) =>
					`flex-1 flex flex-col items-center justify-center py-2 text-xs font-black uppercase tracking-wider text-black border-r-3 border-black transition-all ${
						isActive ? 'bg-[#e4b5fe]' : 'bg-white hover:bg-gray-50'
					}`
				}
			>
				<BarChart3 size={18} className="mb-0.5 stroke-[2.5]" />
				<span>Stats</span>
			</NavLink>

			{/* Budget Link */}
			<NavLink
				to="/budget"
				className={({ isActive }) =>
					`flex-1 flex flex-col items-center justify-center py-2 text-xs font-black uppercase tracking-wider text-black transition-all ${
						isActive ? 'bg-[#fecaca]' : 'bg-white hover:bg-gray-50'
					}`
				}
			>
				<Sliders size={18} className="mb-0.5 stroke-[2.5]" />
				<span>Budget</span>
			</NavLink>
		</nav>
	);
}
