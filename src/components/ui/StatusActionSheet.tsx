import React, { useEffect } from 'react';
import { useStatusSheetStore } from '../../stores/statusSheetStore';
import { AlertCircle } from 'lucide-react';

export const StatusActionSheet: React.FC = () => {
	const isOpen = useStatusSheetStore((s) => s.isOpen);
	const config = useStatusSheetStore((s) => s.config);
	const close = useStatusSheetStore((s) => s.close);

	useEffect(() => {
		if (isOpen) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = 'unset';
		}
		return () => {
			document.body.style.overflow = 'unset';
		};
	}, [isOpen]);

	if (!isOpen) return null;

	const { state, title, message, buttonText, onConfirm } = config;

	const handleAction = () => {
		if (onConfirm) {
			onConfirm();
		} else {
			close();
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/40 backdrop-blur-xs animate-in fade-in duration-200">
			{/* Backdrop click dismiss only on success or error */}
			<div
				className="absolute inset-0"
				onClick={() => {
					if (state !== 'processing') close();
				}}
			/>

			{/* Bottom Sheet Card */}
			<div
				role="dialog"
				aria-modal="true"
				className="relative z-10 w-full max-w-md bg-card rounded-t-[32px] sm:rounded-[32px] shadow-2xl px-6 pt-3 pb-8 flex flex-col items-center text-center animate-in slide-in-from-bottom duration-300"
			>
				{/* Pull Bar / Drag Handle */}
				<div className="w-10 h-1 bg-surface-muted bg-black/15 rounded-full mx-auto mb-6 shrink-0" />

				{/* State Visuals */}
				{state === 'processing' && (
					<div className="flex flex-col items-center justify-center py-4 w-full">
						{/* Animated Origami Plane Graphic */}
						<div className="relative w-36 h-36 flex items-center justify-center mb-5">
							{/* Subtle background glow */}
							<div className="absolute inset-0 bg-mint/25 rounded-full blur-xl animate-pulse" />

							{/* Origami Paper Airplane SVG */}
							<svg
								className="w-28 h-28 relative z-10 animate-airplane-float"
								viewBox="0 0 160 160"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
							>
								{/* Trailing speed dashes */}
								<g className="animate-wind-stream opacity-70">
									<line
										x1="32"
										y1="118"
										x2="52"
										y2="108"
										stroke="#2A2A2A"
										strokeWidth="3.5"
										strokeLinecap="round"
									/>
									<line
										x1="38"
										y1="134"
										x2="65"
										y2="120"
										stroke="#2A2A2A"
										strokeWidth="3.5"
										strokeLinecap="round"
									/>
									<line
										x1="58"
										y1="142"
										x2="80"
										y2="132"
										stroke="#2A2A2A"
										strokeWidth="3.5"
										strokeLinecap="round"
									/>
								</g>

								{/* Upper Wing (Bright Mint/Emerald) */}
								<path
									d="M 132 40 L 46 92 L 94 99 Z"
									fill="#10B981"
									stroke="#059669"
									strokeWidth="1.5"
									strokeLinejoin="round"
								/>

								{/* Center Fold / Upper Spine Highlight */}
								<path
									d="M 132 40 L 94 99 L 90 82 Z"
									fill="#34D399"
									stroke="#10B981"
									strokeWidth="1.5"
									strokeLinejoin="round"
								/>

								{/* Lower Fuselage / Underside (Rich Forest Emerald) */}
								<path
									d="M 132 40 L 94 99 L 84 122 Z"
									fill="#047857"
									stroke="#065F46"
									strokeWidth="1.5"
									strokeLinejoin="round"
								/>

								{/* Bottom Wing Winglet */}
								<path
									d="M 94 99 L 84 122 L 68 108 Z"
									fill="#065F46"
									stroke="#064E3B"
									strokeWidth="1.5"
									strokeLinejoin="round"
								/>
							</svg>
						</div>

						<h3 className="text-[20px] font-semibold text-text tracking-tight">
							{title || 'Processing...'}
						</h3>
						<p className="text-[13px] text-text-muted mt-1 max-w-xs">
							{message || 'Your transfer is processing'}
						</p>
					</div>
				)}

				{state === 'success' && (
					<div className="flex flex-col items-center justify-center py-4 w-full animate-in zoom-in-95 duration-200">
						{/* Green Scalloped Rosette Check Badge */}
						<div className="relative w-32 h-32 flex items-center justify-center mb-5">
							{/* Soft mint bloom */}
							<div className="absolute inset-0 bg-mint/30 rounded-full blur-xl scale-125" />

							{/* 12-petaled scalloped badge */}
							<svg
								className="w-24 h-24 relative z-10 animate-rosette-pop drop-shadow-md"
								viewBox="0 0 100 100"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
							>
								{/* Scalloped badge path */}
								<path
									d="M50 0 
									   C55 0 58 6 62 8 
									   C67 7 72 10 75 14 
									   C79 17 81 23 84 28 
									   C88 32 89 38 90 44 
									   C92 50 90 56 89 61 
									   C86 67 83 72 78 76 
									   C74 80 68 83 63 85 
									   C57 88 51 88 46 88 
									   C40 87 34 85 29 82 
									   C24 78 20 74 17 69 
									   C13 64 11 58 10 52 
									   C10 46 12 40 14 34 
									   C18 29 22 24 27 21 
									   C32 17 38 14 43 12 
									   Z"
									fill="url(#scallop-gradient)"
								/>
								<defs>
									<linearGradient id="scallop-gradient" x1="20" y1="10" x2="80" y2="85" gradientUnits="userSpaceOnUse">
										<stop stopColor="#22C55E" />
										<stop offset="1" stopColor="#15803D" />
									</linearGradient>
								</defs>

								{/* Checkmark icon with rounded ends */}
								<path
									d="M33 46 L44 58 L68 34"
									stroke="white"
									strokeWidth="8"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							</svg>
						</div>

						<h3 className="text-[20px] font-semibold text-text tracking-tight">
							{title || 'Success!'}
						</h3>
						<p className="text-[13px] text-text-muted mt-1 mb-6 max-w-xs leading-relaxed">
							{message || 'Your transfer was successful'}
						</p>

						{/* Dark Pill Action Button */}
						<button
							onClick={handleAction}
							className="w-full max-w-[220px] py-3.5 px-6 rounded-full bg-ink text-white font-medium text-[14px] shadow-lg hover:bg-ink-soft active:scale-[0.96] transition-all cursor-pointer"
						>
							{buttonText || 'Nice one!'}
						</button>
					</div>
				)}

				{state === 'error' && (
					<div className="flex flex-col items-center justify-center py-4 w-full animate-in zoom-in-95 duration-200">
						<div className="w-20 h-20 rounded-full bg-danger-soft flex items-center justify-center text-danger mb-4 shadow-inner">
							<AlertCircle className="w-10 h-10" strokeWidth={2} />
						</div>

						<h3 className="text-[20px] font-semibold text-text tracking-tight">
							{title || 'Action Failed'}
						</h3>
						<p className="text-[13px] text-text-muted mt-1 mb-6 max-w-xs leading-relaxed">
							{message || 'Something went wrong while processing.'}
						</p>

						<button
							onClick={handleAction}
							className="w-full max-w-[200px] py-3.5 px-6 rounded-full bg-ink text-white font-medium text-[14px] hover:bg-ink-soft active:scale-[0.96] transition-all cursor-pointer"
						>
							{buttonText || 'Close'}
						</button>
					</div>
				)}
			</div>
		</div>
	);
};

export default StatusActionSheet;
