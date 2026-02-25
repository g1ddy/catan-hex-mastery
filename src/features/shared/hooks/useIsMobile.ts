import { useSyncExternalStore } from 'react';

// Use matchMedia query for mobile breakpoint
// Tailwind 'md' starts at 768px, so strictly less than 768px is mobile
const MOBILE_QUERY = '(max-width: 767px)';

function subscribe(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  const mediaQuery = window.matchMedia(MOBILE_QUERY);
  mediaQuery.addEventListener('change', callback);
  return () => mediaQuery.removeEventListener('change', callback);
}

function getSnapshot() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(MOBILE_QUERY).matches;
}

function getServerSnapshot() {
  return false;
}

/**
 * Hook to detect if the viewport is mobile sized.
 * Uses window.matchMedia for performant and accurate detection.
 * Breakpoint: < 768px (Tailwind 'md' is 768px, so mobile is max-width: 767px)
 */
export const useIsMobile = () => {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
};
