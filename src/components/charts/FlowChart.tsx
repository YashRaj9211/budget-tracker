import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import './FlowChart.css';

export interface FlowChartProps {
	title: string;
	value: number | string;
	delta?: number;
	caption?: string;
	data: number[];
	markers?: number[];
	interactive?: boolean;
	colors?: string[];
	ratios?: number[];
	formatValue?: (n: number) => string;
	icon?: React.ReactNode;
	onMarkerChange?: (index: number, fraction: number, valueAtFraction: number) => void;
	height?: number | string;
	className?: string;
	style?: React.CSSProperties;
	glowColor?: string;
	bgColor?: string;
	timelineLabels?: string[];
	showIndicators?: boolean;
	budgetLimit?: number;
}

const VB_W = 600;
const VB_H = 300;
const BASELINE = 0.58; // vertical centre of the stream (0 = top, 1 = bottom)
const FILL = 0.46; // max half-thickness as a share of the viewBox height

// Green/purple theme defaults to match budget app:
const DEFAULT_COLORS = ['#1d1b3a', '#3b3478', '#7d6df0', '#aa9cf5'];
const DEFAULT_RATIOS = [1, 0.78, 0.52, 0.28];

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Smooth S-curve through points using horizontal tangents (no overshoot). */
function curve(pts: [number, number][], startWith = 'M'): string {
	if (!pts.length) return '';
	let d = `${startWith}${pts[0][0]},${pts[0][1]}`;
	for (let i = 0; i < pts.length - 1; i++) {
		const [x1, y1] = pts[i];
		const [x2, y2] = pts[i + 1];
		const mx = (x1 + x2) / 2;
		d += ` C${mx},${y1} ${mx},${y2} ${x2},${y2}`;
	}
	return d;
}

function valueAt(data: number[], f: number): number {
	if (!data.length) return 0;
	if (data.length === 1) return data[0];
	const pos = clamp(f, 0, 1) * (data.length - 1);
	const i = Math.floor(pos);
	const j = Math.min(i + 1, data.length - 1);
	return data[i] + (data[j] - data[i]) * (pos - i);
}

const defaultFormat = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');

