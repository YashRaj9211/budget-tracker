import { useState, useEffect } from 'react';
import { UserPlus, Check } from 'lucide-react';
import { friendshipApi, type FriendItem } from '../../api/financeHubApi';
import { useAuthStore } from '../../stores/authStore';
import { useSplitStore } from '../../stores/splitStore';
import { Button } from '../common/Button';
import { BottomSheet } from '../ui/BottomSheet';
import { statusSheet } from '../../stores/statusSheetStore';
import type { Group } from '../../types/split';

interface AddMemberToGroupModalProps {
	isOpen: boolean;
	onClose: () => void;
	group: Group;
}

export default function AddMemberToGroupModal({ isOpen, onClose, group }: AddMemberToGroupModalProps) {
	const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
	const addGroupMember = useSplitStore((s) => s.addGroupMember);

	const [friends, setFriends] = useState<FriendItem[]>([]);
	const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	useEffect(() => {
		if (isOpen) {
			setErrorMessage(null);
			setSelectedFriendIds([]);
			if (isAuthenticated) {
				friendshipApi
					.getAcceptedFriends()
					.then((res) => {
						// Filter out friends who are already in the group
						const currentMemberIds = group.memberDetails?.map((m) => m.id) || [];
						setFriends((res || []).filter((f) => !currentMemberIds.includes(f.id)));
					})
					.catch((err) => console.error('Failed to load friends:', err));
			}
		}
	}, [isOpen, isAuthenticated, group]);

	if (!isOpen) return null;

	const toggleFriend = (id: string) => {
		if (selectedFriendIds.includes(id)) {
			setSelectedFriendIds(selectedFriendIds.filter((fid) => fid !== id));
		} else {
			setSelectedFriendIds([...selectedFriendIds, id]);
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (selectedFriendIds.length === 0) return;

		onClose();

		await statusSheet.execute({
			action: async () => {
				for (const friendId of selectedFriendIds) {
					await addGroupMember(group.id, friendId);
				}
			},
			processingTitle: 'Adding Members...',
			processingMessage: `Adding selected friends to "${group.name}"`,
			successTitle: 'Success!',
			successMessage: `Members added to "${group.name}" successfully`,
			buttonText: 'Done',
			onError: (err) => {
				const msg =
					err?.response?.data?.error ||
					err?.message ||
					'Failed to add members. Please check your connection and try again.';
				setErrorMessage(msg);
			},
		});
	};

	return (
		<BottomSheet
			isOpen={isOpen}
			onClose={onClose}
			title={
				<span className="flex items-center gap-2">
					<UserPlus className="w-5 h-5 text-text-muted" strokeWidth={1.5} /> Add members to group
				</span>
			}
		>
			{errorMessage && (
				<div className="mb-3 p-3 rounded-[16px] bg-danger-soft text-danger text-xs font-medium">
					{errorMessage}
				</div>
			)}

			<form onSubmit={handleSubmit} className="space-y-4">
				<div>
					<label className="block text-[12px] font-medium text-text-muted mb-1.5">
						Select friends to add
					</label>

					{isAuthenticated ? (
						friends.length > 0 ? (
							<div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
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
								No more friends available to add.
							</div>
						)
					) : (
						<div className="rounded-[16px] bg-surface p-3 text-center text-[12px] text-text-muted">
							Log in to add members to this group.
						</div>
					)}
				</div>

				<div className="flex gap-2.5 pt-3">
					<Button
						type="button"
						variant="secondary"
						onClick={onClose}
						className="flex-1 py-3"
					>
						Cancel
					</Button>
					<Button
						type="submit"
						variant="primary"
						disabled={selectedFriendIds.length === 0}
						className="flex-1 py-3 font-medium"
					>
						Add members
					</Button>
				</div>
			</form>
		</BottomSheet>
	);
}
