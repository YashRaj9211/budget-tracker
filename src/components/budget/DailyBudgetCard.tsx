import { Settings } from 'lucide-react';
import { Link } from 'react-router';

function DailyBudgetCard() {
	return (
		<div className="border border-black bg-white p-5 pb-3 shadow-box my-4">
			<div className="flex justify-between items-center mb-3">
				<h3 className="text-xl font-bold text-black">Daily Budget</h3>
				<Link to="/budget" className="text-gray-500 hover:text-black transition-colors cursor-pointer flex items-center" aria-label="Budget settings">
					<Settings size={18} />
				</Link>
			</div>
            
			<div className="flex justify-between items-baseline mb-2 text-sm">
				<span className="text-gray-600">Progress</span>
				<span className="font-bold text-base">48%</span>
			</div>

			{/* Progress bar matching the mockup's flat tan/cream colors */}
			<div className="w-full h-3 bg-[#eedcc2] border border-black mb-4">
				<div className="h-full bg-[#9f8569]" style={{ width: '48%' }}></div>
			</div>

			{/* Mini Stats Row - Subtle/Muted extra info */}
			<div className="flex justify-between items-center">
				<div className="border border-black px-3 py-1.5 text-xs font-bold bg-white text-black tracking-tight">
					27 Jun 2026
				</div>
				<div className="flex flex-col text-xs font-medium text-gray-600">
					<span>
						Remaining: <span className="font-bold text-black">₹129.55</span>
					</span>
					<span>
						Allowance: <span className="font-bold text-black">₹150.00</span>
					</span>
				</div>
			</div>

			<div className="flex justify-between text-[11px] text-gray-400 mt-4 px-0.5 font-medium">
				<span>Total: ₹7000.00</span>
				<span>Used: ₹2240.45</span>
				<span>15 days left</span>
			</div>
		</div>
	);
}

export default DailyBudgetCard;
