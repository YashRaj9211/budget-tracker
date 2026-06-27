import { useState, useEffect } from 'react';
import { ArrowLeft, Check, Save } from 'lucide-react';
import { Link } from 'react-router';
import { useBudgetStore } from '../stores/budgetStore';
import { getDaysInMonth } from '../utils/date';

function BudgetSettings() {
	const currentBudget = useBudgetStore((s) => s.currentBudget);
	const saveBudget = useBudgetStore((s) => s.saveBudget);
	const loadBudget = useBudgetStore((s) => s.loadBudget);

	const now = new Date();
	const [selectedMonth, setSelectedMonth] = useState(
		`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
	);
	const [monthlyBudget, setMonthlyBudget] = useState('');
	const [alertThreshold, setAlertThreshold] = useState('80');
	const [saved, setSaved] = useState(false);

	// Load budget when month changes
	useEffect(() => {
		loadBudget(selectedMonth);
	}, [selectedMonth, loadBudget]);

	// Sync form fields when budget loads
	useEffect(() => {
		if (currentBudget && currentBudget.monthKey === selectedMonth) {
			setMonthlyBudget(String(currentBudget.monthlyLimit));
			setAlertThreshold(String(currentBudget.alertThreshold));
		} else {
			setMonthlyBudget('');
			setAlertThreshold('80');
		}
	}, [currentBudget, selectedMonth]);

	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault();
		await saveBudget({
			monthKey: selectedMonth,
			monthlyLimit: Number(monthlyBudget) || 0,
			alertThreshold: Number(alertThreshold),
		});
		setSaved(true);
		setTimeout(() => setSaved(false), 2000);
	};

	// Calculate daily budget based on actual days in selected month
	const [yearNum, monthNum] = selectedMonth.split('-').map(Number);
	const daysInMonth = getDaysInMonth(yearNum, monthNum - 1);
	const calculatedDaily = Math.round(Number(monthlyBudget || 0) / daysInMonth);

	return (
		<div className="relative pb-24">
			{/* Header */}
			<div className="flex items-center justify-between border border-black p-3 bg-white shadow-box mb-6">
				<Link to="/" className="p-1 hover:bg-gray-50 border border-transparent hover:border-black cursor-pointer transition-all flex items-center" aria-label="Go back">
					<ArrowLeft size={20} />
				</Link>
				<h2 className="text-base font-bold text-black tracking-tight">Budget Settings</h2>
				<div className="w-8"></div> {/* Spacer */}
			</div>

			{/* Main Settings Card */}
			<form onSubmit={handleSave} className="border border-black bg-white p-6 shadow-box mb-6">
				<h3 className="text-lg font-bold text-black mb-4">Set Monthly Budget</h3>

				<div className="space-y-4">
					{/* Month Selection */}
					<div>
						<label htmlFor="budget-month" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
							Select Month
						</label>
						<input
							id="budget-month"
							type="month"
							value={selectedMonth}
							onChange={(e) => setSelectedMonth(e.target.value)}
							className="w-full border-2 border-black p-2.5 text-sm font-semibold bg-white focus:outline-none focus:bg-[#fafbfe] cursor-pointer"
							required
						/>
					</div>

					{/* Monthly Budget Input */}
					<div>
						<label htmlFor="monthly-budget" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
							Monthly Limit (₹)
						</label>
						<div className="relative">
							<span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₹</span>
							<input
								id="monthly-budget"
								type="number"
								value={monthlyBudget}
								onChange={(e) => setMonthlyBudget(e.target.value)}
								className="w-full border-2 border-black p-2.5 pl-8 text-base font-medium bg-white focus:outline-none focus:bg-[#fafbfe] transition-all"
								placeholder="0.00"
								required
							/>
						</div>
					</div>

					{/* Notification Threshold */}
					<div>
						<label htmlFor="threshold" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
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

					{/* Dynamic Calculations (Subtle Info) */}
					<div className="border border-black bg-[#fef8f0] p-4 my-2 text-xs text-gray-700 space-y-1.5">
						<div className="flex justify-between">
							<span>Calculated Daily Allowance:</span>
							<span className="font-bold text-black">₹{calculatedDaily}.00 / day</span>
						</div>
						<div className="flex justify-between">
							<span>Alert Trigger at:</span>
							<span className="font-bold text-black">₹{Math.round(Number(monthlyBudget || 0) * (Number(alertThreshold) / 100))}.00 spent</span>
						</div>
					</div>
				</div>

				{/* Save Button */}
				<button
					type="submit"
					className="w-full mt-6 py-2.5 px-4 bg-black text-white font-bold text-sm tracking-wide border-2 border-black flex items-center justify-center gap-2 hover:bg-gray-900 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] cursor-pointer transition-all"
				>
					{saved ? (
						<>
							<Check size={16} className="text-emerald-400" />
							Saved!
						</>
					) : (
						<>
							<Save size={16} />
							Save Settings
						</>
					)}
				</button>
			</form>
		</div>
	);
}

export default BudgetSettings;
