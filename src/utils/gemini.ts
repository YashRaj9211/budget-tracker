import { GoogleGenAI } from '@google/genai';
import { DEFAULT_CATEGORIES, DEFAULT_ACCOUNTS } from '../types';

export const parseVoiceCommand = async (text: string, apiKey: string) => {
	const ai = new GoogleGenAI({ apiKey });
	const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

	const prompt = `
You are an assistant that parses natural language into a JSON object representing a personal finance transaction in India.
The user input may be in English, Hindi, or Hinglish (e.g., "50 rupaye chai pe kharch kiye", "auto se office gaya 120", "blinkit groceries 450", "salary aayi 50000").
Today's date is: ${today}.

The JSON object must have the following fields:
- "type": either "income" or "expense"
- "amount": a positive number
- "description": a concise string describing the transaction (e.g. "Chai at tapri", "Auto fare", "Blinkit grocery", "Dinner at dhaba")
- "category": a string. Try to match one of these if possible: ${DEFAULT_CATEGORIES.join(', ')}. Default to "Other".
- "account": a string. Try to match one of these if possible: ${DEFAULT_ACCOUNTS.join(', ')}. Default to "Cash".
- "date": a string in "YYYY-MM-DD" format. Resolve words like "today", "yesterday", "aaj", "kal", or specific dates relative to ${today}.

User input: "${text}"

Return ONLY valid JSON. No markdown formatting.
`;

	try {
		const response = await ai.models.generateContent({
			model: 'gemini-2.5-flash',
			contents: prompt,
		});

		let jsonText = response.text;
		if (!jsonText) throw new Error('No response from Gemini');

		// Clean up markdown if the model returns it
		jsonText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();

		const parsed = JSON.parse(jsonText);
		return parsed;
	} catch (error) {
		console.error('Failed to parse voice command:', error);
		throw error;
	}
};
