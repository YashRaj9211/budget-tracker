import React, { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

export interface BottomSheetProps {
	isOpen: boolean;
	onClose: () => void;
	title?: React.ReactNode;
	children: React.ReactNode;
	hideHandle?: boolean;
	hideCloseButton?: boolean;
	maxHeight?: string;
	className?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
	isOpen,
	onClose,
	title,
	children,
	hideHandle = false,
	hideCloseButton = false,
	maxHeight = 'max-h-[90vh]',
	className = '',
}) => {
	const handleKeyDown = useCallback(
		(e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				onClose();
			}
		},
		[onClose]
	);

	useEffect(() => {
		if (isOpen) {
			document.body.style.overflow = 'hidden';
			window.addEventListener('keydown', handleKeyDown);
		} else {
			document.body.style.overflow = 'unset';
		}
		return () => {
			document.body.style.overflow = 'unset';
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [isOpen, handleKeyDown]);

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-ink/40 backdrop-blur-xs animate-in fade-in duration-200">
			{/* Backdrop click dismiss */}
			<div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

			{/* Bottom Sheet Drawer */}
			<div
				role="dialog"
				aria-modal="true"
				className={`relative z-10 w-full max-w-md bg-card rounded-t-[32px] sm:rounded-[32px] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300 ${maxHeight} ${className}`}
			>
				{/* Pull Bar / Drag Handle */}
				{!hideHandle && (
					<div className="pt-3 pb-1 flex justify-center shrink-0">
						<div className="w-10 h-1 bg-black/15 hover:bg-black/25 rounded-full transition-colors" />
					</div>
				)}

				{/* Header (optional if title or close button provided) */}
				{(title || !hideCloseButton) && (
					<div className="flex items-center justify-between px-6 py-3 border-b border-surface shrink-0">
						<div className="text-[17px] font-medium text-text flex items-center gap-2">
							{title}
						</div>
						{!hideCloseButton && (
							<button
								type="button"
								onClick={onClose}
								className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-text-muted hover:text-text transition-colors cursor-pointer"
								aria-label="Close"
							>
								<X size={16} strokeWidth={1.5} />
							</button>
						)}
					</div>
				)}

				{/* Content */}
				<div className="p-6 overflow-y-auto flex-1">
					{children}
				</div>
			</div>
		</div>
	);
};

export default BottomSheet;
