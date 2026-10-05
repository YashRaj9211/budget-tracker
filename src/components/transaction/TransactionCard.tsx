import { useState } from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import type { Transaction } from '../../types';
import { useTransactionStore } from '../../stores/transactionStore';
import { useSplitStore } from '../../stores/splitStore';
import { useNavigate } from 'react-router';
import { ListRow } from '../ui/ListRow';
import { IconButton } from '../ui/IconButton';
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
	const deleteTransaction = useTransactionStore((s) => s.deleteTransaction);
	const setSelectedGroupId = useSplitStore((s) => s.setSelectedGroupId);
	const navigate = useNavigate();
	const isIncome = transaction.type === 'income';

	const handleClick = () => {
		if (transaction.isSplit && transaction.groupId) {
			setSelectedGroupId(transaction.groupId);
			navigate('/split');
		} else {
			setShowActions(!showActions);
		}
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

	return (
		<div className="flex flex-col group rounded-[16px] px-2.5 transition-colors hover:bg-surface/50">
			<div onClick={handleClick} className="cursor-pointer">
				<ListRow
					icon={visual.icon}
					iconBg={visual.bg}
					title={transaction.description}
					caption={getMeaningfulCaption(transaction)}
					amount={formattedAmount}
					amountColor={isIncome ? 'mint-deep' : 'ink'}
				/>
			</div>

			{showActions && (
				<div className="flex justify-end gap-2 pb-2.5 pt-1 animate-fade-in">
					<IconButton variant="outline" className="w-8 h-8 rounded-full" onClick={(e) => e.stopPropagation()}>
						<Edit2 size={13} strokeWidth={1.5} />
					</IconButton>
					<IconButton
						variant="outline"
						className="w-8 h-8 rounded-full text-danger border-danger/40 hover:bg-danger-soft"
						onClick={async (e) => {
							e.stopPropagation();
							await deleteTransaction(transaction.id);
						}}
					>
						<Trash2 size={13} strokeWidth={1.5} />
					</IconButton>
				</div>
			)}
		</div>
	);
}

export default TransactionCard;
