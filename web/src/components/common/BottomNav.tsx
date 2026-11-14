import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useSearchParams } from 'react-router';
import { FINANCE_TABS, parseFinanceTab } from '../../utils/financeTabs';
import { Home, Wallet, Sliders, UserCheck, BarChart3, User, Plus } from 'lucide-react';

const NAV_ITEMS = [
	{ to: '/', icon: Home, label: 'Home' },
	{ to: '/hub', icon: Wallet, label: 'Finance' },
	{ to: '/split', icon: Sliders, label: 'Split' },
	{ to: '/friends', icon: UserCheck, label: 'Friends' },
	{ to: '/stats', icon: BarChart3, label: 'Analytics' },
	{ to: '/profile', icon: User, label: 'Profile' },
];

// Shown directly in the bar; everything else lives in the expanded grid.
const PRIMARY = ['/', '/hub', '/friends'];

// Grid metrics. Panel height is derived from the item count so the blob shape
// always matches the tiles; beyond MAX_ROWS the grid scrolls inside the panel.
const COLS = 4;
const TILE_H = 76;
const GAP = 8;
const PAD = 12;
const MAX_ROWS = 3;
const STRIP_H = 64;

const isRouteActive = (to: string, pathname: string) =>
	to === '/'
		? pathname === '/'
		: to === '/hub'
			? ['/hub', '/finance', '/money'].some((p) => pathname.startsWith(p))
			: pathname.startsWith(to);

