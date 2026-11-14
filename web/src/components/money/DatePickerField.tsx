import { useState } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import CustomCalendar from '../common/Calendar';
import { formatFriendlyDate } from '../../utils/date';

/** Pill button that opens the app's calendar in a popover. */
export default function DatePickerField({
	date,
	onChange,
	placeholder = 'Pick date',
}: {
	date: string;
	onChange: (d: string) => void;
	placeholder?: string;
}) {
	const [open, setOpen] = useState(false);

	return (
		<div className="relative w-full">
			<button
				type="button"
				onClick={() => setOpen((prev) => !prev)}
				className="flex h-12 w-full items-center justify-between rounded-full bg-surface px-4 text-[14px] font-medium text-text focus:outline-none focus:ring-2 focus:ring-lavender-deep/40"
			>
				<span className="truncate">{date ? formatFriendlyDate(date) : placeholder}</span>
				<CalendarIcon size={16} className="ml-1.5 shrink-0 text-text-muted" strokeWidth={1.5} />
			</button>
			{open && (
				<>
					<div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
					<div className="absolute left-0 right-0 z-50 mt-2 rounded-[20px] bg-card p-3 shadow-xl sm:right-auto sm:w-[320px]">
						<CustomCalendar
							selectedDate={date}
							onSelectDate={(d) => {
								onChange(d);
								setOpen(false);
							}}
						/>
					</div>
				</>
			)}
		</div>
	);
}
