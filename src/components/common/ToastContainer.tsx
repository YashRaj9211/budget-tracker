import { CheckCircle2, AlertOctagon, AlertTriangle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useToastStore, type ToastItem, type ToastType } from '../../stores/toastStore';

const TOAST_STYLES: Record<
	ToastType,
	{
		badgeBg: string;
		icon: typeof CheckCircle2;
		iconColor: string;
		defaultTitle: string;
	}
> = {
	success: {
		badgeBg: 'bg-mint/40',
		icon: CheckCircle2,
		iconColor: 'text-mint-deep',
		defaultTitle: 'Success',
	},
	error: {
		badgeBg: 'bg-danger-soft',
		icon: AlertOctagon,
		iconColor: 'text-danger',
		defaultTitle: 'Error',
	},
	warning: {
		badgeBg: 'bg-amber-100',
		icon: AlertTriangle,
		iconColor: 'text-amber-800',
		defaultTitle: 'Notice',
	},
	info: {
		badgeBg: 'bg-lavender/40',
		icon: Info,
		iconColor: 'text-lavender-deep',
		defaultTitle: 'Update',
	},
};

function ToastCard({ item }: { item: ToastItem }) {
	const removeToast = useToastStore((s) => s.removeToast);
	const style = TOAST_STYLES[item.type];
	const Icon = style.icon;

	return (
		<motion.div
			layout
			initial={{ opacity: 0, y: -16, scale: 0.96 }}
			animate={{ opacity: 1, y: 0, scale: 1 }}
			exit={{ opacity: 0, y: -12, scale: 0.92, transition: { duration: 0.15 } }}
			transition={{ type: 'spring', stiffness: 500, damping: 32 }}
			className="pointer-events-auto w-full bg-card rounded-[22px] p-3.5 shadow-xl border border-ink/5 flex flex-col gap-1 relative overflow-hidden"
			role="alert"
		>
			<div className="flex items-start gap-3">
				{/* Icon Badge */}
				<div className={`w-8 h-8 rounded-full ${style.badgeBg} shrink-0 flex items-center justify-center`}>
					<Icon className={`w-4 h-4 ${style.iconColor}`} strokeWidth={2} />
				</div>

				{/* Content */}
				<div className="flex-1 min-w-0 pt-0.5">
					<p className="text-[13px] font-medium text-text leading-tight">
						{item.title || style.defaultTitle}
					</p>
					<p className="text-xs text-text-muted mt-0.5 leading-snug break-words">
						{item.message}
					</p>

					{/* Action button if supplied */}
					{item.action && (
						<button
							type="button"
							onClick={() => {
								item.action?.onClick();
								removeToast(item.id);
							}}
							className="mt-2 inline-flex items-center px-3 py-1 text-xs font-medium rounded-full bg-ink text-white hover:bg-ink-soft cursor-pointer transition-colors"
						>
							{item.action.label}
						</button>
					)}
				</div>

				{/* Dismiss button */}
				<button
					type="button"
					aria-label="Close notification"
					onClick={() => removeToast(item.id)}
					className="w-6 h-6 rounded-full bg-surface flex items-center justify-center text-text-muted hover:text-text cursor-pointer transition-colors shrink-0"
				>
					<X className="w-3.5 h-3.5" strokeWidth={1.5} />
				</button>
			</div>

			{/* Animated duration progress bar */}
			{item.duration > 0 && (
				<motion.div
					initial={{ scaleX: 1 }}
					animate={{ scaleX: 0 }}
					transition={{ duration: item.duration / 1000, ease: 'linear' }}
					className="absolute bottom-0 left-0 right-0 h-[2px] bg-ink/10 origin-left"
				/>
			)}
		</motion.div>
	);
}

export default function ToastContainer() {
	const toasts = useToastStore((s) => s.toasts);

	return (
		<div
			aria-live="polite"
			className="fixed top-3 left-1/2 -translate-x-1/2 w-full max-w-sm sm:max-w-md px-3 z-50 pointer-events-none flex flex-col gap-2"
		>
			<AnimatePresence mode="popLayout">
				{toasts.map((item) => (
					<ToastCard key={item.id} item={item} />
				))}
			</AnimatePresence>
		</div>
	);
}
