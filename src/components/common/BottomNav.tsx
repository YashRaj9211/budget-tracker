import { NavLink, useNavigate, useLocation } from 'react-router';
import { Home, BarChart3, Sliders } from 'lucide-react';
import { useState } from 'react';

export default function BottomNav() {
	const navigate = useNavigate();
	const location = useLocation();
	
	const [bubbleStyle, setBubbleStyle] = useState<React.CSSProperties | null>(null);
	const [isAnimating, setIsAnimating] = useState(false);

	const handleNavClick = (e: React.MouseEvent, path: string) => {
		// Prevent click if already on that page or currently animating
		if (location.pathname === path || isAnimating) {
			e.preventDefault();
			return;
		}
		
		e.preventDefault(); // Stop NavLink from navigating immediately
		
		setIsAnimating(true);
		
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		// Bubble starts from the center of the clicked tab
		const x = rect.left + rect.width / 2;
		const y = rect.top + rect.height / 2;
		
		// 1. Initial state (small bubble)
		setBubbleStyle({
			left: x,
			top: y,
			transform: 'translate(-50%, -50%) scale(0)',
			opacity: 1
		});
		
		// 2. Expand after a tiny delay to ensure initial state is rendered
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				setBubbleStyle({
					left: x,
					top: y,
					transform: 'translate(-50%, -50%) scale(150)', // Large enough to cover screen
					opacity: 1,
					transition: 'transform 1s cubic-bezier(0.4, 0, 0.2, 1)'
				});
			});
		});
		
		// 3. After expansion (400ms), navigate and start shrinking
		setTimeout(() => {
			navigate(path);
			
			// Start shrinking
			setBubbleStyle({
				left: x,
				top: y,
				transform: 'translate(-50%, -50%) scale(0)',
				opacity: 1,
				transition: 'transform 1s cubic-bezier(0.4, 0, 0.2, 1)'
			});
			
			// 4. Cleanup after shrink
			setTimeout(() => {
				setBubbleStyle(null);
				setIsAnimating(false);
			}, 1000);
		}, 1000);
	};

	return (
		<>
			{/* The Bubble Overlay */}
			{bubbleStyle && (
				<div 
					className="fixed w-5 h-5 bg-black rounded-full pointer-events-none z-[100]"
					style={bubbleStyle}
				/>
			)}

			<nav className="fixed bottom-0 p-4 w-full flex justify-around z-50 text-white bg-black -translate-x-4">
				<NavLink 
					to={'/'} 
					onClick={(e) => handleNavClick(e, '/')}
					className={`flex flex-col items-center`}
				>
					<Home className="w-6 h-6" />
					Home
				</NavLink>
				<NavLink 
					to={'/stats'} 
					onClick={(e) => handleNavClick(e, '/stats')}
					className={`flex flex-col items-center`}
				>
					<BarChart3 className="w-6 h-6" />
					Stats
				</NavLink>
				<NavLink 
					to={'/split'} 
					onClick={(e) => handleNavClick(e, '/split')}
					className={`flex flex-col items-center`}
				>
					<Sliders className="w-6 h-6" />
					Split
				</NavLink>
			</nav>
		</>
	);
}