import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import {
	User,
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
	FileSpreadsheet,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import ExcelTools from '../components/common/ExcelTools';
import { Card } from '../components/ui/Card';
import { Button } from '../components/common/Button';
import Chip from '../components/ui/Chip';

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
		? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
		: user?.username
		? user.username.slice(0, 2).toUpperCase()
		: 'U';

	const shortcuts = [
		{ to: '/budget', icon: Sliders, label: 'Budget settings', caption: 'Configure allowance', variant: 'mint' as const },
		{ to: '/hub', icon: LayoutDashboard, label: 'Finance hub', caption: 'Live balance stats', variant: 'lavender' as const },
		{ to: '/friends', icon: UserCheck, label: 'Friends', caption: 'Manage connections', variant: 'white' as const },
		{ to: '/stats', icon: BarChart3, label: 'Analytics', caption: 'Trends & breakdown', variant: 'white' as const },
	];

	return (
		<div className="space-y-3 pb-28">
			{/* Title */}
			<div className="mb-4">
				<h1 className="text-[20px] font-medium text-text flex items-center gap-2">
					<User className="w-5 h-5 text-text-muted" strokeWidth={1.5} /> Profile & account
				</h1>
				<p className="text-[12px] text-text-muted mt-0.5">Manage your session and settings</p>
			</div>

			{/* Profile hero card */}
			<Card variant="ink">
				<div className="flex items-center gap-4">
					<div className="w-14 h-14 rounded-full bg-mint flex items-center justify-center font-medium text-xl text-ink shrink-0">
						{initials}
					</div>
					<div className="flex-1 min-w-0">
						<h2 className="text-[15px] font-medium text-white truncate">
							{user?.name || user?.username || 'Budget User'}
						</h2>
						<p className="text-[12px] text-text-on-ink-muted truncate">@{user?.username || 'user'}</p>
						<div className="mt-2">
							<Chip variant="positive">
								<CheckCircle size={10} className="mr-1" /> Active session
							</Chip>
						</div>
					</div>
				</div>
			</Card>

			{/* Contact info */}
			<Card variant="white" className="!p-0">
				{[
					{ icon: Mail, label: 'Email', value: user?.email || 'None' },
					{ icon: Phone, label: 'Phone', value: user?.phone || 'Not provided' },
				].map((row, i) => (
					<div key={row.label} className={`flex items-center gap-3 px-5 py-3.5 ${i > 0 ? 'border-t border-black/5' : ''}`}>
						<row.icon size={16} className="text-text-muted shrink-0" strokeWidth={1.5} />
						<div>
							<span className="text-[12px] text-text-muted block">{row.label}</span>
							<span className="text-[14px] font-medium text-text">{row.value}</span>
						</div>
					</div>
				))}
			</Card>

			{/* Management shortcuts 2x2 */}
			<div>
				<h3 className="text-[12px] text-text-muted mb-3 px-1">Management shortcuts</h3>
				<div className="grid grid-cols-2 gap-3">
					{shortcuts.map((s) => (
						<Link
							key={s.to}
							to={s.to}
							className="block active:scale-[0.98] transition-transform"
						>
							<Card variant={s.variant} nested className="flex flex-col gap-2">
								<div className={`w-8 h-8 rounded-full flex items-center justify-center ${s.variant === 'white' ? 'bg-surface text-text' : 'bg-black/10 text-text'}`}>
									<s.icon size={16} strokeWidth={1.5} />
								</div>
								<span className="text-[14px] font-medium text-text">{s.label}</span>
								<span className="text-[12px] text-text-muted">{s.caption}</span>
							</Card>
						</Link>
					))}
				</div>
			</div>

			{/* Excel backup */}
			<Card variant="white" className="space-y-3">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-full bg-mint flex items-center justify-center shrink-0">
						<FileSpreadsheet size={18} className="text-ink" strokeWidth={1.5} />
					</div>
					<div className="flex-1 min-w-0">
						<h3 className="text-[14px] font-medium text-text">Excel backup</h3>
						<p className="text-[12px] text-text-muted">Import or export transaction data</p>
					</div>
				</div>
				<ExcelTools />
			</Card>

			{/* App edition */}
			<Card variant="light" nested className="flex items-center justify-between">
				<div className="flex items-center gap-2 text-text-muted">
					<Smartphone size={16} strokeWidth={1.5} />
					<span className="text-[12px]">App edition</span>
				</div>
				<Chip variant="neutral">Mobile-First v1.0</Chip>
			</Card>

			{/* Logout */}
			<Card variant="white">
				<div className="flex items-center gap-2 text-danger mb-3">
					<ShieldAlert size={16} strokeWidth={1.5} />
					<span className="text-[14px] font-medium">Session security</span>
				</div>
				<p className="text-[12px] text-text-muted mb-4 leading-relaxed">
					Log out to disconnect active live synchronization and clear your local credentials on this device.
				</p>
				{showLogoutConfirm ? (
					<div className="space-y-2">
						<p className="text-[12px] text-text text-center mb-3">Are you sure you want to log out?</p>
						<div className="flex gap-2">
							<Button variant="primary" onClick={handleLogout} className="flex-1 flex items-center justify-center gap-1.5 !bg-danger">
								<LogOut size={14} /> Yes, log out
							</Button>
							<Button variant="secondary" onClick={() => setShowLogoutConfirm(false)} className="flex-1">
								Cancel
							</Button>
						</div>
					</div>
				) : (
					<Button
						variant="secondary"
						onClick={() => setShowLogoutConfirm(true)}
						className="w-full flex items-center justify-center gap-2 !border-danger !text-danger"
					>
						<LogOut size={15} strokeWidth={1.5} /> Log out
					</Button>
				)}
			</Card>
		</div>
	);
}
