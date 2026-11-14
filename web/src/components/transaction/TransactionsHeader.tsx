interface TransactionsHeaderProps {
	dayNum: number;
	dayName: string;
	income: number;
	expense: number;
}

function TransactionsHeader({ dayNum, dayName, income, expense }: TransactionsHeaderProps) {
	return (
		<div className="flex items-center justify-between px-1 mb-2 mt-5 first:mt-0">
			<div className="flex items-center gap-2">
				<span className="text-[15px] font-medium text-text">{dayNum}</span>
				<span className="text-[12px] text-text-muted">{dayName}</span>
			</div>
			<div className="flex items-center gap-2 text-[12px] font-medium">
				{income > 0 && (
					<span className="text-mint-deep bg-mint/30 px-2.5 py-0.5 rounded-full">
						+₹{income.toLocaleString()}
					</span>
				)}
				{expense > 0 && (
					<span className="text-text bg-surface px-2.5 py-0.5 rounded-full">
						-₹{expense.toLocaleString()}
					</span>
				)}
			</div>
		</div>
	);
}

export default TransactionsHeader;
