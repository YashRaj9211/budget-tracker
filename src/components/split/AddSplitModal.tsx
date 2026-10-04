import { useState } from 'react';
import { Receipt, Calendar } from 'lucide-react';
import { useSplitStore } from '../../stores/splitStore';
import { errorMessage, useSplitDraft } from '../../hooks/useSplitDraft';
import SplitExpenseFields from './SplitExpenseFields';
import { Button } from '../common/Button';
import { BottomSheet } from '../ui/BottomSheet';
import { statusSheet } from '../../stores/statusSheetStore';

const inputStyle =
	'w-full bg-surface rounded-full h-11 px-4 text-sm font-normal text-text focus:outline-none focus:ring-2 focus:ring-ink/20';

/** "Add split expense" on the Split screen: same fields as the home form, limited to a group. */
export default function AddSplitModal() {
	const isOpen = useSplitStore((s) => s.isAddSplitOpen);
	const setOpen = useSplitStore((s) => s.setAddSplitOpen);

	const [title, setTitle] = useState('');
	const [amount, setAmount] = useState('');
	const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
	const [error, setError] = useState<string | null>(null);

	const numAmount = parseFloat(amount) || 0;
	const draft = useSplitDraft({ active: isOpen, allowFriends: true, amount: numAmount });

	if (!isOpen) return null;

	const handleClose = () => {
		setOpen(false);
		setError(null);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!title.trim() || numAmount <= 0) return;
		setError(null);

		const currentTitle = title.trim();
		const currentDate = date;
		const currentAmount = numAmount;

		setOpen(false);
		setTitle('');
		setAmount('');

		await statusSheet.execute({
			action: async () => {
				await draft.submit({ description: currentTitle, date: currentDate, amount: currentAmount });
				draft.reset();
			},
			processingTitle: 'Processing...',
			processingMessage: `Splitting ₹${currentAmount.toLocaleString()} among members`,
			successTitle: 'Success!',
			successMessage: `₹${currentAmount.toLocaleString()} split recorded for "${currentTitle}"`,
			buttonText: 'Nice one!',
			onError: (err) => {
				setError(errorMessage(err));
			},
		});
	};

	return (
		<BottomSheet
			isOpen={isOpen}
			onClose={handleClose}
			title={
				<span className="flex items-center gap-2">
					<Receipt className="w-5 h-5 text-text-muted" strokeWidth={1.5} />{' '}
					{draft.mode === 'group' && draft.selectedIds.length === 0 ? 'Add group expense' : 'Add split expense'}
				</span>
			}
		>
			<form onSubmit={handleSubmit} className="space-y-4 text-left pb-12">
				<div>
					<label className="block text-[12px] font-medium text-text-muted mb-1.5">Description</label>
					<input
						type="text"
						placeholder="e.g. Weekend Villa, Team Lunch, Uber"
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						required
						className={inputStyle}
					/>
				</div>

				<div className="grid grid-cols-2 gap-3">
					<div>
						<label className="block text-[12px] font-medium text-text-muted mb-1.5">Total amount (₹)</label>
						<input
							type="number"
							step="any"
							min="0"
							placeholder="0.00"
							value={amount}
							onChange={(e) => setAmount(e.target.value)}
							required
							className={inputStyle}
						/>
					</div>
					<div>
						<label className="block text-[12px] font-medium text-text-muted mb-1.5 flex items-center gap-1">
							<Calendar className="w-3.5 h-3.5 text-text-muted" strokeWidth={1.5} /> Date
						</label>
						<input
							type="date"
							value={date}
							onChange={(e) => setDate(e.target.value)}
							required
							className={inputStyle}
						/>
					</div>
				</div>

				<SplitExpenseFields draft={draft} />

				{error && (
					<p role="alert" className="rounded-[16px] bg-danger-soft p-3 text-xs font-medium text-danger">
						{error}
					</p>
				)}

				<Button
					type="submit"
					variant="primary"
					disabled={!!draft.error || numAmount <= 0}
					className="w-full py-3 font-medium"
				>
					{draft.mode === 'group' && draft.selectedIds.length === 0 ? 'Add expense' : 'Add split'}
				</Button>
			</form>
		</BottomSheet>
	);
}
