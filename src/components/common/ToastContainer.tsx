import { CheckCircle2, AlertOctagon, AlertTriangle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useToastStore, type ToastItem, type ToastType } from '../../stores/toastStore';

const TOAST_STYLES: Record<
	ToastType,
	{
		bg: string;
		icon: typeof CheckCircle2;
		iconColor: string;
		defaultTitle: string;
	}
> = {
	success: {
		bg: 'bg-[#bbf7d0]', // Soft mint green
		icon: CheckCircle2,
		iconColor: 'text-black',
		defaultTitle: 'Success',
	},
	error: {
		bg: 'bg-[#fecaca]', // Soft light red
		icon: AlertOctagon,
		iconColor: 'text-black',
		defaultTitle: 'Error',
	},
	warning: {
		bg: 'bg-[#fef08a]', // Soft pastel yellow
		icon: AlertTriangle,
		iconColor: 'text-black',
		defaultTitle: 'Notice',
	},
	info: {
		bg: 'bg-[#bde2ff]', // Soft sky blue
		icon: Info,
		iconColor: 'text-black',
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
			className={`pointer-events-auto w-full border-[2.5px] border-black ${style.bg} p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-1 relative overflow-hidden`}
			role="alert"
		>
			<div className="flex items-start gap-2.5">
				{/* Icon Badge */}
				<div className="w-7 h-7 bg-white border-2 border-black shrink-0 flex items-center justify-center shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)]">
					<Icon className={`w-4 h-4 ${style.iconColor}`} />
				</div>

				{/* Content */}
				<div className="flex-1 min-w-0 pt-0.5">
					<p className="text-[11px] font-black uppercase tracking-wider text-black leading-tight">
						{item.title || style.defaultTitle}
					</p>
					<p className="text-xs font-bold text-gray-900 mt-0.5 leading-snug break-words">
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
							className="mt-2 inline-flex items-center px-2 py-0.5 text-[10px] font-black uppercase bg-black text-white border border-black hover:bg-gray-800 cursor-pointer active:translate-x-0.5 active:translate-y-0.5 transition-transform"
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
					className="w-5 h-5 bg-white border border-black flex items-center justify-center text-black hover:bg-black hover:text-white cursor-pointer transition-colors shrink-0 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
				>
					<X className="w-3.5 h-3.5" />
				</button>
			</div>

			{/* Animated duration progress bar */}
			{item.duration > 0 && (
				<motion.div
					initial={{ scaleX: 1 }}
					animate={{ scaleX: 0 }}
					transition={{ duration: item.duration / 1000, ease: 'linear' }}
					className="absolute bottom-0 left-0 right-0 h-[3px] bg-black/30 origin-left"
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
