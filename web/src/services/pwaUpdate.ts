import { registerSW } from 'virtual:pwa-register';

/**
 * Registers the PWA service worker with auto-update capability.
 * When a new version is deployed to production:
 * 1. The browser detects byte changes in sw.js.
 * 2. It fetches the new assets in the background.
 * 3. It prompts or automatically activates the new service worker without requiring users to reinstall.
 */
export function setupPwaUpdate(): void {
	if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
		const updateSW = registerSW({
			immediate: true,
			onNeedRefresh() {
				console.log('[PWA] New update available. Activating new version...');
				updateSW(true);
			},
			onOfflineReady() {
				console.log('[PWA] App cached and ready to run 100% offline.');
			},
			onRegisteredSW(_swScriptUrl, registration) {
				if (registration) {
					// Periodically check for updates every 60 minutes
					setInterval(() => {
						registration.update().catch((err) => {
							console.warn('[PWA] Periodic update check failed:', err);
						});
					}, 60 * 60 * 1000);

					// Also check for updates when the user switches back to the app/tab
					document.addEventListener('visibilitychange', () => {
						if (document.visibilityState === 'visible' && navigator.onLine) {
							registration.update().catch(() => {});
						}
					});
				}
			},
		});
	}
}
