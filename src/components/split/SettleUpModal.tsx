import { useState, useEffect } from 'react';
import { Handshake, ArrowRight } from 'lucide-react';
import { useSplitStore } from '../../stores/splitStore';
import { Button } from '../common/Button';
import { BottomSheet } from '../ui/BottomSheet';
import { Select } from '../ui/Select';
import { statusSheet } from '../../stores/statusSheetStore';

const PRESET_AMOUNTS = [100, 250, 500, 1000, 2000, 5000];

export default function SettleUpModal() {
	const isSettleUpOpen = useSplitStore((s) => s.isSettleUpOpen);
	const setSettleUpOpen = useSplitStore((s) => s.setSettleUpOpen);
	const groups = useSplitStore((s) => s.groups);
	const selectedGroupId = useSplitStore((s) => s.selectedGroupId);
	const addSplit = useSplitStore((s) => s.addSplit);

	const activeGroup = groups.find((g) => g.id === selectedGroupId);

	const [payer, setPayer] = useState('You');
	const [receiver, setReceiver] = useState('');
	const [amount, setAmount] = useState('');

	useEffect(() => {
		if (activeGroup && activeGroup.members.length > 1) {
			setPayer('You');
			const otherMember = activeGroup.members.find((m) => m !== 'You') || activeGroup.members[1];
			setReceiver(otherMember);
		}
	}, [activeGroup, isSettleUpOpen]);

	if (!isSettleUpOpen || !activeGroup) return null;

	const handleClose = () => {
		setSettleUpOpen(false);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const numAmount = parseFloat(amount);
		if (isNaN(numAmount) || numAmount <= 0 || payer === receiver) return;

		const settlementSplit = {
			id: crypto.randomUUID(),
			groupId: activeGroup.id,
			title: `Settlement: ${payer} paid ${receiver}`,
			amount: numAmount,
			paidBy: payer,
			splitAmong: [receiver], // Receiver receives full credit
			date: new Date().toISOString().split('T')[0],
			createdAt: Date.now(),
			isSettlement: true,
		};

		// Close input bottom sheet and initiate status bottom sheet flow
		setSettleUpOpen(false);
		setAmount('');

		await statusSheet.execute({
			action: async () => {
				await addSplit(settlementSplit);
			},
			processingTitle: 'Processing...',
			processingMessage: 'Your settlement transfer is processing',
			successTitle: 'Success!',
			successMessage: receiver
				? `₹${numAmount.toLocaleString()} settlement to ${receiver} was successful`
				: `₹${numAmount.toLocaleString()} settlement recorded successfully`,
			buttonText: 'Nice one!',
			minProcessingMs: 1000,
		});
	};

	return (
		<BottomSheet
			isOpen={isSettleUpOpen}
			onClose={handleClose}
			title={
				<span className="flex items-center gap-2">
					<Handshake className="w-5 h-5 text-mint-deep" strokeWidth={1.5} /> Record settlement
				</span>
			}
		>
			<form onSubmit={handleSubmit} className="space-y-4">
				{/* Payer and Recipient selectors */}
				<div className="flex items-center gap-3 bg-surface p-4 rounded-[20px]">
					{/* Payer */}
					<div className="flex-1 min-w-0">
						<Select
							label="Payer"
							variant="card"
							size="sm"
							value={payer}
							onChange={(val) => setPayer(val)}
							options={activeGroup.members.map((m) => ({ value: m, label: m }))}
						/>
					</div>

					<ArrowRight className="w-4 h-4 text-text-muted mt-5 shrink-0" strokeWidth={1.5} />

					{/* Receiver */}
					<div className="flex-1 min-w-0">
						<Select
							label="Recipient"
							variant="card"
							size="sm"
							value={receiver}
							onChange={(val) => setReceiver(val)}
							options={activeGroup.members
								.filter((m) => m !== payer)
								.map((m) => ({ value: m, label: m }))}
						/>
					</div>
				</div>

				{/* Amount Input */}
				<div>
					<label className="block text-[12px] font-medium text-text-muted mb-1.5">
						Enter amount
					</label>
					<div className="relative">
						<span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-text-muted">
							₹
						</span>
						<input
							type="number"
							step="any"
							placeholder="0.00"
							value={amount}
							onChange={(e) => setAmount(e.target.value)}
							required
							className="w-full bg-surface rounded-full h-12 pl-8 pr-4 text-[16px] font-semibold text-text focus:outline-none focus:ring-2 focus:ring-ink/20"
						/>
					</div>
				</div>

				{/* Quick Preset Buttons (similar to the reference image) */}
				<div>
					<label className="block text-[11px] font-medium text-text-muted mb-1.5">
						Quick presets
					</label>
					<div className="grid grid-cols-3 gap-2">
						{PRESET_AMOUNTS.map((val) => (
							<button
								key={val}
								type="button"
								onClick={() => setAmount(val.toString())}
								className={`py-2 px-3 rounded-[14px] text-xs font-medium transition-all cursor-pointer ${
									amount === val.toString()
										? 'bg-ink text-white shadow-xs'
										: 'bg-surface text-text hover:bg-black/5 active:scale-95'
								}`}
							>
								₹{val.toLocaleString()}
							</button>
						))}
					</div>
				</div>

				{/* Submit Buttons */}
				<div className="flex gap-2.5 pt-2">
					<Button
						type="button"
						variant="secondary"
						onClick={handleClose}
						className="flex-1 py-3"
					>
						Cancel
					</Button>
					<Button
						type="submit"
						variant="accent"
						disabled={!amount || parseFloat(amount) <= 0}
						className="flex-1 py-3 font-medium"
					>
						Record payment
					</Button>
				</div>
			</form>
		</BottomSheet>
	);
}
