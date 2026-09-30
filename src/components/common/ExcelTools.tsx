import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Download, Upload } from 'lucide-react';
import { useTransactionStore } from '../../stores/transactionStore';
import { addTransactions, getAllTransactions } from '../../db';
import type { Transaction } from '../../types';

export default function ExcelTools() {
	const [isProcessing, setIsProcessing] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const reloadAll = useTransactionStore((s) => s.reloadAll);

	const handleExport = async () => {
		try {
			setIsProcessing(true);
			const allTx = await getAllTransactions();
			
			// Map transactions to flat format for Excel
			const data = allTx.map(t => ({
				ID: t.id,
				Date: t.date,
				Type: t.type,
				Amount: t.amount,
				Description: t.description,
				Category: t.category,
				Account: t.account,
			}));

			const worksheet = XLSX.utils.json_to_sheet(data);
			const workbook = XLSX.utils.book_new();
			XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');
			
			XLSX.writeFile(workbook, `budget_tracker_transactions_${new Date().toISOString().slice(0, 10)}.xlsx`);
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
			const workbook = XLSX.read(data);
			
			const firstSheetName = workbook.SheetNames[0];
			const worksheet = workbook.Sheets[firstSheetName];
			
			// Get JSON from sheet
			const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);
			
			const newTransactions: Transaction[] = [];
			
			for (const row of rows) {
				// Validate required fields
				if (!row.Date || !row.Amount || !row.Type) continue;

				// Parse amount
				const amount = Number(row.Amount);
				if (isNaN(amount)) continue;

				// Enforce Type
				const type = (row.Type === 'income' || row.Type === 'expense') 
					? row.Type 
					: 'expense';

				const tx: Transaction = {
					id: row.ID ? String(row.ID) : crypto.randomUUID(),
					date: String(row.Date),
					type,
					amount,
					description: String(row.Description || ''),
					category: String(row.Category || 'Other'),
					account: String(row.Account || 'Cash'),
					createdAt: Date.now(),
				};
				newTransactions.push(tx);
			}

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
			// Reset file input so the same file can be selected again
			if (fileInputRef.current) {
				fileInputRef.current.value = '';
			}
		}
	};

	return (
		<div className="flex gap-2 w-full">
			<button
				onClick={handleExport}
				disabled={isProcessing}
				className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 text-xs font-bold border-2 border-black bg-white hover:bg-gray-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-50 cursor-pointer uppercase tracking-wider"
			>
				<Download size={14} />
				Export Excel
			</button>
			
			<button
				onClick={handleImportClick}
				disabled={isProcessing}
				className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 text-xs font-bold border-2 border-black bg-white hover:bg-gray-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-50 cursor-pointer uppercase tracking-wider"
			>
				<Upload size={14} />
				Import Excel
			</button>
			
			<input
				type="file"
				ref={fileInputRef}
				onChange={handleFileChange}
				accept=".xlsx, .xls, .csv"
				className="hidden"
			/>
		</div>
	);
}
