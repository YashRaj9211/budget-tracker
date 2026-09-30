import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router';
import { Home, LayoutDashboard, Sliders, UserCheck, BarChart3, User } from 'lucide-react';
import { motion } from 'motion/react';

const NAV_ITEMS = [
	{ to: '/', icon: Home, label: 'Home' },
	{ to: '/hub', icon: LayoutDashboard, label: 'Finance Hub' },
	{ to: '/split', icon: Sliders, label: 'Split Expenses' },
	{ to: '/friends', icon: UserCheck, label: 'Friends' },
	{ to: '/stats', icon: BarChart3, label: 'Analytics' },
	{ to: '/profile', icon: User, label: 'Profile' },
];

export default function BottomNav() {
	const location = useLocation();
	const prevIndexRef = useRef<number>(0);
	const [direction, setDirection] = useState<'right' | 'left' | null>(null);

	const currentIndex = Math.max(
		0,
		NAV_ITEMS.findIndex((item) =>
			item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)
		)
	);

	useEffect(() => {
		if (prevIndexRef.current !== currentIndex) {
			setDirection(currentIndex > prevIndexRef.current ? 'right' : 'left');
			prevIndexRef.current = currentIndex;
		}
	}, [currentIndex]);

	// Water droplet tail / teardrop styling dynamically based on movement direction
	const dropletBorderRadius =
		direction === 'right'
			? '24px 38px 38px 24px' // Leading edge rounds out, trailing edge tapers
			: direction === 'left'
			? '38px 24px 24px 38px'
			: '9999px';

	return (
		<nav
			className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center gap-1 sm:gap-1.5 p-1.5 rounded-full bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] max-w-[95vw] select-none"
			role="navigation"
			aria-label="Bottom Navigation"
		>
			{NAV_ITEMS.map(({ to, icon: Icon, label }) => (
				<NavLink
					key={to}
					to={to}
					title={label}
					aria-label={label}
					className={({ isActive }) =>
						`relative flex items-center justify-center rounded-full cursor-pointer transition-colors duration-200 ${
							isActive
								? 'text-white px-3 sm:px-3.5 py-2'
								: 'text-neutral-700 hover:text-black hover:bg-neutral-100 px-2 sm:px-2.5 py-2'
						}`
					}
				>
					{({ isActive }) => (
						<>
							{isActive && (
								<motion.span
									layoutId="nav-droplet"
									className="absolute inset-0 bg-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.25)] origin-center pointer-events-none"
									style={{ borderRadius: dropletBorderRadius }}
									initial={{ scaleX: 1, scaleY: 1 }}
									animate={{
										scaleX: [1, 1.45, 0.88, 1.05, 1],
										scaleY: [1, 0.72, 1.15, 0.96, 1],
										borderRadius: ['9999px', dropletBorderRadius, '9999px'],
									}}
									transition={{
										layout: {
											type: 'spring',
											stiffness: 340,
											damping: 24,
											mass: 0.75,
										},
										scaleX: { duration: 0.48, ease: [0.22, 1.25, 0.36, 1] },
										scaleY: { duration: 0.48, ease: [0.22, 1.25, 0.36, 1] },
										borderRadius: { duration: 0.45, ease: 'easeOut' },
									}}
								>
									{/* Top specular water droplet light glint */}
									<span className="absolute top-1 left-2 w-2.5 h-1 rounded-full bg-white/35 blur-[0.4px]" />
									{/* Secondary trailing mini bubble/reflection */}
									<span className="absolute bottom-1 right-2 w-1 h-1 rounded-full bg-white/15" />
								</motion.span>
							)}
							<span className="relative z-10 flex items-center justify-center">
								<Icon
									size={20}
									strokeWidth={isActive ? 2.5 : 2.2}
									className="transition-transform duration-200"
								/>
							</span>
						</>
					)}
				</NavLink>
			))}
		</nav>
	);
}


