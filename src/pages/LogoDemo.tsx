import React, { useState } from 'react';
import { ArrowLeft, Sparkles, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { Link } from 'react-router';
import AnimatedLogo, { type AnimatedLogoState } from '../components/common/AnimatedLogo';
import { Card } from '../components/ui/Card';
import { Button } from '../components/common/Button';
import { statusSheet } from '../stores/statusSheetStore';

export default function LogoDemo() {
	const [activeState, setActiveState] = useState<AnimatedLogoState>('idle');
	const [activeSize, setActiveSize] = useState<number>(100);
	const [triggerKey, setTriggerKey] = useState(0);

	const handleSetState = (s: AnimatedLogoState) => {
		setActiveState(s);
		setTriggerKey((k) => k + 1);
	};

	const testAsyncFlow = async () => {
		await statusSheet.execute({
			action: async () => {
				await new Promise((resolve) => setTimeout(resolve, 1500));
				return true;
			},
			processingTitle: 'Processing with Mascot...',
			processingMessage: 'Hold on while we complete your transaction',
			successTitle: 'Done!',
			successMessage: 'Mascot celebrated with a happy pop!',
			buttonText: 'Awesome!',
		});
	};

	return (
		<div className="min-h-screen bg-canvas text-text px-4 py-6 pb-28 max-w-lg mx-auto space-y-6">
			{/* Top Bar */}
			<div className="flex items-center justify-between">
				<Link
					to="/"
					className="w-9 h-9 rounded-full bg-surface hover:bg-surface-muted flex items-center justify-center transition-colors"
				>
					<ArrowLeft className="w-4 h-4 text-text" />
				</Link>
				<h1 className="text-base font-semibold tracking-tight">AnimatedLogo Showcase</h1>
				<div className="w-9" />
			</div>

			{/* Interactive Playground */}
			<Card variant="white" className="p-6 flex flex-col items-center text-center space-y-4 shadow-sm">
				<div className="text-xs font-semibold uppercase tracking-wider text-text-muted">
					Interactive State Tester
				</div>

				<div className="relative py-4 flex items-center justify-center">
					<div
						className={`absolute inset-0 rounded-full blur-2xl transition-all duration-300 ${
							activeState === 'loading'
								? 'bg-lavender/40 scale-125'
								: activeState === 'success'
								? 'bg-mint/50 scale-125'
								: activeState === 'error'
								? 'bg-danger/20 scale-125'
								: 'bg-mint/20 scale-100'
						}`}
					/>
					<AnimatedLogo
						key={`${activeState}-${triggerKey}`}
						state={activeState}
						size={activeSize}
						title={`Mascot in ${activeState} state`}
					/>
				</div>

				<div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-surface text-text">
					Current state:{' '}
					<span className="font-bold uppercase tracking-wider text-mint-deep">
						{activeState}
					</span>
				</div>

				{/* State Selector Buttons */}
				<div className="grid grid-cols-4 gap-2 w-full pt-2">
					<button
						type="button"
						onClick={() => handleSetState('idle')}
						className={`py-2 px-1 text-xs font-medium rounded-xl transition-all cursor-pointer ${
							activeState === 'idle'
								? 'bg-ink text-white shadow-sm'
								: 'bg-surface text-text hover:bg-surface-muted'
						}`}
					>
						Idle
					</button>
					<button
						type="button"
						onClick={() => handleSetState('loading')}
						className={`py-2 px-1 text-xs font-medium rounded-xl transition-all cursor-pointer ${
							activeState === 'loading'
								? 'bg-ink text-white shadow-sm'
								: 'bg-surface text-text hover:bg-surface-muted'
						}`}
					>
						Loading
					</button>
					<button
						type="button"
						onClick={() => handleSetState('success')}
						className={`py-2 px-1 text-xs font-medium rounded-xl transition-all cursor-pointer ${
							activeState === 'success'
								? 'bg-ink text-white shadow-sm'
								: 'bg-surface text-text hover:bg-surface-muted'
						}`}
					>
						Success
					</button>
					<button
						type="button"
						onClick={() => handleSetState('error')}
						className={`py-2 px-1 text-xs font-medium rounded-xl transition-all cursor-pointer ${
							activeState === 'error'
								? 'bg-ink text-white shadow-sm'
								: 'bg-surface text-text hover:bg-surface-muted'
						}`}
					>
						Error
					</button>
				</div>

				{/* Size Slider */}
				<div className="w-full pt-2 flex items-center justify-between gap-3 text-xs text-text-muted">
					<span>Size ({activeSize}px)</span>
					<input
						type="range"
						min="48"
						max="180"
						step="4"
						value={activeSize}
						onChange={(e) => setActiveSize(Number(e.target.value))}
						className="flex-1 accent-ink cursor-pointer"
					/>
				</div>
			</Card>

			{/* All 4 States Side-by-Side */}
			<div className="space-y-3">
				<h2 className="text-sm font-semibold text-text px-1">All 4 States Side-by-Side</h2>
				<div className="grid grid-cols-2 gap-3">
					{/* Idle */}
					<Card variant="light" nested className="p-4 flex flex-col items-center text-center">
						<AnimatedLogo state="idle" size={72} />
						<div className="mt-3 text-xs font-semibold text-text">Idle</div>
						<div className="text-[11px] text-text-muted mt-0.5">
							Gentle float &amp; offset eye blinking
						</div>
					</Card>

					{/* Loading */}
					<Card variant="light" nested className="p-4 flex flex-col items-center text-center">
						<AnimatedLogo state="loading" size={72} />
						<div className="mt-3 text-xs font-semibold text-text">Loading</div>
						<div className="text-[11px] text-text-muted mt-0.5">
							Continuous thinking bounce &amp; squint
						</div>
					</Card>

					{/* Success */}
					<Card variant="light" nested className="p-4 flex flex-col items-center text-center">
						<AnimatedLogo state="success" size={72} />
						<div className="mt-3 text-xs font-semibold text-text">Success</div>
						<div className="text-[11px] text-text-muted mt-0.5">
							Happy head nod &amp; wide eyes
						</div>
					</Card>

					{/* Error */}
					<Card variant="light" nested className="p-4 flex flex-col items-center text-center">
						<AnimatedLogo state="error" size={72} />
						<div className="mt-3 text-xs font-semibold text-text">Error</div>
						<div className="text-[11px] text-text-muted mt-0.5">
							Disappointed face slump &amp; sad eyes
						</div>
					</Card>
				</div>
			</div>

			{/* Action Sheet Modal Test */}
			<Card variant="white" className="p-4 space-y-3">
				<h3 className="text-sm font-semibold text-text">Test in Action Sheet Modal</h3>
				<p className="text-xs text-text-muted leading-relaxed">
					See how the AnimatedLogo transitions between processing, success, and error inside the global Status Action Sheet.
				</p>
				<Button
					variant="primary"
					onClick={testAsyncFlow}
					className="w-full flex items-center justify-center gap-2"
				>
					<Sparkles className="w-4 h-4" /> Trigger Action Sheet Flow
				</Button>
			</Card>
		</div>
	);
}
