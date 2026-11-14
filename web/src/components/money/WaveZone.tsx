import { usePrefersReducedMotion } from './paymentShared';

/** A circle whose radius ripples like a wave: r + amp·sin(lobes·θ + phase) */
function wavePath(r: number, amp: number, lobes: number, phase: number, steps = 64): string {
	let d = '';
	for (let i = 0; i < steps; i++) {
		const t = (i / steps) * Math.PI * 2;
		const rr = r + amp * Math.sin(lobes * t + phase);
		const x = (50 + rr * Math.cos(t)).toFixed(2);
		const y = (50 + rr * Math.sin(t)).toFixed(2);
		d += `${i === 0 ? 'M' : 'L'}${x} ${y} `;
	}
	return d + 'Z';
}

/** Keyframes for one layer — phase sweeps a full turn so the loop is seamless. */
function frames(r: number, amp: number, lobes: number, dir: 1 | -1) {
	const phases = [0, 0.5, 1, 1.5, 2].map((p) => p * Math.PI * dir);
	return phases.map((ph) => wavePath(r, amp, lobes, ph)).join(';');
}

// Built once — paths are identical for every account.
const LAYERS = [
	{ r: 46, amp: 2.2, lobes: 7, dur: 9, dir: 1 as const, fill: 0.16, stroke: 0.35 },
	{ r: 42, amp: 2.4, lobes: 5, dur: 7, dir: -1 as const, fill: 0.24, stroke: 0.5 },
	{ r: 38, amp: 1.8, lobes: 6, dur: 5.5, dir: 1 as const, fill: 0.34, stroke: 0.7 },
].map((l) => ({ ...l, values: frames(l.r, l.amp, l.lobes, l.dir), still: wavePath(l.r, l.amp, l.lobes, 0) }));

/**
 * The animated wavy "zone" around an account. It idles gently, breathes while
 * a method is picked up (`armed`), and swells + glows when one hovers it (`active`).
 */
export default function WaveZone({
	color,
	active,
	armed,
	pulseKey,
}: {
	color: string;
	active: boolean;
	armed: boolean;
	/** Changes whenever something was just dropped here → triggers a ripple */
	pulseKey: number;
}) {
	const reduced = usePrefersReducedMotion();

	return (
		<svg
			viewBox="0 0 100 100"
			aria-hidden
			className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
		>
			<g
				style={{
					transformOrigin: '50px 50px',
					transform: active ? 'scale(1.12)' : 'scale(1)',
					transition: 'transform 380ms cubic-bezier(.2,.9,.3,1.3)',
				}}
			>
				<g className={armed && !active && !reduced ? 'pm-breathe' : undefined} style={{ transformOrigin: '50px 50px' }}>
					{LAYERS.map((l, i) => (
						<path
							key={i}
							d={l.still}
							fill={color}
							stroke={color}
							strokeWidth={0.6}
							fillOpacity={active ? Math.min(l.fill + 0.28, 0.75) : armed ? l.fill + 0.1 : l.fill}
							strokeOpacity={active ? 1 : l.stroke}
							strokeDasharray={armed && !active ? '2 2.4' : undefined}
							style={{ transition: 'fill-opacity 300ms, stroke-opacity 300ms' }}
						>
							{!reduced && (
								<animate
									attributeName="d"
									dur={`${active ? l.dur * 0.45 : l.dur}s`}
									repeatCount="indefinite"
									values={l.values}
								/>
							)}
						</path>
					))}
				</g>
			</g>

			{/* One-shot ripple when a method lands */}
			{pulseKey > 0 && !reduced && (
				<circle
					key={pulseKey}
					cx="50"
					cy="50"
					r="38"
					fill="none"
					stroke={color}
					strokeWidth="1.5"
					className="pm-splash"
					style={{ transformOrigin: '50px 50px' }}
				/>
			)}
		</svg>
	);
}
