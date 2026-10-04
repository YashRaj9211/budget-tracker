import { useEffect, useState, useTransition } from 'react';
import { UserCheck, UserPlus, Clock, Check, X, Mail, ShieldAlert, Sparkles, Send, Loader2 } from 'lucide-react';
import { friendshipApi, type Friendship, type FriendItem } from '../api/financeHubApi';
import { useWebSocket } from '../hooks/useWebSocket';
import { Card } from '../components/ui/Card';
import Chip from '../components/ui/Chip';
import SegmentedTabs from '../components/ui/SegmentedTabs';
import { IconButton } from '../components/ui/IconButton';
import { statusSheet } from '../stores/statusSheetStore';

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
		window.hideSplashScreen?.();
	}, []);

	useEffect(() => {
		const unsubAccept = onEvent('FRIEND_REQUEST_ACCEPTED', () => loadData());
		const unsubReceive = onEvent('FRIEND_REQUEST_RECEIVED', () => loadData());
		const unsubReject = onEvent('FRIEND_REQUEST_REJECTED', () => loadData());
		return () => { unsubAccept(); unsubReceive(); unsubReject(); };
	}, [onEvent]);

	const handleSendRequest = async (e: React.FormEvent) => {
		e.preventDefault();
		const email = emailInput.trim();
		if (!email) return;
		setError(null);
		setSuccessMsg(null);
		setEmailInput('');

		await statusSheet.execute({
			action: async () => {
				await friendshipApi.sendRequest(email);
				await loadData();
			},
			processingTitle: 'Sending invite...',
			processingMessage: `Sending friend request to ${email}`,
			successTitle: 'Invite sent!',
			successMessage: `Friend request sent to ${email}`,
			buttonText: 'Nice one!',
			onError: (err) => {
				setError(err?.message || 'Failed to send friend request');
			},
		});
	};

	const handleAccept = async (friendId: string, friendName?: string) => {
		await statusSheet.execute({
			action: async () => {
				await friendshipApi.acceptRequest(friendId);
				await loadData();
			},
			processingTitle: 'Connecting...',
			processingMessage: `Connecting with ${friendName || 'friend'}`,
			successTitle: 'Connected!',
			successMessage: `You and ${friendName || 'friend'} can now split expenses together`,
			buttonText: 'Nice one!',
			onError: (err) => {
				setError(err?.message || 'Failed to accept friend request');
			},
		});
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
		<div className="w-full space-y-3 pb-28">
			{/* Title */}
			<div className="flex items-center justify-between mb-4">
				<h1 className="text-[20px] font-medium text-text flex items-center gap-2">
					<UserCheck className="w-5 h-5 text-text-muted" strokeWidth={1.5} /> Friends hub
				</h1>
				<Chip variant="neutral">{friends.length} friends</Chip>
			</div>

			{/* Add friend card */}
			<Card variant="white">
				<h2 className="text-[15px] font-medium text-text flex items-center gap-2 mb-3">
					<UserPlus className="w-4 h-4 text-text-muted" strokeWidth={1.5} /> Add friend by email
				</h2>
				<form onSubmit={handleSendRequest} className="flex gap-2 items-center">
					<div className="relative flex-1">
						<Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" strokeWidth={1.5} />
						<input
							type="email"
							placeholder="friend@example.com"
							value={emailInput}
							onChange={(e) => setEmailInput(e.target.value)}
							required
							className="w-full pl-10 pr-4 h-12 bg-surface text-text placeholder:text-text-muted rounded-full focus:outline-none focus:ring-2 focus:ring-ink/40 transition-shadow text-[14px]"
						/>
					</div>
					<button
						type="submit"
						disabled={isLoading}
						aria-label="Send invite"
						className="w-12 h-12 rounded-full bg-ink text-white hover:bg-ink/90 flex items-center justify-center shrink-0 cursor-pointer transition-transform active:scale-[0.98] disabled:opacity-50 shadow-2xs"
					>
						{isLoading ? (
							<Loader2 className="w-4 h-4 animate-spin text-white" />
						) : (
							<Send className="w-4 h-4 text-white ml-0.5" strokeWidth={1.5} />
						)}
					</button>
				</form>
				{error && (
					<div className="mt-3 p-3 bg-danger-soft text-danger rounded-[16px] text-[13px] flex items-center gap-1.5">
						<ShieldAlert className="w-4 h-4 shrink-0" strokeWidth={1.5} />
						{error}
					</div>
				)}
				{successMsg && (
					<div className="mt-3 p-3 bg-mint text-ink rounded-[16px] text-[13px] flex items-center gap-1.5">
						<Sparkles className="w-4 h-4 shrink-0" strokeWidth={1.5} />
						{successMsg}
					</div>
				)}
			</Card>

			{/* Friends / Pending tabs */}
			<SegmentedTabs
				tabs={[
					{ id: 'friends', label: `Friends (${friends.length})` },
					{ id: 'requests', label: `Pending (${pendingRequests.length})` },
				]}
				activeId={activeTab}
				onChange={(id) => startTransition(() => setActiveTab(id as 'friends' | 'requests'))}
			/>

			{/* Tab content */}
			{activeTab === 'friends' ? (
				friends.length === 0 ? (
					<div className="p-6 bg-surface rounded-[20px] text-center">
						<p className="text-[14px] font-medium text-text-muted">No friends added yet.</p>
						<p className="text-[12px] text-text-muted mt-1">Send a friend invite using their email above!</p>
					</div>
				) : (
					<Card variant="white" className="!p-0 divide-y divide-black/5">
						{friends.map((f) => (
							<div key={f.user_id} className="flex items-center justify-between px-5 py-3">
								<div className="flex items-center gap-3">
									<div className="w-10 h-10 rounded-full bg-lavender flex items-center justify-center font-medium text-ink text-[14px] shrink-0">
										{f.name.slice(0, 2).toUpperCase()}
									</div>
									<div>
										<h3 className="text-[14px] font-medium text-text">{f.name}</h3>
										<span className="text-[12px] text-text-muted">ID: {f.user_id}</span>
									</div>
								</div>
								<Chip variant="positive">Active</Chip>
							</div>
						))}
					</Card>
				)
			) : (
				pendingRequests.length === 0 ? (
					<div className="p-6 bg-surface rounded-[20px] text-center">
						<p className="text-[14px] font-medium text-text-muted">No pending friendship requests.</p>
					</div>
				) : (
					<Card variant="white" className="!p-0 divide-y divide-black/5">
						{pendingRequests.map((req) => (
							<div key={req.id} className="flex items-center justify-between px-5 py-3">
								<div>
									<h3 className="text-[14px] font-medium text-text">
										{req.friend?.name || req.user?.name || 'User'}
									</h3>
									<span className="text-[12px] text-text-muted flex items-center gap-1 mt-0.5">
										<Clock className="w-3 h-3" strokeWidth={1.5} /> Awaiting response
									</span>
								</div>
								<div className="flex items-center gap-2">
									<IconButton
										variant="surface"
										onClick={() => handleAccept(req.friendId, req.friend?.name || req.user?.name)}
										title="Accept"
										className="w-9 h-9 bg-mint text-ink border-none"
									>
										<Check className="w-4 h-4" strokeWidth={1.5} />
									</IconButton>
									<IconButton
										variant="outline"
										onClick={() => handleReject(req.friendId)}
										title="Reject"
										className="w-9 h-9 border-danger/40 text-danger"
									>
										<X className="w-4 h-4" strokeWidth={1.5} />
									</IconButton>
								</div>
							</div>
						))}
					</Card>
				)
			)}
		</div>
	);
}
