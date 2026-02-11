import { useState, useEffect } from 'react';

// Use matchMedia query for mobile breakpoint
// Tailwind 'md' starts at 768px, so strictly less than 768px is mobile
const MOBILE_QUERY = '(max-width: 767px)';

/**
 * Hook to detect if the viewport is mobile sized.
 * Uses window.matchMedia for performant and accurate detection.
 * Breakpoint: < 768px (Tailwind 'md' is 768px, so mobile is max-width: 767px)
 */
export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(() => {
    // SSR safe check
    if (typeof window === 'undefined') return false;
    return window.matchMedia(MOBILE_QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(MOBILE_QUERY);

    // Handler for changes
    const handleChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };

    // Modern browsers use addEventListener
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return isMobile;
};