export function FlowChart({
	title,
	value,
	delta,
	caption,
	data,
	markers = [0.18, 0.52, 0.88],
	interactive = true,
	colors = DEFAULT_COLORS,
	ratios = DEFAULT_RATIOS,
	formatValue = defaultFormat,
	icon,
	onMarkerChange,
	height = 240,
	className = '',
	style,
	glowColor,
	bgColor,
	timelineLabels = ['Day 1', 'Mid Month', 'Today / End'],
	showIndicators = true,
	budgetLimit,
}: FlowChartProps) {
	const plotRef = useRef<HTMLDivElement>(null);
	const [positions, setPositions] = useState(markers);
	const [dragging, setDragging] = useState<number | null>(null);

	const markersKey = markers.join(',');
	useEffect(() => {
		if (dragging === null) {
			setPositions(markers);
		}
	}, [markersKey]);

	const safeData = useMemo(() => {
		if (!data || data.length === 0) return [0, 0];
		if (data.length === 1) return [0, data[0]];
		return data;
	}, [data]);

	const layers = useMemo(() => {
		const max = Math.max(...safeData, 1);
		const step = VB_W / (safeData.length - 1);
		const cy = VB_H * BASELINE;
		const unit = (VB_H * FILL) / max;
		return colors.map((color, k) => {
			const r = ratios[k] ?? 1;
			const top: [number, number][] = safeData.map((v, i) => [i * step, cy - v * unit * r * 1.15]);
			const bottom: [number, number][] = safeData.map((v, i) => [i * step, cy + v * unit * r * 0.85]);
			const d =
				curve(top) +
				` L${bottom[bottom.length - 1][0]},${bottom[bottom.length - 1][1]} ` +
				curve([...bottom].reverse(), 'L') +
				' Z';
			return { color, d };
		});
	}, [safeData, colors, ratios]);

	const move = useCallback(
		(index: number, f: number) => {
			const next = clamp(f, 0.03, 0.97);
			setPositions((p) => p.map((v, i) => (i === index ? next : v)));
			onMarkerChange?.(index, next, valueAt(safeData, next));
		},
		[safeData, onMarkerChange]
	);

	const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
		if (dragging === null || !plotRef.current) return;
		const rect = plotRef.current.getBoundingClientRect();
		move(dragging, (e.clientX - rect.left) / rect.width);
	};

	const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, i: number) => {
		if (!interactive) return;
		if (e.key === 'ArrowLeft') {
			e.preventDefault();
			move(i, positions[i] - 0.02);
		}
		if (e.key === 'ArrowRight') {
			e.preventDefault();
			move(i, positions[i] + 0.02);
		}
	};

	const trend = delta !== undefined && delta > 0 ? 'up' : delta !== undefined && delta < 0 ? 'down' : 'flat';
	const shown = typeof value === 'number' ? formatValue(value) : value;

	const cardStyle: React.CSSProperties = {
		...style,
		...(glowColor ? ({ ['--fc-glow' as any]: glowColor } as React.CSSProperties) : {}),
		...(bgColor ? ({ ['--fc-bg' as any]: bgColor } as React.CSSProperties) : {}),
	};

	return (
		<section className={`fc-card ${className}`} style={cardStyle}>
			<header className="fc-head">
				<div>
					<div className="flex items-center gap-2">
						<h3 className="fc-title">{title}</h3>
						{interactive && (
							<span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-white/10 text-white/70 tracking-wider">
								Draggable checkpoints
							</span>
						)}
					</div>
					<div className="fc-value-row">
						<span className="fc-value">{shown}</span>
						{delta !== undefined && (
							<span className={`fc-delta fc-delta--${trend}`}>
								<svg
									width="14"
									height="14"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="3"
									strokeLinecap="round"
									strokeLinejoin="round"
									aria-hidden="true"
									style={{ transform: trend === 'down' ? 'rotate(180deg)' : 'none' }}
								>
									<path d="M12 20V4M5 11l7-7 7 7" />
								</svg>
								{Math.abs(delta)}%
							</span>
						)}
					</div>
					{caption && <p className="fc-caption">{caption}</p>}
				</div>
				<span className="fc-badge" aria-hidden="true">
					{icon ?? (
						<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
							<path d="M12 1c.6 5.6 5.4 10.4 11 11-5.6.6-10.4 5.4-11 11-.6-5.6-5.4-10.4-11-11 5.6-.6 10.4-5.4 11-11z" />
						</svg>
					)}
				</span>
			</header>

			{/* Stream Plot */}
			<div
				className="fc-plot"
				ref={plotRef}
				style={{ height }}
				onPointerMove={onPointerMove}
				onPointerUp={() => setDragging(null)}
				onPointerCancel={() => setDragging(null)}
			>
				{/* Background baseline and guideline indicator */}
				<svg
					className="fc-svg"
					viewBox={`0 0 ${VB_W} ${VB_H}`}
					preserveAspectRatio="none"
					role="img"
					aria-label={`${title} stream chart, from ${formatValue(safeData[0])} to ${formatValue(safeData[safeData.length - 1])}`}
				>
					{/* Subtle grid lines for depth */}
					<line
						x1="0"
						y1={VB_H * BASELINE}
						x2={VB_W}
						y2={VB_H * BASELINE}
						stroke="rgba(255,255,255,0.06)"
						strokeDasharray="4 4"
						strokeWidth="1"
					/>

					{layers.map((l, i) => (
						<path key={i} d={l.d} fill={l.color} />
					))}
				</svg>

				{/* Draggable Markers */}
				{positions.map((f, i) => (
					<div key={i} className="fc-marker" style={{ left: `${f * 100}%` }}>
						<span className="fc-line" />
						<button
							type="button"
							className={`fc-pill ${dragging === i ? 'is-dragging' : ''}`}
							style={{ top: `${BASELINE * 100}%`, touchAction: 'none', cursor: interactive ? 'grab' : 'default' }}
							role="slider"
							aria-label={`Marker ${i + 1}`}
							aria-valuemin={0}
							aria-valuemax={100}
							aria-valuenow={Math.round(f * 100)}
							aria-valuetext={formatValue(valueAt(safeData, f))}
							onPointerDown={(e) => {
								if (!interactive) return;
								e.currentTarget.setPointerCapture(e.pointerId);
								setDragging(i);
							}}
							onPointerMove={(e) => {
								if (dragging === i && plotRef.current) {
									const rect = plotRef.current.getBoundingClientRect();
									move(i, (e.clientX - rect.left) / rect.width);
								}
							}}
							onPointerUp={(e) => {
								if (dragging === i) {
									try {
										e.currentTarget.releasePointerCapture(e.pointerId);
									} catch {
										// ignore
									}
									setDragging(null);
								}
							}}
							onPointerCancel={() => setDragging(null)}
							onKeyDown={(e) => onKeyDown(e, i)}
						>
							{formatValue(valueAt(safeData, f))}
						</button>
					</div>
				))}
			</div>

			{/* Bottom Indicators & Timeline Axis Labels */}
			{showIndicators && (
				<footer className="px-6 pb-5 pt-1 space-y-2.5 border-t border-white/5 mt-1">
					{/* Horizontal timeline labels */}
					<div className="flex justify-between items-center text-[11px] font-mono text-white/40">
						<span>{timelineLabels[0] ?? 'Day 1'}</span>
						<span className="text-center">{timelineLabels[1] ?? 'Mid Month'}</span>
						<span className="text-right">{timelineLabels[2] ?? 'Current'}</span>
					</div>

					{/* Layer stream indicators and guidance */}
					<div className="flex items-center justify-between flex-wrap gap-2 pt-1 text-[11px]">
						<div className="flex items-center gap-3 text-white/60">
							<span className="flex items-center gap-1.5">
								<span className="w-2 h-2 rounded-full bg-[#aa9cf5]" />
								Core spend
							</span>
							<span className="flex items-center gap-1.5">
								<span className="w-2 h-2 rounded-full bg-[#7d6df0]" />
								Accumulated
							</span>
							<span className="flex items-center gap-1.5">
								<span className="w-2 h-2 rounded-full bg-[#3b3478]" />
								Monthly envelope
							</span>
						</div>

						{budgetLimit !== undefined && budgetLimit > 0 && (
							<span className="text-white/50 font-mono text-[11px]">
								Budget: {formatValue(budgetLimit)}
							</span>
						)}
					</div>
				</footer>
			)}
		</section>
	);
}

export default FlowChart;
