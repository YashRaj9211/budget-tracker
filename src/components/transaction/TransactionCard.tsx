import { useState } from 'react';
import {
	Edit2,
	Trash2,
	ShoppingBag,
	Utensils,
	Coffee,
	Car,
	HeartPulse,
	Film,
	Receipt,
	Sparkles,
	Tag,
	Users,
	ArrowDownLeft,
} from 'lucide-react';
import type { Transaction } from '../../types';
import { useTransactionStore } from '../../stores/transactionStore';
import { useSplitStore } from '../../stores/splitStore';
import { useNavigate } from 'react-router';
import { ListRow } from '../ui/ListRow';
import { IconButton } from '../ui/IconButton';

interface TransactionCardProps {
	transaction: Transaction;
}

function getCategoryVisual(category = '', description = '', isIncome = false, isSplit = false) {
	if (isIncome) {
		return {
			icon: <ArrowDownLeft size={18} strokeWidth={2} />,
			bg: 'bg-mint/40 text-mint-deep',
		};
	}
	if (isSplit) {
		return {
			icon: <Users size={18} strokeWidth={1.75} />,
			bg: 'bg-lavender/40 text-lavender-deep',
		};
	}

	const text = `${category} ${description}`.toLowerCase();

	if (/grocery|groceries|zepto|blinkit|instamart|bigbasket|supermarket/i.test(text)) {
		return {
			icon: <ShoppingBag size={18} strokeWidth={1.75} />,
			bg: 'bg-emerald-100 text-emerald-800',
		};
	}
	if (/chai|coffee|tea|cafe|starbucks/i.test(text)) {
		return {
			icon: <Coffee size={18} strokeWidth={1.75} />,
			bg: 'bg-amber-100 text-amber-800',
		};
	}
	if (/food|lunch|dinner|breakfast|momo|golgappe|sandwich|burger|pizza|restaurant|zomato|swiggy|snack|meal/i.test(text)) {
		return {
			icon: <Utensils size={18} strokeWidth={1.75} />,
			bg: 'bg-orange-100 text-orange-800',
		};
	}
	if (/travel|cab|uber|ola|metro|auto|rapido|petrol|fuel|bus|train|flight/i.test(text)) {
		return {
			icon: <Car size={18} strokeWidth={1.75} />,
			bg: 'bg-sky-100 text-sky-800',
		};
	}
	if (/medicine|pill|tablet|citrazin|paracetamol|doctor|hospital|health|clinic/i.test(text)) {
		return {
			icon: <HeartPulse size={18} strokeWidth={1.75} />,
			bg: 'bg-rose-100 text-rose-800',
		};
	}
	if (/shopping|clothes|shirt|pants|shoes|amazon|flipkart|myntra|zara|h&m/i.test(text)) {
		return {
			icon: <ShoppingBag size={18} strokeWidth={1.75} />,
			bg: 'bg-pink-100 text-pink-800',
		};
	}
	if (/movie|cinema|netflix|spotify|prime|game|entertainment/i.test(text)) {
		return {
			icon: <Film size={18} strokeWidth={1.75} />,
			bg: 'bg-purple-100 text-purple-800',
		};
	}
	if (/bill|electricity|wifi|internet|rent|recharge|water|utility/i.test(text)) {
		return {
			icon: <Receipt size={18} strokeWidth={1.75} />,
			bg: 'bg-amber-100 text-amber-800',
		};
	}
	if (/hair|salon|spa|beauty|grooming/i.test(text)) {
		return {
			icon: <Sparkles size={18} strokeWidth={1.75} />,
			bg: 'bg-teal-100 text-teal-800',
		};
	}

	return {
		icon: <Tag size={18} strokeWidth={1.75} />,
		bg: 'bg-surface text-text-muted',
	};
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
