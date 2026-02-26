import { useSyncExternalStore } from 'react';

// Use matchMedia query for mobile breakpoint
// Tailwind 'md' starts at 768px, so strictly less than 768px is mobile
const MOBILE_QUERY = '(max-width: 767px)';

let mediaQuery: MediaQueryList | null = null;

function getMediaQuery(): MediaQueryList | null {
  if (typeof window === 'undefined') return null;
  if (!mediaQuery) {
    mediaQuery = window.matchMedia(MOBILE_QUERY);
  }
  return mediaQuery;
}

function subscribe(callback: () => void) {
  const mq = getMediaQuery();
  if (!mq) return () => {};

  mq.addEventListener('change', callback);
  return () => mq.removeEventListener('change', callback);
}

function getSnapshot() {
  const mq = getMediaQuery();
  return mq ? mq.matches : false;
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
