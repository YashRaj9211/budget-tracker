import { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, CheckCircle2, CloudUpload } from 'lucide-react';
import { useSyncStore, syncService } from '../../services/syncService';
import { useAuthStore } from '../../stores/authStore';

export default function SyncStatusBanner() {
	const { isOnline, isSyncing, pendingCount, lastSyncTime } = useSyncStore();
	const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
	const [showSuccessBanner, setShowSuccessBanner] = useState(false);

	// Show temporary "All records synced" banner after a sync completes
	useEffect(() => {
		if (lastSyncTime && pendingCount === 0 && isOnline) {
			setShowSuccessBanner(true);
			const timer = setTimeout(() => setShowSuccessBanner(false), 3500);
			return () => clearTimeout(timer);
		}
	}, [lastSyncTime, pendingCount, isOnline]);

	const handleManualSync = async () => {
		if (isSyncing || !isOnline) return;
		await syncService.syncAll();
	};

	if (!isAuthenticated) return null;

	// 1. OFFLINE Banner
	if (!isOnline) {
		return (
			<div
				role="status"
				className="w-full bg-amber-300 border-2 border-black px-3 py-1.5 mb-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-between gap-2 text-xs font-bold text-black animate-in fade-in duration-200"
			>
				<div className="flex items-center gap-1.5">
					<WifiOff className="w-4 h-4 text-black shrink-0 animate-pulse" />
					<span>Offline Mode — Changes saved on device</span>
				</div>
				{pendingCount > 0 && (
					<span className="bg-black text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-none">
						{pendingCount} pending
					</span>
				)}
			</div>
		);
	}

	// 2. SYNCING Banner
	if (isSyncing) {
		return (
			<div
				role="status"
				className="w-full bg-blue-100 border-2 border-black px-3 py-1.5 mb-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-between gap-2 text-xs font-bold text-black"
			>
				<div className="flex items-center gap-1.5">
					<RefreshCw className="w-4 h-4 text-blue-800 shrink-0 animate-spin" />
					<span>Syncing records to cloud...</span>
				</div>
				<span className="text-[10px] text-blue-900 font-semibold uppercase">In Progress</span>
			</div>
		);
	}

	// 3. PENDING RECORDS (Online, but items waiting to sync)
	if (pendingCount > 0) {
		return (
			<div
				role="status"
				className="w-full bg-purple-100 border-2 border-black px-3 py-1.5 mb-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-between gap-2 text-xs font-bold text-black"
			>
				<div className="flex items-center gap-1.5">
					<CloudUpload className="w-4 h-4 text-purple-800 shrink-0" />
					<span>{pendingCount} offline record{pendingCount > 1 ? 's' : ''} ready to sync</span>
				</div>
				<button
					type="button"
					onClick={handleManualSync}
					className="bg-black text-white hover:bg-neutral-800 text-[10px] font-bold px-2 py-0.5 cursor-pointer border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-px active:translate-y-px"
				>
					Sync Now
				</button>
			</div>
		);
	}

	// 4. JUST SYNCED SUCCESS BANNER
	if (showSuccessBanner) {
		return (
			<div
				role="status"
				className="w-full bg-emerald-100 border-2 border-black px-3 py-1.5 mb-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-between gap-2 text-xs font-bold text-emerald-900 animate-in fade-in slide-in-from-top-1 duration-200"
			>
				<div className="flex items-center gap-1.5">
					<CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
					<span>All offline records synced to cloud!</span>
				</div>
			</div>
		);
	}

	return null;
}
