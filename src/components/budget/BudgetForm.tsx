import React, { useState, useEffect } from 'react';
import { PlusCircle, Check, Save, CalendarRange, Sparkles, Bell } from 'lucide-react';
import { getTotalDays, todayStr, formatDisplayDate } from '../../utils/date';
import { Card } from '../ui/Card';
import { Select } from '../ui/Select';
import { Button } from '../common/Button';
import { statusSheet } from '../../stores/statusSheetStore';
import type { Budget } from '../../types';

interface BudgetFormProps {
	onSave: (budget: Budget) => Promise<void>;
}

export const BudgetForm: React.FC<BudgetFormProps> = ({ onSave }) => {
	const today = todayStr();
	const [startDate, setStartDate] = useState(today);
	const [endDate, setEndDate] = useState('');
	const [totalLimit, setTotalLimit] = useState('');
	const [alertThreshold, setAlertThreshold] = useState('80');
	const [saved, setSaved] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState('');

	// Auto-set end date to 30 days from start when start changes
	useEffect(() => {
		if (startDate) {
			const d = new Date(startDate + 'T00:00:00');
			d.setDate(d.getDate() + 29); // 30-day default
			const y = d.getFullYear();
			const m = String(d.getMonth() + 1).padStart(2, '0');
			const day = String(d.getDate()).padStart(2, '0');
			setEndDate(`${y}-${m}-${day}`);
		}
	}, [startDate]);

	const totalDays = startDate && endDate ? getTotalDays(startDate, endDate) : 0;
	const calculatedDaily = totalDays > 0 ? Math.round(Number(totalLimit || 0) / totalDays) : 0;

	const handlePresetClick = (type: 'thisMonth' | '30days' | '14days' | '7days') => {
		const baseDate = new Date();
		const y = baseDate.getFullYear();
		const m = baseDate.getMonth();

		if (type === 'thisMonth') {
			const startOfMonth = new Date(y, m, 1);
			const endOfMonth = new Date(y, m + 1, 0);

			const sy = startOfMonth.getFullYear();
			const sm = String(startOfMonth.getMonth() + 1).padStart(2, '0');
			const sday = String(startOfMonth.getDate()).padStart(2, '0');

			const ey = endOfMonth.getFullYear();
			const em = String(endOfMonth.getMonth() + 1).padStart(2, '0');
			const eday = String(endOfMonth.getDate()).padStart(2, '0');

			setStartDate(`${sy}-${sm}-${sday}`);
			setEndDate(`${ey}-${em}-${eday}`);
		} else {
			const daysToAdd = type === '30days' ? 29 : type === '14days' ? 13 : 6;
			const start = todayStr();
			setStartDate(start);

			const target = new Date(start + 'T00:00:00');
			target.setDate(target.getDate() + daysToAdd);

			const ty = target.getFullYear();
			const tm = String(target.getMonth() + 1).padStart(2, '0');
			const tday = String(target.getDate()).padStart(2, '0');

			setEndDate(`${ty}-${tm}-${tday}`);
		}
	};

	const handleFormSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');

		if (!startDate || !endDate) {
			setError('Please select both start and end dates.');
			return;
		}
		if (endDate < startDate) {
			setError('End date must be on or after start date.');
			return;
		}
		if (!totalLimit || Number(totalLimit) <= 0) {
			setError('Please enter a budget limit greater than 0.');
			return;
		}

		setIsSubmitting(true);

		const limitNum = Number(totalLimit);
		const days = getTotalDays(startDate, endDate);

		await statusSheet.execute({
			action: async () => {
				await onSave({
					id: crypto.randomUUID(),
					startDate,
					endDate,
					totalLimit: limitNum,
					alertThreshold: Number(alertThreshold),
				});
			},
			processingTitle: 'Saving budget target...',
			processingMessage: `Allocating ₹${limitNum.toLocaleString('en-IN')} for ${days} days`,
			successTitle: 'Budget saved!',
			successMessage: `Budget set for ${formatDisplayDate(startDate)} → ${formatDisplayDate(endDate)}`,
			buttonText: 'Nice one!',
			onSuccess: () => {
				setSaved(true);
				setTimeout(() => setSaved(false), 2000);
				// Reset form
				setTotalLimit('');
				setAlertThreshold('80');
				setStartDate(today);
			},
			onError: (err) => {
				setError(err?.message || 'Failed to save budget');
			},
		});

		setIsSubmitting(false);
	};

	return (
		<Card variant="white" className="p-5">
			<form onSubmit={handleFormSubmit}>
				{/* Header */}
				<div className="flex items-center gap-3 mb-5">
					<div className="w-10 h-10 rounded-full bg-mint text-ink flex items-center justify-center shrink-0">
						<PlusCircle size={20} strokeWidth={1.5} />
					</div>
					<div>
						<h2 className="text-[16px] font-medium text-text">New budget target</h2>
						<p className="text-[12px] text-text-muted">Set spending limit for your chosen period</p>
					</div>
				</div>

				<div className="space-y-4">
					{/* Duration Presets */}
					<div>
						<span className="block text-[12px] font-medium text-text-muted mb-2">
							Duration presets
						</span>
						<div className="flex gap-2 flex-wrap">
							{[
								{ id: 'thisMonth', label: 'This month' },
								{ id: '30days', label: 'Next 30 days' },
								{ id: '14days', label: 'Next 14 days' },
								{ id: '7days', label: 'Next 7 days' },
							].map((p) => (
								<button
									key={p.id}
									type="button"
									onClick={() => handlePresetClick(p.id as any)}
									className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-surface text-text-muted hover:text-text active:scale-95 transition-all cursor-pointer"
								>
									{p.label}
								</button>
							))}
						</div>
					</div>

					{/* Date Range Inputs */}
					<div className="grid grid-cols-2 gap-3">
						<div>
							<label
								htmlFor="budget-start"
								className="block text-[12px] font-medium text-text-muted mb-1.5"
							>
								Start date
							</label>
							<input
								id="budget-start"
								type="date"
								value={startDate}
								onChange={(e) => setStartDate(e.target.value)}
								className="w-full bg-surface rounded-full h-11 px-4 text-sm font-medium text-text focus:outline-none focus:ring-2 focus:ring-ink/20 cursor-pointer"
								required
							/>
						</div>
						<div>
							<label
								htmlFor="budget-end"
								className="block text-[12px] font-medium text-text-muted mb-1.5"
							>
								End date
							</label>
							<input
								id="budget-end"
								type="date"
								value={endDate}
								min={startDate}
								onChange={(e) => setEndDate(e.target.value)}
								className="w-full bg-surface rounded-full h-11 px-4 text-sm font-medium text-text focus:outline-none focus:ring-2 focus:ring-ink/20 cursor-pointer"
								required
							/>
						</div>
					</div>

					{/* Total Budget Input with Quick Chips */}
					<div>
						<label
							htmlFor="total-budget"
							className="block text-[12px] font-medium text-text-muted mb-1.5"
						>
							Total budget limit (₹)
						</label>
						<div className="relative">
							<span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted font-medium text-sm">₹</span>
							<input
								id="total-budget"
								type="number"
								value={totalLimit}
								onChange={(e) => setTotalLimit(e.target.value)}
								className="w-full bg-surface rounded-full h-11 pl-8 pr-4 text-sm font-medium text-text focus:outline-none focus:ring-2 focus:ring-ink/20"
								placeholder="0.00"
								min="1"
								required
							/>
						</div>

						{/* Quick Amount Suggestion Chips */}
						<div className="flex gap-2 flex-wrap mt-2">
							{[5000, 10000, 20000, 50000].map((amt) => (
								<button
									key={amt}
									type="button"
									onClick={() => setTotalLimit(String(amt))}
									className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
										totalLimit === String(amt)
											? 'bg-ink text-white shadow-2xs'
											: 'bg-surface text-text-muted hover:text-text'
									}`}
								>
									₹{amt.toLocaleString('en-IN')}
								</button>
							))}
						</div>
					</div>

					{/* Alert Threshold Select */}
					<Select
						id="threshold"
						label="Alert threshold (%)"
						value={alertThreshold}
						onChange={(val) => setAlertThreshold(val)}
						options={[
							{ value: '50', label: '50% used (Early warning)' },
							{ value: '75', label: '75% used' },
							{ value: '80', label: '80% used (Recommended)' },
							{ value: '90', label: '90% used (Late alert)' },
							{ value: '100', label: '100% used (Hard limit)' },
						]}
						searchable={false}
					/>

					{/* Live Calculation Summary */}
					{totalDays > 0 && Number(totalLimit) > 0 && (
						<div className="rounded-[20px] bg-surface p-4 text-xs text-text-muted space-y-2.5">
							<div className="flex justify-between items-center">
								<span className="flex items-center gap-1.5">
									<CalendarRange size={13} strokeWidth={1.5} className="text-text-muted" /> Budget period
								</span>
								<span className="font-medium text-text">{totalDays} days</span>
							</div>
							<div className="flex justify-between items-center">
								<span className="flex items-center gap-1.5">
									<Sparkles size={13} strokeWidth={1.5} className="text-text-muted" /> Daily allowance
								</span>
								<span className="font-semibold text-text text-[13px]">
									₹{calculatedDaily > 0 ? calculatedDaily.toLocaleString('en-IN') : '0'} / day
								</span>
							</div>
							<div className="flex justify-between items-center">
								<span className="flex items-center gap-1.5">
									<Bell size={13} strokeWidth={1.5} className="text-text-muted" /> Alert triggers at
								</span>
								<span className="font-medium text-text">
									₹{Math.round(Number(totalLimit || 0) * (Number(alertThreshold) / 100)).toLocaleString('en-IN')} ({alertThreshold}%)
								</span>
							</div>
						</div>
					)}

					{error && (
						<p className="text-xs font-medium text-danger rounded-[16px] bg-danger-soft p-3">
							{error}
						</p>
					)}
				</div>

				{/* Save Button */}
				<Button
					type="submit"
					variant="primary"
					disabled={isSubmitting}
					className="w-full mt-6 py-3.5 flex items-center justify-center gap-2 cursor-pointer shadow-2xs hover:bg-ink-soft disabled:opacity-50"
				>
					{saved ? (
						<>
							<Check size={16} strokeWidth={2} className="text-mint" />
							Saved!
						</>
					) : (
						<>
							<Save size={16} strokeWidth={1.5} />
							Save budget target
						</>
					)}
				</Button>
			</form>
		</Card>
	);
};
