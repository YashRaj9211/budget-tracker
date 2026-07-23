import { useEffect } from 'react';
import { Plus, Users, ArrowUpRight, ArrowDownRight, Scale } from 'lucide-react';
import { useSplitStore } from '../stores/splitStore';
import GroupCard from '../components/split/GroupCard';
import GroupDetailView from '../components/split/GroupDetailView';
import AddGroupModal from '../components/split/AddGroupModal';
import AddSplitModal from '../components/split/AddSplitModal';
import SettleUpModal from '../components/split/SettleUpModal';

export default function Split() {
	const groups = useSplitStore((s) => s.groups);
	const selectedGroupId = useSplitStore((s) => s.selectedGroupId);
	const setSelectedGroupId = useSplitStore((s) => s.setSelectedGroupId);
	const setAddGroupOpen = useSplitStore((s) => s.setAddGroupOpen);
	const setAddSplitOpen = useSplitStore((s) => s.setAddSplitOpen);
	const loadData = useSplitStore((s) => s.loadData);
	const getTotalUserBalance = useSplitStore((s) => s.getTotalUserBalance);
	const isLoading = useSplitStore((s) => s.isLoading);

	useEffect(() => {
		loadData().then(() => {
			(window as any).hideSplashScreen?.();
		});
	}, [loadData]);

	const { totalOwedToUser, totalUserOwes, netTotal } = getTotalUserBalance();

	return (
		<div className="max-w-xl mx-auto space-y-5 pb-28">
			{/* Overall Summary Header */}
			<div className="border-2 border-black p-4 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
				<div className="flex items-center justify-between mb-3 border-b border-black/20 pb-2">
					<h1 className="text-xl font-black text-black tracking-wide uppercase flex items-center gap-2">
						<Scale className="w-6 h-6" /> Split Expenses
					</h1>
					<span className="text-xs bg-black text-white font-bold px-2 py-0.5">
						{groups.length} Groups
					</span>
				</div>

				<div className="grid grid-cols-3 gap-2 text-center">
					{/* Owed to You */}
					<div className="p-2 border border-black bg-emerald-50">
						<span className="text-[10px] text-emerald-800 uppercase font-semibold block flex items-center justify-center gap-0.5">
							<ArrowUpRight className="w-3 h-3" /> Owed to you
						</span>
						<span className="font-extrabold text-sm text-emerald-700">
							+₹{totalOwedToUser.toLocaleString()}
						</span>
					</div>

					{/* You Owe */}
					<div className="p-2 border border-black bg-rose-50">
						<span className="text-[10px] text-rose-800 uppercase font-semibold block flex items-center justify-center gap-0.5">
							<ArrowDownRight className="w-3 h-3" /> You owe
						</span>
						<span className="font-extrabold text-sm text-rose-700">
							-₹{totalUserOwes.toLocaleString()}
						</span>
					</div>

					{/* Net Balance */}
					<div className="p-2 border border-black bg-yellow-50">
						<span className="text-[10px] text-gray-700 uppercase font-semibold block">Net Total</span>
						<span
							className={`font-extrabold text-sm ${
								netTotal > 0
									? 'text-emerald-700'
									: netTotal < 0
									? 'text-rose-700'
									: 'text-black'
							}`}
						>
							{netTotal > 0 ? `+₹${netTotal}` : netTotal < 0 ? `-₹${Math.abs(netTotal)}` : '₹0'}
						</span>
					</div>
				</div>
			</div>

			{/* Render Group Detail or Group List */}
			{selectedGroupId ? (
				<GroupDetailView
					groupId={selectedGroupId}
					onBack={() => setSelectedGroupId(null)}
				/>
			) : (
				<div className="space-y-4">
					{/* Top Actions Row */}
					<div className="flex items-center justify-between gap-3">
						<h2 className="font-bold text-base text-black uppercase tracking-wider flex items-center gap-1.5">
							<Users className="w-4 h-4" /> Your Groups
						</h2>

						<div className="flex items-center gap-2">
							<button
								onClick={() => setAddGroupOpen(true)}
								className="flex items-center gap-1.5 border-2 border-black px-3 py-1.5 bg-pastel-blue text-xs font-bold text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-blue-200"
							>
								<Plus className="w-3.5 h-3.5" /> Group
							</button>

							<button
								onClick={() => setAddSplitOpen(true)}
								className="flex items-center gap-1.5 border-2 border-black px-3 py-1.5 bg-black text-white text-xs font-bold shadow-[2px_2px_0px_0px_rgba(150,150,150,1)] hover:bg-gray-800"
							>
								<Plus className="w-3.5 h-3.5" /> Split
							</button>
						</div>
					</div>

					{/* Groups List */}
					{isLoading ? (
						<div className="border-2 border-black p-6 bg-white text-center font-bold text-sm text-gray-500">
							Loading split groups...
						</div>
					) : groups.length === 0 ? (
						<div className="border-2 border-black p-8 bg-white text-center space-y-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
							<Users className="w-10 h-10 mx-auto text-gray-400" />
							<h3 className="font-bold text-base text-black">No Groups Yet</h3>
							<p className="text-xs text-gray-600 max-w-xs mx-auto">
								Create a group with friends, roommates, or trip mates to split bills effortlessly.
							</p>
							<button
								onClick={() => setAddGroupOpen(true)}
								className="inline-flex items-center gap-1.5 border-2 border-black px-4 py-2 bg-pastel-pink font-bold text-sm text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-pink-200"
							>
								<Plus className="w-4 h-4" /> Create Your First Group
							</button>
						</div>
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