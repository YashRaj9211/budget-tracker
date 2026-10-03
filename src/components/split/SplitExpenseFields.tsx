import { Layers, User, Users } from 'lucide-react';
import type { SplitDraft } from '../../hooks/useSplitDraft';
import type { SplitType } from '../../api/financeHubApi';
import { SearchableSelect, SearchableMultiSelect } from '../common/SearchableSelect';

const TYPES: { id: SplitType; label: string; hint: string; unit: string }[] = [
	{ id: 'EQUAL', label: 'Equally', hint: 'Everyone pays the same', unit: '' },
	{ id: 'EXACT', label: 'Amounts', hint: 'Type what each person owes', unit: '₹' },
	{ id: 'PERCENTAGE', label: 'Percent', hint: 'Must add up to 100%', unit: '%' },
	{ id: 'SHARES', label: 'Shares', hint: 'e.g. 2 shares vs 1 share', unit: '×' },
];

const label = 'block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1.5';

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
			{draft.loadError && <p className="border-2 border-rose-400 bg-rose-50 p-2 text-xs font-bold text-rose-800">{draft.loadError}</p>}

			{/* Group or friends */}
			{allowFriends && (
				<div className="grid grid-cols-2 gap-2" role="group" aria-label="Split with">
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
							className={`py-2 text-xs font-bold border-2 border-black flex items-center justify-center gap-1.5 cursor-pointer ${
								mode === id ? 'bg-purple-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] -translate-x-px -translate-y-px' : 'bg-white text-gray-500 hover:bg-gray-50'
							}`}
						>
							<Icon size={14} /> {text}
						</button>
					))}
				</div>
			)}

			{mode === 'group' && (
				<div>
					<label className={label}>Group</label>
					{groups.length === 0 ? (
						<p className="text-xs text-gray-500 border border-dashed border-black/40 p-2">You are not in any group yet. Create one on the Split screen.</p>
					) : (
						<SearchableSelect 
							ariaLabel="Group" 
							value={draft.groupId} 
							onChange={draft.switchGroup}
							options={groups.map(g => ({ id: g.id, label: g.name }))}
							placeholder="Select a group..."
						/>
					)}
				</div>
			)}

			{/* Who paid */}
			<div>
				<label className={`${label} flex items-center gap-1`}>
					<User size={12} /> Paid by
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
					<label className={label}>Split</label>
					<div className="grid grid-cols-4 border-2 border-black" role="group" aria-label="Split type">
						{TYPES.map((t, i) => (
							<button
								key={t.id}
								type="button"
								aria-pressed={splitType === t.id}
								onClick={() => draft.setSplitType(t.id)}
								className={`py-1.5 text-[11px] font-bold cursor-pointer ${i > 0 ? 'border-l-2 border-black' : ''} ${splitType === t.id ? 'bg-black text-white' : 'bg-white hover:bg-gray-50'}`}
							>
								{t.label}
							</button>
						))}
					</div>
					<p className="text-[10px] text-gray-500 mt-1">{current.hint}</p>
				</div>
			)}

			{/* Who is included */}
			<div>
				<label className={label}>{mode === 'friends' ? 'Split with friends' : 'Shared by'}</label>
				{people.length === 0 ? (
					<p className="text-xs text-gray-500">No one to show yet.</p>
				) : (
					<div className="space-y-3">
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
										<li key={p.id} className="flex items-center gap-2 border-2 border-black p-1.5 bg-white">
											<span className="text-sm font-bold truncate flex-1">{p.name}</span>
											{splitType !== 'EQUAL' && (
												<span className="flex items-center gap-1">
													<input
														aria-label={`${current.label} for ${p.name}`}
														type="number"
														inputMode="decimal"
														min="0"
														step="any"
														value={draft.values[p.id] ?? (splitType === 'SHARES' ? '1' : '')}
														onChange={(e) => draft.setValue(p.id, e.target.value)}
														className="w-20 border border-black p-1 text-right text-sm font-semibold focus:outline-none"
													/>
													<span className="text-xs text-gray-500 w-3">{current.unit}</span>
												</span>
											)}
											{perPerson.get(p.id) && <span className="text-xs font-black w-20 text-right">₹{perPerson.get(p.id)}</span>}
										</li>
									);
								})}
							</ul>
						)}
					</div>
				)}
				{mode === 'group' && selectedIds.length === 0 && (
					<p className="text-[11px] text-gray-500 mt-1.5 italic">No members selected — will be added as a group expense without splits.</p>
				)}
				{draft.error && <p className="text-xs font-bold text-amber-700 mt-1.5" role="status">{draft.error}</p>}
			</div>

			{/* Category (shared list from the server, so charts can group by it) */}
			{draft.categories.length > 0 && (
				<div>
					<label className={label}>Category</label>
					<SearchableSelect 
						ariaLabel="Category" 
						value={draft.categoryId} 
						onChange={draft.setCategoryId}
						options={[{ id: '', label: 'No category' }, ...draft.categories.map(c => ({ id: c.id, label: c.name }))]}
						placeholder="Select a category..."
					/>
				</div>
			)}
		</div>
	);
}
