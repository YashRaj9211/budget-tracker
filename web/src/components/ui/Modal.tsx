import React, { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
	isOpen: boolean;
	onClose: () => void;
	title: React.ReactNode;
	children: React.ReactNode;
	asBottomSheet?: boolean;
}

export const Modal = ({ isOpen, onClose, title, children, asBottomSheet = true }: ModalProps) => {
	const handleKeyDown = useCallback(
		(e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose();
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
		<div
			className={`fixed inset-0 z-[60] flex bg-ink/40 backdrop-blur-xs animate-in fade-in duration-200 ${
				asBottomSheet ? 'items-end sm:items-center justify-center p-0 sm:p-4' : 'items-center justify-center p-4'
			}`}
		>
			<div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
			<div
				className={`w-full max-w-md bg-card shadow-2xl max-h-[92vh] flex flex-col overflow-hidden relative z-10 animate-in ${
					asBottomSheet
						? 'rounded-t-[32px] sm:rounded-[28px] slide-in-from-bottom duration-300'
						: 'rounded-[28px] zoom-in-95 duration-200'
				}`}
				role="dialog"
			>
				{asBottomSheet && (
					<div className="pt-3 pb-1 flex justify-center shrink-0">
						<div className="w-10 h-1 bg-black/15 hover:bg-black/25 rounded-full transition-colors" />
					</div>
				)}
				<div className="flex items-center justify-between px-6 py-3 border-b border-surface bg-card shrink-0">
					<h2 className="text-[17px] font-medium text-text">{title}</h2>
					<button
						onClick={onClose}
						className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-text-muted hover:text-text transition-colors cursor-pointer"
						aria-label="Close"
					>
						<X size={16} strokeWidth={1.5} />
					</button>
				</div>
				<div className="p-6 overflow-y-auto flex-1">{children}</div>
			</div>
		</div>
	);
};

export default Modal;
