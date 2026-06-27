function TransactionsHeader() {
	return (
		<div className="transaction-header grid grid-cols-12 items-center px-4 py-2 bg-white border-t border-b border-dashed">
			<div className="col-span-6 flex items-baseline gap-2">
				<span className="text-xl font-medium">27</span>
				<span className="text-sm text-gray-500">Sat</span>
			</div>
			<div className="col-span-3 text-right text-sm font-medium text-emerald-600">+0.0</div>
			<div className="col-span-3 text-right text-sm font-medium text-rose-600">-120.45</div>
		</div>
	);
}

export default TransactionsHeader;
