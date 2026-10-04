import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export interface StatTileProps {
	label: string;
	value: string | React.ReactNode;
	trend?: 'up' | 'down';
	className?: string;
}

export function StatTile({ label, value, trend, className = '' }: StatTileProps) {
	return (
		<div className={`rounded-[20px] p-4 bg-white flex flex-col justify-between ${className}`}>
			<div className="flex justify-between items-start mb-2">
				<span className="text-[12px] text-text-muted">{label}</span>
				{trend && (
					<div className={`flex items-center justify-center w-6 h-6 rounded-full ${trend === 'up' ? 'bg-mint text-ink' : 'bg-danger-soft text-danger'}`}>
						{trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
					</div>
				)}
			</div>
			<div className="text-[24px] font-medium text-text">{value}</div>
		</div>
	);
}

export default StatTile;
