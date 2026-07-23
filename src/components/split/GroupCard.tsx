import { Users, ChevronRight, ArrowUpRight, ArrowDownRight, CheckCircle2 } from 'lucide-react';
import type { Group } from '../../types/split';
import { useSplitStore } from '../../stores/splitStore';

interface GroupCardProps {
	group: Group;
	onClick: () => void;
}

export default function GroupCard({ group, onClick }: GroupCardProps) {
	const getGroupUserBalance = useSplitStore((s) => s.getGroupUserBalance);
	const splits = useSplitStore((s) => s.splits);

	const userBalance = getGroupUserBalance(group.id);
	const groupSplits = splits.filter((s) => s.groupId === group.id);
	const totalSpent = groupSplits.reduce((acc, s) => acc + s.amount, 0);

	return (
		<div
			onClick={onClick}
			className={`border-2 border-black p-4 mb-3 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer rounded-none relative overflow-hidden`}
		>
			{/* Top Bar with Group Name & Member count */}
			<div className="flex items-center justify-between mb-2">
				<div className="flex items-center gap-2">
					<span
						className={`w-9 h-9 border-2 border-black flex items-center justify-center font-bold text-lg ${
							group.avatarColor || 'pastel-blue'
						}`}
					>
						{group.name.substring(0, 1).toUpperCase()}
					</span>
					<div>
						<h3 className="font-bold text-base text-black leading-tight">{group.name}</h3>
						<div className="flex items-center gap-1 text-xs text-gray-600 mt-0.5">
							<Users className="w-3.5 h-3.5" />
							<span>{group.members.join(', ')}</span>
						</div>
					</div>
				</div>
				<ChevronRight className="w-5 h-5 text-black" />
			</div>

			{/* Divider */}
			<div className="border-b border-dashed border-black/30 my-3" />

			{/* Bottom Bar: Total Spent & User Balance */}
			<div className="flex items-center justify-between">
				<div>
					<span className="text-[11px] text-gray-500 uppercase font-semibold block">Total Spent</span>
					<span className="font-bold text-sm text-black">₹{totalSpent.toLocaleString()}</span>
				</div>

				<div className="text-right">
					{userBalance > 0 ? (
						<div>
							<span className="text-[11px] text-emerald-700 font-semibold flex items-center justify-end gap-0.5">
								<ArrowUpRight className="w-3.5 h-3.5" /> You are owed
							</span>
							<span className="font-bold text-base text-emerald-700">
								+₹{Math.abs(userBalance).toLocaleString()}
							</span>
						</div>
					) : userBalance < 0 ? (
						<div>
							<span className="text-[11px] text-rose-700 font-semibold flex items-center justify-end gap-0.5">
								<ArrowDownRight className="w-3.5 h-3.5" /> You owe
							</span>
							<span className="font-bold text-base text-rose-700">
								-₹{Math.abs(userBalance).toLocaleString()}
							</span>
						</div>
					) : (
						<div className="flex items-center gap-1 text-gray-500 text-xs font-medium">
							<CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Settled up
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
