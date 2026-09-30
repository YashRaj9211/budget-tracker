import React, { useState, useEffect } from 'react';
import { PlusCircle, Check, Save } from 'lucide-react';
import { getTotalDays, todayStr } from '../../utils/date';
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

		await onSave({
			id: crypto.randomUUID(),
			startDate,
			endDate,
			totalLimit: Number(totalLimit) || 0,
			alertThreshold: Number(alertThreshold),
		});

		setSaved(true);
		setTimeout(() => setSaved(false), 2000);

		// Reset form
		setTotalLimit('');
		setAlertThreshold('80');
		setStartDate(today);
	};

	return (
		<form onSubmit={handleFormSubmit} className="border border-black bg-white p-6 shadow-box mb-6">
			<div className="flex items-center gap-2 mb-4">
				<PlusCircle size={18} />
				<h3 className="text-lg font-bold text-black">New Budget</h3>
			</div>

			<div className="space-y-4">
				{/* Date Range */}
				<div className="grid grid-cols-2 gap-3">
					<div>
						<label
							htmlFor="budget-start"
							className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5"
						>
							Start Date
						</label>
						<input
							id="budget-start"
							type="date"
							value={startDate}
							onChange={(e) => setStartDate(e.target.value)}
							className="w-full border-2 border-black p-2.5 text-sm font-semibold bg-white focus:outline-none focus:bg-[#fafbfe] cursor-pointer"
							required
						/>
					</div>
					<div>
						<label
							htmlFor="budget-end"
							className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5"
						>
							End Date
						</label>
						<input
							id="budget-end"
							type="date"
							value={endDate}
							min={startDate}
							onChange={(e) => setEndDate(e.target.value)}
							className="w-full border-2 border-black p-2.5 text-sm font-semibold bg-white focus:outline-none focus:bg-[#fafbfe] cursor-pointer"
							required
						/>
					</div>
				</div>

				{/* Total Budget Input */}
				<div>
					<label
						htmlFor="total-budget"
						className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5"
					>
						Total Budget Limit (₹)
					</label>
					<div className="relative">
						<span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₹</span>
						<input
							id="total-budget"
							type="number"
							value={totalLimit}
							onChange={(e) => setTotalLimit(e.target.value)}
							className="w-full border-2 border-black p-2.5 pl-8 text-base font-medium bg-white focus:outline-none focus:bg-[#fafbfe] transition-all"
							placeholder="0.00"
							min="0"
							required
						/>
					</div>
				</div>

				{/* Alert Threshold */}
				<div>
					<label
						htmlFor="threshold"
						className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5"
					>
						Alert Threshold (%)
					</label>
					<select
						id="threshold"
						value={alertThreshold}
						onChange={(e) => setAlertThreshold(e.target.value)}
						className="w-full border-2 border-black p-2.5 text-sm font-medium bg-white focus:outline-none focus:bg-[#fafbfe] cursor-pointer"
					>
						<option value="50">50% used</option>
						<option value="80">80% used</option>
						<option value="90">90% used</option>
						<option value="100">100% used</option>
					</select>
				</div>

				{/* Summary */}
				{totalDays > 0 && (
					<div className="border border-black bg-[#fef8f0] p-4 text-xs text-gray-700 space-y-1.5">
						<div className="flex justify-between">
							<span>Budget Period:</span>
							<span className="font-bold text-black">{totalDays} days</span>
						</div>
						<div className="flex justify-between">
							<span>Daily Allowance:</span>
							<span className="font-bold text-black">₹{calculatedDaily.toFixed(2)} / day</span>
						</div>
						<div className="flex justify-between">
							<span>Alert Trigger at:</span>
							<span className="font-bold text-black">
								₹{Math.round(Number(totalLimit || 0) * (Number(alertThreshold) / 100)).toFixed(2)} spent
							</span>
						</div>
					</div>
				)}

				{error && (
					<p className="text-xs font-bold text-rose-600 border border-rose-300 bg-rose-50 px-3 py-2">
						{error}
					</p>
				)}
			</div>

			{/* Save Button */}
			<button
				type="submit"
				className="w-full mt-6 py-2.5 px-4 bg-black text-white font-bold text-sm tracking-wide border-2 border-black flex items-center justify-center gap-2 hover:bg-gray-900 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] cursor-pointer transition-all"
			>
				{saved ? (
					<>
						<Check size={16} className="text-emerald-400" />
						Saved!
					</>
				) : (
					<>
						<Save size={16} />
						Save Budget
					</>
				)}
			</button>
		</form>
	);
};
