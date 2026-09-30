import { useState } from 'react';
import {
	ArrowLeft,
	Plus,
	Handshake,
	Trash2,
	UserCheck,
	ArrowRight,
	Receipt,
	CheckCircle2,
} from 'lucide-react';
import { useSplitStore } from '../../stores/splitStore';

interface GroupDetailViewProps {
	groupId: string;
	onBack: () => void;
}

export default function GroupDetailView({ groupId, onBack }: GroupDetailViewProps) {
	const groups = useSplitStore((s) => s.groups);
	const splits = useSplitStore((s) => s.splits);
	const removeSplit = useSplitStore((s) => s.removeSplit);
	const removeGroup = useSplitStore((s) => s.removeGroup);
	const setAddSplitOpen = useSplitStore((s) => s.setAddSplitOpen);
	const setSettleUpOpen = useSplitStore((s) => s.setSettleUpOpen);
	const getGroupBalances = useSplitStore((s) => s.getGroupBalances);

	const [confirmDelete, setConfirmDelete] = useState(false);

	const group = groups.find((g) => g.id === groupId);
	if (!group) return null;

	const groupSplits = splits.filter((s) => s.groupId === groupId);
	const { memberBalances, debts } = getGroupBalances(groupId);

	const handleDeleteGroup = async () => {
		await removeGroup(groupId);
		onBack();
	};

	return (
		<div className="space-y-4">
			{/* Detail View Header */}
			<div className="flex items-center justify-between border-2 border-black p-3 bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
				<div className="flex items-center gap-3">
					<button
						onClick={onBack}
						className="p-1.5 border border-black hover:bg-gray-100 transition-colors"
						title="Back to Groups"
					>
						<ArrowLeft className="w-5 h-5" />
					</button>
					<div>
						<h2 className="font-bold text-lg text-black leading-tight">{group.name}</h2>
						<p className="text-xs text-gray-600">{group.members.length} Members</p>
					</div>
				</div>

				<div className="flex items-center gap-2">
					{confirmDelete ? (
						<div className="flex items-center gap-1">
							<button
								onClick={handleDeleteGroup}
								className="px-2 py-1 bg-red-600 text-white font-bold text-xs border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
							>
								Confirm
							</button>
							<button
								onClick={() => setConfirmDelete(false)}
								className="px-2 py-1 bg-gray-200 text-black font-bold text-xs border border-black"
							>
								Cancel
							</button>
						</div>
					) : (
						<button
							onClick={() => setConfirmDelete(true)}
							className="p-1.5 border border-black hover:bg-red-50 text-red-600 transition-colors"
							title="Delete Group"
						>
							<Trash2 className="w-4 h-4" />
						</button>
					)}
				</div>
			</div>

			{/* Action Buttons: Add Split & Settle Up */}
			<div className="grid grid-cols-2 gap-3">
				<button
					onClick={() => setAddSplitOpen(true)}
					className="flex items-center justify-center gap-2 border-2 border-black p-3 bg-pastel-yellow font-bold text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-px hover:translate-y-px active:translate-x-0.5 active:translate-y-0.5 transition-all"
				>
					<Plus className="w-4 h-4" />
					<span>Add Expense</span>
				</button>

				<button
					onClick={() => setSettleUpOpen(true)}
					className="flex items-center justify-center gap-2 border-2 border-black p-3 bg-pastel-green font-bold text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-px hover:translate-y-px active:translate-x-0.5 active:translate-y-0.5 transition-all"
				>
					<Handshake className="w-4 h-4" />
					<span>Settle Up</span>
				</button>
			</div>

			{/* Summary / Who Owes Whom Section */}
			<div className="border-2 border-black p-4 bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
				<h3 className="font-bold text-sm text-black uppercase tracking-wider mb-3 flex items-center gap-1.5">
					<UserCheck className="w-4 h-4" /> Member Balances & Settlement
				</h3>

				{debts.length === 0 ? (
					<div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-sm font-medium">
						<CheckCircle2 className="w-5 h-5 text-emerald-600" />
						<span>Everyone is all settled up in this group!</span>
					</div>
				) : (
					<div className="space-y-2">
						{debts.map((debt, idx) => (
							<div
								key={idx}
								className="flex items-center justify-between p-2.5 bg-gray-50 border border-black text-sm font-medium"
							>
								<div className="flex items-center gap-2">
									<span className={debt.from === 'You' ? 'font-bold text-rose-600' : 'text-gray-800'}>
										{debt.from}
									</span>
									<ArrowRight className="w-4 h-4 text-gray-400" />
									<span className={debt.to === 'You' ? 'font-bold text-emerald-600' : 'text-gray-800'}>
										{debt.to}
									</span>
								</div>
								<span className="font-bold text-black bg-white px-2 py-0.5 border border-black">
									₹{debt.amount.toLocaleString()}
								</span>
							</div>
						))}
					</div>
				)}

				{/* Individual Member Net Status Badges */}
				<div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-200">
					{memberBalances.map((b) => (
						<div
							key={b.member}
							className={`text-xs px-2.5 py-1 border border-black font-medium ${
								b.netAmount > 0
									? 'bg-emerald-100 text-emerald-900 border-emerald-400'
									: b.netAmount < 0
									? 'bg-rose-100 text-rose-900 border-rose-400'
									: 'bg-gray-100 text-gray-600'
							}`}
						>
							{b.member}:{' '}
							<span className="font-bold">
								{b.netAmount > 0 ? `+₹${b.netAmount}` : b.netAmount < 0 ? `-₹${Math.abs(b.netAmount)}` : '₹0'}
							</span>
						</div>
					))}
				</div>
			</div>

			{/* Group Expenses Activity Feed */}
			<div className="border-2 border-black p-4 bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
				<h3 className="font-bold text-sm text-black uppercase tracking-wider mb-3 flex items-center gap-1.5">
					<Receipt className="w-4 h-4" /> Group Expenses ({groupSplits.length})
				</h3>

				{groupSplits.length === 0 ? (
					<p className="text-sm text-gray-500 italic text-center py-4">
						No split expenses recorded in this group yet.
					</p>
				) : (
					<div className="space-y-3">
						{groupSplits.map((split) => {
							const shareAmount = Math.round(split.amount / (split.splitAmong.length || 1));
							const isUserPayer = split.paidBy === 'You';
							const isUserInvolved = split.splitAmong.includes('You');

							return (
								<div
									key={split.id}
									className={`p-3 border border-black flex items-center justify-between ${
										split.isSettlement ? 'bg-emerald-50 border-emerald-400' : 'bg-gray-50'
									}`}
								>
									<div>
										<div className="flex items-center gap-2">
											<span className="font-bold text-sm text-black">{split.title}</span>
											{split.isSettlement && (
												<span className="text-[10px] bg-emerald-600 text-white font-bold px-1.5 py-0.5">
													Settlement
												</span>
											)}
										</div>
										<p className="text-xs text-gray-600 mt-0.5">
											<span className="font-semibold text-black">{split.paidBy}</span> paid ₹
											{split.amount.toLocaleString()} • split among {split.splitAmong.join(', ')}
										</p>
										<p className="text-[11px] text-gray-400 mt-0.5">{split.date}</p>
									</div>

									<div className="flex items-center gap-3">
										<div className="text-right">
											{isUserPayer ? (
												<span className="text-xs font-bold text-emerald-700 block">
													You lent ₹{(split.amount - (isUserInvolved ? shareAmount : 0)).toLocaleString()}
												</span>
											) : isUserInvolved ? (
												<span className="text-xs font-bold text-rose-700 block">
													You owe ₹{shareAmount.toLocaleString()}
												</span>
											) : (
												<span className="text-xs text-gray-500 block">Not involved</span>
											)}
										</div>

										<button
											onClick={() => removeSplit(split.id)}
											className="p-1 hover:bg-rose-100 text-gray-400 hover:text-rose-600 border border-transparent hover:border-black transition-colors"
											title="Delete split expense"
										>
											<Trash2 className="w-3.5 h-3.5" />
										</button>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}
