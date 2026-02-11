import { useState, useEffect } from 'react';

/**
 * Hook to detect if the viewport is mobile sized.
 * Uses window.matchMedia for performant and accurate detection.
 * Breakpoint: < 768px (Tailwind 'md' is 768px, so mobile is max-width: 767px)
 */
export const useIsMobile = () => {
  // Use matchMedia query for mobile breakpoint
  // Tailwind 'md' starts at 768px, so strictly less than 768px is mobile
  const query = '(max-width: 767px)';

  const [isMobile, setIsMobile] = useState(() => {
    // SSR safe check
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);

    // Handler for changes
    const handleChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };

    // Modern browsers use addEventListener
    mediaQuery.addEventListener('change', handleChange);

    // Ensure state is in sync (in case of changes between init and effect)
    if (mediaQuery.matches !== isMobile) {
        setIsMobile(mediaQuery.matches);
    }

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []); // Query is constant

  return isMobile;
};
