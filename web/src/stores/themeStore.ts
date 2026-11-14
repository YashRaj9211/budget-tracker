import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ThemeState = {
	theme: 'brutal' | 'modern';
	toggleTheme: () => void;
};

export const useThemeStore = create<ThemeState>()(
	persist(
		(set) => ({
			theme: 'brutal',
			toggleTheme: () => set((state) => ({ theme: state.theme === 'brutal' ? 'modern' : 'brutal' })),
		}),
		{ name: 'theme-storage' }
	)
);
