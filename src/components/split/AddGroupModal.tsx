import { useState, useEffect } from 'react';
import { X, Users, Palette, Check } from 'lucide-react';
import { useSplitStore } from '../../stores/splitStore';
import { useAuthStore } from '../../stores/authStore';
import { friendshipApi, type FriendItem } from '../../api/financeHubApi';

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
	const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

	const [name, setName] = useState('');
	const [description, setDescription] = useState('');
	const [selectedColor, setSelectedColor] = useState('pastel-pink');
	const [friends, setFriends] = useState<FriendItem[]>([]);
	const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Load friends when modal opens if authenticated
	useEffect(() => {
		if (isAddGroupOpen && isAuthenticated) {
			friendshipApi
				.getAcceptedFriends()
				.then((res) => setFriends(res || []))
				.catch((err) => console.error('Failed to load friends:', err));
		}
	}, [isAddGroupOpen, isAuthenticated]);

	if (!isAddGroupOpen) return null;

	const toggleFriend = (id: string) => {
		if (selectedFriendIds.includes(id)) {
			setSelectedFriendIds(selectedFriendIds.filter((fid) => fid !== id));
		} else {
			setSelectedFriendIds([...selectedFriendIds, id]);
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim() || isSubmitting) return;

		setIsSubmitting(true);
		try {
			await addGroup({
				name: name.trim(),
				description: description.trim(),
				memberIds: selectedFriendIds,
				avatarColor: selectedColor,
			});
			setAddGroupOpen(false);

			// Reset form
			setName('');
			setDescription('');
			setSelectedFriendIds([]);
		} catch (error) {
			console.error('Error creating group:', error);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
			<div className="bg-white border-2 border-black w-full max-w-md p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] relative max-h-[90vh] flex flex-col">
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

				<form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-1">
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

					{/* Description */}
					<div>
						<label className="block text-xs font-bold uppercase mb-1">Description (Optional)</label>
						<input
							type="text"
							placeholder="Trip expenses, shared apartment bills, etc."
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							className="w-full border-2 border-black p-2 text-sm font-medium focus:outline-none focus:bg-yellow-50"
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
										selectedColor === c.class
											? 'ring-2 ring-black scale-110 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
											: 'opacity-80'
									}`}
								/>
							))}
						</div>
					</div>

					{/* Add Friends Section */}
					<div>
						<div className="flex items-center justify-between mb-1.5">
							<label className="block text-xs font-bold uppercase">Add Friends to Group</label>
							<span className="text-[11px] font-bold text-gray-500">
								{selectedFriendIds.length} friend{selectedFriendIds.length === 1 ? '' : 's'} added
							</span>
						</div>

						{isAuthenticated ? (
							friends.length > 0 ? (
								<div className="border-2 border-black p-2 space-y-1.5 max-h-40 overflow-y-auto bg-neutral-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
									{friends.map((f) => {
										const isSelected = selectedFriendIds.includes(f.user_id);
										return (
											<div
												key={f.user_id}
												onClick={() => toggleFriend(f.user_id)}
												className={`flex items-center justify-between p-2 border-2 transition-all cursor-pointer select-none ${
													isSelected
														? 'border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
														: 'border-transparent bg-transparent opacity-70 hover:opacity-100 hover:bg-neutral-100'
												}`}
											>
												<div className="flex items-center gap-2">
													<div
														className={`w-4 h-4 border-2 border-black flex items-center justify-center ${
															isSelected ? 'bg-black text-white' : 'bg-white'
														}`}
													>
														{isSelected && <Check className="w-3 h-3 stroke-[3]" />}
													</div>
													<span className="text-xs font-bold text-black">{f.name}</span>
												</div>
											</div>
										);
									})}
								</div>
							) : (
								<div className="border-2 border-dashed border-gray-300 p-3 text-center text-xs text-gray-500 bg-gray-50">
									No accepted friends found. You can add friends from the Finance Hub tab or create a group with just yourself for now.
								</div>
							)
						) : (
							<div className="border-2 border-dashed border-gray-300 p-3 text-center text-xs text-gray-500 bg-gray-50">
								Log in to invite and sync group expenses with real friends.
							</div>
						)}
					</div>

					{/* Buttons */}
					<div className="flex gap-3 pt-3 border-t-2 border-black">
						<button
							type="button"
							onClick={() => setAddGroupOpen(false)}
							className="flex-1 border-2 border-black p-2.5 font-bold text-sm bg-gray-100 hover:bg-gray-200"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={isSubmitting}
							className="flex-1 border-2 border-black p-2.5 font-bold text-sm bg-black text-white shadow-[3px_3px_0px_0px_rgba(150,150,150,1)] hover:bg-gray-800 disabled:opacity-50"
						>
							{isSubmitting ? 'Creating...' : 'Create Group'}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
