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
import { Card } from '../ui/Card';
import { Button } from '../common/Button';

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
	const [deletingSplitId, setDeletingSplitId] = useState<string | null>(null);

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
			<Card variant="white" className="p-4 flex items-center justify-between">
				<div className="flex items-center gap-3">
					<button
						onClick={onBack}
						className="w-9 h-9 rounded-full bg-surface flex items-center justify-center text-text hover:bg-surface/80 transition-colors"
						title="Back to Groups"
					>
						<ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
					</button>
					<div>
						<h2 className="font-medium text-[17px] text-text leading-tight">{group.name}</h2>
						<p className="text-[12px] text-text-muted mt-0.5">{group.members.length} Members: {group.members.join(', ')}</p>
					</div>
				</div>

				<div className="flex items-center gap-2">
					{confirmDelete ? (
						<div className="flex items-center gap-1.5">
							<button
								onClick={handleDeleteGroup}
								className="px-3 py-1 bg-danger text-white font-medium text-xs rounded-full hover:bg-danger/90 transition-colors"
							>
								Confirm
							</button>
							<button
								onClick={() => setConfirmDelete(false)}
								className="px-3 py-1 bg-surface text-text font-medium text-xs rounded-full hover:bg-surface/80 transition-colors"
							>
								Cancel
							</button>
						</div>
					) : (
						<button
							onClick={() => setConfirmDelete(true)}
							className="w-9 h-9 rounded-full bg-surface hover:bg-danger-soft text-text-muted hover:text-danger flex items-center justify-center transition-colors"
							title="Delete Group"
						>
							<Trash2 className="w-4 h-4" strokeWidth={1.5} />
						</button>
					)}
				</div>
			</Card>

			{/* Action Buttons: Add Split & Settle Up */}
			<div className="grid grid-cols-2 gap-3">
				<Button
					variant="primary"
					onClick={() => setAddSplitOpen(true)}
					className="flex items-center justify-center gap-2 py-3"
				>
					<Plus className="w-4 h-4" strokeWidth={1.5} />
					<span>Add Expense</span>
				</Button>

				<Button
					variant="accent"
					onClick={() => setSettleUpOpen(true)}
					className="flex items-center justify-center gap-2 py-3"
				>
					<Handshake className="w-4 h-4" strokeWidth={1.5} />
					<span>Settle Up</span>
				</Button>
			</div>

			{/* Summary / Who Owes Whom Section */}
			<Card variant="white" className="p-5">
				<h3 className="font-medium text-[14px] text-text mb-3 flex items-center gap-2">
					<UserCheck className="w-4 h-4 text-text-muted" strokeWidth={1.5} /> Member Balances & Settlement
				</h3>

				{debts.length === 0 ? (
					<div className="flex items-center gap-2 p-3.5 rounded-[16px] bg-mint/30 text-mint-deep text-[13px] font-medium">
						<CheckCircle2 className="w-4 h-4 shrink-0" strokeWidth={1.5} />
						<span>Everyone is all settled up in this group!</span>
					</div>
				) : (
					<div className="space-y-2">
						{debts.map((debt, idx) => (
							<div
								key={idx}
								className="flex items-center justify-between p-3 rounded-[16px] bg-surface text-[13px] font-medium text-text"
							>
								<div className="flex items-center gap-2">
									<span className={debt.from === 'You' ? 'font-medium text-danger' : 'text-text'}>
										{debt.from}
									</span>
									<ArrowRight className="w-3.5 h-3.5 text-text-muted" strokeWidth={1.5} />
									<span className={debt.to === 'You' ? 'font-medium text-mint-deep' : 'text-text'}>
										{debt.to}
									</span>
								</div>
								<div className="flex items-center gap-2.5">
									<span className="font-medium text-text bg-card px-2.5 py-1 rounded-full text-xs shadow-2xs">
										₹{debt.amount.toLocaleString()}
									</span>
									{(debt.from === 'You' || debt.to === 'You') && (
										<button
											onClick={() => setSettleUpOpen(true)}
											className="px-3 py-1 bg-mint text-ink text-xs font-medium rounded-full hover:bg-mint/80 transition-colors"
										>
											Settle
										</button>
									)}
								</div>
							</div>
						))}
					</div>
				)}

				{/* Individual Member Net Status Badges */}
				<div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-surface">
					{memberBalances.map((b) => (
						<div
							key={b.member}
							className={`text-[12px] px-3 py-1 rounded-full font-medium ${
								b.netAmount > 0
									? 'bg-mint/30 text-mint-deep'
									: b.netAmount < 0
									? 'bg-danger-soft text-danger'
									: 'bg-surface text-text-muted'
							}`}
						>
							{b.member}:{' '}
							<span>
								{b.netAmount > 0 ? `+₹${b.netAmount}` : b.netAmount < 0 ? `-₹${Math.abs(b.netAmount)}` : '₹0'}
							</span>
						</div>
					))}
				</div>
			</Card>

			{/* Group Expenses Activity Feed */}
			<Card variant="white" className="p-5">
				<h3 className="font-medium text-[14px] text-text mb-3 flex items-center gap-2">
					<Receipt className="w-4 h-4 text-text-muted" strokeWidth={1.5} /> Group Expenses ({groupSplits.length})
				</h3>

				{groupSplits.length === 0 ? (
					<p className="text-[13px] text-text-muted text-center py-6">
						No split expenses recorded in this group yet.
					</p>
				) : (
					<div className="space-y-2.5">
						{groupSplits.map((split) => {
							const totalPaise = Math.round(split.amount * 100);
							const count = split.splitAmong.length || 1;
							const baseSharePaise = Math.floor(totalPaise / count);
							const isUserPayer = split.paidBy === 'You';
							const isUserInvolved = split.splitAmong.includes('You');
							const userShareAmount = baseSharePaise / 100;

							return (
								<div
									key={split.id}
									className={`p-3.5 rounded-[16px] flex items-center justify-between ${
										split.isSettlement ? 'bg-mint/20' : 'bg-surface'
									}`}
								>
									<div>
										<div className="flex items-center gap-2">
											<span className="font-medium text-[14px] text-text">{split.title}</span>
											{split.isSettlement && (
												<span className="text-[10px] bg-mint text-ink font-medium px-2 py-0.5 rounded-full">
													Settlement
												</span>
											)}
										</div>
										<p className="text-[12px] text-text-muted mt-0.5">
											<span className="text-text font-medium">{split.paidBy}</span> paid ₹
											{split.amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
											{split.splitAmong && split.splitAmong.length > 0
												? ` • split among ${split.splitAmong.join(', ')}`
												: ' • not split'}
										</p>
										<p className="text-[11px] text-text-muted mt-0.5">{split.date}</p>
									</div>

									<div className="flex items-center gap-3">
										<div className="text-right">
											{!split.splitAmong || split.splitAmong.length === 0 ? (
												isUserPayer ? (
													<span className="text-xs font-medium text-text block">
														You paid ₹{split.amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
													</span>
												) : (
													<span className="text-xs text-text-muted block">No split</span>
												)
											) : isUserPayer ? (
												<span className="text-xs font-medium text-mint-deep block">
													You lent ₹{(split.amount - (isUserInvolved ? userShareAmount : 0)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
												</span>
											) : isUserInvolved ? (
												<span className="text-xs font-medium text-danger block">
													You owe ₹{userShareAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
												</span>
											) : (
												<span className="text-xs text-text-muted block">Not involved</span>
											)}
										</div>

										<button
											onClick={() => {
												if (deletingSplitId === split.id) {
													setDeletingSplitId(null);
													removeSplit(split.id);
												} else {
													setDeletingSplitId(split.id);
													setTimeout(() => setDeletingSplitId(null), 3000);
												}
											}}
											className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
												deletingSplitId === split.id
													? 'bg-danger text-white'
													: 'text-text-muted hover:text-danger hover:bg-danger-soft'
											}`}
											title={deletingSplitId === split.id ? 'Tap again to confirm delete' : 'Delete split expense'}
										>
											<Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
										</button>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</Card>
		</div>
	);
}
