import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Check, Landmark, Link2, Plus, SlidersHorizontal, Unlink } from 'lucide-react';
import { PAYMENT_KIND_META, usePaymentMethodStore, type PaymentMethod } from '../../stores/paymentMethodStore';
import type { SavingsAccount } from '../../api/financeHubApi';
import type { Transaction } from '../../types';
import { money } from './ui';
import WaveZone from './WaveZone';
import { PAYMENT_KIND_ICONS, getAccountDeduction, haptic, usePrefersReducedMotion } from './paymentShared';

// Same order as the pastel cards on the Accounts tab so an account keeps its colour across tabs.
const WAVE_COLORS = ['#8C7AF0', '#5DB2F0', '#E8C516', '#3FBF52'];

export type Notify = (message: string, undo?: () => void) => void;

/** Smoothly tween a number (e.g. a balance) towards its new value. */
function useCountUp(target: number, ms = 650) {
	const reduced = usePrefersReducedMotion();
	const [value, setValue] = useState(target);
	const current = useRef(target);

	useEffect(() => {
		if (reduced || current.current === target) return;
		const from = current.current;
		const t0 = performance.now();
		let raf = 0;
		const tick = (t: number) => {
			const p = Math.min(1, (t - t0) / ms);
			current.current = from + (target - from) * (1 - Math.pow(1 - p, 3));
			setValue(current.current);
			if (p < 1) raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	}, [target, ms, reduced]);

	return reduced ? target : value;
}

// ── A draggable payment-method circle ────────────────────────────────────────

type PressHandler = (e: ReactPointerEvent, methodId: string, fromAccountId: string | null) => void;

function MethodBubble({
	method,
	fromAccountId,
	selected,
	faded,
	onPress,
	onTap,
}: {
	method: PaymentMethod;
	fromAccountId: string | null;
	selected: boolean;
	faded?: boolean;
	onPress: PressHandler;
	onTap: (id: string) => void;
}) {
	const meta = PAYMENT_KIND_META[method.kind];
	const Icon = PAYMENT_KIND_ICONS[method.kind];
	return (
		<button
			type="button"
			aria-pressed={selected}
			aria-label={`${method.name}, ${meta.label}. Drag onto an account, or press Enter to select.`}
			title={method.name}
			onPointerDown={(e) => onPress(e, method.id, fromAccountId)}
			onClick={(e) => {
				// e.detail === 0 → keyboard activation; pointer taps are routed here too
				e.stopPropagation();
				onTap(method.id);
			}}
			className={`group/bubble relative flex h-full w-full cursor-grab touch-none select-none items-center justify-center rounded-full bg-card transition-[transform,opacity,box-shadow] duration-200 hover:scale-110 active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
				faded ? 'opacity-25' : ''
			} ${selected ? 'pm-select scale-110' : ''}`}
			style={{
				color: meta.hexColor,
				boxShadow: selected
					? `0 0 0 3px ${meta.hexColor}, 0 6px 18px ${meta.hexColor}55`
					: `0 0 0 2px ${meta.hexColor}, 0 3px 8px rgba(0,0,0,.14)`,
			}}
		>
			<Icon size="50%" strokeWidth={2.2} />
			{/* name tooltip */}
			<span className="pointer-events-none absolute -top-7 left-1/2 z-30 max-w-[140px] -translate-x-1/2 truncate whitespace-nowrap rounded-full bg-ink px-2.5 py-1 text-[10px] font-semibold text-white opacity-0 shadow-md transition-opacity group-hover/bubble:opacity-100">
				{method.name}
			</span>
		</button>
	);
}

// ── One account: centre disc + wavy zone + orbiting linked methods ───────────

const MAX_ORBIT = 8;

function AccountOrbit({
	account,
	colorIndex,
	linked,
	deduction,
	active,
	armed,
	canTap,
	pulseKey,
	dragging,
	selectedId,
	hint,
	onPress,
	onTapMethod,
	onTapAccount,
}: {
	account: SavingsAccount;
	colorIndex: number;
	linked: PaymentMethod[];
	deduction: ReturnType<typeof getAccountDeduction>;
	active: boolean;
	armed: boolean;
	canTap: boolean;
	pulseKey: number;
	dragging: { id: string; from: string | null } | null;
	selectedId: string | null;
	hint: string | null;
	onPress: PressHandler;
	onTapMethod: (id: string) => void;
	onTapAccount: (a: SavingsAccount) => void;
}) {
	const color = WAVE_COLORS[colorIndex % WAVE_COLORS.length];
	const balance = useCountUp(deduction.deductedBalance);
	const shown = linked.slice(0, MAX_ORBIT);
	const extra = linked.length - shown.length;
	const slots = shown.length + (extra > 0 ? 1 : 0);

	return (
		<div
			data-drop-account={account.id}
			className="relative mx-auto aspect-square w-full max-w-[250px] sm:max-w-[300px]"
			style={{ padding: '4%' }}
		>
			<WaveZone color={color} active={active} armed={armed} pulseKey={pulseKey} />

			{/* Orbiting methods */}
			{shown.map((m, i) => {
				const angle = (-90 + (i * 360) / slots) * (Math.PI / 180);
				return (
					<div
						key={m.id}
						className="absolute z-20 aspect-square"
						style={{
							width: '15%',
							left: `${50 + 43 * Math.cos(angle)}%`,
							top: `${50 + 43 * Math.sin(angle)}%`,
							transform: 'translate(-50%,-50%)',
						}}
					>
						<div className="pm-pop h-full w-full">
							<div className="pm-float h-full w-full" style={{ animationDelay: `${i * -0.7}s` }}>
								<MethodBubble
									method={m}
									fromAccountId={account.id}
									selected={selectedId === m.id}
									faded={dragging?.id === m.id && dragging.from === account.id}
									onPress={onPress}
									onTap={onTapMethod}
								/>
							</div>
						</div>
					</div>
				);
			})}
			{extra > 0 && (
				<div
					className="absolute z-20 flex aspect-square items-center justify-center rounded-full bg-ink text-[11px] font-bold text-white"
					style={{
						width: '13%',
						left: `${50 + 43 * Math.cos((-90 + (shown.length * 360) / slots) * (Math.PI / 180))}%`,
						top: `${50 + 43 * Math.sin((-90 + (shown.length * 360) / slots) * (Math.PI / 180))}%`,
						transform: 'translate(-50%,-50%)',
					}}
				>
					+{extra}
				</div>
			)}

			{/* Centre: the account itself */}
			<button
				type="button"
				onClick={() => onTapAccount(account)}
				disabled={!canTap}
				aria-label={`${account.name}, balance ${money(deduction.deductedBalance)}`}
				className={`absolute left-1/2 top-1/2 z-10 flex aspect-square w-[46%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full bg-card px-2 text-center shadow-lg transition-transform duration-300 ${
					active ? 'scale-110' : canTap ? 'cursor-pointer hover:scale-105' : ''
				}`}
				style={{ boxShadow: active ? `0 0 0 4px ${color}, 0 10px 30px ${color}66` : `0 0 0 3px ${color}55, 0 6px 16px rgba(0,0,0,.1)` }}
			>
				<Landmark size={16} style={{ color }} className="mb-0.5 shrink-0" />
				<span className="max-w-full truncate text-[11px] font-bold leading-tight text-text sm:text-[12px]">{account.name}</span>
				<span className={`text-[14px] font-extrabold leading-tight tracking-tight sm:text-[16px] ${balance < 0 ? 'text-danger' : 'text-text'}`}>
					{money(Math.round(balance))}
				</span>
				{deduction.totalSpent > 0 ? (
					<span className="text-[9px] font-semibold leading-tight text-danger">−{money(deduction.totalSpent)} spent</span>
				) : linked.length === 0 ? (
					<span className="text-[9px] font-medium leading-tight text-text-muted">Drop a method</span>
				) : null}
			</button>

			{/* Hover caption */}
			{hint && (
				<span className="pm-up pointer-events-none absolute -bottom-1 left-1/2 z-30 whitespace-nowrap rounded-full bg-ink px-3 py-1.5 text-[11px] font-semibold text-white shadow-lg">
					{hint}
				</span>
			)}
		</div>
	);
}

// ── The board ────────────────────────────────────────────────────────────────

interface LinkBoardProps {
	accounts: SavingsAccount[];
	methods: PaymentMethod[];
	transactions: Transaction[];
	selectedId: string | null;
	onSelect: (id: string | null) => void;
	onManage: (id: string) => void;
	onAdd: () => void;
	notify: Notify;
}

type Press = { id: string; from: string | null; sx: number; sy: number; started: boolean };

export default function LinkBoard({ accounts, methods, transactions, selectedId, onSelect, onManage, onAdd, notify }: LinkBoardProps) {
	const press = useRef<Press | null>(null);
	const suppressClick = useRef(false);
	const ghostRef = useRef<HTMLDivElement>(null);
	const ghostPos = useRef({ x: 0, y: 0 });
	const pointerY = useRef(0);

	const [drag, setDrag] = useState<{ id: string; from: string | null } | null>(null);
	const [overAccount, setOverAccount] = useState<string | null>(null);
	const [overTray, setOverTray] = useState(false);
	const [pulse, setPulse] = useState<Record<string, number>>({});

	// Latest props for the window-level listeners (which are attached once)
	const latest = useRef({ accounts, notify });
	useEffect(() => {
		latest.current = { accounts, notify };
	});

	const draggingMethod = drag ? methods.find((m) => m.id === drag.id) ?? null : null;
	const selectedMethod = selectedId ? methods.find((m) => m.id === selectedId) ?? null : null;
	const activeMethod = draggingMethod ?? selectedMethod;

	const deductions = useMemo(
		() => new Map(accounts.map((a) => [a.id, getAccountDeduction(a, methods, transactions)])),
		[accounts, methods, transactions],
	);

	// Unlinked methods first — they're the ones that need attention
	const trayMethods = useMemo(
		() => [...methods].sort((a, b) => Number(a.linkedAccountIds.length > 0) - Number(b.linkedAccountIds.length > 0)),
		[methods],
	);

	// ── Linking ──
	const link = useCallback((methodId: string, accountId: string, fromId: string | null) => {
		const store = usePaymentMethodStore.getState();
		const m = store.methods.find((x) => x.id === methodId);
		const acc = latest.current.accounts.find((a) => a.id === accountId);
		if (!m || !acc) return;
		if (fromId === accountId) return;
		if (m.linkedAccountIds.includes(accountId)) {
			latest.current.notify(`${m.name} is already on ${acc.name}`);
			return;
		}
		const prevDate = fromId ? (m.linkDates?.[fromId] ?? null) : null;
		// A move keeps the original start date, so nothing is double counted or lost
		store.linkAccount(methodId, accountId, fromId ? prevDate : undefined);
		if (fromId) {
			store.unlinkAccount(methodId, fromId);
			latest.current.notify(`Moved ${m.name} → ${acc.name}`, () => {
				const s = usePaymentMethodStore.getState();
				s.unlinkAccount(methodId, accountId);
				s.linkAccount(methodId, fromId, prevDate);
			});
		} else {
			latest.current.notify(`${m.name} now pays from ${acc.name} — new payments deduct from it`, () =>
				usePaymentMethodStore.getState().unlinkAccount(methodId, accountId),
			);
		}
		haptic(14);
		setPulse((p) => ({ ...p, [accountId]: (p[accountId] ?? 0) + 1 }));
	}, []);

	const unlink = useCallback((methodId: string, accountId: string) => {
		const store = usePaymentMethodStore.getState();
		const m = store.methods.find((x) => x.id === methodId);
		const acc = latest.current.accounts.find((a) => a.id === accountId);
		if (!m || !acc) return;
		const prevDate = m.linkDates?.[accountId] ?? null;
		store.unlinkAccount(methodId, accountId);
		haptic(10);
		latest.current.notify(`${m.name} unlinked from ${acc.name}`, () =>
			usePaymentMethodStore.getState().linkAccount(methodId, accountId, prevDate),
		);
	}, []);

	// ── Pointer drag engine (mouse, pen and touch) ──
	const onPress: PressHandler = useCallback((e, id, from) => {
		if (e.button !== 0) return;
		press.current = { id, from, sx: e.clientX, sy: e.clientY, started: false };
	}, []);

	useEffect(() => {
		const hit = (x: number, y: number) => {
			const el = document.elementFromPoint(x, y);
			const acc = el?.closest<HTMLElement>('[data-drop-account]')?.dataset.dropAccount ?? null;
			return { acc, tray: !acc && !!el?.closest('[data-drop-tray]') };
		};

		const move = (e: PointerEvent) => {
			const p = press.current;
			if (!p) return;
			if (!p.started) {
				if (Math.hypot(e.clientX - p.sx, e.clientY - p.sy) < 6) return;
				p.started = true;
				ghostPos.current = { x: e.clientX, y: e.clientY };
				haptic(10);
				setDrag({ id: p.id, from: p.from });
			}
			ghostPos.current = { x: e.clientX, y: e.clientY };
			pointerY.current = e.clientY;
			if (ghostRef.current) ghostRef.current.style.transform = `translate3d(${e.clientX - 30}px,${e.clientY - 30}px,0)`;
			const { acc, tray } = hit(e.clientX, e.clientY);
			setOverAccount((prev) => (prev === acc ? prev : acc));
			setOverTray((prev) => (prev === tray ? prev : tray));
		};

		const end = (e: PointerEvent) => {
			const p = press.current;
			press.current = null;
			if (!p?.started) return;
			suppressClick.current = true;
			setTimeout(() => (suppressClick.current = false), 0);
			if (e.type === 'pointerup') {
				const { acc, tray } = hit(e.clientX, e.clientY);
				if (acc) link(p.id, acc, p.from);
				else if (tray && p.from) unlink(p.id, p.from);
			}
			setDrag(null);
			setOverAccount(null);
			setOverTray(false);
		};

		window.addEventListener('pointermove', move);
		window.addEventListener('pointerup', end);
		window.addEventListener('pointercancel', end);
		return () => {
			window.removeEventListener('pointermove', move);
			window.removeEventListener('pointerup', end);
			window.removeEventListener('pointercancel', end);
		};
	}, [link, unlink]);

	// While dragging: no text selection, grabbing cursor, auto-scroll near viewport edges
	useEffect(() => {
		if (!drag) return;
		const { userSelect, cursor } = document.body.style;
		document.body.style.userSelect = 'none';
		document.body.style.cursor = 'grabbing';
		let raf = 0;
		const tick = () => {
			const y = pointerY.current;
			const h = window.innerHeight;
			if (y < 90) window.scrollBy(0, -Math.ceil((90 - y) / 5));
			else if (y > h - 90) window.scrollBy(0, Math.ceil((y - (h - 90)) / 5));
			raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => {
			cancelAnimationFrame(raf);
			document.body.style.userSelect = userSelect;
			document.body.style.cursor = cursor;
		};
	}, [drag]);

	// ── Tap / keyboard fallback: select a method, then tap an account ──
	const tapMethod = useCallback(
		(id: string) => {
			if (suppressClick.current) return;
			onSelect(selectedId === id ? null : id);
		},
		[onSelect, selectedId],
	);

	const tapAccount = (a: SavingsAccount) => {
		if (!selectedMethod) return;
		if (selectedMethod.linkedAccountIds.includes(a.id)) unlink(selectedMethod.id, a.id);
		else link(selectedMethod.id, a.id, null);
	};

	// Esc cancels a selection
	useEffect(() => {
		if (!selectedId) return;
		const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onSelect(null);
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [selectedId, onSelect]);

	const hintText = drag
		? drag.from
			? 'Drop on another account to move · drop here to unlink'
			: 'Drop on an account’s wave to link'
		: selectedMethod
			? `Tap an account to link ${selectedMethod.name}`
			: 'Drag a method onto an account';

	const ghostMeta = draggingMethod ? PAYMENT_KIND_META[draggingMethod.kind] : null;
	const GhostIcon = draggingMethod ? PAYMENT_KIND_ICONS[draggingMethod.kind] : null;

	return (
		<div className="space-y-4">
			{/* ── Tray of payment-method circles ── */}
			<div
				data-drop-tray
				className={`sticky top-2 z-30 rounded-[28px] border bg-card/95 p-3.5 shadow-md backdrop-blur transition-all duration-200 ${
					overTray ? 'border-danger bg-danger-soft/90 scale-[1.01]' : 'border-canvas'
				}`}
			>
				<div className="mb-2.5 flex items-center justify-between gap-2 px-0.5">
					<p className="min-w-0 truncate text-[12px] font-semibold text-text-muted" aria-live="polite">
						{overTray ? (
							<span className="inline-flex items-center gap-1.5 text-danger">
								<Unlink size={13} /> Release to unlink
							</span>
						) : (
							hintText
						)}
					</p>
					{selectedMethod && !drag && (
						<button
							type="button"
							onClick={() => onManage(selectedMethod.id)}
							className="pm-in inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-[11px] font-semibold text-white transition-all hover:bg-ink-soft active:scale-95"
						>
							<SlidersHorizontal size={12} /> Manage
						</button>
					)}
				</div>

				<div className="flex gap-3 overflow-x-auto px-0.5 pb-1 pt-1 [&::-webkit-scrollbar]:hidden">
					{trayMethods.map((m) => {
						const n = m.linkedAccountIds.length;
						return (
							<div key={m.id} className="flex w-[60px] shrink-0 flex-col items-center gap-1.5">
								<div className="relative h-[52px] w-[52px]">
									<MethodBubble
										method={m}
										fromAccountId={null}
										selected={selectedId === m.id}
										faded={drag?.id === m.id && drag.from === null}
										onPress={onPress}
										onTap={tapMethod}
									/>
									<span
										className={`pointer-events-none absolute -bottom-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-card px-1 text-[9px] font-bold ${
											n > 0 ? 'bg-mint-deep text-white' : 'bg-amber-400 text-ink'
										}`}
									>
										{n > 0 ? <Check size={10} strokeWidth={3.5} /> : '!'}
									</span>
								</div>
								<p className="w-full truncate text-center text-[10px] font-semibold leading-tight text-text">{m.name}</p>
							</div>
						);
					})}

					<div className="flex w-[60px] shrink-0 flex-col items-center gap-1.5">
						<button
							type="button"
							onClick={onAdd}
							aria-label="Add payment method"
							className="flex h-[52px] w-[52px] cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-canvas-soft bg-surface text-text-muted transition-all hover:scale-110 hover:border-ink hover:text-ink active:scale-95"
						>
							<Plus size={20} />
						</button>
						<p className="text-[10px] font-semibold text-text-muted">New</p>
					</div>
				</div>
			</div>

			{/* ── Accounts with their wavy zones ── */}
			<div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,240px),1fr))] gap-x-3 gap-y-6">
				{accounts.map((a, i) => {
					const ded = deductions.get(a.id)!;
					const isActive = !!drag && overAccount === a.id;
					const already = !!activeMethod && activeMethod.linkedAccountIds.includes(a.id);
					const st = activeMethod;
					return (
						<AccountOrbit
							key={a.id}
							account={a}
							colorIndex={i}
							linked={ded.linkedMethods}
							deduction={ded}
							active={isActive}
							armed={!!activeMethod && !already}
							canTap={!!selectedMethod && !drag}
							pulseKey={pulse[a.id] ?? 0}
							dragging={drag}
							selectedId={selectedId}
							hint={
								isActive && activeMethod && st
									? already && drag?.from !== a.id
										? 'Already linked'
										: 'Link · new payments deduct here'
									: null
							}
							onPress={onPress}
							onTapMethod={tapMethod}
							onTapAccount={tapAccount}
						/>
					);
				})}
			</div>

			{/* ── Ghost that follows the pointer ── */}
			{drag && draggingMethod && ghostMeta && GhostIcon && (
				<div
					ref={(el) => {
						ghostRef.current = el;
						if (el) el.style.transform = `translate3d(${ghostPos.current.x - 30}px,${ghostPos.current.y - 30}px,0)`;
					}}
					className="pointer-events-none fixed left-0 top-0 z-[60] will-change-transform"
				>
					<div
						className="pm-lift relative flex h-[60px] w-[60px] items-center justify-center rounded-full bg-card"
						style={{ color: ghostMeta.hexColor, boxShadow: `0 0 0 3px ${ghostMeta.hexColor}, 0 14px 30px rgba(0,0,0,.25)` }}
					>
						<GhostIcon size={26} strokeWidth={2.2} />
						{overAccount && (
							<span className="pm-pop absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-mint-deep text-white shadow">
								<Link2 size={12} />
							</span>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
