import { useState, useEffect } from 'react';
import { X, Receipt, ChevronDown, Check, User, Calendar, Layers } from 'lucide-react';
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

	const toggleSelectAll = () => {
		if (!activeGroup) return;
		if (splitAmong.length === activeGroup.members.length) {
			// keep at least one
			setSplitAmong([activeGroup.members[0]]);
		} else {
			setSplitAmong([...activeGroup.members]);
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

	const isAllSelected = activeGroup ? splitAmong.length === activeGroup.members.length : false;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
			<div className="bg-white border-[3px] border-black w-full max-w-md p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative max-h-[92vh] flex flex-col">
				{/* Modal Header */}
				<div className="flex items-center justify-between border-b-2 border-black pb-3 mb-4">
					<h2 className="font-black text-lg text-black uppercase tracking-wide flex items-center gap-2">
						<Receipt className="w-5 h-5" /> Add Split Expense
					</h2>
					<button
						onClick={() => setAddSplitOpen(false)}
						className="p-1 border-2 border-black hover:bg-neutral-100 active:translate-x-0.5 active:translate-y-0.5"
						aria-label="Close modal"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Scrollable Form Body */}
				<form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-1 space-y-4 text-left">
					{/* Group Selector Dropdown */}
					<div>
						<label className="block text-xs font-black uppercase mb-1.5 flex items-center gap-1.5">
							<Layers className="w-3.5 h-3.5" /> Group
						</label>
						<div className="relative">
							<select
								value={groupId}
								onChange={(e) => setGroupId(e.target.value)}
								required
								className="w-full appearance-none border-2 border-black p-2.5 pr-9 text-sm font-bold bg-white focus:outline-none focus:bg-yellow-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
							>
								{groups.map((g) => (
									<option key={g.id} value={g.id}>
										{g.name}
									</option>
								))}
							</select>
							<ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-black" />
						</div>
					</div>

					{/* Expense Description */}
					<div>
						<label className="block text-xs font-black uppercase mb-1.5">Description</label>
						<input
							type="text"
							placeholder="e.g. Weekend Villa, Team Lunch, Uber"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							required
							className="w-full border-2 border-black p-2.5 text-sm font-semibold focus:outline-none focus:bg-yellow-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
						/>
					</div>

					{/* Amount & Date */}
					<div className="grid grid-cols-2 gap-3">
						<div>
							<label className="block text-xs font-black uppercase mb-1.5">Total Amount (₹)</label>
							<input
								type="number"
								step="any"
								placeholder="0.00"
								value={amount}
								onChange={(e) => setAmount(e.target.value)}
								required
								className="w-full border-2 border-black p-2.5 text-sm font-semibold focus:outline-none focus:bg-yellow-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
							/>
						</div>
						<div>
							<label className="block text-xs font-black uppercase mb-1.5 flex items-center gap-1">
								<Calendar className="w-3.5 h-3.5" /> Date
							</label>
							<input
								type="date"
								value={date}
								onChange={(e) => setDate(e.target.value)}
								required
								className="w-full border-2 border-black p-2 text-sm font-semibold focus:outline-none focus:bg-yellow-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
							/>
						</div>
					</div>

					{/* Paid By Dropdown */}
					{activeGroup && (
						<div>
							<label className="block text-xs font-black uppercase mb-1.5 flex items-center gap-1">
								<User className="w-3.5 h-3.5" /> Paid By
							</label>
							<div className="relative">
								<select
									value={paidBy}
									onChange={(e) => setPaidBy(e.target.value)}
									className="w-full appearance-none border-2 border-black p-2.5 pr-9 text-sm font-bold bg-white focus:outline-none focus:bg-yellow-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
								>
									{activeGroup.members.map((m) => (
										<option key={m} value={m}>
											{m}
										</option>
									))}
								</select>
								<ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-black" />
							</div>
						</div>
					)}

					{/* Split Among Custom Checkboxes */}
					{activeGroup && (
						<div>
							<div className="flex items-center justify-between mb-1.5">
								<label className="block text-xs font-black uppercase">Split Among</label>
								<div className="flex items-center gap-2">
									<button
										type="button"
										onClick={toggleSelectAll}
										className="text-[11px] font-black underline uppercase hover:text-neutral-700"
									>
										{isAllSelected ? 'Deselect All' : 'Select All'}
									</button>
									<span className="text-xs bg-yellow-200 border border-black font-extrabold px-1.5 py-0.5">
										₹{perPersonShare} / person
									</span>
								</div>
							</div>

							<div className="border-2 border-black p-2 space-y-1.5 bg-neutral-50 max-h-40 overflow-y-auto shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] scrollbar-thin">
								{activeGroup.members.map((m) => {
									const isChecked = splitAmong.includes(m);
									return (
										<div
											key={m}
											onClick={() => toggleMemberSplit(m)}
											className={`flex items-center justify-between p-2 border-2 transition-all cursor-pointer select-none ${
												isChecked
													? 'border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
													: 'border-transparent bg-transparent opacity-60 hover:opacity-100 hover:bg-neutral-100'
											}`}
										>
											<div className="flex items-center gap-2.5">
												<div
													className={`w-4 h-4 border-2 border-black flex items-center justify-center ${
														isChecked ? 'bg-black text-white' : 'bg-white'
													}`}
												>
													{isChecked && <Check className="w-3 h-3 stroke-[3]" />}
												</div>
												<span className="text-xs font-bold text-black">{m}</span>
											</div>
											{isChecked && (
												<span className="text-[11px] font-black text-emerald-700">
													₹{perPersonShare}
												</span>
											)}
										</div>
									);
								})}
							</div>
						</div>
					)}

					{/* Submit & Cancel Buttons */}
					<div className="flex gap-3 pt-3 border-t-2 border-black">
						<button
							type="button"
							onClick={() => setAddSplitOpen(false)}
							className="flex-1 border-2 border-black p-2.5 font-black text-xs uppercase tracking-wider bg-neutral-100 hover:bg-neutral-200 active:translate-x-0.5 active:translate-y-0.5"
						>
							Cancel
						</button>
						<button
							type="submit"
							className="flex-1 border-2 border-black p-2.5 font-black text-xs uppercase tracking-wider bg-black text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-neutral-800 active:translate-x-0.5 active:translate-y-0.5"
						>
							Save Split
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}

