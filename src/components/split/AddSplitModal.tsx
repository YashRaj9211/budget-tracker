import { useState } from 'react';
import { Receipt, Calendar, ArrowLeft, ArrowRight } from 'lucide-react';
import { useSplitStore } from '../../stores/splitStore';
import { errorMessage, useSplitDraft } from '../../hooks/useSplitDraft';
import SplitExpenseFields from './SplitExpenseFields';
import { Select } from '../ui/Select';
import { Button } from '../common/Button';
import { BottomSheet } from '../ui/BottomSheet';
import { statusSheet } from '../../stores/statusSheetStore';
import { getCategoryVisual } from '../../utils/indianCategoryIcons';

const inputStyle =
	'w-full bg-surface rounded-full h-11 px-4 text-sm font-normal text-text focus:outline-none focus:ring-2 focus:ring-ink/20';

/** "Add split expense" on the Split screen: 2-step flow with details then splits. */
export default function AddSplitModal() {
	const isOpen = useSplitStore((s) => s.isAddSplitOpen);
	const setOpen = useSplitStore((s) => s.setAddSplitOpen);

	const [step, setStep] = useState<1 | 2>(1);
	const [title, setTitle] = useState('');
	const [amount, setAmount] = useState('');
	const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
	const [error, setError] = useState<string | null>(null);

	const numAmount = parseFloat(amount) || 0;
	const draft = useSplitDraft({ active: isOpen, allowFriends: true, amount: numAmount });

	const detectedVisual = getCategoryVisual({
		description: title,
		isSplit: true,
		iconSize: 16,
	});

	if (!isOpen) return null;

	const handleClose = () => {
		setOpen(false);
		setStep(1);
		setError(null);
	};

	const canProceedToStep2 = () => {
		return !!(title.trim() && numAmount > 0);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!title.trim() || numAmount <= 0) return;
		setError(null);

		const currentTitle = title.trim();
		const currentDate = date;
		const currentAmount = numAmount;

		setOpen(false);
		setStep(1);
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
				<div className="flex items-center justify-between w-full pr-4">
					<span className="flex items-center gap-2">
						<Receipt className="w-5 h-5 text-text-muted" strokeWidth={1.5} />{' '}
						{draft.mode === 'group' && draft.selectedIds.length === 0 ? 'Add group expense' : 'Add split expense'}
					</span>
					<span className="text-xs font-normal text-text-muted">
						Step {step} of 2
					</span>
				</div>
			}
		>
			<form onSubmit={handleSubmit} className="space-y-4 text-left pb-12">
				{/* Step progress bar */}
				<div className="flex items-center gap-2 pt-0.5 pb-1">
					<div
						className={`flex-1 h-1 rounded-full transition-all ${
							step >= 1 ? 'bg-ink' : 'bg-surface'
						}`}
					/>
					<div
						className={`flex-1 h-1 rounded-full transition-all ${
							step >= 2 ? 'bg-ink' : 'bg-surface'
						}`}
					/>
				</div>

				{/* STEP 1: Amount, Date, Description, Category */}
				{step === 1 && (
					<>
						<div>
							<div className="flex items-center justify-between mb-1.5">
								<label className="text-[12px] font-medium text-text-muted">Description</label>
								{title.trim() && (
									<span className="text-[11px] text-text-muted flex items-center gap-1.5">
										<span>Auto icon:</span>
										<span
											className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all ${detectedVisual.bg}`}
										>
											{detectedVisual.icon}
											<span>{detectedVisual.iconName}</span>
										</span>
									</span>
								)}
							</div>
							<div className="relative flex items-center">
								<input
									type="text"
									placeholder="e.g. Chai tapri, Dinner at Dhaba, Auto ride, Blinkit"
									value={title}
									onChange={(e) => setTitle(e.target.value)}
									required
									className={`${inputStyle} pr-11`}
								/>
								<div
									className={`absolute right-2.5 w-7 h-7 rounded-full flex items-center justify-center transition-all ${
										title.trim()
											? detectedVisual.bg
											: 'bg-surface text-text-muted opacity-40'
									}`}
									title={`Auto icon: ${detectedVisual.iconName}`}
								>
									{detectedVisual.icon}
								</div>
							</div>
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

						{draft.categories.length > 0 && (
							<div>
								<label className="block text-[12px] font-medium text-text-muted mb-1.5">Category</label>
								<Select
									ariaLabel="Category"
									value={draft.categoryId}
									onChange={draft.setCategoryId}
									options={[{ id: '', label: 'No category' }, ...draft.categories.map((c) => ({ id: c.id, label: c.name }))]}
									placeholder="No category"
								/>
							</div>
						)}
					</>
				)}

				{/* STEP 2: Group/Friends, Paid by, Split methods and Member assignments */}
				{step === 2 && (
					<SplitExpenseFields draft={draft} hideCategory={true} />
				)}

				{error && (
					<p role="alert" className="rounded-[16px] bg-danger-soft p-3 text-xs font-medium text-danger">
						{error}
					</p>
				)}

				{step === 1 ? (
					<Button
						type="button"
						variant="primary"
						disabled={!canProceedToStep2()}
						onClick={() => setStep(2)}
						className="w-full py-3 font-medium flex items-center justify-center gap-2"
					>
						<span>Continue to Splits</span>
						<ArrowRight size={16} />
					</Button>
				) : (
					<div className="flex items-center gap-2">
						<Button
							type="button"
							variant="secondary"
							onClick={() => setStep(1)}
							className="px-4 py-3 font-medium flex items-center justify-center gap-1.5"
						>
							<ArrowLeft size={16} />
							<span>Back</span>
						</Button>
						<Button
							type="submit"
							variant="primary"
							disabled={!!draft.error || numAmount <= 0}
							className="flex-1 py-3 font-medium"
						>
							{draft.mode === 'group' && draft.selectedIds.length === 0 ? 'Add expense' : 'Add split'}
						</Button>
					</div>
				)}
			</form>
		</BottomSheet>
	);
}
