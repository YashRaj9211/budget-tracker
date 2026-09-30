import { useEffect, useState, useTransition } from 'react';
import { UserCheck, UserPlus, Clock, Check, X, Mail, ShieldAlert, Sparkles } from 'lucide-react';
import { friendshipApi, type Friendship, type FriendItem } from '../api/financeHubApi';
import { useWebSocket } from '../hooks/useWebSocket';

export default function Friends() {
	const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends');
	const [friends, setFriends] = useState<FriendItem[]>([]);
	const [friendships, setFriendships] = useState<Friendship[]>([]);
	const [emailInput, setEmailInput] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [successMsg, setSuccessMsg] = useState<string | null>(null);
	const [, startTransition] = useTransition();

	const { onEvent } = useWebSocket();

	const loadData = async () => {
		setIsLoading(true);
		setError(null);
		try {
			const [friendsRes, friendshipsRes] = await Promise.all([
				friendshipApi.getAcceptedFriends(),
				friendshipApi.getAllFriendships(),
			]);
			setFriends(friendsRes || []);
			setFriendships(friendshipsRes || []);
		} catch (err: any) {
			setError(err.message || 'Failed to load friends');
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		loadData();
		(window as any).hideSplashScreen?.();
	}, []);

	// Live sync with WebSocket events from backend
	useEffect(() => {
		const unsubAccept = onEvent('FRIEND_REQUEST_ACCEPTED', () => loadData());
		const unsubReceive = onEvent('FRIEND_REQUEST_RECEIVED', () => loadData());
		const unsubReject = onEvent('FRIEND_REQUEST_REJECTED', () => loadData());

		return () => {
			unsubAccept();
			unsubReceive();
			unsubReject();
		};
	}, [onEvent]);

	const handleSendRequest = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!emailInput.trim()) return;

		setError(null);
		setSuccessMsg(null);
		try {
			await friendshipApi.sendRequest(emailInput.trim());
			setSuccessMsg(`Friend request sent to ${emailInput}`);
			setEmailInput('');
			loadData();
		} catch (err: any) {
			setError(err.message || 'Failed to send friend request');
		}
	};

	const handleAccept = async (friendId: string) => {
		try {
			await friendshipApi.acceptRequest(friendId);
			loadData();
		} catch (err: any) {
			setError(err.message || 'Failed to accept friend request');
		}
	};

	const handleReject = async (friendId: string) => {
		try {
			await friendshipApi.rejectRequest(friendId);
			loadData();
		} catch (err: any) {
			setError(err.message || 'Failed to reject friend request');
		}
	};

	const pendingRequests = friendships.filter((f) => f.status === 'PENDING');

	return (
		<div className="w-full space-y-4 pb-28">
			{/* Header */}
			<div className="border-[3px] border-black p-4 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-xl font-black text-black uppercase tracking-wider flex items-center gap-1.5">
							<UserCheck className="w-6 h-6" /> Friends Hub
						</h1>
						<p className="text-[10px] text-black/60 font-bold mt-0.5">
							Manage your splitwise connections
						</p>
					</div>
					<span className="bg-yellow-300 border-2 border-black font-black text-xs px-2.5 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
						{friends.length} Friends
					</span>
				</div>
			</div>

			{/* Add Friend Input Form */}
			<form
				onSubmit={handleSendRequest}
				className="border-[3px] border-black p-5 bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-3"
			>
				<h2 className="text-sm font-black uppercase tracking-wide flex items-center gap-2 text-black">
					<UserPlus className="w-4 h-4" /> Add Friend by Email
				</h2>
				<div className="flex gap-2">
					<div className="relative flex-1">
						<Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" />
						<input
							type="email"
							placeholder="friend@example.com"
							value={emailInput}
							onChange={(e) => setEmailInput(e.target.value)}
							required
							className="w-full pl-9 pr-3 py-2 border-2 border-black font-semibold text-sm focus:outline-none focus:bg-yellow-50"
						/>
					</div>
					<button
						type="submit"
						disabled={isLoading}
						className="px-4 py-2 bg-black text-white font-black text-sm uppercase tracking-wide border-2 border-black hover:bg-neutral-800 active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50"
					>
						{isLoading ? 'Sending...' : 'Send Invite'}
					</button>
				</div>
				{error && (
					<div className="p-2 border-2 border-red-500 bg-red-50 text-red-700 text-xs font-bold flex items-center gap-1.5">
						<ShieldAlert className="w-4 h-4 shrink-0" />
						{error}
					</div>
				)}
				{successMsg && (
					<div className="p-2 border-2 border-emerald-500 bg-emerald-50 text-emerald-800 text-xs font-bold flex items-center gap-1.5">
						<Sparkles className="w-4 h-4 shrink-0 text-emerald-600" />
						{successMsg}
					</div>
				)}
			</form>

			{/* Tabs */}
			<div className="flex border-[3px] border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
				<button
					onClick={() => startTransition(() => setActiveTab('friends'))}
					className={`flex-1 py-2.5 text-center font-black text-sm uppercase tracking-wider border-r-2 border-black transition-colors ${
						activeTab === 'friends' ? 'bg-yellow-300' : 'bg-white hover:bg-neutral-100'
					}`}
				>
					Friends ({friends.length})
				</button>
				<button
					onClick={() => startTransition(() => setActiveTab('requests'))}
					className={`flex-1 py-2.5 text-center font-black text-sm uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 ${
						activeTab === 'requests' ? 'bg-yellow-300' : 'bg-white hover:bg-neutral-100'
					}`}
				>
					Pending ({pendingRequests.length})
				</button>
			</div>

			{/* Tab Content */}
			{activeTab === 'friends' ? (
				<div className="space-y-3">
					{friends.length === 0 ? (
						<div className="border-[3px] border-black p-8 bg-white text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
							<p className="font-bold text-sm text-black/60">No friends added yet.</p>
							<p className="text-xs text-black/40 mt-1">Send a friend invite using their email above!</p>
						</div>
					) : (
						friends.map((f) => (
							<div
								key={f.user_id}
								className="border-[3px] border-black p-4 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-between"
							>
								<div className="flex items-center gap-3">
									<div className="w-10 h-10 border-2 border-black bg-yellow-200 font-black text-black flex items-center justify-center uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
										{f.name.slice(0, 2)}
									</div>
									<div>
										<h3 className="font-black text-black text-base">{f.name}</h3>
										<span className="text-[11px] font-bold text-black/50">ID: {f.user_id}</span>
									</div>
								</div>
								<span className="text-xs font-black uppercase px-2 py-1 bg-emerald-100 text-emerald-800 border-2 border-emerald-600">
									Active
								</span>
							</div>
						))
					)}
				</div>
			) : (
				<div className="space-y-3">
					{pendingRequests.length === 0 ? (
						<div className="border-[3px] border-black p-8 bg-white text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
							<p className="font-bold text-sm text-black/60">No pending friendship requests.</p>
						</div>
					) : (
						pendingRequests.map((req) => (
							<div
								key={req.id}
								className="border-[3px] border-black p-4 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-between"
							>
								<div>
									<h3 className="font-black text-black text-sm">
										{req.friend?.name || req.user?.name || 'User'}
									</h3>
									<span className="text-xs text-black/50 font-bold flex items-center gap-1 mt-0.5">
										<Clock className="w-3 h-3" /> Awaiting response
									</span>
								</div>
								<div className="flex items-center gap-2">
									<button
										onClick={() => handleAccept(req.friendId)}
										className="p-1.5 bg-emerald-500 text-white border-2 border-black hover:bg-emerald-600 active:translate-x-0.5 active:translate-y-0.5"
										title="Accept"
									>
										<Check className="w-4 h-4" />
									</button>
									<button
										onClick={() => handleReject(req.friendId)}
										className="p-1.5 bg-rose-500 text-white border-2 border-black hover:bg-rose-600 active:translate-x-0.5 active:translate-y-0.5"
										title="Reject"
									>
										<X className="w-4 h-4" />
									</button>
								</div>
							</div>
						))
					)}
				</div>
			)}
		</div>
	);
}
