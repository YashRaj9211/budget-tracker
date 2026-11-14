import { Users, ChevronRight, ArrowUpRight, ArrowDownRight, CheckCircle2 } from 'lucide-react';
import type { Group } from '../../types/split';
import { useSplitStore } from '../../stores/splitStore';
import { Card } from '../ui/Card';

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
		<Card
			variant="white"
			onClick={onClick}
			className="cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm"
		>
			{/* Top Bar with Group Name & Member count */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<div className="w-11 h-11 rounded-full bg-lavender/35 text-lavender-deep flex items-center justify-center font-medium text-[16px] shrink-0">
						{group.name.substring(0, 1).toUpperCase()}
					</div>
					<div>
						<h3 className="font-medium text-[16px] text-text leading-tight">{group.name}</h3>
						<div className="flex items-center gap-1.5 text-[12px] text-text-muted mt-1">
							<Users className="w-3.5 h-3.5 text-text-muted" strokeWidth={1.5} />
							<span>{group.members.join(', ')}</span>
						</div>
					</div>
				</div>
				<ChevronRight className="w-5 h-5 text-text-muted" strokeWidth={1.5} />
			</div>

			{/* Soft Divider */}
			<div className="h-px bg-surface my-3.5" />

			{/* Bottom Bar: Total Spent & User Balance */}
			<div className="flex items-center justify-between">
				<div>
					<span className="text-[11px] text-text-muted block">Total spent</span>
					<span className="text-[16px] font-medium text-text">₹{totalSpent.toLocaleString()}</span>
				</div>

				<div className="text-right">
					{userBalance > 0 ? (
						<div>
							<span className="text-[11px] text-mint-deep font-medium flex items-center justify-end gap-0.5">
								<ArrowUpRight className="w-3.5 h-3.5" strokeWidth={1.5} /> Owed to you
							</span>
							<span className="text-[16px] font-medium text-mint-deep">
								+₹{Math.abs(userBalance).toLocaleString()}
							</span>
						</div>
					) : userBalance < 0 ? (
						<div>
							<span className="text-[11px] text-danger font-medium flex items-center justify-end gap-0.5">
								<ArrowDownRight className="w-3.5 h-3.5" strokeWidth={1.5} /> You owe
							</span>
							<span className="text-[16px] font-medium text-danger">
								-₹{Math.abs(userBalance).toLocaleString()}
							</span>
						</div>
					) : (
						<div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-mint/30 text-mint-deep text-[12px] font-medium">
							<CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.5} />
							<span>Settled up</span>
						</div>
					)}
				</div>
			</div>
		</Card>
	);
}
