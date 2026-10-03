import { useState } from 'react';
import { X, Receipt, Calendar } from 'lucide-react';
import { useSplitStore } from '../../stores/splitStore';
import { errorMessage, useSplitDraft } from '../../hooks/useSplitDraft';
import SplitExpenseFields from './SplitExpenseFields';

const input =
	'w-full border-2 border-black p-2.5 text-sm font-semibold focus:outline-none focus:bg-yellow-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]';

/** "Add split expense" on the Split screen: same fields as the home form, limited to a group. */
export default function AddSplitModal() {
	const isOpen = useSplitStore((s) => s.isAddSplitOpen);
	const setOpen = useSplitStore((s) => s.setAddSplitOpen);

	const [title, setTitle] = useState('');
	const [amount, setAmount] = useState('');
	const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const numAmount = parseFloat(amount) || 0;
	const draft = useSplitDraft({ active: isOpen, allowFriends: true, amount: numAmount });

	if (!isOpen) return null;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!title.trim() || numAmount <= 0 || saving) return;
		setSaving(true);
		setError(null);
		try {
			await draft.submit({ description: title.trim(), date, amount: numAmount });
			setOpen(false);
			setTitle('');
			setAmount('');
			draft.reset();
		} catch (err) {
			setError(errorMessage(err));
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
			<div className="bg-white border-[3px] border-black w-full max-w-md p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative max-h-[92vh] flex flex-col">
				<div className="flex items-center justify-between border-b-2 border-black pb-3 mb-4">
					<h2 className="font-black text-lg text-black uppercase tracking-wide flex items-center gap-2">
						<Receipt className="w-5 h-5" /> {draft.mode === 'group' && draft.selectedIds.length === 0 ? 'Add Group Expense' : 'Add Split Expense'}
					</h2>
					<button onClick={() => setOpen(false)} className="p-1 border-2 border-black hover:bg-neutral-100" aria-label="Close modal">
						<X className="w-5 h-5" />
					</button>
				</div>

				<form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-1 space-y-4 text-left">
					<div>
						<label className="block text-xs font-black uppercase mb-1.5">Description</label>
						<input type="text" placeholder="e.g. Weekend Villa, Team Lunch, Uber" value={title} onChange={(e) => setTitle(e.target.value)} required className={input} />
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div>
							<label className="block text-xs font-black uppercase mb-1.5">Total Amount (₹)</label>
							<input type="number" step="any" min="0" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} required className={input} />
						</div>
						<div>
							<label className="block text-xs font-black uppercase mb-1.5 flex items-center gap-1">
								<Calendar className="w-3.5 h-3.5" /> Date
							</label>
							<input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className={input} />
						</div>
					</div>

					<SplitExpenseFields draft={draft} />

					{error && (
						<p role="alert" className="border-2 border-rose-400 bg-rose-50 p-2 text-xs font-bold text-rose-800">
							{error}
						</p>
					)}

					<button
						type="submit"
						disabled={saving || !!draft.error || numAmount <= 0}
						className="w-full py-2.5 border-2 border-black font-bold text-xs tracking-wider uppercase bg-black text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{saving ? 'Saving…' : draft.mode === 'group' && draft.selectedIds.length === 0 ? 'Add Expense' : 'Add Split'}
					</button>
				</form>
			</div>
		</div>
	);
}
