import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import {
	ArrowLeft,
	User as UserIcon,
	Mail,
	Phone,
	Sliders,
	LayoutDashboard,
	UserCheck,
	BarChart3,
	LogOut,
	ShieldAlert,
	Smartphone,
	CheckCircle,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

export default function Profile() {
	const navigate = useNavigate();
	const user = useAuthStore((s) => s.user);
	const logout = useAuthStore((s) => s.logout);
	const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

	const handleLogout = () => {
		logout();
		navigate('/login');
	};

	const initials = user?.name
		? user.name
				.split(' ')
				.map((n) => n[0])
				.join('')
				.toUpperCase()
				.slice(0, 2)
		: user?.username
		? user.username.slice(0, 2).toUpperCase()
		: 'U';

	return (
		<div className="space-y-4 pb-28">
			{/* Top Bar Header */}
			<div className="border-2 border-black p-3.5 bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-between">
				<div className="flex items-center gap-2.5">
					<button
						onClick={() => navigate(-1)}
						className="p-1.5 hover:bg-gray-100 border border-black transition-all cursor-pointer shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
						aria-label="Go back"
					>
						<ArrowLeft size={16} />
					</button>
					<div>
						<h1 className="text-base font-black text-black uppercase tracking-wider leading-none">
							Profile & Account
						</h1>
						<p className="text-[10px] text-gray-500 font-bold mt-0.5">
							Manage your session and settings
						</p>
					</div>
				</div>

				<div className="flex items-center gap-1">
					<span className="text-[10px] font-black uppercase px-2 py-0.5 bg-[#bde2ff] border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
						Mobile
					</span>
				</div>
			</div>

			{/* User Info Card */}
			<div className="border-2 border-black p-4 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4">
				<div className="flex items-center gap-3.5">
					<div className="w-14 h-14 bg-[#fefed4] border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center font-black text-xl text-black shrink-0">
						{initials}
					</div>
					<div className="flex-1 min-w-0">
						<h2 className="text-base font-black text-black truncate uppercase tracking-tight">
							{user?.name || user?.username || 'Budget User'}
						</h2>
						<p className="text-xs font-bold text-gray-600 truncate">
							@{user?.username || 'user'}
						</p>
						<div className="mt-1 flex items-center gap-1.5">
							<span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 border border-emerald-500">
								<CheckCircle size={10} /> Active Session
							</span>
						</div>
					</div>
				</div>

				{/* Contact Details */}
				<div className="border border-black/20 divide-y divide-black/10 bg-gray-50 text-xs">
					<div className="p-2.5 flex items-center gap-2.5">
						<Mail size={14} className="text-gray-500 shrink-0" />
						<div className="flex-1 min-w-0">
							<span className="text-[10px] font-bold uppercase text-gray-400 block">Email</span>
							<span className="font-bold text-black truncate block">{user?.email || 'None'}</span>
						</div>
					</div>
					<div className="p-2.5 flex items-center gap-2.5">
						<Phone size={14} className="text-gray-500 shrink-0" />
						<div className="flex-1 min-w-0">
							<span className="text-[10px] font-bold uppercase text-gray-400 block">Phone</span>
							<span className="font-bold text-black truncate block">
								{user?.phone || 'Not provided'}
							</span>
						</div>
					</div>
				</div>
			</div>

			{/* Quick Shortcuts */}
			<div className="space-y-2">
				<h3 className="text-xs font-black text-black uppercase tracking-wider px-0.5">
					Management Shortcuts
				</h3>
				<div className="grid grid-cols-2 gap-2">
					<Link
						to="/budget"
						className="p-3 border-2 border-black bg-white hover:bg-yellow-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex flex-col gap-1 cursor-pointer"
					>
						<div className="flex items-center justify-between">
							<Sliders size={16} className="text-black" />
							<span className="text-[10px] font-black uppercase text-gray-400">Limits</span>
						</div>
						<span className="text-xs font-black text-black">Budget Settings</span>
						<span className="text-[10px] font-semibold text-gray-500">Configure allowance</span>
					</Link>

					<Link
						to="/hub"
						className="p-3 border-2 border-black bg-white hover:bg-blue-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex flex-col gap-1 cursor-pointer"
					>
						<div className="flex items-center justify-between">
							<LayoutDashboard size={16} className="text-black" />
							<span className="text-[10px] font-black uppercase text-gray-400">Overview</span>
						</div>
						<span className="text-xs font-black text-black">Finance Hub</span>
						<span className="text-[10px] font-semibold text-gray-500">Live balance stats</span>
					</Link>

					<Link
						to="/friends"
						className="p-3 border-2 border-black bg-white hover:bg-emerald-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex flex-col gap-1 cursor-pointer"
					>
						<div className="flex items-center justify-between">
							<UserCheck size={16} className="text-black" />
							<span className="text-[10px] font-black uppercase text-gray-400">Social</span>
						</div>
						<span className="text-xs font-black text-black">Friends</span>
						<span className="text-[10px] font-semibold text-gray-500">Manage connections</span>
					</Link>

					<Link
						to="/stats"
						className="p-3 border-2 border-black bg-white hover:bg-purple-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex flex-col gap-1 cursor-pointer"
					>
						<div className="flex items-center justify-between">
							<BarChart3 size={16} className="text-black" />
							<span className="text-[10px] font-black uppercase text-gray-400">Reports</span>
						</div>
						<span className="text-xs font-black text-black">Analytics</span>
						<span className="text-[10px] font-semibold text-gray-500">Trends & breakdown</span>
					</Link>
				</div>
			</div>

			{/* App Specifications */}
			<div className="border border-black p-3 bg-gray-50 flex items-center justify-between text-xs">
				<div className="flex items-center gap-2 text-gray-600">
					<Smartphone size={14} />
					<span className="font-bold">App Edition</span>
				</div>
				<span className="font-black text-black uppercase text-[10px] bg-white px-2 py-0.5 border border-black">
					Mobile-First v1.0
				</span>
			</div>

			{/* Logout / Session Option */}
			<div className="border-2 border-black p-4 bg-rose-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-3">
				<div className="flex items-center gap-2 text-rose-900 font-black text-xs uppercase tracking-wider">
					<ShieldAlert size={16} />
					Session Security
				</div>

				<p className="text-xs text-rose-800 font-medium leading-relaxed">
					Log out to disconnect active live synchronization and clear your local credentials on this device.
				</p>

				{showLogoutConfirm ? (
					<div className="space-y-2 pt-1">
						<p className="text-xs font-black text-rose-950 uppercase text-center">
							Are you sure you want to log out?
						</p>
						<div className="flex gap-2">
							<button
								onClick={handleLogout}
								className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-1.5 cursor-pointer"
							>
								<LogOut size={14} />
								Yes, Log Out
							</button>
							<button
								onClick={() => setShowLogoutConfirm(false)}
								className="flex-1 py-2 px-3 bg-white hover:bg-gray-100 text-black font-black text-xs uppercase tracking-wider border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
							>
								Cancel
							</button>
						</div>
					</div>
				) : (
					<button
						onClick={() => setShowLogoutConfirm(true)}
						className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer"
					>
						<LogOut size={15} />
						Log Out
					</button>
				)}
			</div>
		</div>
	);
}
