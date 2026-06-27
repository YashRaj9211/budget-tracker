import { Hamburger, IndianRupee } from 'lucide-react';
import type { Transaction } from '../../types';

interface TransactionCardProps {
	transaction: Transaction;
}

function TransactionCard({ transaction }: TransactionCardProps) {
	const isIncome = transaction.type === 'income';

	return (
		<li className="py-2.5">
			<div className="grid grid-cols-12 items-center">
				<div className="col-span-1 flex items-center justify-start">
					<div className="p-1 bg-[#eedcc2] border border-black text-[#9f8569] flex items-center justify-center">
						<Hamburger size={15} />
					</div>
				</div>
				<div className="col-span-5 text-left pl-2">
					<p className="font-semibold text-sm text-black leading-tight">{transaction.description}</p>
					<p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mt-0.5">
						{transaction.account}
					</p>
				</div>
				<div className="col-span-3 text-right text-sm text-gray-300">
					{transaction.category}
				</div>
				<div className={`col-span-3 text-right text-sm font-bold flex items-center justify-end gap-0.5 ${isIncome ? 'text-emerald-600' : 'text-[#8c6239]'}`}>
					{isIncome && <span>+</span>}
					<IndianRupee size={12} className="inline shrink-0" />
					<span>{transaction.amount.toFixed(1)}</span>
				</div>
			</div>
		</li>
	);
}

export default TransactionCard;
