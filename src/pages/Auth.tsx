import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router';
import { useAuthStore } from '../stores/authStore';
import { Mail, Lock, User as UserIcon, Phone, Eye, EyeOff, Wallet, ArrowRight, Loader2, Sparkles } from 'lucide-react';

type AuthMode = 'login' | 'signup';

export default function Auth() {
	const navigate = useNavigate();
	const { login, signup, isAuthenticated, isLoading, error, clearError } = useAuthStore();

	const [mode, setMode] = useState<AuthMode>('login');
	const [showPassword, setShowPassword] = useState(false);

	// Form State
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [name, setName] = useState('');
	const [username, setUsername] = useState('');
	const [phone, setPhone] = useState('');

	useEffect(() => {
		(window as any).hideSplashScreen?.();
	}, []);

	if (isAuthenticated) {
		return <Navigate to="/" replace />;
	}

	const handleSwitchMode = (newMode: AuthMode) => {
		setMode(newMode);
		clearError();
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		clearError();

		try {
			if (mode === 'login') {
				await login({ email, password });
			} else {
				await signup({
					email,
					password,
					name,
					username,
					phone: phone ? phone : undefined,
				});
			}
			navigate('/');
		} catch {
			// Error is handled in authStore
		}
	};

	return (
		<div className="h-screen text-black flex flex-col justify-center items-center overflow-hidden">
			{/* Main Neobrutalist Card */}
			<div className="w-full max-w-md bg-white border-[3px] border-black p-6 sm:p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
				
				{/* Header */}
				<div className="border-[3px] border-black bg-[#bde2ff] p-4 mb-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center">
					<div className="inline-flex items-center justify-center w-12 h-12 bg-white border-2 border-black mb-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
						<Wallet className="w-6 h-6 text-black" />
					</div>
					<h1 className="text-xl font-black tracking-tight uppercase">
						Divvit Budget
					</h1>
					<p className="text-xs font-bold text-gray-800 uppercase mt-1">
						{mode === 'login' ? 'Welcome back! Sign in below.' : 'Create a new account.'}
					</p>
				</div>

				{/* Mode Switcher Buttons */}
				{/* <div className="grid grid-cols-2 gap-2 mb-6">
					<button
						type="button"
						onClick={() => handleSwitchMode('login')}
						className={`py-2 text-xs font-black uppercase border-2 border-black transition-all cursor-pointer ${
							mode === 'login'
								? 'bg-black text-white shadow-none'
								: 'bg-white text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none'
						}`}
					>
						Sign In
					</button>
					<button
						type="button"
						onClick={() => handleSwitchMode('signup')}
						className={`py-2 text-xs font-black uppercase border-2 border-black transition-all cursor-pointer ${
							mode === 'signup'
								? 'bg-black text-white shadow-none'
								: 'bg-white text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none'
						}`}
					>
						Sign Up
					</button>
				</div> */}

				{/* Error Feedback */}
				{error && (
					<div className="mb-6 p-3 bg-[#ff6b6b] border-2 border-black text-black font-bold text-xs shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2">
						<span className="w-2.5 h-2.5 bg-black border border-white shrink-0" />
						<p className="flex-1 uppercase">{error}</p>
					</div>
				)}

				{/* Form */}
				<form onSubmit={handleSubmit} className="space-y-4">
					{mode === 'signup' && (
						<>
							{/* Full Name */}
							<div>
								<label className="block text-xs font-black uppercase tracking-wider text-black mb-1">
									Full Name
								</label>
								<div className="relative">
									<UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-black" />
									<input
										type="text"
										required
										value={name}
										onChange={(e) => setName(e.target.value)}
										placeholder="e.g. John Doe"
										className="w-full bg-white border-2 border-black pl-10 pr-4 py-2.5 text-sm text-black placeholder:text-gray-500 font-bold focus:outline-none focus:ring-2 focus:ring-[#bde2ff] focus:ring-offset-2 transition-all"
									/>
								</div>
							</div>

							{/* Username */}
							<div>
								<label className="block text-xs font-black uppercase tracking-wider text-black mb-1">
									Username
								</label>
								<div className="relative">
									<Sparkles className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-black" />
									<input
										type="text"
										required
										value={username}
										onChange={(e) => setUsername(e.target.value)}
										placeholder="e.g. johndoe"
										className="w-full bg-white border-2 border-black pl-10 pr-4 py-2.5 text-sm text-black placeholder:text-gray-500 font-bold focus:outline-none focus:ring-2 focus:ring-[#bde2ff] focus:ring-offset-2 transition-all"
									/>
								</div>
							</div>
						</>
					)}

					{/* Email */}
					<div>
						<label className="block text-xs font-black uppercase tracking-wider text-black mb-1">
							Email Address
						</label>
						<div className="relative">
							<Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-black" />
							<input
								type="email"
								required
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder="e.g. name@example.com"
								className="w-full bg-white border-2 border-black pl-10 pr-4 py-2.5 text-sm text-black placeholder:text-gray-500 font-bold focus:outline-none focus:ring-2 focus:ring-[#bde2ff] focus:ring-offset-2 transition-all"
							/>
						</div>
					</div>

					{/* Password */}
					<div>
						<label className="block text-xs font-black uppercase tracking-wider text-black mb-1">
							Password
						</label>
						<div className="relative">
							<Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-black" />
							<input
								type={showPassword ? 'text' : 'password'}
								required
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								placeholder="••••••••"
								className="w-full bg-white border-2 border-black pl-10 pr-10 py-2.5 text-sm text-black placeholder:text-gray-500 font-bold focus:outline-none focus:ring-2 focus:ring-[#bde2ff] focus:ring-offset-2 transition-all"
							/>
							<button
								type="button"
								onClick={() => setShowPassword(!showPassword)}
								className="absolute right-3.5 top-1/2 -translate-y-1/2 text-black hover:opacity-70 transition-opacity"
							>
								{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
							</button>
						</div>
					</div>

					{mode === 'signup' && (
						/* Phone Number */
						<div>
							<label className="block text-xs font-black uppercase tracking-wider text-black mb-1">
								Phone Number <span className="text-gray-600 font-bold lowercase">(optional)</span>
							</label>
							<div className="relative">
								<Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-black" />
								<input
									type="tel"
									value={phone}
									onChange={(e) => setPhone(e.target.value)}
									placeholder="e.g. +1234567890"
									className="w-full bg-white border-2 border-black pl-10 pr-4 py-2.5 text-sm text-black placeholder:text-gray-500 font-bold focus:outline-none focus:ring-2 focus:ring-[#bde2ff] focus:ring-offset-2 transition-all"
								/>
							</div>
						</div>
					)}

					{/* Submit Button */}
					<button
						type="submit"
						disabled={isLoading}
						className="w-full bg-[#aff588] text-black font-black uppercase border-2 border-black py-3 px-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-[#9eed68] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
					>
						{isLoading ? (
							<>
								<Loader2 className="w-4 h-4 animate-spin" />
								<span>Processing...</span>
							</>
						) : (
							<>
								<span>{mode === 'login' ? 'Sign In' : 'Sign Up'}</span>
								<ArrowRight className="w-4 h-4 text-black" />
							</>
						)}
					</button>
				</form>

				{/* Toggle link */}
				<div className="mt-6 text-center text-xs font-bold uppercase">
					{mode === 'login' ? (
						<p>
							New here?{' '}
							<button
								type="button"
								onClick={() => handleSwitchMode('signup')}
								className="underline decoration-2 hover:opacity-75 focus:outline-none cursor-pointer font-black"
							>
								Create Account
							</button>
						</p>
					) : (
						<p>
							Have an account?{' '}
							<button
								type="button"
								onClick={() => handleSwitchMode('login')}
								className="underline decoration-2 hover:opacity-75 focus:outline-none cursor-pointer font-black"
							>
								Login instead
							</button>
						</p>
					)}
				</div>
			</div>
		</div>
	);
}
