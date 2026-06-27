import TransactionCard from './TransactionCard';
import TransactionsHeader from './TransactionsHeader';
function TransactionList() {
	return (
		<div className="transaction-list">
			<TransactionsHeader />
			<ul className="px-4">
				<TransactionCard />
				<TransactionCard />
				<TransactionCard />
			</ul>
		</div>
	);
}

export default TransactionList;
