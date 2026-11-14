import React, { useState } from 'react';
import { Mic } from 'lucide-react';
import VoiceCaptureOverlay from '../voice/VoiceCaptureOverlay';

interface VoiceInputProps {
	dateContext?: string;
	className?: string;
}

// Mic button: opens the full-screen voice entry with live transcription.
const VoiceInput: React.FC<VoiceInputProps> = ({ dateContext, className = '' }) => {
	const [open, setOpen] = useState(false);

	return (
		<>
			<button
				onClick={() => setOpen(true)}
				className={`flex items-center justify-center w-12 h-12 rounded-full bg-mint text-ink shadow-md hover:bg-mint/80 active:scale-[0.95] transition-all cursor-pointer ${className}`}
				aria-label="Add transactions with voice"
			>
				<Mic className="w-5 h-5" strokeWidth={2} />
			</button>
			{open && <VoiceCaptureOverlay onClose={() => setOpen(false)} dateContext={dateContext} />}
		</>
	);
};

export default VoiceInput;