export default function BottomNav() {
	const { pathname } = useLocation();
	const [open, setOpen] = useState(false);
	const [searchParams] = useSearchParams();
	const onFinance = pathname === '/hub' || pathname === '/finance' || pathname === '/money';
	const financeTab = parseFinanceTab(searchParams.get('tab'));

	// Close the menu whenever the route changes.
	// Exception: arriving on Finance keeps it open so a section can be picked from the strip.
	useEffect(() => {
		if (!onFinance) setOpen(false);
	}, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [open]);

	const rows = Math.min(Math.ceil(NAV_ITEMS.length / COLS), MAX_ROWS);
	const panelH =
		rows * TILE_H + (rows - 1) * GAP + PAD * 2 + (onFinance ? STRIP_H + GAP : 0);

	const primary = NAV_ITEMS.filter((i) => PRIMARY.includes(i.to));
	const secondaryActive = NAV_ITEMS.some((i) => !PRIMARY.includes(i.to) && isRouteActive(i.to, pathname));

	return (
		<>
			{/* Blurred backdrop */}
			<div
				onClick={() => setOpen(false)}
				aria-hidden="true"
				className={`fixed inset-0 z-20 bg-black/30 backdrop-blur-md transition-opacity ${open ? 'duration-300' : 'duration-700'} ${
					open ? 'opacity-100' : 'opacity-0 pointer-events-none'
				}`}
			/>

			<div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 w-[calc(100%-32px)] max-w-[420px] h-[60px]">
				{/* Gooey filter: blurs then thresholds alpha so nearby shapes fuse like water droplets */}
				<svg width="0" height="0" className="absolute" aria-hidden="true">
					<defs>
						<filter id="nav-goo" x="-20%" y="-20%" width="140%" height="140%">
							<feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur" />
							<feColorMatrix
								in="blur"
								mode="matrix"
								values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9"
							/>
						</filter>
					</defs>
				</svg>

				{/* Filtered shapes (background only) */}
				<div
					aria-hidden="true"
					className="absolute -left-5 -right-5 -bottom-5 h-[420px] pointer-events-none"
					style={{ filter: 'url(#nav-goo)' }}
				>
					{/* Panel */}
					<div
						className={`absolute left-5 right-5 rounded-[28px] bg-ink transition-all ${open ? 'duration-500' : 'duration-[900ms]'} ease-[cubic-bezier(0.32,0.72,0,1)]`}
						style={{ bottom: 72, height: open ? panelH : 0, opacity: open ? 1 : 0 }}
					/>
					{/* Bar: stretches into the circle when open */}
					<div
						className={`absolute left-5 bottom-5 h-[60px] rounded-[30px] bg-ink transition-all ${open ? 'duration-500' : 'duration-[900ms]'} ease-[cubic-bezier(0.32,0.72,0,1)]`}
						style={{ right: open ? 20 : 92 }}
					/>
					{/* Circle */}
					<div className="absolute right-5 bottom-5 w-[60px] h-[60px] rounded-full bg-ink" />
				</div>

				{/* Expanded grid content */}
				<div
					id="nav-grid"
					role="menu"
					aria-hidden={!open}
					style={{ height: panelH, padding: PAD, gap: GAP, gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`, gridAutoRows: TILE_H, ...(onFinance ? { gridTemplateRows: `${STRIP_H}px` } : {}) }}
					className={`absolute left-0 right-0 bottom-[52px] grid overflow-y-auto overscroll-contain rounded-[28px] transition-opacity ${open ? 'duration-300' : 'duration-[600ms]'} [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
						open ? 'opacity-100 delay-200' : 'opacity-0 pointer-events-none delay-100'
					}`}
				>
					{onFinance && (
						<div
							style={{ gridColumn: '1 / -1' }}
							className={`flex items-stretch gap-1 transition-all duration-300 ${
								open ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
							}`}
						>
							{FINANCE_TABS.map(({ id, label, icon: Icon }) => {
								const active = financeTab === id;
								return (
									<Link
										key={id}
										to={id === 'overview' ? '/hub' : `/hub?tab=${id}`}
										replace
										role="menuitem"
										tabIndex={open ? 0 : -1}
										className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-medium ${
											active ? 'bg-mint text-ink' : 'bg-white/10 text-white hover:bg-white/20'
										}`}
									>
										<Icon size={18} strokeWidth={active ? 2 : 1.5} />
										{label}
									</Link>
								);
							})}
						</div>
					)}
					{NAV_ITEMS.map(({ to, icon: Icon, label }, i) => {
						const active = isRouteActive(to, pathname);
						return (
							<NavLink
								key={to}
								to={to}
								role="menuitem"
								tabIndex={open ? 0 : -1}
								style={{ transitionDelay: open ? `${150 + i * 35}ms` : '0ms' }}
								className={`flex flex-col items-center justify-center gap-1.5 min-w-0 rounded-2xl text-[11px] font-medium transition-all duration-300 ${
									open ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
								} ${active ? 'bg-mint text-ink' : 'bg-white/10 text-white hover:bg-white/20'}`}
							>
								<Icon size={22} strokeWidth={active ? 2 : 1.5} />
								{label}
							</NavLink>
						);
					})}
				</div>

				{/* Bar items */}
				<nav
					className="absolute left-0 bottom-0 h-[60px] w-[calc(100%-72px)] flex items-center justify-between p-2"
					role="navigation"
					aria-label="Bottom Navigation"
				>
					{primary.map(({ to, icon: Icon, label }) => {
						const active = isRouteActive(to, pathname);
						return (
							<NavLink
								key={to}
								to={to}
								title={label}
								aria-label={label}
								className={`flex items-center justify-center gap-2 h-11 rounded-full cursor-pointer transition-all duration-300 ${
									active ? 'px-4 bg-mint text-ink' : 'w-11 text-white hover:bg-ink-soft'
								}`}
							>
								<Icon size={20} strokeWidth={active ? 2 : 1.5} />
								{active && <span className="text-sm font-semibold">{label}</span>}
							</NavLink>
						);
					})}
				</nav>

				{/* Plus button (own circle) */}
				<button
					type="button"
					onClick={() => setOpen((o) => !o)}
					aria-label={open ? 'Close menu' : 'Open menu'}
					aria-expanded={open}
					aria-controls="nav-grid"
					className="absolute right-0 bottom-0 w-[60px] h-[60px] flex items-center justify-center rounded-full cursor-pointer"
				>
					<span
						className={`flex items-center justify-center w-11 h-11 rounded-full transition-colors duration-300 ${
							open ? 'bg-white text-ink' : secondaryActive ? 'bg-mint text-ink' : 'bg-ink-soft text-white'
						}`}
					>
						<Plus
							size={22}
							strokeWidth={2}
							className={`transition-transform duration-300 ${open ? 'rotate-[135deg]' : 'rotate-0'}`}
						/>
					</span>
				</button>
			</div>
		</>
	);
}
