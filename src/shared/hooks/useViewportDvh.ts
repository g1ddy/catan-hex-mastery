import { useState, useEffect } from 'react';

/**
 * A debounced hook to get the dynamic viewport height (dvh).
 * This is useful for mobile browsers where the viewport size changes
 * dynamically. It returns the height in pixels as a string (e.g., "768px").
 *
 * @returns {string} The dynamic viewport height.
 */
export const useViewportDvh = (): string => {
  const [viewportHeight, setViewportHeight] = useState(() => {
    if (typeof window !== 'undefined') {
      return `${window.innerHeight}px`;
    }
    return '100dvh'; // Fallback for SSR, dvh is the modern CSS equivalent
  });

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setViewportHeight(`${window.innerHeight}px`);
      }, 150); // Debounce resize events for 150ms
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return viewportHeight;
};
