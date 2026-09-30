import React, { useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { useTransactionStore } from '../../stores/transactionStore';
import { addTransactions, getAllTransactions } from '../../db';
import { exportTransactionsToExcel, parseTransactionsFromExcel } from '../../utils/excel';

interface ExcelToolsProps {
	className?: string;
}

export default function ExcelTools({ className = '' }: ExcelToolsProps) {
	const [isProcessing, setIsProcessing] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const reloadAll = useTransactionStore((s) => s.reloadAll);

	const handleExport = async () => {
		try {
			setIsProcessing(true);
			const allTx = await getAllTransactions();
			exportTransactionsToExcel(allTx);
		} catch (error) {
			console.error('Failed to export to Excel', error);
			alert('Failed to export transactions.');
		} finally {
			setIsProcessing(false);
		}
	};

	const handleImportClick = () => {
		fileInputRef.current?.click();
	};

	const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;

		try {
			setIsProcessing(true);
			const data = await file.arrayBuffer();
			const newTransactions = parseTransactionsFromExcel(data);

			if (newTransactions.length > 0) {
				await addTransactions(newTransactions);
				await reloadAll();
				alert(`Successfully imported ${newTransactions.length} transactions.`);
			} else {
				alert('No valid transactions found in the Excel file.');
			}
		} catch (error) {
			console.error('Failed to import Excel file', error);
			alert('Failed to import transactions. Please check the file format.');
		} finally {
			setIsProcessing(false);
			if (fileInputRef.current) {
				fileInputRef.current.value = '';
			}
		}
	};

	return (
		<div className={`flex items-center gap-2 shrink-0 ${className}`}>
			<button
				onClick={handleExport}
				disabled={isProcessing}
				className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-gray-100 border border-black text-black text-xs font-bold uppercase tracking-wider shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer disabled:opacity-50"
				title="Export transactions to Excel"
			>
				<Download size={13} />
				<span>{isProcessing ? '...' : 'Export'}</span>
			</button>

			<input
				type="file"
				ref={fileInputRef}
				onChange={handleFileChange}
				accept=".xlsx, .xls"
				className="hidden"
			/>

			<button
				onClick={handleImportClick}
				disabled={isProcessing}
				className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#fefed4] hover:bg-yellow-200 border border-black text-black text-xs font-bold uppercase tracking-wider shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer disabled:opacity-50"
				title="Import transactions from Excel"
			>
				<Upload size={13} />
				<span>Import</span>
			</button>
		</div>
	);
}
