import { useState } from 'react';
import { X, Plus, Users, Palette } from 'lucide-react';
import { useSplitStore } from '../../stores/splitStore';

const COLOR_OPTIONS = [
	{ name: 'Pink', class: 'pastel-pink' },
	{ name: 'Blue', class: 'pastel-blue' },
	{ name: 'Purple', class: 'pastel-purple' },
	{ name: 'Yellow', class: 'pastel-yellow' },
	{ name: 'Green', class: 'pastel-green' },
];

export default function AddGroupModal() {
	const isAddGroupOpen = useSplitStore((s) => s.isAddGroupOpen);
	const setAddGroupOpen = useSplitStore((s) => s.setAddGroupOpen);
	const addGroup = useSplitStore((s) => s.addGroup);
	const setSelectedGroupId = useSplitStore((s) => s.setSelectedGroupId);

	const [name, setName] = useState('');
	const [membersInput, setMembersInput] = useState('');
	const [members, setMembers] = useState<string[]>(['You']);
	const [selectedColor, setSelectedColor] = useState('pastel-pink');

	if (!isAddGroupOpen) return null;

	const handleAddMember = (e: React.FormEvent) => {
		e.preventDefault();
		const trimmed = membersInput.trim();
		if (trimmed && !members.includes(trimmed)) {
			setMembers([...members, trimmed]);
			setMembersInput('');
		}
	};

	const handleRemoveMember = (mToRemove: string) => {
		if (mToRemove === 'You') return; // Cannot remove 'You'
		setMembers(members.filter((m) => m !== mToRemove));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim()) return;

		const newGroup = {
			id: crypto.randomUUID(),
			name: name.trim(),
			members: members.length > 0 ? members : ['You'],
			avatarColor: selectedColor,
			createdAt: Date.now(),
		};

		await addGroup(newGroup);
		setSelectedGroupId(newGroup.id);
		setAddGroupOpen(false);

		// Reset state
		setName('');
		setMembers(['You']);
		setMembersInput('');
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
			<div className="bg-white border-2 border-black w-full max-w-md p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] relative">
				{/* Close Button */}
				<button
					onClick={() => setAddGroupOpen(false)}
					className="absolute top-4 right-4 p-1 border border-black hover:bg-gray-100"
				>
					<X className="w-5 h-5" />
				</button>

				<h2 className="font-bold text-lg text-black mb-4 flex items-center gap-2">
					<Users className="w-5 h-5" /> Create New Group
				</h2>

				<form onSubmit={handleSubmit} className="space-y-4">
					{/* Group Name */}
					<div>
						<label className="block text-xs font-bold uppercase mb-1">Group Name</label>
						<input
							type="text"
							placeholder="e.g. Goa Trip 🏖️, Roommates 🏠"
							value={name}
							onChange={(e) => setName(e.target.value)}
							required
							className="w-full border-2 border-black p-2.5 text-sm font-medium focus:outline-none focus:bg-yellow-50"
						/>
					</div>

					{/* Theme Color */}
					<div>
						<label className="block text-xs font-bold uppercase mb-1 items-center gap-1">
							<Palette className="w-3.5 h-3.5" /> Group Badge Color
						</label>
						<div className="flex gap-2">
							{COLOR_OPTIONS.map((c) => (
								<button
									key={c.class}
									type="button"
									onClick={() => setSelectedColor(c.class)}
									className={`w-8 h-8 border-2 border-black ${c.class} ${
										selectedColor === c.class ? 'ring-2 ring-black scale-110 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'opacity-80'
									}`}
								/>
							))}
						</div>
					</div>

					{/* Add Members */}
					<div>
						<label className="block text-xs font-bold uppercase mb-1">Group Members</label>
						<div className="flex gap-2 mb-2">
							<input
								type="text"
								placeholder="Enter member name"
								value={membersInput}
								onChange={(e) => setMembersInput(e.target.value)}
								className="flex-1 border-2 border-black p-2 text-sm font-medium focus:outline-none"
							/>
							<button
								type="button"
								onClick={handleAddMember}
								className="border-2 border-black bg-pastel-blue px-3 font-bold text-sm hover:bg-blue-200"
							>
								<Plus className="w-4 h-4" />
							</button>
						</div>

						{/* Member Chips */}
						<div className="flex flex-wrap gap-1.5 mt-2">
							{members.map((m) => (
								<span
									key={m}
									className="inline-flex items-center gap-1.5 px-2.5 py-1 border border-black bg-gray-100 text-xs font-bold"
								>
									{m}
									{m !== 'You' && (
										<button
											type="button"
											onClick={() => handleRemoveMember(m)}
											className="hover:text-red-600"
										>
											<X className="w-3.5 h-3.5" />
										</button>
									)}
								</span>
							))}
						</div>
					</div>

					{/* Buttons */}
					<div className="flex gap-3 pt-3">
						<button
							type="button"
							onClick={() => setAddGroupOpen(false)}
							className="flex-1 border-2 border-black p-2.5 font-bold text-sm bg-gray-100 hover:bg-gray-200"
						>
							Cancel
						</button>
						<button
							type="submit"
							className="flex-1 border-2 border-black p-2.5 font-bold text-sm bg-black text-white shadow-[3px_3px_0px_0px_rgba(150,150,150,1)] hover:bg-gray-800"
						>
							Save Group
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
