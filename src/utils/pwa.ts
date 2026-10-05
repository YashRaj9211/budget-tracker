export type DevicePlatform = 'ios' | 'android' | 'desktop';

/**
 * Accurately detects whether the client device is running Android, iOS, or Desktop.
 * Accurately handles modern iPads that claim to be MacIntel by checking maxTouchPoints.
 */
export function getDevicePlatform(): DevicePlatform {
  if (typeof window === 'undefined') return 'desktop';

  const userAgent = window.navigator.userAgent || window.navigator.vendor || '';

  // 1. Android
  if (/android/i.test(userAgent)) {
    return 'android';
  }

  // 2. iOS (iPhone, iPad, iPod, including iPadOS desktop Safari)
  const isIOS =
    /iPad|iPhone|iPod/.test(userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  if (isIOS) {
    return 'ios';
  }

  return 'desktop';
}

/**
 * Checks if the web app is running in standalone mode (already installed as PWA).
 */
export function isPWAInstalled(): boolean {
  if (typeof window === 'undefined') return false;

  const isStandaloneMatchMedia = window.matchMedia('(display-mode: standalone)').matches;
  const isIOSStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;

  return isStandaloneMatchMedia || isIOSStandalone;
}
