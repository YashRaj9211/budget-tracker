import { useState, useEffect } from 'react';
import { X, Receipt, CheckSquare, Square } from 'lucide-react';
import { useSplitStore } from '../../stores/splitStore';

export default function AddSplitModal() {
	const isAddSplitOpen = useSplitStore((s) => s.isAddSplitOpen);
	const setAddSplitOpen = useSplitStore((s) => s.setAddSplitOpen);
	const groups = useSplitStore((s) => s.groups);
	const selectedGroupId = useSplitStore((s) => s.selectedGroupId);
	const addSplit = useSplitStore((s) => s.addSplit);

	const [groupId, setGroupId] = useState('');
	const [title, setTitle] = useState('');
	const [amount, setAmount] = useState('');
	const [paidBy, setPaidBy] = useState('You');
	const [splitAmong, setSplitAmong] = useState<string[]>([]);
	const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

	// Update active group selection when modal opens
	useEffect(() => {
		if (selectedGroupId && groups.some((g) => g.id === selectedGroupId)) {
			setGroupId(selectedGroupId);
		} else if (groups.length > 0) {
			setGroupId(groups[0].id);
		}
	}, [selectedGroupId, groups, isAddSplitOpen]);

	// Update members list when selected group changes
	useEffect(() => {
		const g = groups.find((group) => group.id === groupId);
		if (g) {
			setSplitAmong([...g.members]);
			setPaidBy('You');
		}
	}, [groupId, groups]);

	if (!isAddSplitOpen) return null;

	const activeGroup = groups.find((g) => g.id === groupId);

	const toggleMemberSplit = (member: string) => {
		if (splitAmong.includes(member)) {
			if (splitAmong.length > 1) {
				setSplitAmong(splitAmong.filter((m) => m !== member));
			}
		} else {
			setSplitAmong([...splitAmong, member]);
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const numAmount = parseFloat(amount);
		if (!title.trim() || isNaN(numAmount) || numAmount <= 0 || !groupId) return;

		const newSplit = {
			id: crypto.randomUUID(),
			groupId,
			title: title.trim(),
			amount: numAmount,
			paidBy,
			splitAmong,
			date,
			createdAt: Date.now(),
		};

		await addSplit(newSplit);
		setAddSplitOpen(false);

		// Reset form
		setTitle('');
		setAmount('');
	};

	const perPersonShare =
		amount && !isNaN(parseFloat(amount)) && splitAmong.length > 0
			? (parseFloat(amount) / splitAmong.length).toFixed(2)
			: '0';

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
			<div className="bg-white border-2 border-black w-full max-w-md p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] relative max-h-[90vh] overflow-y-auto">
				{/* Close Button */}
				<button
					onClick={() => setAddSplitOpen(false)}
					className="absolute top-4 right-4 p-1 border border-black hover:bg-gray-100"
				>
					<X className="w-5 h-5" />
				</button>

				<h2 className="font-bold text-lg text-black mb-4 flex items-center gap-2">
					<Receipt className="w-5 h-5" /> Add Split Expense
				</h2>

				<form onSubmit={handleSubmit} className="space-y-4">
					{/* Group Selector */}
					<div>
						<label className="block text-xs font-bold uppercase mb-1">Group</label>
						<select
							value={groupId}
							onChange={(e) => setGroupId(e.target.value)}
							required
							className="w-full border-2 border-black p-2.5 text-sm font-medium bg-white focus:outline-none"
						>
							{groups.map((g) => (
								<option key={g.id} value={g.id}>
									{g.name}
								</option>
							))}
						</select>
					</div>

					{/* Expense Description */}
					<div>
						<label className="block text-xs font-bold uppercase mb-1">Description</label>
						<input
							type="text"
							placeholder="e.g. Dinner, Uber, Hotel"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							required
							className="w-full border-2 border-black p-2.5 text-sm font-medium focus:outline-none"
						/>
					</div>

					{/* Amount & Date */}
					<div className="grid grid-cols-2 gap-3">
						<div>
							<label className="block text-xs font-bold uppercase mb-1">Total Amount (₹)</label>
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
						<div>
							<label className="block text-xs font-bold uppercase mb-1">Date</label>
							<input
								type="date"
								value={date}
								onChange={(e) => setDate(e.target.value)}
								required
								className="w-full border-2 border-black p-2 text-sm font-medium focus:outline-none"
							/>
						</div>
					</div>

					{/* Paid By */}
					{activeGroup && (
						<div>
							<label className="block text-xs font-bold uppercase mb-1">Paid By</label>
							<select
								value={paidBy}
								onChange={(e) => setPaidBy(e.target.value)}
								className="w-full border-2 border-black p-2.5 text-sm font-medium bg-white focus:outline-none"
							>
								{activeGroup.members.map((m) => (
									<option key={m} value={m}>
										{m}
									</option>
								))}
							</select>
						</div>
					)}

					{/* Split Among checkboxes */}
					{activeGroup && (
						<div>
							<div className="flex items-center justify-between mb-1">
								<label className="block text-xs font-bold uppercase">Split Among</label>
								<span className="text-xs text-gray-500 font-semibold">
									₹{perPersonShare} / person
								</span>
							</div>

							<div className="border-2 border-black p-2.5 space-y-2 bg-gray-50 max-h-36 overflow-y-auto">
								{activeGroup.members.map((m) => {
									const isChecked = splitAmong.includes(m);
									return (
										<div
											key={m}
											onClick={() => toggleMemberSplit(m)}
											className="flex items-center gap-2 cursor-pointer hover:bg-gray-200 p-1.5 border border-transparent hover:border-black transition-all select-none"
										>
											{isChecked ? (
												<CheckSquare className="w-4 h-4 text-black" />
											) : (
												<Square className="w-4 h-4 text-gray-400" />
											)}
											<span className="text-sm font-medium text-black">{m}</span>
										</div>
									);
								})}
							</div>
						</div>
					)}

					{/* Submit Buttons */}
					<div className="flex gap-3 pt-3">
						<button
							type="button"
							onClick={() => setAddSplitOpen(false)}
							className="flex-1 border-2 border-black p-2.5 font-bold text-sm bg-gray-100 hover:bg-gray-200"
						>
							Cancel
						</button>
						<button
							type="submit"
							className="flex-1 border-2 border-black p-2.5 font-bold text-sm bg-black text-white shadow-[3px_3px_0px_0px_rgba(150,150,150,1)] hover:bg-gray-800"
						>
							Save Expense
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
