import TransactionCard from './TransactionCard';
import TransactionsHeader from './TransactionsHeader';
import type { DayGroup } from '../../types';
import { Card } from '../ui/Card';

interface TransactionListProps {
	group: DayGroup;
}

function TransactionList({ group }: TransactionListProps) {
	return (
		<div className="mb-4 last:mb-0">
			<TransactionsHeader
				dayNum={group.dayNum}
				dayName={group.dayName}
				income={group.income}
				expense={group.expense}
			/>
			<Card variant="white" nested className="p-2 shadow-sm divide-y divide-surface">
				{group.transactions.map((t) => (
					<TransactionCard key={t.id} transaction={t} />
				))}
			</Card>
		</div>
	);
}

export default TransactionList;
