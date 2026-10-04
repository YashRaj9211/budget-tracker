import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router';
import {
	Lock,
	Mail,
	ArrowRight,
	Eye,
	EyeOff,
	User as UserIcon,
	Phone,
	Sparkles,
	Loader2,
	KeyRound,
	ArrowLeft,
	ShieldCheck,
	AlertCircle,
	RefreshCw,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

// Optional custom image asset paths (drop generated images into public/assets/auth/)
const CUSTOM_HERO_IMAGE = '/assets/auth/hero-logo.png';
const CUSTOM_OTP_IMAGE = '/assets/auth/otp-badge.png';
const CUSTOM_WATERMARK_IMAGE = '/assets/auth/watermark-badge.png';

export default function Auth() {
	const navigate = useNavigate();
	const location = useLocation();
	const {
		isAuthenticated,
		isLoading,
		error,
		login,
		signup,
		requestOtp,
		verifyOtp,
		clearError,
	} = useAuthStore();

	const isInitialSignup = location.pathname.includes('signup');
	const isWelcomeRoute = location.pathname === '/auth';

	const [mode, setMode] = useState<'welcome' | 'login' | 'signup'>(
		isWelcomeRoute ? 'welcome' : isInitialSignup ? 'signup' : 'login'
	);
	const [loginMethod, setLoginMethod] = useState<'password' | 'otp'>('password');
	const [otpState, setOtpState] = useState<'idle' | 'requested'>('idle');
	const [resendCooldown, setResendCooldown] = useState(0);
	const [hasPasswordFailed, setHasPasswordFailed] = useState(false);

	// Form fields
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [name, setName] = useState('');
	const [username, setUsername] = useState('');
	const [phone, setPhone] = useState('');
	const [isUsernameTouched, setIsUsernameTouched] = useState(false);

	// 6-digit OTP state
	const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
	const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

	useEffect(() => {
		window.hideSplashScreen?.();
		if (isAuthenticated) {
			navigate('/');
		}
	}, [isAuthenticated, navigate]);

	useEffect(() => {
		if (resendCooldown > 0) {
			const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
			return () => clearTimeout(timer);
		}
	}, [resendCooldown]);

	// Auto-focus first OTP digit when OTP state becomes 'requested'
	useEffect(() => {
		if (otpState === 'requested') {
			setTimeout(() => {
				otpInputRefs.current[0]?.focus();
			}, 150);
		}
	}, [otpState]);

	const handleSwitchMode = (newMode: 'welcome' | 'login' | 'signup') => {
		setMode(newMode);
		clearError();
		setOtpState('idle');
		setLoginMethod('password');
		setOtpDigits(['', '', '', '', '', '']);
	};

	const handleNameChange = (val: string) => {
		setName(val);
		if (!isUsernameTouched) {
			const suggested = val.toLowerCase().replace(/[^a-z0-9]/g, '');
			setUsername(suggested);
		}
		if (error) clearError();
	};

	const handleOtpChange = (index: number, val: string) => {
		const digit = val.replace(/\D/g, '').slice(-1);
		const newDigits = [...otpDigits];
		newDigits[index] = digit;
		setOtpDigits(newDigits);
		if (error) clearError();

		if (digit && index < 5) {
			otpInputRefs.current[index + 1]?.focus();
		}

		// Auto submit when 6th digit entered
		if (digit && index === 5 && newDigits.every((d) => d !== '')) {
			const fullCode = newDigits.join('');
			triggerOtpVerify(fullCode);
		}
	};

	const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
			otpInputRefs.current[index - 1]?.focus();
		}
	};

	const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
		e.preventDefault();
		const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
		if (!pasted) return;

		const newDigits = [...otpDigits];
		for (let i = 0; i < 6; i++) {
			newDigits[i] = pasted[i] || '';
		}
		setOtpDigits(newDigits);
		if (error) clearError();

		const focusIdx = Math.min(pasted.length, 5);
		otpInputRefs.current[focusIdx]?.focus();

		if (pasted.length === 6) {
			triggerOtpVerify(pasted);
		}
	};

	const triggerOtpVerify = async (code: string) => {
		try {
			await verifyOtp(email.trim(), code);
			navigate('/');
		} catch {
			// handled in authStore
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		clearError();

		try {
			if (mode === 'signup') {
				await signup({
					name: name.trim(),
					username: username.trim(),
					email: email.trim(),
					password,
					phone: phone.trim() || undefined,
				});
				navigate('/');
			} else if (mode === 'login') {
				if (loginMethod === 'password') {
					try {
						await login({ email: email.trim(), password });
						navigate('/');
					} catch (err) {
						setHasPasswordFailed(true);
						throw err;
					}
				} else {
					if (otpState === 'idle') {
						await requestOtp(email.trim());
						setOtpState('requested');
						setResendCooldown(30);
					} else {
						const fullCode = otpDigits.join('');
						if (fullCode.length < 6) return;
						await verifyOtp(email.trim(), fullCode);
						navigate('/');
					}
				}
			}
		} catch {
			// Error recorded in useAuthStore
		}
	};

	return (
		<div className="min-h-screen w-full bg-card text-text flex flex-col justify-between relative overflow-x-hidden select-none">
			{/* Hidden preloader checks for custom user images */}
			<img
				src={CUSTOM_HERO_IMAGE}
				alt="test-hero"
				className="hidden"
			/>
			<img
				src={CUSTOM_OTP_IMAGE}
				alt="test-otp"
				className="hidden"
			/>
			<img
				src={CUSTOM_WATERMARK_IMAGE}
				alt="test-watermark"
				className="hidden"
			/>
				{/* ========================================================= */}
				{/* MODE 1: WELCOME SCREEN (Eye-Soothing Soft Mint Organic Wave) */}
				{/* ========================================================= */}
				{mode === 'welcome' ? (
					<div className="flex-1 flex flex-col justify-between relative z-10">
						{/* Top Organic Wave Hero */}
						<div className="relative w-full h-[320px] sm:h-[350px] flex flex-col items-center justify-center overflow-hidden">
							{/* Soft Mint Gradient Backdrop */}
							<div className="absolute inset-0 bg-gradient-to-b from-[#C4F7BE] via-[#A8F5A2] to-[#8EEB87]">
								{/* Subtle geometric pattern layer */}
								<div className="absolute inset-0 hatched opacity-10" />

								{/* Organic Wave SVG Divider */}
								<svg
									className="absolute -bottom-1 left-0 w-full h-20 text-card"
									viewBox="0 0 400 120"
									fill="currentColor"
									preserveAspectRatio="none"
								>
									<path d="M0,0 C80,60 160,110 240,65 C310,25 365,60 400,90 L400,120 L0,120 Z" />
								</svg>
							</div>

							{/* Hero Brand Icon & Wordmark Slot (Slot: auth-hero-illustration) */}
							<div className="relative z-10 flex flex-col items-center -translate-y-2">
								<div
									id="auth-hero-illustration"
									className="w-24 h-24 sm:w-28 sm:h-28 rounded-[28px] overflow-hidden shadow-xl shadow-mint-deep/20 transition-transform hover:scale-105 border-2 border-white/70 bg-white/40 backdrop-blur-sm p-1 flex items-center justify-center"
								>
									<img
										src="/budget-tracker-icon.svg"
										alt="Divvit Budget Icon"
										className="w-full h-full object-contain rounded-[22px]"
									/>
								</div>

								{/* Brand Script Title */}
								<h2 className="mt-3.5 text-2xl sm:text-3xl font-bold tracking-tight text-ink">
									divvit
								</h2>
								<span className="text-[11px] font-medium tracking-widest uppercase text-ink/70">
									budget • track • split
								</span>
							</div>
						</div>

						{/* Bottom Content Area */}
						<div className="px-6 sm:px-8 pt-2 pb-8 flex flex-col items-center text-center">
							<h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text mb-2">
								Smart Spending
							</h1>
							<p className="text-xs sm:text-sm text-text-muted leading-relaxed max-w-[280px] mb-8">
								Manage personal expenses, split bills effortlessly with friends, and stay stress-free.
							</p>

							{/* Primary Action Button (Create Account) */}
							<button
								type="button"
								onClick={() => handleSwitchMode('signup')}
								className="w-full h-[50px] rounded-full bg-ink hover:bg-ink-soft active:scale-[0.98] text-white font-medium text-xs sm:text-sm tracking-wider uppercase shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 mb-3"
							>
								<span>Create Account</span>
								<ArrowRight className="w-4 h-4" strokeWidth={1.75} />
							</button>

							{/* Secondary Button (Sign In) */}
							<button
								type="button"
								onClick={() => handleSwitchMode('login')}
								className="w-full h-[46px] rounded-full bg-surface hover:bg-surface/80 text-text font-medium text-xs sm:text-sm tracking-wider uppercase transition-colors cursor-pointer"
							>
								Sign In
							</button>
						</div>
					</div>
				) : (
					/* ========================================================= */
					/* MODE 2 & 3: FORM SCREENS (Sign In, Sign Up, & OTP Flow)   */
					/* ========================================================= */
					<div className="flex-1 flex flex-col relative z-10">
						{/* Top Compact Organic Wave Header */}
						<div className="relative w-full h-28 sm:h-32 overflow-hidden">
							<div className="absolute inset-0 bg-gradient-to-r from-[#C2F7BC] via-[#A8F5A2] to-[#8EEB87]">
								<div className="absolute inset-0 hatched opacity-10" />
								<svg
									className="absolute -bottom-1 left-0 w-full h-14 text-card"
									viewBox="0 0 400 80"
									fill="currentColor"
									preserveAspectRatio="none"
								>
									<path d="M0,0 C120,45 230,10 400,50 L400,80 L0,80 Z" />
								</svg>
							</div>

							{/* Header Bar: Back Button & Mini Badge */}
							<div className="relative z-10 px-5 pt-4 flex items-center justify-between">
								<button
									type="button"
									onClick={() => {
										if (mode === 'login' && otpState === 'requested') {
											setOtpState('idle');
											clearError();
										} else {
											handleSwitchMode('welcome');
										}
									}}
									className="w-9 h-9 rounded-full bg-white/80 backdrop-blur-md border border-white/60 shadow-2xs flex items-center justify-center text-text hover:bg-white transition-colors cursor-pointer"
									aria-label="Go back"
								>
									<ArrowLeft className="w-4 h-4" strokeWidth={2} />
								</button>

								<div className="flex items-center gap-1.5 bg-white/80 backdrop-blur-md pl-1.5 pr-3 py-1 rounded-full border border-white/60 shadow-2xs">
									<img
										src="/budget-tracker-icon.svg"
										alt="Divvit"
										className="w-4 h-4 rounded-sm object-contain"
									/>
									<span className="text-[11px] font-bold text-ink tracking-wide">divvit</span>
								</div>
							</div>
						</div>

						{/* Form Content Container */}
						<div className="flex-1 px-6 sm:px-8 pt-1 pb-6 flex flex-col justify-between">
							<div>
								{/* Header Text */}
								<div className="mb-5">
									<h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text">
										{mode === 'signup'
											? 'Welcome!'
											: loginMethod === 'otp' && otpState === 'requested'
											? 'Enter Code'
											: 'Welcome Back!'}
									</h1>
									<p className="text-xs text-text-muted mt-1 leading-relaxed">
										{mode === 'signup'
											? 'Create an account to join Divvit and manage expenses'
											: loginMethod === 'otp'
											? otpState === 'requested'
												? `Enter the 6-digit code sent to ${email || 'your email'}`
												: 'Sign in password-free with a secure email code'
											: 'Sign in to access your budget and split balances'}
									</p>
								</div>



								{/* Error Notification */}
								{error && (
									<div className="mb-4 p-3 rounded-2xl bg-danger-soft text-danger text-xs font-medium flex items-center gap-2 animate-fadeIn">
										<AlertCircle className="w-4 h-4 shrink-0" />
										<span className="flex-1">{error}</span>
									</div>
								)}

								{/* Main Form Fields */}
								<form onSubmit={handleSubmit} className="space-y-3.5">
									{/* SIGNUP FIELDS */}
									{mode === 'signup' && (
										<>
											{/* Full Name */}
											<div>
												<label className="block text-[11px] font-medium text-text-muted mb-1 ml-1">
													Full Name
												</label>
												<div className="relative">
													<UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" strokeWidth={1.75} />
													<input
														type="text"
														required
														value={name}
														onChange={(e) => handleNameChange(e.target.value)}
														placeholder="e.g. Yash Raj"
														className="w-full bg-surface rounded-full pl-11 pr-4 h-11 text-sm text-text placeholder-text-muted/60 border border-transparent focus:border-ink/20 focus:bg-white focus:outline-none focus:ring-2 focus:ring-mint transition-all"
													/>
												</div>
											</div>

											{/* Username */}
											<div>
												<label className="block text-[11px] font-medium text-text-muted mb-1 ml-1">
													Username
												</label>
												<div className="relative">
													<Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" strokeWidth={1.75} />
													<input
														type="text"
														required
														value={username}
														onChange={(e) => {
															setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
															setIsUsernameTouched(true);
															if (error) clearError();
														}}
														placeholder="yashraj"
														className="w-full bg-surface rounded-full pl-11 pr-4 h-11 text-sm text-text placeholder-text-muted/60 border border-transparent focus:border-ink/20 focus:bg-white focus:outline-none focus:ring-2 focus:ring-mint transition-all font-mono text-[13px]"
													/>
												</div>
											</div>
										</>
									)}

									{/* EMAIL FIELD (Hidden when OTP digits are active) */}
									{!(mode === 'login' && loginMethod === 'otp' && otpState === 'requested') && (
										<div>
											<label className="block text-[11px] font-medium text-text-muted mb-1 ml-1">
												Email Address
											</label>
											<div className="relative">
												<Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" strokeWidth={1.75} />
												<input
													type="email"
													required
													value={email}
													onChange={(e) => {
														setEmail(e.target.value);
														if (error) clearError();
													}}
													placeholder="name@example.com"
													className="w-full bg-surface rounded-full pl-11 pr-4 h-11 text-sm text-text placeholder-text-muted/60 border border-transparent focus:border-ink/20 focus:bg-white focus:outline-none focus:ring-2 focus:ring-mint transition-all"
												/>
											</div>
											{/* Option to return to password login if currently in OTP mode */}
											{mode === 'login' && loginMethod === 'otp' && otpState === 'idle' && (
												<div className="flex justify-end pt-1.5 animate-fadeIn">
													<button
														type="button"
														onClick={() => {
															setLoginMethod('password');
															clearError();
														}}
														className="text-[11px] font-medium text-text-muted hover:text-text flex items-center gap-1 cursor-pointer transition-colors"
													>
														<Lock size={12} strokeWidth={1.75} />
														<span>Sign in with password instead</span>
													</button>
												</div>
											)}
										</div>
									)}

									{/* PASSWORD FIELD (For Signup or Password Login) */}
									{(mode === 'signup' || (mode === 'login' && loginMethod === 'password')) && (
										<div>
											<label className="block text-[11px] font-medium text-text-muted mb-1 ml-1">
												Password
											</label>
											<div className="relative">
												<Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" strokeWidth={1.75} />
												<input
													type={showPassword ? 'text' : 'password'}
													required
													value={password}
													onChange={(e) => {
														setPassword(e.target.value);
														if (error) clearError();
													}}
													placeholder="••••••••"
													className="w-full bg-surface rounded-full pl-11 pr-11 h-11 text-sm text-text placeholder-text-muted/60 border border-transparent focus:border-ink/20 focus:bg-white focus:outline-none focus:ring-2 focus:ring-mint transition-all"
												/>
												<button
													type="button"
													onClick={() => setShowPassword(!showPassword)}
													className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition-colors cursor-pointer"
												>
													{showPassword ? <EyeOff className="w-4 h-4" strokeWidth={1.75} /> : <Eye className="w-4 h-4" strokeWidth={1.75} />}
												</button>
											</div>

											{/* Optional one-tap switch to OTP once password has failed */}
											{hasPasswordFailed && mode === 'login' && loginMethod === 'password' && (
												<div className="flex justify-end pt-1 animate-fadeIn">
													<button
														type="button"
														onClick={() => {
															setLoginMethod('otp');
															clearError();
														}}
														className="text-[11px] font-medium text-mint-deep hover:text-ink flex items-center gap-1 cursor-pointer transition-colors"
													>
														<KeyRound size={12} strokeWidth={1.75} />
														<span>Forgot password? Sign in with Email OTP</span>
													</button>
												</div>
											)}
										</div>
									)}

									{/* PHONE FIELD (Optional on Signup) */}
									{mode === 'signup' && (
										<div>
											<label className="block text-[11px] font-medium text-text-muted mb-1 ml-1 flex justify-between">
												<span>Phone Number</span>
												<span className="text-[10px] text-text-muted/70">(optional)</span>
											</label>
											<div className="relative">
												<Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" strokeWidth={1.75} />
												<input
													type="tel"
													value={phone}
													onChange={(e) => setPhone(e.target.value)}
													placeholder="+91 98765 43210"
													className="w-full bg-surface rounded-full pl-11 pr-4 h-11 text-sm text-text placeholder-text-muted/60 border border-transparent focus:border-ink/20 focus:bg-white focus:outline-none focus:ring-2 focus:ring-mint transition-all"
												/>
											</div>
										</div>
									)}

									{/* OTP VERIFICATION VIEW (Interactive 6 Boxes & OTP Badge) */}
									{mode === 'login' && loginMethod === 'otp' && otpState === 'requested' && (
										<div className="pt-1">
											{/* OTP Security Badge / Illustration Slot (Slot: auth-otp-badge) */}
											<div className="flex flex-col items-center justify-center my-2">
												<div
													id="auth-otp-badge"
													className="w-16 h-16 rounded-[22px] bg-white border border-mint flex items-center justify-center p-2.5 shadow-sm mb-2 relative"
												>
													<img
														src="/budget-tracker-icon.svg"
														alt="Divvit Security"
														className="w-full h-full object-contain rounded-xl"
													/>
													<div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-ink text-mint flex items-center justify-center shadow-xs">
														<ShieldCheck className="w-3.5 h-3.5" strokeWidth={2.5} />
													</div>
												</div>
												<div className="text-center">
													<span className="text-[11px] font-medium text-text-muted">
														Code sent to <strong className="text-text font-semibold">{email}</strong>
													</span>
												</div>
											</div>

											{/* 6 Discrete Numeric Inputs */}
											<div className="flex justify-between gap-1.5 sm:gap-2 my-3" onPaste={handleOtpPaste}>
												{otpDigits.map((digit, index) => (
													<input
														key={index}
														ref={(el) => {
															otpInputRefs.current[index] = el;
														}}
														type="text"
														inputMode="numeric"
														maxLength={1}
														value={digit}
														onChange={(e) => handleOtpChange(index, e.target.value)}
														onKeyDown={(e) => handleOtpKeyDown(index, e)}
														className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold font-mono rounded-[18px] bg-surface text-text border transition-all focus:outline-none ${
															digit
																? 'border-ink bg-white shadow-2xs ring-2 ring-mint/60'
																: 'border-ink/10 focus:border-ink focus:bg-white focus:ring-2 focus:ring-mint'
														}`}
													/>
												))}
											</div>

											{/* Resend & Change Email Controls */}
											<div className="flex justify-between items-center mt-3 pt-1 text-xs">
												<button
													type="button"
													onClick={() => {
														setOtpState('idle');
														setOtpDigits(['', '', '', '', '', '']);
														clearError();
													}}
													className="text-text-muted hover:text-text flex items-center gap-1 cursor-pointer transition-colors"
												>
													<ArrowLeft className="w-3.5 h-3.5" />
													<span>Change email</span>
												</button>

												<button
													type="button"
													disabled={resendCooldown > 0}
													onClick={async () => {
														clearError();
														await requestOtp(email.trim());
														setResendCooldown(30);
													}}
													className="text-mint-deep hover:text-ink font-medium flex items-center gap-1 disabled:text-text-muted/50 disabled:cursor-not-allowed cursor-pointer transition-colors"
												>
													<RefreshCw className={`w-3.5 h-3.5 ${resendCooldown > 0 ? '' : 'hover:rotate-180 transition-transform'}`} />
													<span>{resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}</span>
												</button>
											</div>
										</div>
									)}

									{/* Primary Action Button */}
									<div className="pt-2">
										<button
											type="submit"
											disabled={
												isLoading ||
												(mode === 'login' &&
													loginMethod === 'otp' &&
													otpState === 'requested' &&
													otpDigits.some((d) => d === ''))
											}
											className="w-full h-11 sm:h-12 rounded-full bg-ink hover:bg-ink-soft active:scale-[0.98] text-white font-medium text-xs sm:text-sm tracking-wide shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
										>
											{isLoading ? (
												<>
													<Loader2 className="w-4 h-4 animate-spin" />
													<span>Processing...</span>
												</>
											) : (
												<>
													<span>
														{mode === 'signup'
															? 'Create Account'
															: loginMethod === 'password'
															? 'Sign In'
															: otpState === 'idle'
															? 'Send Verification Code'
															: 'Verify & Sign In'}
													</span>
													<ArrowRight className="w-4 h-4" strokeWidth={1.75} />
												</>
											)}
										</button>
									</div>
								</form>
							</div>

							{/* Footer Mode Switcher & Watermark */}
							<div className="mt-6 pt-3 flex flex-col items-center relative">
								<div className="text-xs text-text-muted z-10">
									{mode === 'signup' ? (
										<>
											Already have an account?{' '}
											<button
												type="button"
												onClick={() => handleSwitchMode('login')}
												className="text-ink font-semibold hover:underline ml-1 cursor-pointer transition-colors"
											>
												Sign In
											</button>
										</>
									) : (
										<>
											Don't have an account?{' '}
											<button
												type="button"
												onClick={() => handleSwitchMode('signup')}
												className="text-ink font-semibold hover:underline ml-1 cursor-pointer transition-colors"
											>
												Create Account
											</button>
										</>
									)}
								</div>

								{/* Watermark Slot (Slot: auth-watermark-icon) */}
								<div
									id="auth-watermark-icon"
									className="absolute -bottom-3 right-0 w-24 h-24 pointer-events-none opacity-20 flex items-center justify-center"
								>
									<img
										src="/budget-tracker-icon.svg"
										alt="Divvit Watermark"
										className="w-full h-full object-contain grayscale opacity-60"
									/>
								</div>
							</div>
						</div>
					</div>
				)}
		</div>
	);
}
