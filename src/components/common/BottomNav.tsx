import { NavLink, useLocation } from 'react-router';
import { Home, LayoutDashboard, Sliders, UserCheck, BarChart3, User } from 'lucide-react';

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

	return (
		<nav
			className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center justify-between p-2 rounded-[32px] bg-ink w-[calc(100%-32px)] max-w-[420px]"
			role="navigation"
			aria-label="Bottom Navigation"
		>
			{NAV_ITEMS.map(({ to, icon: Icon, label }) => {
				const isActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);
				
				return (
					<NavLink
						key={to}
						to={to}
						title={label}
						aria-label={label}
						className={`relative flex items-center justify-center rounded-full cursor-pointer transition-colors duration-200 ${
							isActive ? 'w-11 h-11 bg-mint text-ink' : 'w-10 h-10 text-white hover:bg-ink-soft'
						}`}
					>
						<Icon
							size={isActive ? 22 : 20}
							strokeWidth={isActive ? 2 : 1.5}
							className="transition-transform duration-200"
						/>
					</NavLink>
				);
			})}
		</nav>
	);
}
