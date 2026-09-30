import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { parseTransactionsFromExcel } from './excel';

function makeBuffer(rows: Record<string, unknown>[]): ArrayBuffer {
	const ws = XLSX.utils.json_to_sheet(rows);
	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
	const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
	return out;
}

describe('parseTransactionsFromExcel', () => {
	it('reads valid rows and skips bad ones', () => {
		const buf = makeBuffer([
			{ ID: 'a1', Date: '2026-01-05', Type: 'expense', Amount: 250, Description: 'Food', Category: 'Food', Account: 'Cash' },
			{ Date: '2026-01-06', Type: 'income', Amount: 1000 },
			{ Date: '2026-01-07', Type: 'expense', Amount: -5 }, // negative -> skipped
			{ Date: '2026-01-08', Type: 'expense', Amount: 'abc' }, // not a number -> skipped
			{ Type: 'expense', Amount: 10 }, // no date -> skipped
		]);
		const result = parseTransactionsFromExcel(buf);
		expect(result).toHaveLength(2);
		expect(result[0]).toMatchObject({ id: 'a1', amount: 250, type: 'expense', category: 'Food' });
		expect(result[1]).toMatchObject({ type: 'income', category: 'Other', account: 'Cash' });
	});

	it('returns an empty list for an empty file', () => {
		expect(parseTransactionsFromExcel(makeBuffer([{}]))).toEqual([]);
	});
});
