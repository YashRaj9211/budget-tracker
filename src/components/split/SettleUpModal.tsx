import { useState, useEffect } from 'react';
import { X, Handshake, ArrowRight, ChevronDown } from 'lucide-react';
import { useSplitStore } from '../../stores/splitStore';

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

		await addSplit(settlementSplit);
		setSettleUpOpen(false);
		setAmount('');
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
			<div className="bg-white border-2 border-black w-full max-w-md p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] relative">
				{/* Close Button */}
				<button
					onClick={() => setSettleUpOpen(false)}
					className="absolute top-4 right-4 p-1 border border-black hover:bg-gray-100"
				>
					<X className="w-5 h-5" />
				</button>

				<h2 className="font-bold text-lg text-black mb-4 flex items-center gap-2">
					<Handshake className="w-5 h-5 text-emerald-600" /> Record Settlement
				</h2>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="flex items-center gap-2 bg-emerald-50 p-3 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
						{/* Payer */}
						<div className="flex-1">
							<label className="block text-[11px] font-black uppercase mb-1 text-emerald-900">Payer</label>
							<div className="relative">
								<select
									value={payer}
									onChange={(e) => setPayer(e.target.value)}
									className="w-full appearance-none border-2 border-black p-2 pr-7 text-xs font-bold bg-white focus:outline-none cursor-pointer"
								>
									{activeGroup.members.map((m) => (
										<option key={m} value={m}>
											{m}
										</option>
									))}
								</select>
								<ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none text-black" />
							</div>
						</div>

						<ArrowRight className="w-5 h-5 text-black mt-4 shrink-0" />

						{/* Receiver */}
						<div className="flex-1">
							<label className="block text-[11px] font-black uppercase mb-1 text-emerald-900">Recipient</label>
							<div className="relative">
								<select
									value={receiver}
									onChange={(e) => setReceiver(e.target.value)}
									className="w-full appearance-none border-2 border-black p-2 pr-7 text-xs font-bold bg-white focus:outline-none cursor-pointer"
								>
									{activeGroup.members
										.filter((m) => m !== payer)
										.map((m) => (
											<option key={m} value={m}>
												{m}
											</option>
										))}
								</select>
								<ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none text-black" />
							</div>
						</div>
					</div>

					{/* Amount */}
					<div>
						<label className="block text-xs font-bold uppercase mb-1">Settlement Amount (₹)</label>
						<input
							type="number"
							step="any"
							placeholder="0.00"
							value={amount}
							onChange={(e) => setAmount(e.target.value)}
							required
							className="w-full border-2 border-black p-2.5 text-sm font-medium focus:outline-none"
						/>
					</div>

					{/* Submit Buttons */}
					<div className="flex gap-3 pt-3">
						<button
							type="button"
							onClick={() => setSettleUpOpen(false)}
							className="flex-1 border-2 border-black p-2.5 font-bold text-sm bg-gray-100 hover:bg-gray-200"
						>
							Cancel
						</button>
						<button
							type="submit"
							className="flex-1 border-2 border-black p-2.5 font-bold text-sm bg-emerald-600 text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-emerald-700"
						>
							Record Payment
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
