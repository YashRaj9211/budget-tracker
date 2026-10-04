

interface PageLoaderProps {
	message?: string;
	subtext?: string;
	fullScreen?: boolean;
}

export default function PageLoader({
	message = 'Loading your workspace…',
	subtext = 'Smart expense tracking & splits',
	fullScreen = true,
}: PageLoaderProps) {
	return (
		<div
			className={`flex flex-col items-center justify-center bg-canvas text-text ${
				fullScreen ? 'fixed inset-0 z-50' : 'w-full py-16'
			} animate-fadeIn`}
		>
			<div className="w-[320px] max-w-[90%] bg-card rounded-[32px] p-8 flex flex-col items-center text-center shadow-lg border border-ink/5">
				{/* Squircle Animated Icon */}
				<div className="relative mb-4">
					<div className="w-18 h-18 rounded-[24px] overflow-hidden shadow-sm animate-pulse p-1 bg-white/50 border border-mint">
						<img
							src="/budget-tracker-icon.svg"
							alt="Divvit Logo"
							className="w-full h-full object-contain rounded-[20px]"
						/>
					</div>
					<div className="absolute inset-0 rounded-[24px] bg-mint/40 blur-md -z-10 animate-ping opacity-30" />
				</div>

				{/* Title & Subtext */}
				<h2 className="text-xl font-medium tracking-tight text-text mb-1">
					Divvit Budget
				</h2>
				<p className="text-xs text-text-muted mb-6">
					{subtext}
				</p>

				{/* Smooth Progress Bar */}
				<div className="w-40 h-1.5 bg-surface rounded-full overflow-hidden relative mb-3">
					<div className="h-full rounded-full bg-gradient-to-r from-mint via-[#7FEA79] to-lavender w-2/5 absolute top-0 left-0 animate-[loaderSlide_1.4s_infinite_ease-in-out]" />
				</div>

				<p className="text-[11px] font-medium text-text-muted">
					{message}
				</p>

				{/* Bottom Tag */}
				<div className="mt-5 inline-flex items-center gap-1.5 bg-surface px-3 py-1 rounded-full text-[10.5px] font-medium text-text-muted">
					<span className="w-1.5 h-1.5 rounded-full bg-mint-text inline-block animate-pulse" />
					Offline-first sync
				</div>
			</div>
		</div>
	);
}
