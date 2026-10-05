import React, { useEffect } from 'react';
import { useStatusSheetStore } from '../../stores/statusSheetStore';
import AnimatedLogo from '../common/AnimatedLogo';

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
						{/* Animated Mascot Graphic */}
						<div className="relative w-32 h-32 flex items-center justify-center mb-4">
							<div className="absolute inset-0 bg-mint/30 rounded-full blur-xl animate-pulse" />
							<AnimatedLogo state="loading" size={88} title="Processing..." />
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
						{/* Animated Mascot Happy Nod */}
						<div className="relative w-32 h-32 flex items-center justify-center mb-4">
							<div className="absolute inset-0 bg-mint/40 rounded-full blur-xl scale-125" />
							<AnimatedLogo state="success" size={88} title="Success!" />
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
						{/* Animated Mascot Failure Slump */}
						<div className="relative w-32 h-32 flex items-center justify-center mb-4">
							<div className="absolute inset-0 bg-danger/20 rounded-full blur-xl" />
							<AnimatedLogo state="error" size={88} title="Action Failed" />
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
