/* eslint-disable react-refresh/only-export-components -- shared UI kit: small components plus formatting helpers */
import type { ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight, Loader2, Check, Minus } from 'lucide-react';

/** ₹1,23,456 (whole rupees when there are no paise) */
export const money = (v: string | number | null | undefined) =>
	`₹${Number(v ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export const num = (v: string | number | null | undefined) => Number(v ?? 0);

/** % change from prev to curr, or null when there is no base to compare with. */
export const pctChange = (curr: number, prev: number): number | null =>
	prev === 0 ? null : ((curr - prev) / Math.abs(prev)) * 100;

/** "2026-10" -> "Oct" */
export const monthLabel = (ym: string) =>
	new Date(`${ym}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'short' });

export const todayStr = () => new Date().toLocaleDateString('en-CA'); // local YYYY-MM-DD

export function errMsg(err: unknown): string {
	const data = (err as { response?: { data?: { error?: string } } })?.response?.data;
	if (data?.error) return data.error;
	return err instanceof Error ? err.message : 'Something went wrong';
}

export const fieldClass =
	'w-full h-12 px-4 bg-surface text-text placeholder:text-text-muted rounded-full text-[14px] focus:outline-none focus:ring-2 focus:ring-lavender-deep/40';

type Tone = 'white' | 'mint' | 'lavender' | 'ink';

const toneClass: Record<Tone, string> = {
	white: 'bg-card text-text',
	mint: 'bg-mint text-text',
	lavender: 'bg-lavender text-text',
	ink: 'bg-ink text-white',
};

/** Green = good news, violet/red = bad news. `goodWhenUp` says whether a rise is good. */
export function DeltaPill({ change, goodWhenUp = false }: { change: number | null; goodWhenUp?: boolean }) {
	if (change === null) {
		return <span className="rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-text-muted">New</span>;
	}
	if (Math.abs(change) < 0.5) {
		return (
			<span className="inline-flex items-center gap-0.5 rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-text-muted">
				<Minus size={12} /> 0%
			</span>
		);
	}
	const up = change > 0;
	const good = up === goodWhenUp;
	const Icon = up ? ArrowUpRight : ArrowDownRight;
	return (
		<span
			className={`inline-flex items-center gap-0.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
				good ? 'bg-mint-deep text-white' : 'bg-danger text-white'
			}`}
		>
			<Icon size={12} />
			{Math.abs(change).toFixed(0)}%
		</span>
	);
}

export function StatTile({
	label,
	value,
	tone = 'white',
	footer,
}: {
	label: string;
	value: string;
	tone?: Tone;
	footer?: ReactNode;
}) {
	return (
		<div className={`rounded-[20px] p-4 ${toneClass[tone]}`}>
			<p className="text-[12px] opacity-75">{label}</p>
			<p className="mt-1 text-[20px] font-semibold tracking-tight">{value}</p>
			{footer && <div className="mt-2">{footer}</div>}
		</div>
	);
}

export function SectionHead({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
	return (
		<div className="mb-4 flex items-start justify-between gap-3">
			<div>
				<h2 className="text-[17px] font-semibold text-text">{title}</h2>
				{hint && <p className="mt-0.5 text-[12px] text-text-muted">{hint}</p>}
			</div>
			{action}
		</div>
	);
}

export function Segmented<T extends string>({
	value,
	options,
	onChange,
	label,
}: {
	value: T;
	options: { value: T; label: string; tone: 'mint' | 'lavender' }[];
	onChange: (v: T) => void;
	label: string;
}) {
	return (
		<div role="radiogroup" aria-label={label} className="flex rounded-full bg-surface p-1">
			{options.map((o) => {
				const active = o.value === value;
				const activeClass = o.tone === 'mint' ? 'bg-mint-deep text-white' : 'bg-lavender-deep text-white';
				return (
					<button
						key={o.value}
						type="button"
						role="radio"
						aria-checked={active}
						onClick={() => onChange(o.value)}
						className={`flex-1 rounded-full px-3 py-2.5 text-[13px] font-semibold transition-all duration-200 active:scale-[0.98] ${
							active ? activeClass : 'text-text-muted'
						}`}
					>
						{o.label}
					</button>
				);
			})}
		</div>
	);
}

export function Chip({ active, onClick, children }: { active?: boolean; onClick: () => void; children: ReactNode }) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`rounded-full px-3.5 py-2 text-[13px] font-medium transition-all active:scale-95 ${
				active ? 'bg-ink text-white' : 'bg-surface text-text hover:bg-canvas'
			}`}
		>
			{children}
		</button>
	);
}

/** Big rupee input with a soft pill background. Only digits and one dot are kept. */
export function AmountInput({ value, onChange, label = 'Amount' }: { value: string; onChange: (v: string) => void; label?: string }) {
	return (
		<label className="flex items-center gap-2 rounded-[24px] bg-surface px-5 py-3">
			<span className="text-[26px] font-semibold text-text-muted">₹</span>
			<input
				aria-label={label}
				inputMode="decimal"
				placeholder="0"
				value={value}
				onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, '').replace(/^(\d*\.?\d{0,2}).*$/, '$1'))}
				className="w-full bg-transparent text-[30px] font-semibold text-text placeholder:text-text-muted/50 focus:outline-none"
			/>
		</label>
	);
}

/** Full-width pill button with a busy spinner and a short "Saved" tick. */
export function SubmitButton({ busy, done, label, doneLabel = 'Saved' }: { busy: boolean; done: boolean; label: string; doneLabel?: string }) {
	return (
		<button
			type="submit"
			disabled={busy}
			className={`flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-[15px] font-semibold text-white transition-all duration-300 active:scale-[0.98] disabled:opacity-60 ${
				done ? 'bg-mint-deep' : 'bg-ink hover:bg-ink-soft'
			}`}
		>
			{busy && <Loader2 size={18} className="animate-spin" />}
			{!busy && done && <Check size={18} />}
			{busy ? 'Saving…' : done ? doneLabel : label}
		</button>
	);
}

export function ErrorNote({ message }: { message: string | null }) {
	if (!message) return null;
	return <p role="alert" className="rounded-[16px] bg-danger-soft px-4 py-2.5 text-[12px] font-medium text-danger">{message}</p>;
}
