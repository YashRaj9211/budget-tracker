import * as XLSX from 'xlsx';
import type { Transaction } from '../types';

/**
 * Exports an array of transactions to an Excel file (.xlsx)
 */
export function exportTransactionsToExcel(transactions: Transaction[], filename?: string): void {
	const data = transactions.map((t) => ({
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

	const exportName = filename || `budget_tracker_transactions_${new Date().toISOString().slice(0, 10)}.xlsx`;
	XLSX.writeFile(workbook, exportName);
}

/**
 * Parses an Excel file array buffer and returns a validated list of transactions.
 */
export function parseTransactionsFromExcel(arrayBuffer: ArrayBuffer): Transaction[] {
	const workbook = XLSX.read(arrayBuffer);
	const firstSheetName = workbook.SheetNames[0];
	if (!firstSheetName) return [];

	const worksheet = workbook.Sheets[firstSheetName];
	const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);

	const transactions: Transaction[] = [];

	for (const row of rows) {
		// Validate required fields
		if (!row.Date || !row.Amount || !row.Type) continue;

		// Parse amount
		const amount = Number(row.Amount);
		if (isNaN(amount) || amount <= 0) continue;

		// Enforce Type
		const type = row.Type === 'income' || row.Type === 'expense' ? row.Type : 'expense';

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
		transactions.push(tx);
	}

	return transactions;
}
