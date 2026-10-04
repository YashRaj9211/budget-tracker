
export interface TabItem {
	id: string;
	label: string;
}

export interface SegmentedTabsProps {
	tabs: TabItem[];
	activeId: string;
	onChange: (id: string) => void;
	className?: string;
}

export function SegmentedTabs({ tabs, activeId, onChange, className = '' }: SegmentedTabsProps) {
	return (
		<div className={`bg-surface rounded-full p-1 flex ${className}`}>
			{tabs.map((tab) => {
				const isActive = tab.id === activeId;
				return (
					<button
						key={tab.id}
						onClick={() => onChange(tab.id)}
						className={`flex-1 rounded-full py-2 text-sm text-center transition-colors font-medium ${
							isActive ? 'bg-ink text-white' : 'text-text-muted hover:text-ink'
						}`}
					>
						{tab.label}
					</button>
				);
			})}
		</div>
	);
}

export default SegmentedTabs;
