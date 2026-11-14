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
		<div className={`grid grid-cols-2 gap-2 w-full ${className}`}>
			<button
				type="button"
				onClick={handleExport}
				disabled={isProcessing}
				className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-full border border-ink/20 text-ink bg-surface hover:bg-surface/80 text-xs font-medium active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
				title="Export transactions to Excel"
			>
				<Download size={14} strokeWidth={1.5} />
				<span>{isProcessing ? 'Exporting…' : 'Export'}</span>
			</button>

			<input
				type="file"
				ref={fileInputRef}
				onChange={handleFileChange}
				accept=".xlsx, .xls"
				className="hidden"
			/>

			<button
				type="button"
				onClick={handleImportClick}
				disabled={isProcessing}
				className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-full bg-ink text-white hover:bg-ink-soft text-xs font-medium active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
				title="Import transactions from Excel"
			>
				<Upload size={14} strokeWidth={1.5} />
				<span>Import</span>
			</button>
		</div>
	);
}
