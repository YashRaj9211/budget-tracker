import { useEffect } from 'react';
import { Plus, Users, ArrowUpRight, ArrowDownRight, Scale } from 'lucide-react';
import { useSplitStore } from '../stores/splitStore';
import GroupCard from '../components/split/GroupCard';
import GroupDetailView from '../components/split/GroupDetailView';
import AddGroupModal from '../components/split/AddGroupModal';
import AddSplitModal from '../components/split/AddSplitModal';
import SettleUpModal from '../components/split/SettleUpModal';
import { useWebSocket } from '../hooks/useWebSocket';
import { Card } from '../components/ui/Card';
import { Button } from '../components/common/Button';
import AnimatedLogo from '../components/common/AnimatedLogo';

export default function Split() {
	const groups = useSplitStore((s) => s.groups);
	const selectedGroupId = useSplitStore((s) => s.selectedGroupId);
	const setSelectedGroupId = useSplitStore((s) => s.setSelectedGroupId);
	const setAddGroupOpen = useSplitStore((s) => s.setAddGroupOpen);

	const loadData = useSplitStore((s) => s.loadData);
	const getTotalUserBalance = useSplitStore((s) => s.getTotalUserBalance);
	const isLoading = useSplitStore((s) => s.isLoading);
	const error = useSplitStore((s) => s.error);

	const { onEvent } = useWebSocket();

	useEffect(() => {
		loadData().then(() => {
			window.hideSplashScreen?.();
		});
	}, [loadData]);

	useEffect(() => {
		let timer: ReturnType<typeof setTimeout> | undefined;
		const unsubscribe = onEvent('REFETCH_EXPENSES', () => {
			clearTimeout(timer);
			timer = setTimeout(() => loadData(), 500);
		});
		return () => {
			clearTimeout(timer);
			unsubscribe();
		};
	}, [onEvent, loadData]);

	const { totalOwedToUser, totalUserOwes, netTotal } = getTotalUserBalance();

	return (
		<div className="w-full space-y-3 pb-28">
			{/* Title + actions */}
			<div className="flex items-center justify-between gap-2 mb-4">
				<h1 className="text-[18px] sm:text-[20px] font-medium text-text flex items-center gap-1.5 whitespace-nowrap shrink-0">
					<Scale className="w-5 h-5 text-text-muted shrink-0" strokeWidth={1.5} />
					<span>Split expenses</span>
				</h1>
				<div className="flex items-center gap-1.5 shrink-0">
					<Button
						variant="secondary"
						onClick={() => setAddGroupOpen(true)}
						className="flex items-center gap-1 text-xs px-3 py-1.5 whitespace-nowrap"
					>
						<Plus className="w-3.5 h-3.5" /> Group
					</Button>
					{/* <Button
						variant="primary"
						onClick={() => setAddSplitOpen(true)}
						className="flex items-center gap-1 text-xs px-3.5 py-1.5 whitespace-nowrap"
					>
						<Plus className="w-3.5 h-3.5" /> Split
					</Button> */}
				</div>
			</div>

			{/* 3 summary tiles */}
			<div className="grid grid-cols-3 gap-2">
				<Card variant="mint" nested className="text-center px-1.5 py-3">
					<p className="text-[10.5px] sm:text-[11px] text-text-muted mb-1 flex items-center justify-center gap-1 whitespace-nowrap">
						<ArrowUpRight className="w-3 h-3 text-mint-deep shrink-0" strokeWidth={1.5} />
						<span>You Lent</span>
					</p>
					<p className="text-[17px] sm:text-[20px] font-medium text-mint-deep whitespace-nowrap">
						{totalOwedToUser > 0 ? `+₹${totalOwedToUser.toLocaleString()}` : '₹0'}
					</p>
				</Card>
				<Card
					variant={totalUserOwes > 0 ? 'white' : 'white'}
					nested
					className={`text-center px-1.5 py-3 ${totalUserOwes > 0 ? 'bg-danger-soft' : 'bg-surface'}`}
				>
					<p className="text-[10.5px] sm:text-[11px] text-text-muted mb-1 flex items-center justify-center gap-1 whitespace-nowrap">
						<ArrowDownRight className={`w-3 h-3 shrink-0 ${totalUserOwes > 0 ? 'text-danger' : 'text-text-muted'}`} strokeWidth={1.5} />
						<span>You Owe</span>
					</p>
					<p className={`text-[17px] sm:text-[20px] font-medium whitespace-nowrap ${totalUserOwes > 0 ? 'text-danger' : 'text-text'}`}>
						{totalUserOwes > 0 ? `-₹${totalUserOwes.toLocaleString()}` : '₹0'}
					</p>
				</Card>
				<Card variant="light" nested className="text-center px-1.5 py-3">
					<p className="text-[10.5px] sm:text-[11px] text-text-muted mb-1 flex items-center justify-center gap-1 whitespace-nowrap">
						<span>Net total</span>
					</p>
					<p className={`text-[17px] sm:text-[20px] font-medium whitespace-nowrap ${netTotal > 0 ? 'text-mint-deep' : netTotal < 0 ? 'text-danger' : 'text-text'}`}>
						{netTotal > 0 ? `+₹${netTotal.toLocaleString()}` : netTotal < 0 ? `-₹${Math.abs(netTotal).toLocaleString()}` : '₹0'}
					</p>
				</Card>
			</div>

			{error && (
				<div className="bg-danger-soft text-danger rounded-[20px] p-3 flex items-center justify-between gap-3">
					<span className="text-[13px]">{error}</span>
					<button
						onClick={() => loadData()}
						className="bg-ink text-white text-[12px] font-medium px-3 py-1 rounded-full"
					>
						Retry
					</button>
				</div>
			)}

			{selectedGroupId ? (
				<GroupDetailView groupId={selectedGroupId} onBack={() => setSelectedGroupId(null)} />
			) : (
				<div className="space-y-3">
					<h2 className="text-[15px] font-medium text-text flex items-center gap-1.5 px-1">
						<Users className="w-4 h-4 text-text-muted" strokeWidth={1.5} /> Your groups
					</h2>

					{isLoading ? (
						<div className="p-8 bg-surface rounded-[24px] text-center flex flex-col items-center justify-center">
							<AnimatedLogo state="loading" size={56} className="mb-2" title="Loading groups" />
							<p className="text-[13px] text-text-muted">Loading split groups…</p>
						</div>
					) : groups.length === 0 ? (
						<Card variant="white" className="flex flex-col items-center justify-center gap-2.5 text-center py-8">
							<AnimatedLogo state="idle" size={60} className="mb-1" title="No groups" />
							<h3 className="text-[15px] font-medium text-text">No groups yet</h3>
							<p className="text-[12px] text-text-muted max-w-xs">
								Create a group with friends, roommates, or trip mates to split bills effortlessly.
							</p>
							<Button variant="primary" onClick={() => setAddGroupOpen(true)} className="mt-2">
								<Plus className="w-4 h-4 mr-1" /> Create your first group
							</Button>
						</Card>
					) : (
						<div className="space-y-3">
							{groups.map((group) => (
								<GroupCard
									key={group.id}
									group={group}
									onClick={() => setSelectedGroupId(group.id)}
								/>
							))}
						</div>
					)}
				</div>
			)}

			{/* Modals */}
			<AddGroupModal />
			<AddSplitModal />
			<SettleUpModal />
		</div>
	);
}
