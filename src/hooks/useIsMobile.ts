import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 768;

export const useIsMobile = () => {
  // Initialize state based on window.innerWidth if available (client-side)
  // Otherwise default to false (SSR safe, though this is a SPA)
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < MOBILE_BREAKPOINT;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
};
