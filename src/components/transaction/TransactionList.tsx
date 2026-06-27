import TransactionCard from './TransactionCard';
import TransactionsHeader from './TransactionsHeader';
import type { DayGroup } from '../../types';

interface TransactionListProps {
	group: DayGroup;
}

function TransactionList({ group }: TransactionListProps) {
	return (
		<div className="transaction-list">
			<TransactionsHeader
				dayNum={group.dayNum}
				dayName={group.dayName}
				income={group.income}
				expense={group.expense}
			/>
			<ul className="px-4">
				{group.transactions.map((t) => (
					<TransactionCard key={t.id} transaction={t} />
				))}
			</ul>
		</div>
	);
}

export default TransactionList;
