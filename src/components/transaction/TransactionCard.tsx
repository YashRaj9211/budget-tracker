import { useState } from 'react';
import { Edit2, Trash2, X, Users } from 'lucide-react';
import type { Transaction } from '../../types';
import { useTransactionStore } from '../../stores/transactionStore';
import { useSplitStore } from '../../stores/splitStore';
import { useNavigate } from 'react-router';
import { ListRow } from '../ui/ListRow';
import { getCategoryVisual } from '../../utils/indianCategoryIcons';

interface TransactionCardProps {
	transaction: Transaction;
}

function getMeaningfulCaption(transaction: Transaction) {
	if (transaction.isSplit) {
		if (transaction.paidByMe) {
			return (
				<span className="text-lavender-deep font-medium">
					Split with group · Lent ₹{transaction.lentAmount}
				</span>
			);
		}
		return (
			<span className="text-danger font-medium">
				Split with group · You owe ₹{transaction.amount}
			</span>
		);
	}

	const hasCategory = transaction.category && transaction.category.toLowerCase() !== 'default';
	const hasAccount = transaction.account && transaction.account.toLowerCase() !== 'default';

	if (hasCategory && hasAccount) {
		return `${transaction.category} · ${transaction.account}`;
	}
	if (hasCategory) {
		return transaction.category;
	}
	if (hasAccount) {
		return transaction.account;
	}
	return 'Personal';
}

function TransactionCard({ transaction }: TransactionCardProps) {
	const [showActions, setShowActions] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const deleteTransaction = useTransactionStore((s) => s.deleteTransaction);
	const setEditingTransaction = useTransactionStore((s) => s.setEditingTransaction);
	const setSelectedGroupId = useSplitStore((s) => s.setSelectedGroupId);
	const navigate = useNavigate();
	const isIncome = transaction.type === 'income';

	const handleCardClick = () => {
		setShowActions((prev) => !prev);
	};

	const visual = getCategoryVisual(
		transaction.category,
		transaction.description,
		isIncome,
		transaction.isSplit
	);

	const formattedAmount = `${isIncome ? '+₹' : '-₹'}${transaction.amount.toLocaleString(undefined, {
		minimumFractionDigits: 0,
		maximumFractionDigits: 2,
	})}`;

	const rightContent = (
		<div className="relative flex items-center justify-end h-8 min-w-[70px]">
			{/* Price Display */}
			<div
				className={`flex items-center justify-end transition-all duration-200 ease-out ${
					showActions
						? 'opacity-0 scale-90 pointer-events-none'
						: 'opacity-100 scale-100'
				}`}
			>
				<span className={`text-[15px] font-medium shrink-0 ${isIncome ? 'text-mint-deep' : 'text-text'}`}>
					{formattedAmount}
				</span>
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
				{transaction.isSplit && transaction.groupId ? (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							if (transaction.groupId) {
								setSelectedGroupId(transaction.groupId);
								navigate('/split');
							}
						}}
						className="w-7 h-7 rounded-full flex items-center justify-center bg-card text-text-muted hover:text-text hover:bg-surface transition-colors cursor-pointer shadow-2xs border border-border/40"
						title="View group"
						aria-label="View group in split"
					>
						<Users size={13} strokeWidth={1.5} />
					</button>
				) : (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							setEditingTransaction(transaction);
						}}
						className="w-7 h-7 rounded-full flex items-center justify-center bg-card text-text-muted hover:text-text hover:bg-surface transition-colors cursor-pointer shadow-2xs border border-border/40"
						title="Edit transaction"
						aria-label="Edit transaction"
					>
						<Edit2 size={13} strokeWidth={1.5} />
					</button>
				)}

				<button
					type="button"
					onClick={async (e) => {
						e.stopPropagation();
						if (isDeleting) return;
						setIsDeleting(true);
						try {
							await deleteTransaction(transaction.id);
						} finally {
							setIsDeleting(false);
						}
					}}
					disabled={isDeleting}
					className="w-7 h-7 rounded-full flex items-center justify-center bg-card text-danger hover:bg-danger-soft transition-colors cursor-pointer shadow-2xs border border-danger/30 disabled:opacity-50"
					title="Delete transaction"
					aria-label="Delete transaction"
				>
					<Trash2 size={13} strokeWidth={1.5} />
				</button>

				{/* Explicit Escape Hatch: Close (X) button */}
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						setShowActions(false);
					}}
					className="w-7 h-7 rounded-full flex items-center justify-center bg-surface text-text-muted hover:text-text hover:bg-card transition-colors cursor-pointer shadow-2xs border border-border/40"
					title="Close actions"
					aria-label="Close actions"
				>
					<X size={13} strokeWidth={2} />
				</button>
			</div>
		</div>
	);

	return (
		<div
			onClick={handleCardClick}
			className="rounded-[16px] px-2.5 transition-colors hover:bg-surface/50 cursor-pointer select-none"
		>
			<ListRow
				icon={visual.icon}
				iconBg={visual.bg}
				title={transaction.description}
				caption={getMeaningfulCaption(transaction)}
				rightContent={rightContent}
			/>
		</div>
	);
}

export default TransactionCard;
