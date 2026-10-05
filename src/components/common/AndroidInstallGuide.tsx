import React, { useState, useEffect } from 'react';
import { Download, MoreVertical, CheckCircle2, X, ArrowDown } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import BottomSheet from '../ui/BottomSheet';

const DISMISS_KEY = 'budget_android_pwa_guide_dismissed';

interface AndroidInstallGuideProps {
	/** If provided, overrides auto-popup logic (e.g. triggered manually from settings or a banner) */
	isOpen?: boolean;
	onClose?: () => void;
}

export const AndroidInstallGuide: React.FC<AndroidInstallGuideProps> = ({
	isOpen: externalIsOpen,
	onClose: externalOnClose,
}) => {
	const { platform, isInstalled, canInstallDirectly, triggerInstall } = usePWAInstall();
	const [internalOpen, setInternalOpen] = useState(false);
	const [isInstalling, setIsInstalling] = useState(false);
	const [installedSuccess, setInstalledSuccess] = useState(false);

	// Auto-prompt first-time Android visitors who haven't installed or dismissed yet
	useEffect(() => {
		if (externalIsOpen !== undefined) return;

		if (platform === 'android' && !isInstalled) {
			const isDismissed = localStorage.getItem(DISMISS_KEY) === 'true';
			if (!isDismissed) {
				// Subtle delay so it doesn't pop aggressively while page is first rendering
				const timer = setTimeout(() => {
					setInternalOpen(true);
				}, 1500);
				return () => clearTimeout(timer);
			}
		}
	}, [platform, isInstalled, externalIsOpen]);

	const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalOpen;

	const handleClose = () => {
		if (externalOnClose) {
			externalOnClose();
		} else {
			setInternalOpen(false);
			localStorage.setItem(DISMISS_KEY, 'true');
		}
	};

	const handleInstallClick = async () => {
		if (canInstallDirectly) {
			setIsInstalling(true);
			const success = await triggerInstall();
			setIsInstalling(false);
			if (success) {
				setInstalledSuccess(true);
				setTimeout(() => {
					handleClose();
				}, 1800);
			}
		}
	};

	// Only render on Android (or when manually forced via props for testing)
	if (platform !== 'android' && externalIsOpen === undefined) {
		return null;
	}

	if (isInstalled && !installedSuccess) {
		return null;
	}

	return (
		<BottomSheet isOpen={isOpen} onClose={handleClose} hideCloseButton hideHandle>
			<div className="relative pt-1 pb-2">
				{/* Close button */}
				<button
					type="button"
					onClick={handleClose}
					className="absolute right-0 top-0 w-8 h-8 rounded-full bg-surface flex items-center justify-center text-text-muted hover:text-text transition-colors cursor-pointer"
					aria-label="Dismiss guide"
				>
					<X size={16} strokeWidth={2} />
				</button>

				{installedSuccess ? (
					<div className="text-center py-6 flex flex-col items-center">
						<div className="w-16 h-16 rounded-full bg-mint/20 text-mint-deep flex items-center justify-center mb-3 animate-in zoom-in-75 duration-300">
							<CheckCircle2 size={36} />
						</div>
						<h3 className="text-xl font-semibold text-text mb-1">Installed Successfully!</h3>
						<p className="text-sm text-text-muted">
							You can now open Budget Tracker right from your home screen.
						</p>
					</div>
				) : (
					<div>
						{/* App Preview & Header */}
						<div className="flex items-center gap-3.5 mb-5">
							
								<img
									src="/budget-tracker-icon.svg"
									alt="Budget Tracker App"
									className="w-8 h-8"
									onError={(e) => {
										// Fallback to icon if svg path fails
										(e.target as HTMLElement).style.display = 'none';
									}}
								/>
							<div>
								<h3 className="text-lg font-bold text-text leading-tight">
									Install Budget Tracker
								</h3>
								<p className="text-xs text-text-muted mt-0.5">
									Fast, offline-ready & instant access
								</p>
							</div>
						</div>

						{/* Android 1-Step Install Action */}
						{canInstallDirectly ? (
							<div className="space-y-4">
								<div className="p-3.5 bg-surface/70 rounded-2xl border border-black/5 flex items-start gap-3">
									<div className="w-7 h-7 rounded-xl bg-mint/30 text-mint-deep flex items-center justify-center shrink-0 mt-0.5">
										<Download size={16} />
									</div>
									<div>
										<p className="text-xs font-semibold text-text">1-Tap Quick Install</p>
										<p className="text-[12px] text-text-muted mt-0.5">
											Install without opening Google Play Store. It uses almost zero storage and
											works offline!
										</p>
									</div>
								</div>

								<button
									type="button"
									onClick={handleInstallClick}
									disabled={isInstalling}
									className="w-full py-3.5 px-4 bg-ink text-white rounded-2xl font-medium text-sm flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all cursor-pointer hover:bg-ink-soft disabled:opacity-70"
								>
									<Download size={18} className="text-mint" />
									<span>{isInstalling ? 'Installing...' : 'Install App to Home Screen'}</span>
								</button>
							</div>
						) : (
							/* Fallback Manual 1-Step Guide (if browser did not fire beforeinstallprompt yet or in custom browser) */
							<div className="space-y-4">
								<div className="p-3.5 bg-surface/80 rounded-2xl border border-black/5">
									<div className="flex items-center gap-2 mb-2">
										<span className="w-5 h-5 rounded-full bg-ink text-white text-[11px] font-bold flex items-center justify-center">
											1
										</span>
										<span className="text-xs font-bold text-text">
											How to install in 5 seconds:
										</span>
									</div>

									<ol className="text-xs text-text space-y-2.5 pl-1">
										<li className="flex items-center gap-2">
											<span>Tap Chrome menu</span>
											<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-card border border-black/10 font-medium text-[11px]">
												<MoreVertical size={13} /> 3 dots
											</span>
											<span>at top right</span>
										</li>
										<li className="flex items-center gap-2">
											<ArrowDown size={14} className="text-text-muted shrink-0" />
											<span>
												Select <strong>Install app</strong> or <strong>Add to Home screen</strong>
											</span>
										</li>
									</ol>
								</div>

								<button
									type="button"
									onClick={handleClose}
									className="w-full py-3 px-4 bg-surface hover:bg-black/5 text-text font-medium text-xs rounded-2xl transition-colors cursor-pointer"
								>
									Got it, close
								</button>
							</div>
						)}

						{/* Subtle dismiss / maybe later button */}
						{canInstallDirectly && (
							<div className="text-center mt-3">
								<button
									type="button"
									onClick={handleClose}
									className="text-xs text-text-muted hover:text-text transition-colors cursor-pointer py-1 px-3"
								>
									Maybe later
								</button>
							</div>
						)}
					</div>
				)}
			</div>
		</BottomSheet>
	);
};

export default AndroidInstallGuide;
