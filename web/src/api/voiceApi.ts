import apiClient from './client';
import type { TransactionType } from '../types';

export interface VoiceTransaction {
	type: TransactionType;
	amount: number;
	description: string;
	category: string;
	account: string;
	date: string; // YYYY-MM-DD
	/** Client-only: category as heard, before being matched to an existing one. */
	rawCategory?: string;
}

export const voiceApi = {
	// Sends the spoken text to our Go server, which asks the NVIDIA LLM to split it into transactions.
	async parse(text: string, categories: string[], accounts: string[], today: string) {
		const res = await apiClient.post<{ transactions: VoiceTransaction[] }>(
			'/api/_private/v1/voice/parse',
			{ text, categories, accounts, today },
			{ timeout: 15000 }
		);
		return res.data.transactions ?? [];
	},
};
