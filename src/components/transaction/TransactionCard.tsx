import { useState } from 'react';
import { Edit2, Trash2, Hamburger, IndianRupee } from 'lucide-react';
import type { Transaction } from '../../types';
import { useTransactionStore } from '../../stores/transactionStore';

interface TransactionCardProps {
	transaction: Transaction;
}

function TransactionCard({ transaction }: TransactionCardProps) {
	const [showActions, setShowActions] = useState(false);
	const deleteTransaction = useTransactionStore((s) => s.deleteTransaction);
	const isIncome = transaction.type === 'income';

	return (
		<li className="py-2.5 border-b border-gray-100 last:border-b-0">
			<div
				className="grid grid-cols-12 items-center cursor-pointer select-none active:bg-gray-50 transition-colors"
				onClick={() => setShowActions(!showActions)}
			>
				<div className="col-span-1 flex items-center justify-start">
					<div className="p-1 bg-[#eedcc2] border border-black text-[#9f8569] flex items-center justify-center">
						<Hamburger size={15} />
					</div>
				</div>
				<div className="col-span-5 text-left pl-2">
					<p className="font-semibold text-sm text-black leading-tight">
						{transaction.description}
					</p>
					<p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mt-0.5">
						{transaction.account}
					</p>
				</div>
				<div className="col-span-3 text-right text-sm text-gray-300">{transaction.category}</div>
				<div
					className={`col-span-3 text-right text-sm font-bold flex items-center justify-end gap-0.5 ${isIncome ? 'text-emerald-600' : 'text-[#8c6239]'}`}
				>
					{isIncome && <span>+</span>}
					<IndianRupee size={12} className="inline shrink-0" />
					<span>{transaction.amount.toFixed(1)}</span>
				</div>
			</div>

			{showActions && (
				<div className="flex items-center gap-1.5 justify-end mt-2 animate-fade-in">
					<button className="flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wider p-1 border border-black bg-white hover:bg-gray-50 active:translate-x-pxtactive:translate-y-pxtive:shadow-none shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] cursor-pointer transition-all">
						<Edit2 size={10} />
						{/* <span>Edit</span> */}
					</button>
					<button
						onClick={async () => await deleteTransaction(transaction.id)}
						className="flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wider p-1 border border-black bg-rose-50 hover:bg-rose-100 text-rose-700 active:translate-x-px active:translate-y-px active:shadow-none shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] cursor-pointer transition-all"
					>
						<Trash2 size={10} />
						{/* <span>Delete</span> */}
					</button>
				</div>
			)}
		</li>
	);
}

export default TransactionCard;
