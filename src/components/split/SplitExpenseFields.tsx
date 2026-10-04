import { Layers, User, Users, ChevronDown } from 'lucide-react';
import type { SplitDraft } from '../../hooks/useSplitDraft';
import type { SplitType } from '../../api/financeHubApi';
import { SearchableMultiSelect, SearchableSelect } from '../common/SearchableSelect';

const TYPES: { id: SplitType; label: string; hint: string; unit: string }[] = [
	{ id: 'EQUAL', label: 'Equally', hint: 'Everyone pays the same', unit: '' },
	{ id: 'EXACT', label: 'Amounts', hint: 'Type what each person owes', unit: '₹' },
	{ id: 'PERCENTAGE', label: 'Percent', hint: 'Must add up to 100%', unit: '%' },
	{ id: 'SHARES', label: 'Shares', hint: 'e.g. 2 shares vs 1 share', unit: '×' },
];

const labelStyle = 'block text-[12px] font-medium text-text-muted mb-1.5';
const selectStyle = "w-full bg-surface rounded-full h-11 px-4 pr-10 text-sm font-medium text-text focus:outline-none focus:ring-2 focus:ring-ink/20 appearance-none";

/**
 * The "who shares this expense" part of the form: group or friends, who paid,
 * who is included, and how to divide. All state lives in useSplitDraft.
 */
export default function SplitExpenseFields({ draft }: { draft: SplitDraft }) {
	const { mode, allowFriends, groups, people, selectedIds, splitType } = draft;
	const perPerson = draft.result.ok ? new Map(draft.result.splits.map((s) => [s.userId, s.amount])) : new Map<string, string>();
	const current = TYPES.find((t) => t.id === splitType) ?? TYPES[0];

	return (
		<div className="space-y-4">
			{draft.loadError && (
				<p className="rounded-[16px] bg-danger-soft p-2.5 text-xs font-medium text-danger">
					{draft.loadError}
				</p>
			)}

			{/* Group or friends switch */}
			{allowFriends && (
				<div className="flex bg-surface p-1 rounded-full gap-1" role="group" aria-label="Split with">
					{(
						[
							['group', 'A group', Layers],
							['friends', 'Friends', Users],
						] as const
					).map(([id, text, Icon]) => (
						<button
							key={id}
							type="button"
							aria-pressed={mode === id}
							onClick={() => draft.switchMode(id)}
							className={`flex-1 py-2 text-xs font-medium rounded-full flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
								mode === id ? 'bg-ink text-white shadow-2xs' : 'text-text-muted hover:text-text'
							}`}
						>
							<Icon size={14} strokeWidth={1.5} /> {text}
						</button>
					))}
				</div>
			)}

			{mode === 'group' && (
				<div>
					<label className={labelStyle}>Group</label>
					{groups.length === 0 ? (
						<p className="text-xs text-text-muted rounded-[16px] bg-surface p-3">
							You are not in any group yet. Create one on the Split screen.
						</p>
					) : (
						<div className="relative">
							<select
								value={draft.groupId}
								onChange={(e) => draft.switchGroup(e.target.value)}
								className={selectStyle}
								aria-label="Group"
							>
								<option value="" disabled>Select a group...</option>
								{groups.map(g => (
									<option key={g.id} value={g.id}>{g.name}</option>
								))}
							</select>
							<ChevronDown className="w-4 h-4 text-text-muted absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
						</div>
					)}
				</div>
			)}

			{/* Who paid */}
			<div>
				<label className={`${labelStyle} flex items-center gap-1`}>
					<User size={12} strokeWidth={1.5} /> Paid by
				</label>
				<SearchableSelect 
					ariaLabel="Paid by" 
					value={draft.payerId} 
					onChange={draft.setPayerChoice}
					options={people.map(p => ({ id: p.id, label: p.name }))}
					placeholder="Select person..."
				/>
			</div>

			{/* How to divide */}
			{selectedIds.length > 0 && (
				<div>
					<label className={labelStyle}>Split method</label>
					<div className="flex bg-surface p-1 rounded-full gap-1" role="group" aria-label="Split type">
						{TYPES.map((t) => (
							<button
								key={t.id}
								type="button"
								aria-pressed={splitType === t.id}
								onClick={() => draft.setSplitType(t.id)}
								className={`flex-1 py-1.5 text-xs font-medium rounded-full cursor-pointer transition-all ${
									splitType === t.id ? 'bg-ink text-white shadow-2xs' : 'text-text-muted hover:text-text'
								}`}
							>
								{t.label}
							</button>
						))}
					</div>
					<p className="text-[11px] text-text-muted mt-1 px-1">{current.hint}</p>
				</div>
			)}

			{/* Who is included */}
			<div>
				<label className={labelStyle}>{mode === 'friends' ? 'Split with friends' : 'Shared by'}</label>
				{people.length === 0 ? (
					<p className="text-xs text-text-muted rounded-[16px] bg-surface p-3">No one to show yet.</p>
				) : (
					<div className="space-y-2.5">
						<SearchableMultiSelect 
							options={people.map(p => ({ id: p.id, label: p.name }))}
							selectedIds={selectedIds}
							onChange={draft.setSelectedIds}
							placeholder="Select friends..."
						/>
						{selectedIds.length > 0 && (
							<ul className="space-y-1.5">
								{people.filter(p => selectedIds.includes(p.id)).map((p) => {
									return (
										<li key={p.id} className="flex items-center gap-2 p-2.5 rounded-[16px] border border-ink/10 bg-surface/50">
											<span className="text-sm font-medium text-text truncate flex-1">{p.name}</span>
											{splitType !== 'EQUAL' && (
												<div className="flex items-center justify-end gap-2">
													<input
														aria-label={`${current.label} for ${p.name}`}
														type="number"
														inputMode="decimal"
														min="0"
														step="any"
														placeholder="0"
														value={draft.values[p.id] ?? (splitType === 'SHARES' ? '1' : '')}
														onChange={(e) => draft.setValue(p.id, e.target.value)}
														className="w-24 bg-card rounded-full px-3 py-1.5 text-right text-sm font-medium text-text border border-ink/10 focus:outline-none focus:border-ink/30"
													/>
													<span className="text-xs text-text-muted w-4 font-medium">{current.unit}</span>
												</div>
											)}
											{perPerson.get(p.id) && splitType === 'EQUAL' && (
												<span className="text-[13px] font-medium text-text-muted text-right">
													₹{perPerson.get(p.id)}
												</span>
											)}
										</li>
									);
								})}
							</ul>
						)}
					</div>
				)}
				{mode === 'group' && selectedIds.length === 0 && (
					<p className="text-[11px] text-text-muted mt-1.5 italic">
						No members selected — will be added as a group expense without splits.
					</p>
				)}
				{draft.error && <p className="text-xs font-medium text-amber-700 mt-1.5" role="status">{draft.error}</p>}
			</div>

			{/* Category (shared list from the server, so charts can group by it) */}
			{draft.categories.length > 0 && (
				<div>
					<label className={labelStyle}>Category</label>
					<div className="relative">
						<select
							value={draft.categoryId}
							onChange={(e) => draft.setCategoryId(e.target.value)}
							className={selectStyle}
							aria-label="Category"
						>
							<option value="">No category</option>
							{draft.categories.map(c => (
								<option key={c.id} value={c.id}>{c.name}</option>
							))}
						</select>
						<ChevronDown className="w-4 h-4 text-text-muted absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
					</div>
				</div>
			)}
		</div>
	);
}
