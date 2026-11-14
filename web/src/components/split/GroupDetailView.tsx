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
	X,
} from 'lucide-react';
import { useSplitStore } from '../../stores/splitStore';
import { statusSheet } from '../../stores/statusSheetStore';
import { Card } from '../ui/Card';
import { Button } from '../common/Button';
import { BottomSheet } from '../ui/BottomSheet';
import AddMemberToGroupModal from './AddMemberToGroupModal';
import { getCategoryVisual } from '../../utils/indianCategoryIcons';
import type { SplitExpense } from '../../types/split';

interface GroupDetailViewProps {
	groupId: string;
	onBack: () => void;
}

interface GroupExpenseItemProps {
	split: SplitExpense;
	onDelete: (split: SplitExpense) => void;
}

function GroupExpenseItem({ split, onDelete }: GroupExpenseItemProps) {
	const [showActions, setShowActions] = useState(false);

	const totalPaise = Math.round(split.amount * 100);
	const count = split.splitAmong?.length || 1;
	const baseSharePaise = Math.floor(totalPaise / count);
	const isUserPayer = split.paidBy === 'You';
	const isUserInvolved = split.splitAmong?.includes('You');
	const userShareAmount = baseSharePaise / 100;
	const visual = getCategoryVisual({
		description: split.title,
		isSplit: true,
	});

	const handleCardClick = () => {
		setShowActions((prev) => !prev);
	};

	return (
		<div
			onClick={handleCardClick}
			className={`p-3.5 rounded-[16px] flex items-center justify-between gap-3 cursor-pointer select-none transition-colors ${
				split.isSettlement
					? 'bg-mint/20 hover:bg-mint/30'
					: 'bg-surface hover:bg-surface/80'
			}`}
		>
			<div className="flex items-center gap-3 min-w-0">
				<div
					className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${visual.bg}`}
				>
					{visual.icon}
				</div>
				<div className="min-w-0">
					<div className="flex items-center gap-2">
						<span className="font-medium text-[14px] text-text truncate">
							{split.title}
						</span>
						{split.isSettlement && (
							<span className="text-[10px] bg-mint text-ink font-medium px-2 py-0.5 rounded-full shrink-0">
								Settlement
							</span>
						)}
					</div>
					<p className="text-[12px] text-text-muted mt-0.5 truncate">
						<span className="text-text font-medium">{split.paidBy}</span> paid ₹
						{split.amount.toLocaleString(undefined, {
							minimumFractionDigits: 0,
							maximumFractionDigits: 2,
						})}
						{split.splitAmong && split.splitAmong.length > 0
							? ` • split among ${split.splitAmong.join(', ')}`
							: ' • not split'}
					</p>
					<p className="text-[11px] text-text-muted mt-0.5">{split.date}</p>
				</div>
			</div>

			{/* Inline Action Swap */}
			<div className="relative flex items-center justify-end shrink-0 min-w-[80px] h-9">
				{/* Breakdown/Price */}
				<div
					className={`text-right transition-all duration-200 ease-out ${
						showActions
							? 'opacity-0 scale-90 pointer-events-none'
							: 'opacity-100 scale-100'
					}`}
				>
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

				{/* Inline Action Swap Buttons */}
				<div
					className={`absolute right-0 flex items-center gap-1.5 transition-all duration-200 ease-out ${
						showActions
							? 'opacity-100 scale-100 pointer-events-auto'
							: 'opacity-0 scale-90 pointer-events-none'
					}`}
					onClick={(e) => e.stopPropagation()}
				>
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onDelete(split);
						}}
						className="w-7 h-7 rounded-full flex items-center justify-center bg-card text-danger hover:bg-danger-soft transition-colors cursor-pointer shadow-2xs border border-danger/30"
						title="Delete split expense"
						aria-label="Delete split expense"
					>
						<Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
					</button>

					{/* Explicit Escape Hatch: Close (X) button */}
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							setShowActions(false);
						}}
						className="w-7 h-7 rounded-full flex items-center justify-center bg-card text-text-muted hover:text-text hover:bg-surface transition-colors cursor-pointer shadow-2xs border border-border/40"
						title="Close actions"
						aria-label="Close actions"
					>
						<X className="w-3.5 h-3.5" strokeWidth={2} />
					</button>
				</div>
			</div>
		</div>
	);
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
	const [splitToDelete, setSplitToDelete] = useState<SplitExpense | null>(null);
	const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);

	const group = groups.find((g) => g.id === groupId);
	if (!group) return null;

	const groupSplits = splits.filter((s) => s.groupId === groupId);
	const { memberBalances, debts } = getGroupBalances(groupId);

	const handleDeleteGroup = async () => {
		await removeGroup(groupId);
		onBack();
	};

	const handleConfirmDeleteSplit = async () => {
		if (!splitToDelete) return;
		const id = splitToDelete.id;
		setSplitToDelete(null);
		await statusSheet.execute({
			action: async () => {
				await removeSplit(id);
			},
			processingTitle: 'Deleting expense...',
			processingMessage: 'Removing expense from group',
			successTitle: 'Expense deleted',
			successMessage: 'The group expense has been deleted',
			buttonText: 'Done',
		});
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
						<p className="text-[12px] text-text-muted mt-0.5">{group.members.length} Members</p>
					</div>
				</div>

				<div className="flex items-center gap-2">
					{!confirmDelete && (
						<button
							onClick={() => setIsAddMemberOpen(true)}
							className="px-3 py-1.5 bg-surface text-text font-medium text-xs rounded-full hover:bg-surface/80 transition-colors"
							title="Add Members"
						>
							Add Member
						</button>
					)}
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
							onClick={() => {
								setIsAddMemberOpen(false);
								setConfirmDelete(true);
							}}
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
						{groupSplits.map((split) => (
							<GroupExpenseItem
								key={split.id}
								split={split}
								onDelete={setSplitToDelete}
							/>
						))}
					</div>
				)}
			</Card>

			<AddMemberToGroupModal
				isOpen={isAddMemberOpen}
				onClose={() => setIsAddMemberOpen(false)}
				group={group}
			/>

			{/* Delete Confirmation Bottom Bar */}
			<BottomSheet
				isOpen={!!splitToDelete}
				onClose={() => setSplitToDelete(null)}
				title={
					<span className="flex items-center gap-2">
						<Trash2 className="w-5 h-5 text-danger" strokeWidth={1.5} /> Delete expense?
					</span>
				}
			>
				<div className="flex flex-col justify-between min-h-[340px] sm:min-h-[300px] pb-6">
					<div className="space-y-4 pt-2">
						{/* Detail preview card matching app design */}
						<div className="p-4 rounded-[20px] bg-surface flex items-center justify-between gap-3">
							<div className="min-w-0">
								<p className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-0.5">
									Expense to delete
								</p>
								<p className="text-[16px] font-medium text-text truncate">
									{splitToDelete?.title}
								</p>
								<p className="text-[12px] text-text-muted mt-0.5">
									Paid by {splitToDelete?.paidBy} • {splitToDelete?.date}
								</p>
							</div>
							<div className="text-right shrink-0">
								<span className="text-[18px] font-semibold text-text">
									₹{splitToDelete?.amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
								</span>
							</div>
						</div>

						<div className="p-3.5 rounded-[16px] bg-danger-soft/60 border border-danger/10 text-danger text-[13px] leading-relaxed">
							This action is permanent and will recalculate balances for everyone in <span className="font-medium text-text">{group.name}</span>.
						</div>
					</div>

					<div className="space-y-2.5 pt-6">
						<button
							type="button"
							onClick={handleConfirmDeleteSplit}
							className="w-full py-3.5 rounded-full bg-danger text-white text-[14px] font-medium hover:bg-danger/90 active:scale-[0.98] transition-all cursor-pointer shadow-sm"
						>
							Yes, Delete Expense
						</button>
						<button
							type="button"
							onClick={() => setSplitToDelete(null)}
							className="w-full py-3 rounded-full bg-surface text-text text-[14px] font-medium hover:bg-surface/80 active:scale-[0.98] transition-all cursor-pointer"
						>
							Cancel
						</button>
					</div>
				</div>
			</BottomSheet>
		</div>
	);
}
