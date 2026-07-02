import { GoogleGenAI } from '@google/genai';
import { DEFAULT_CATEGORIES, DEFAULT_ACCOUNTS } from '../types';

export const parseVoiceCommand = async (text: string, apiKey: string) => {
	const ai = new GoogleGenAI({ apiKey });
	const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

	const prompt = `
You are an assistant that parses natural language into a JSON object representing a transaction.
Today's date is: ${today}.

The JSON object must have the following fields:
- "type": either "income" or "expense"
- "amount": a number
- "description": a short string describing the transaction
- "category": a string. Try to match one of these if possible: ${DEFAULT_CATEGORIES.join(', ')}. Default to "Other".
- "account": a string. Try to match one of these if possible: ${DEFAULT_ACCOUNTS.join(', ')}. Default to "Cash".
- "date": a string in "YYYY-MM-DD" format. Resolve words like "today", "yesterday", or specific dates relative to ${today}.

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
