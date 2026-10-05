import React, { useState, useEffect } from 'react';
import { PlusCircle, Check, Save } from 'lucide-react';
import { getTotalDays, todayStr } from '../../utils/date';
import { Card } from '../ui/Card';
import { Select } from '../ui/Select';
import { Button } from '../common/Button';
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
		<Card variant="white" className="mb-6 p-6">
			<form onSubmit={handleFormSubmit}>
				<div className="flex items-center gap-2 mb-5">
					<PlusCircle size={18} className="text-text-muted" strokeWidth={1.5} />
					<h3 className="text-[17px] font-medium text-text">New budget</h3>
				</div>

				<div className="space-y-4">
					{/* Date Range */}
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

					{/* Total Budget Input */}
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
								min="0"
								required
							/>
						</div>
					</div>

					{/* Alert Threshold */}
					<Select
						id="threshold"
						label="Alert threshold (%)"
						value={alertThreshold}
						onChange={(val) => setAlertThreshold(val)}
						options={[
							{ value: '50', label: '50% used' },
							{ value: '80', label: '80% used' },
							{ value: '90', label: '90% used' },
							{ value: '100', label: '100% used' },
						]}
						searchable={false}
					/>

					{/* Summary */}
					{totalDays > 0 && (
						<div className="rounded-[20px] bg-surface p-4 text-xs text-text-muted space-y-2">
							<div className="flex justify-between">
								<span>Budget period</span>
								<span className="font-medium text-text">{totalDays} days</span>
							</div>
							<div className="flex justify-between">
								<span>Daily allowance</span>
								<span className="font-medium text-text">₹{calculatedDaily.toFixed(2)} / day</span>
							</div>
							<div className="flex justify-between">
								<span>Alert trigger at</span>
								<span className="font-medium text-text">
									₹{Math.round(Number(totalLimit || 0) * (Number(alertThreshold) / 100)).toFixed(2)} spent
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
					className="w-full mt-6 py-3 flex items-center justify-center gap-2"
				>
					{saved ? (
						<>
							<Check size={16} strokeWidth={2} className="text-mint" />
							Saved!
						</>
					) : (
						<>
							<Save size={16} strokeWidth={1.5} />
							Save budget
						</>
					)}
				</Button>
			</form>
		</Card>
	);
};
