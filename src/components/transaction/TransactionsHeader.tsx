interface TransactionsHeaderProps {
	dayNum: number;
	dayName: string;
	income: number;
	expense: number;
}

function TransactionsHeader({ dayNum, dayName, income, expense }: TransactionsHeaderProps) {
	return (
		<div className="transaction-header grid grid-cols-12 items-center px-4 py-2 bg-white border-t border-b border-dashed">
			<div className="col-span-6 flex items-baseline gap-2">
				<span className="text-xl font-medium">{dayNum}</span>
				<span className="text-sm text-gray-500">{dayName}</span>
			</div>
			<div className="col-span-3 text-right text-sm font-medium text-emerald-600">
				{income > 0 ? `+${income.toFixed(1)}` : '+0.0'}
			</div>
			<div className="col-span-3 text-right text-sm font-medium text-rose-600">
				{expense > 0 ? `-${expense.toFixed(1)}` : '-0.0'}
			</div>
		</div>
	);
}

export default TransactionsHeader;
