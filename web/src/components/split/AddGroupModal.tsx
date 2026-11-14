import { useState, useEffect } from 'react';
import { Users, Palette, Check } from 'lucide-react';
import { useSplitStore } from '../../stores/splitStore';
import { useAuthStore } from '../../stores/authStore';
import { friendshipApi, type FriendItem } from '../../api/financeHubApi';
import { Button } from '../common/Button';
import { BottomSheet } from '../ui/BottomSheet';
import { statusSheet } from '../../stores/statusSheetStore';

const COLOR_OPTIONS = [
	{ name: 'Mint', class: 'bg-mint text-ink' },
	{ name: 'Lavender', class: 'bg-lavender text-ink' },
	{ name: 'Pink', class: 'bg-rose-200 text-rose-900' },
	{ name: 'Blue', class: 'bg-sky-200 text-sky-900' },
	{ name: 'Yellow', class: 'bg-amber-200 text-amber-900' },
];

export default function AddGroupModal() {
	const isAddGroupOpen = useSplitStore((s) => s.isAddGroupOpen);
	const setAddGroupOpen = useSplitStore((s) => s.setAddGroupOpen);
	const addGroup = useSplitStore((s) => s.addGroup);
	const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

	const [name, setName] = useState('');
	const [description, setDescription] = useState('');
	const [selectedColor, setSelectedColor] = useState('bg-lavender text-ink');
	const [friends, setFriends] = useState<FriendItem[]>([]);
	const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	// Load friends when modal opens if authenticated
	useEffect(() => {
		if (isAddGroupOpen) {
			setErrorMessage(null);
			if (isAuthenticated) {
				friendshipApi
					.getAcceptedFriends()
					.then((res) => setFriends(res || []))
					.catch((err) => console.error('Failed to load friends:', err));
			}
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

	const handleClose = () => {
		setAddGroupOpen(false);
		setErrorMessage(null);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim()) return;

		const groupName = name.trim();
		const groupDesc = description.trim();
		const memberIds = [...selectedFriendIds];
		const color = selectedColor;

		setAddGroupOpen(false);
		setName('');
		setDescription('');
		setSelectedFriendIds([]);

		await statusSheet.execute({
			action: async () => {
				await addGroup({
					name: groupName,
					description: groupDesc,
					memberIds,
					avatarColor: color,
				});
			},
			processingTitle: 'Processing...',
			processingMessage: `Setting up split group "${groupName}"`,
			successTitle: 'Success!',
			successMessage: `Group "${groupName}" created successfully`,
			buttonText: 'Nice one!',
			onError: (err) => {
				const msg =
					err?.response?.data?.error ||
					err?.message ||
					'Failed to create group. Please check your connection and try again.';
				setErrorMessage(msg);
			},
		});
	};

	return (
		<BottomSheet
			isOpen={isAddGroupOpen}
			onClose={handleClose}
			title={
				<span className="flex items-center gap-2">
					<Users className="w-5 h-5 text-text-muted" strokeWidth={1.5} /> Create new group
				</span>
			}
		>
			{errorMessage && (
				<div className="mb-3 p-3 rounded-[16px] bg-danger-soft text-danger text-xs font-medium">
					{errorMessage}
				</div>
			)}

			<form onSubmit={handleSubmit} className="space-y-4">
				{/* Group Name */}
				<div>
					<label className="block text-[12px] font-medium text-text-muted mb-1.5">Group name</label>
					<input
						type="text"
						placeholder="e.g. Goa Trip 🏖️, Roommates 🏠"
						value={name}
						onChange={(e) => setName(e.target.value)}
						required
						className="w-full bg-surface rounded-full h-11 px-4 text-sm font-normal text-text focus:outline-none focus:ring-2 focus:ring-ink/20"
					/>
				</div>

				{/* Description */}
				<div>
					<label className="block text-[12px] font-medium text-text-muted mb-1.5">
						Description (optional)
					</label>
					<input
						type="text"
						placeholder="e.g. Shared expenses for our trip"
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						className="w-full bg-surface rounded-full h-11 px-4 text-sm font-normal text-text focus:outline-none focus:ring-2 focus:ring-ink/20"
					/>
				</div>

				{/* Color theme selection */}
				<div>
					<label className="block text-[12px] font-medium text-text-muted mb-1.5 flex items-center gap-1.5">
						<Palette className="w-3.5 h-3.5" strokeWidth={1.5} /> Color theme
					</label>
					<div className="flex items-center gap-2.5">
						{COLOR_OPTIONS.map((c) => (
							<button
								key={c.name}
								type="button"
								onClick={() => setSelectedColor(c.class)}
								className={`w-9 h-9 rounded-full flex items-center justify-center transition-transform cursor-pointer ${
									c.class
								} ${selectedColor === c.class ? 'ring-2 ring-ink ring-offset-2 scale-105' : 'opacity-70 hover:opacity-100'}`}
								title={c.name}
							>
								{selectedColor === c.class && <Check className="w-4 h-4" strokeWidth={2} />}
							</button>
						))}
					</div>
				</div>

				{/* Friends selection */}
				<div>
					<label className="block text-[12px] font-medium text-text-muted mb-1.5">
						Add members ({selectedFriendIds.length + 1})
					</label>

					<div className="mb-2 flex items-center gap-2 bg-surface p-2.5 rounded-[16px]">
						<div className="w-7 h-7 rounded-full bg-mint text-ink font-medium text-xs flex items-center justify-center">
							Y
						</div>
						<div className="flex-1">
							<p className="text-xs font-medium text-text">You (Creator)</p>
						</div>
						<span className="text-[11px] text-text-muted font-normal bg-card px-2 py-0.5 rounded-full">
							Always included
						</span>
					</div>

					{isAuthenticated ? (
						friends.length > 0 ? (
							<div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
								{friends.map((friend) => {
									const isSelected = selectedFriendIds.includes(friend.id);
									return (
										<div
											key={friend.id}
											onClick={() => toggleFriend(friend.id)}
											className={`flex items-center justify-between p-2.5 rounded-[16px] cursor-pointer transition-colors ${
												isSelected
													? 'bg-ink text-white'
													: 'bg-surface hover:bg-surface/80 text-text'
											}`}
										>
											<div className="flex items-center gap-2.5">
												<div
													className={`w-7 h-7 rounded-full flex items-center justify-center font-medium text-xs ${
														isSelected ? 'bg-white/20 text-white' : 'bg-card text-text'
													}`}
												>
													{friend.name.slice(0, 1).toUpperCase()}
												</div>
												<div>
													<p className="text-xs font-medium leading-none">{friend.name}</p>
													<p
														className={`text-[10px] mt-0.5 leading-none ${
															isSelected ? 'text-white/70' : 'text-text-muted'
														}`}
													>
														@{friend.username}
													</p>
												</div>
											</div>
											<div
												className={`w-5 h-5 rounded-full flex items-center justify-center border transition-colors ${
													isSelected
														? 'bg-mint border-transparent text-ink'
														: 'border-black/20 bg-card'
												}`}
											>
												{isSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
											</div>
										</div>
									);
								})}
							</div>
						) : (
							<div className="rounded-[16px] bg-surface p-3 text-center text-[12px] text-text-muted">
								No friends found. You can add friends from the Finance Hub tab or create a group with just yourself for now.
							</div>
						)
					) : (
						<div className="rounded-[16px] bg-surface p-3 text-center text-[12px] text-text-muted">
							Log in to invite and sync group expenses with real friends.
						</div>
					)}
				</div>

				{/* Buttons */}
				<div className="flex gap-2.5 pt-3">
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
						variant="primary"
						disabled={!name.trim()}
						className="flex-1 py-3 font-medium"
					>
						Create group
					</Button>
				</div>
			</form>
		</BottomSheet>
	);
}
