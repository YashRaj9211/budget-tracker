import { useState, useEffect, useRef, type ReactNode } from 'react';
import { WifiOff, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSyncStore, syncService } from '../../services/syncService';
import { useAuthStore } from '../../stores/authStore';

export default function SyncStatusBanner() {
	const { isOnline, isSyncing, pendingCount, lastError } = useSyncStore();
	const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
	const [showSuccessBanner, setShowSuccessBanner] = useState(false);
	const prevSyncingRef = useRef(isSyncing);

	// Show brief success pill when sync finishes successfully, then automatically disappear
	useEffect(() => {
		if (prevSyncingRef.current && !isSyncing && pendingCount === 0 && !lastError && isOnline) {
			setShowSuccessBanner(true);
			const timer = setTimeout(() => {
				setShowSuccessBanner(false);
			}, 2000);
			return () => clearTimeout(timer);
		}
		prevSyncingRef.current = isSyncing;
	}, [isSyncing, pendingCount, lastError, isOnline]);

	if (!isAuthenticated) return null;

	const baseClasses =
		'pointer-events-auto rounded-full px-4 py-1.5 flex items-center justify-center gap-2 text-xs font-medium shadow-md backdrop-blur-md border border-ink/5 select-none';

	let bannerContent: ReactNode = null;
	let bannerKey: string | null = null;

	// 1. When offline: show compact offline indicator
	if (!isOnline) {
		bannerKey = 'offline';
		bannerContent = (
			<div role="status" className={`${baseClasses} bg-surface/95 text-text-muted border-ink/10`}>
				<WifiOff className="w-3.5 h-3.5 text-text-muted shrink-0" strokeWidth={1.5} />
				<span>Offline mode</span>
				{pendingCount > 0 && (
					<span className="bg-ink text-white text-[10px] px-2 py-0.2 rounded-full font-mono">
						{pendingCount} saved
					</span>
				)}
			</div>
		);
	}
	// 2. While syncing: show active spinning sync indicator
	else if (isSyncing) {
		bannerKey = 'syncing';
		bannerContent = (
			<div role="status" className={`${baseClasses} bg-lavender/95 text-ink`}>
				<RefreshCw className="w-3.5 h-3.5 text-ink shrink-0 animate-spin" strokeWidth={1.5} />
				<span>Syncing changes…</span>
			</div>
		);
	}
	// 3. Briefly show success notification, then disappear
	else if (showSuccessBanner) {
		bannerKey = 'success';
		bannerContent = (
			<div role="status" className={`${baseClasses} bg-mint/95 text-ink`}>
				<CheckCircle2 className="w-3.5 h-3.5 text-ink shrink-0" strokeWidth={1.5} />
				<span>All records synced!</span>
			</div>
		);
	}
	// 4. When sync previously failed and items remain pending: show calm indicator with retry button
	else if (lastError && pendingCount > 0) {
		bannerKey = 'error';
		bannerContent = (
			<div role="status" className={`${baseClasses} bg-surface/95 text-text-muted border-ink/10`}>
				<AlertCircle className="w-3.5 h-3.5 text-danger shrink-0" strokeWidth={1.5} />
				<span>{pendingCount} unsynced change{pendingCount > 1 ? 's' : ''}</span>
				<button
					type="button"
					onClick={() => syncService.syncAll({ force: true })}
					className="text-ink font-semibold underline underline-offset-2 ml-1 cursor-pointer hover:opacity-80 active:scale-95 transition"
				>
					Retry
				</button>
			</div>
		);
	}

	return (
		<div
			aria-live="polite"
			className="fixed top-3 left-1/2 -translate-x-1/2 z-40 pointer-events-none flex justify-center w-fit max-w-[90vw]"
		>
			<AnimatePresence mode="wait">
				{bannerContent && (
					<motion.div
						key={bannerKey}
						initial={{ opacity: 0, y: -16, scale: 0.95 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: -16, scale: 0.95 }}
						transition={{ duration: 0.2, ease: 'easeOut' }}
					>
						{bannerContent}
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

