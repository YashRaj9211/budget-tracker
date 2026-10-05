import { useCallback, useEffect, useMemo, useState } from 'react';
import { categoryApi, expenseApi, friendshipApi, type ApiCategory, type FriendItem, type SplitType } from '../api/financeHubApi';
import { matchCategoryToApi } from '../utils/categoryMatcher';
import { suggestCategoryFromText } from '../utils/indianCategoryIcons';
import { useAuthStore } from '../stores/authStore';
import { useSplitStore } from '../stores/splitStore';
import { computeSplits, type SplitResult } from '../utils/splitMath';
import * as db from '../db';
import { syncService } from '../services/syncService';
import type { SplitExpense } from '../types/split';

export interface Person {
	id: string;
	name: string;
}

export type SplitWith = 'group' | 'friends';

/** Pull a readable message out of an API error. */
export function errorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
	const e = err as { response?: { data?: { error?: string } }; message?: string };
	return e?.response?.data?.error || e?.message || fallback;
}

/**
 * All the state behind the "split this expense" form: group or friends, who paid,
 * who shares it, and how it is divided. Used by both the home form and the Split screen.
 */
export function useSplitDraft({ active, allowFriends = true, amount }: { active: boolean; allowFriends?: boolean; amount: number }) {
	const me = useAuthStore((s) => s.user);
	const groups = useSplitStore((s) => s.groups);
	const selectedGroupId = useSplitStore((s) => s.selectedGroupId);
	const loadGroups = useSplitStore((s) => s.loadData);

	const [friends, setFriends] = useState<FriendItem[]>([]);
	const [categories, setCategories] = useState<ApiCategory[]>([]);
	const [loadError, setLoadError] = useState<string | null>(null);

	const [splitWith, setSplitWith] = useState<SplitWith>('group');
	const [groupChoice, setGroupChoice] = useState('');
	const [chosen, setChosen] = useState<Set<string> | null>(null); // null = everyone
	const [payerChoice, setPayerChoice] = useState('');
	const [splitType, setSplitType] = useState<SplitType>('EQUAL');
	const [values, setValues] = useState<Record<string, string>>({});
	const [categoryId, setCategoryId] = useState('');

	// Load groups, friends and categories the first time the split form is shown
	useEffect(() => {
		if (!active || !me) return;
		let cancelled = false;
		Promise.all([friendshipApi.getAcceptedFriends(), categoryApi.list(), groups.length === 0 ? loadGroups() : Promise.resolve()])
			.then(([f, c]) => {
				if (cancelled) return;
				setFriends(f || []);
				setCategories(c || []);
				setLoadError(null);
			})
			.catch((err) => {
				if (!cancelled) setLoadError(errorMessage(err, 'Could not load your groups and friends.'));
			});
		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [active, me?.id]);

	// Effective choices (fall back to sensible defaults without extra effects)
	const mode: SplitWith = allowFriends ? splitWith : 'group';
	const groupId = groups.some((g) => g.id === groupChoice)
		? groupChoice
		: groups.some((g) => g.id === selectedGroupId)
			? (selectedGroupId as string)
			: groups[0]?.id ?? '';
	const group = groups.find((g) => g.id === groupId);

	// Everyone who can be part of this expense (always includes me)
	const people: Person[] = useMemo(() => {
		if (!me) {
			if (mode === 'group' && group?.members) {
				return group.members.map((name) => ({ id: name, name }));
			}
			return [];
		}
		if (mode === 'group') {
			if (group?.memberDetails && group.memberDetails.length > 0) {
				return group.memberDetails.map((m) => ({ id: m.id, name: me && m.id === me.id ? 'You' : m.name }));
			}
			return (group?.members ?? ['You']).map((name) => ({ id: name, name }));
		}
		return [{ id: me.id, name: 'You' }, ...friends.map((f) => ({ id: f.user_id, name: f.name }))];
	}, [me, mode, group, friends]);

	// Friends mode starts with everyone if 1 friend, or just 'You'; group mode starts with everyone.
	const selectedIds = useMemo(() => {
		if (chosen) return people.filter((p) => chosen.has(p.id)).map((p) => p.id);
		if (mode === 'group') return people.map((p) => p.id);
		if (people.length === 2) return people.map((p) => p.id);
		return me ? [me.id] : [];
	}, [chosen, people, mode, me]);

	const payerId = people.some((p) => p.id === payerChoice) ? payerChoice : me?.id ?? people[0]?.id ?? '';

	const toggle = useCallback(
		(id: string) => {
			const next = new Set(selectedIds);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			setChosen(next);
		},
		[selectedIds]
	);

	const selectAll = useCallback(() => {
		setChosen(new Set(people.map((p) => p.id)));
	}, [people]);

	const selectNone = useCallback(() => {
		setChosen(new Set());
	}, []);

	const setSelectedIds = useCallback((ids: string[]) => {
		setChosen(new Set(ids));
	}, []);

	const switchMode = (m: SplitWith) => {
		setSplitWith(m);
		setChosen(null);
		setValues({});
		setPayerChoice('');
	};
	const switchGroup = (id: string) => {
		setGroupChoice(id);
		setChosen(null);
		setValues({});
		setPayerChoice('');
	};
	const setValue = (id: string, v: string) => setValues((prev) => ({ ...prev, [id]: v }));

	const result: SplitResult = useMemo(() => {
		if (mode === 'group' && selectedIds.length === 0) {
			if (!(Math.round(amount * 100) > 0)) {
				return { ok: false, error: 'Enter an amount first' };
			}
			return { ok: true, splits: [] };
		}
		return computeSplits(
			amount,
			splitType,
			selectedIds.map((id) => ({ userId: id, value: values[id] ?? (splitType === 'SHARES' ? '1' : undefined) })),
			payerId
		);
	}, [mode, amount, splitType, selectedIds, values, payerId]);

	const missingTarget = mode === 'group' && !group ? 'Create a group first, or split with friends' : mode === 'friends' && friends.length === 0 ? 'Add a friend first' : null;
	const nobodyElse = mode !== 'group' && (selectedIds.length === 0 || (selectedIds.length === 1 && selectedIds[0] === payerId));
	const error = missingTarget ?? (nobodyElse ? 'Choose who to split with' : result.ok ? null : result.error);

	/** Send the expense to the server and refresh data, or save locally if offline. */
	const submit = async (info: { description: string; date: string; amount: number }) => {
		if (!result.ok || error) throw new Error(error ?? (result.ok ? '' : result.error));

		const inferredCat = suggestCategoryFromText(info.description);
		const effectiveCatId = categoryId || (inferredCat ? matchCategoryToApi(inferredCat, categories) : null);

		const payload = {
			type: 'SPLIT' as const,
			amount: info.amount,
			description: info.description,
			currency: 'INR',
			expenseDate: info.date ? new Date(info.date).toISOString() : new Date().toISOString(),
			groupId: mode === 'group' ? groupId : null,
			categoryId: effectiveCatId || null,
			userId: payerId,
			splits: result.splits,
		};

		if (navigator.onLine) {
			try {
				await expenseApi.create(payload);
				await loadGroups();
				return;
			} catch (err: unknown) {
				console.warn('[useSplitDraft] Server create failed. Checking if offline fallback applies:', err);
				const status = (err as { response?: { status?: number } })?.response?.status;
				if (typeof status === 'number' && status >= 400 && status < 500) {
					throw err;
				}
			}
		}

		// Offline fallback: save locally in IndexedDB & queue sync
		const localId = crypto.randomUUID();
		const payerPerson = people.find((p) => p.id === payerId);
		const splitExpense: SplitExpense = {
			id: localId,
			groupId: mode === 'group' ? groupId : '',
			title: info.description,
			amount: info.amount,
			paidBy: payerPerson?.name || 'You',
			paidById: payerId,
			splitAmong: people.filter((p) => selectedIds.includes(p.id)).map((p) => p.name),
			splitAmongIds: selectedIds,
			date: info.date,
			createdAt: Date.now(),
			syncStatus: 'pending',
		};

		await db.saveSplit(splitExpense);
		await syncService.enqueue({
			entityType: 'split',
			action: 'create',
			recordId: localId,
			payload,
		});

		useSplitStore.setState((s) => ({
			splits: [splitExpense, ...s.splits],
		}));
	};

	const reset = () => {
		setChosen(null);
		setValues({});
		setSplitType('EQUAL');
		setCategoryId('');
		setPayerChoice('');
	};

	return {
		mode, switchMode, allowFriends,
		groups, groupId, switchGroup,
		people, selectedIds, toggle, selectAll, selectNone, setSelectedIds,
		payerId, setPayerChoice,
		splitType, setSplitType, values, setValue,
		categories, categoryId, setCategoryId,
		loadError, error, result, submit, reset,
	};
}

export type SplitDraft = ReturnType<typeof useSplitDraft>;
